use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use thiserror::Error;

const HISTORY_FILE_NAME: &str = "draw_history.json";
const BACKUP_FILE_NAME: &str = "draw_history.bak";

#[derive(Default)]
struct StorageState {
    data_dir: Mutex<Option<PathBuf>>,
    using_fallback: Mutex<bool>,
    fallback_dir: Mutex<Option<PathBuf>>,
}

impl StorageState {
    fn set(&self, dir: PathBuf, using_fallback: bool, fallback: Option<PathBuf>) {
        if let Ok(mut guard) = self.data_dir.lock() {
            *guard = Some(dir);
        }
        if let Ok(mut guard) = self.using_fallback.lock() {
            *guard = using_fallback;
        }
        if let Ok(mut guard) = self.fallback_dir.lock() {
            *guard = fallback;
        }
    }

    fn current_dir(&self) -> Option<PathBuf> {
        self.data_dir.lock().ok().and_then(|guard| guard.clone())
    }

    fn using_fallback(&self) -> bool {
        self.using_fallback.lock().map(|guard| *guard).unwrap_or(false)
    }

    fn fallback_path(&self) -> Option<PathBuf> {
        self.fallback_dir.lock().ok().and_then(|guard| guard.clone())
    }
}

#[derive(Debug, Error)]
enum StorageError {
    #[error("无法定位应用可执行文件路径")]
    InvalidExecutableLocation,
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON 数据无效")]
    InvalidJson,
}

#[derive(Serialize)]
struct EnsureResponse {
    data_dir: String,
    using_fallback: bool,
    fallback_dir: Option<String>,
    message: Option<String>,
}

#[derive(Serialize)]
struct ReadResponse {
    history: Value,
    data_dir: String,
    using_fallback: bool,
    fallback_dir: Option<String>,
}

#[derive(Serialize)]
struct WriteResponse {
    data_dir: String,
    backup_path: Option<String>,
    using_fallback: bool,
}

#[tauri::command]
fn ensure_data_dir(app_handle: AppHandle, state: State<StorageState>) -> Result<EnsureResponse, String> {
    let (dir, using_fallback, fallback_dir, message) =
        ensure_storage_dir(&app_handle, &state).map_err(|e| e.to_string())?;

    Ok(EnsureResponse {
        data_dir: dir.to_string_lossy().into_owned(),
        using_fallback,
        fallback_dir: fallback_dir.map(|p| p.to_string_lossy().into_owned()),
        message,
    })
}

#[tauri::command]
fn read_history_file(app_handle: AppHandle, state: State<StorageState>) -> Result<ReadResponse, String> {
    let (dir, using_fallback, fallback_dir, _) =
        ensure_storage_dir(&app_handle, &state).map_err(|e| e.to_string())?;
    let history_path = dir.join(HISTORY_FILE_NAME);

    let history = match fs::read_to_string(&history_path) {
        Ok(content) => serde_json::from_str::<Value>(&content).unwrap_or(Value::Array(vec![])),
        Err(_) => Value::Array(vec![]),
    };

    Ok(ReadResponse {
        history,
        data_dir: dir.to_string_lossy().into_owned(),
        using_fallback,
        fallback_dir: fallback_dir.map(|p| p.to_string_lossy().into_owned()),
    })
}

#[tauri::command]
fn write_history_file(
    app_handle: AppHandle,
    state: State<StorageState>,
    data: Value,
) -> Result<WriteResponse, String> {
    let (dir, using_fallback, _fallback_dir, _) =
        ensure_storage_dir(&app_handle, &state).map_err(|e| e.to_string())?;

    if !data.is_array() {
        return Err(StorageError::InvalidJson.to_string());
    }

    let serialized = serde_json::to_vec_pretty(&data).map_err(|_| StorageError::InvalidJson.to_string())?;

    let history_path = dir.join(HISTORY_FILE_NAME);
    let backup_path = dir.join(BACKUP_FILE_NAME);
    let temp_path = dir.join(format!("{}.tmp", HISTORY_FILE_NAME));

    {
        let mut file = File::create(&temp_path).map_err(|e| StorageError::Io(e).to_string())?;
        file.write_all(&serialized)
            .map_err(|e| StorageError::Io(e).to_string())?;
        file.sync_all()
            .map_err(|e| StorageError::Io(e).to_string())?;
    }

    let mut backup_written = None;
    if history_path.exists() {
        match fs::copy(&history_path, &backup_path) {
            Ok(_) => backup_written = Some(backup_path.clone()),
            Err(err) => {
                eprintln!("备份历史记录失败: {}", err);
            }
        }
        if let Err(err) = fs::remove_file(&history_path) {
            eprintln!("删除旧文件失败: {}", err);
        }
    }

    fs::rename(&temp_path, &history_path).map_err(|e| StorageError::Io(e).to_string())?;

    Ok(WriteResponse {
        data_dir: dir.to_string_lossy().into_owned(),
        backup_path: backup_written.map(|p| p.to_string_lossy().into_owned()),
        using_fallback,
    })
}

