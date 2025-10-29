# DrawLots 员工满意度抽签系统（桌面版）

## 项目概述
本项目用于将广东粤华发电有限责任公司的员工满意度抽签流程封装为跨平台桌面应用。前端基于纯 HTML/CSS/ES6 提供抽签界面与动画效果，后端使用 Tauri（Rust + WebView）处理文件读写、跨平台封装与安装包构建，最终生成可在 macOS 与 Windows 上独立运行的应用。

## 核心功能
- **Excel 花名册解析**：基于 SheetJS 读取公司花名册，自动过滤不参与人员并生成部门统计。
- **公平抽签与可视化过程**：提供动画、降权策略、补抽机制与历史回溯，保证抽签过程透明可追溯。
- **历史记录持久化**：将抽签结果写入 `data/draw_history.json` 并在必要时生成备份，权限受限时自动切换到用户数据目录。
- **双平台打包**：使用 Tauri 将前端静态资源打包成 macOS `.app/.dmg` 与 Windows `.msi/.exe`，无需额外依赖。
- **离线备份与导出**：支持导出历史记录，便于长期归档或迁移。

## 技术栈与架构
- **前端**：原生 HTML、CSS、ES6 模块，按功能拆分在 `scripts/`、`styles/` 中。
- **桌面封装**：Tauri 1.x（Rust），主要逻辑位于 `src-tauri/src/lib.rs`，通过命令与前端通信。
- **构建工具**：Node.js 脚本 (`tools/prepare-static.js`) 负责打包前复制静态资源；GitHub Actions 负责自动构建与发布。
- **图标资源**：使用 `icons/橘猫.svg`/`橘猫.png` 生成的多尺寸图标，兼容 macOS `.icns` 与 Windows `.ico`。

## 目录结构
```text
DrawLots/
├─ data/                  # 历史记录目录（仓库仅保留 .gitkeep）
├─ docs/                  # 文档资料
├─ icons/                 # 图标源文件及多尺寸导出
├─ scripts/               # 前端业务脚本
├─ src-tauri/             # Tauri 配置、Rust 代码与平台图标
├─ styles/                # 样式文件
├─ tools/                 # 构建辅助脚本
├─ .github/workflows/     # GitHub Actions 工作流
├─ index.html             # 单页应用入口
└─ README.md              # 项目说明（本文档）
```

## 环境要求
| 工具 | 版本建议 | 说明 |
| --- | --- | --- |
| Node.js / npm | Node ≥ 18 | 前端与 Tauri CLI 所需 |
| Rust toolchain | stable（1.70+ 建议） | 使用 `rustup` 安装 |
| Tauri CLI | `@tauri-apps/cli` | 已作为 devDependency，可通过 `npx tauri` 调用 |
| macOS 额外依赖 | Xcode Command Line Tools | 签名、公证需要额外证书 |
| Windows 额外依赖 | Visual Studio Build Tools（含 C++） | 构建 `.msi/.exe` 所需 |

## 快速开始
```bash
npm install          # 安装依赖
npm run tauri:dev    # 启动桌面应用（开发模式）
```
开发模式会直接操作本地 `data/draw_history.json`，调试时建议使用测试数据。

## 常用命令
| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装 Node、Tauri CLI 依赖 |
| `npm run tauri:dev` | 启动开发模式（WebView） |
| `npm run build:web` | 复制静态资源至 `dist/` 供打包使用 |
| `npm run tauri:build` | 构建当前平台的安装包（macOS `.app/.dmg`，Windows `.msi/.exe`） |
| `xattr -dr com.apple.quarantine <AppPath>` | macOS 内部测试时移除 Gatekeeper 隔离标记 |

## 构建与发布
### 本地构建
- **macOS**：执行 `npm run tauri:build`，产物位于 `src-tauri/target/release/bundle/macos/`。
- **Windows**：在 Windows 环境执行同样的命令，产物位于 `src-tauri/target/release/bundle/msi/` 与 `bundle/nsis/`。

