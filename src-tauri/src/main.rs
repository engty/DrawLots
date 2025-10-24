#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = drawlots_tauri::run() {
        eprintln!("启动 Tauri 应用失败: {error}");
    }
}