fn ensure_storage_dir(
    app_handle: &AppHandle,
    state: &State<StorageState>,
) -> Result<(PathBuf, bool, Option<PathBuf>, Option<String>), StorageError> {
    if let Some(existing) = state.current_dir() {
        return Ok((existing, state.using_fallback(), state.fallback_path(), None));
    }

    let candidate_paths = collect_candidate_data_dirs();
    let mut first_failure: Option<(PathBuf, StorageError)> = None;

    for candidate in candidate_paths {
        match prepare_dir(&candidate) {
            Ok(_) => {
                state.set(candidate.clone(), false, None);
                #[cfg(debug_assertions)]
                println!("使用数据目录: {}", candidate.to_string_lossy());
                return Ok((candidate, false, None, None));
            }
            Err(err) => {
                eprintln!(
                    "创建数据目录失败({}): {}",
                    candidate.to_string_lossy(),
                    err
                );
                if first_failure.is_none() {
                    first_failure = Some((candidate.clone(), err));
                }
            }
        }
    }

    let fallback_dir = app_handle
        .path_resolver()
        .app_local_data_dir()
        .ok_or(StorageError::InvalidExecutableLocation)?
        .join("data");

    prepare_dir(&fallback_dir)?;

    let message = first_failure.as_ref().map(|(failed_path, error)| {
        format!(
            "主目录不可写({}): {}；已改用系统数据目录: {}",
            failed_path.to_string_lossy(),
            error,
            fallback_dir.to_string_lossy()
        )
    });

    let original_dir = first_failure.as_ref().map(|(path, _)| path.clone());

    state.set(fallback_dir.clone(), true, original_dir.clone());
    Ok((fallback_dir, true, original_dir, message))
}

fn prepare_dir(path: &Path) -> Result<(), StorageError> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }

    let history_path = path.join(HISTORY_FILE_NAME);
    if !history_path.exists() {
        fs::write(&history_path, b"[]")?;
    }

    Ok(())
}

fn collect_candidate_data_dirs() -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    let project_root = find_project_root();

    if let Some(root) = project_root.as_ref() {
        let candidate = root.join("data");
        if let Some(path) = register_candidate(candidate, &mut seen, project_root.as_ref()) {
            result.push(path);
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidate = exe_dir.join("data");
            if let Some(path) = register_candidate(candidate, &mut seen, project_root.as_ref()) {
                result.push(path);
            }
        }
    }

    if let Ok(current_dir) = std::env::current_dir() {
        let candidate = current_dir.join("data");
        if let Some(path) = register_candidate(candidate, &mut seen, project_root.as_ref()) {
            result.push(path);
        }
    }

    result
}

fn register_candidate(
    candidate: PathBuf,
    seen: &mut HashSet<PathBuf>,
    project_root: Option<&PathBuf>,
) -> Option<PathBuf> {
    if let Some(root) = project_root {
        if candidate.starts_with(root.join("src-tauri")) {
            return None;
        }
    }

    if seen.insert(candidate.clone()) {
        Some(candidate)
    } else {
        None
    }
}

fn find_project_root() -> Option<PathBuf> {
    let mut bases = Vec::new();
    if let Ok(current_dir) = std::env::current_dir() {
        bases.push(current_dir);
    }
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            bases.push(exe_dir.to_path_buf());
        }
    }

    for base in bases {
        for ancestor in base.ancestors() {
            if is_project_root(ancestor) {
                return Some(ancestor.to_path_buf());
            }
        }
    }

    None
}

fn is_project_root(path: &Path) -> bool {
    path.join("index.html").exists() && path.join("scripts").is_dir()
}

pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        .manage(StorageState::default())
        .invoke_handler(tauri::generate_handler![
            ensure_data_dir,
            read_history_file,
            write_history_file
        ])
        .run(tauri::generate_context!())
}