> 需要跨平台构建时，推荐在目标系统上运行，或使用 GitHub Actions 提供的官方 runner。

### GitHub Actions 自动发布
- 工作流：`.github/workflows/release.yml`
  - 触发条件：推送 `v*` 格式标签或手动触发 `workflow_dispatch`。
  - 平台：`macos-latest` 与 `windows-latest` 双平台矩阵构建。
  - 产物：自动上传 `.app.tar.gz`、`.dmg`、`.msi`、`.exe` 等安装包到对应 Release。
- 发布步骤：
  1. 合并代码后执行 `git tag vX.Y.Z && git push origin vX.Y.Z`。
  2. 等待 Actions 成功，即可在 Releases 页面下载安装包。

### macOS 签名与公证（建议发布前完成）
1. 加入 Apple Developer Program，申请 Developer ID Application 证书。
2. 在构建机导入 `.p12` 证书，配置 `TAURI_SIGNING_IDENTITY`、`APPLE_ID`、`APPLE_TEAM_ID`、App 专用密码等环境变量。
3. 在 `tauri.conf.json` 的 `bundle.macOS` 中设置 `signingIdentity`、`notarization` 信息。
4. 执行 `npm run tauri:build` 后，Tauri 会调用 `codesign` 与 `notarytool` 完成签名、公证并 stapler。
5. 用户即可直接将 `.dmg/.app` 拖入应用程序目录运行。

若仅在内部测试，可临时执行：
```bash
xattr -dr com.apple.quarantine /Applications/DrawLots.app
```
但正式发布仍建议完成签名与公证。

## 图标资源
- **主图标源文件**：`icons/橘猫.svg`、`icons/橘猫.png`。
- **导出结果**：
  - `icons/icon_1024.png` ~ `icon_16.png`：按尺寸缩放的透明 PNG。
  - `icons/app.iconset/`：用于生成 `.icns` 的 Apple IconSet。
  - `icons/icon.icns` / `icons/icon.ico`：分别供 macOS、Windows 打包使用。
  - `src-tauri/icons/icon.png` / `icon.ico`：Tauri 构建时读取的图标。
- **如果需要重新生成图标**：
  ```bash
  npx --yes svgexport icons/橘猫.svg icons/icon_1024.png 1024:1024
  # 使用 sips 将 1024 PNG 缩放为其他尺寸
  for size in 512 256 128 64 32 16; do
    sips -z $size $size icons/icon_1024.png --out icons/icon_${size}.png
  done
  # 生成 .icns 与 .ico
  iconutil -c icns icons/app.iconset -o icons/icon.icns
  npx --yes png-to-ico icons/icon_256.png icons/icon_128.png icons/icon_64.png icons/icon_32.png icons/icon_16.png > icons/icon.ico
  cp icons/icon_512.png src-tauri/icons/icon.png
  cp icons/icon.ico src-tauri/icons/icon.ico
  ```

## 数据目录策略
- 默认将历史记录写入应用所在目录的 `data/`；如权限不足，自动切换到用户数据目录（`AppData` 或 `Library/Application Support`）。
- `.gitignore` 已排除真实抽签数据，仓库仅保留 `data/.gitkeep`。
- 建议定期备份 `data/draw_history.json`，并在生产操作前准备测试数据。

## 常见问题（FAQ）
- **“应用已损坏”或无法打开（macOS）**：
  - 未签名/未公证的应用被 Gatekeeper 拒绝。开发阶段可用 `xattr -dr com.apple.quarantine <App>`，对外发布请完成签名与公证。
- **Windows SmartScreen 提示**：
  - 未签名的可执行文件可能触发 SmartScreen。可选择使用代码签名证书或通过组织策略允许。
- **GitHub Actions 发布失败**：
  - 确认已有 `icons/icon.ico`、设置 `permissions: contents: write`，并确保打包目标为 `app`, `msi`, `nsis`。

## 许可与使用说明
本项目主要服务于公司内部业务流程，若需对外分发请先确认授权范围，并遵循公司数据安全要求。
