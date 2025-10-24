# 员工满意度抽签系统（桌面版）

## 项目概述
本项目为广东粤华发电有限责任公司定制的员工满意度调查抽签系统。前端基于纯 HTML/CSS/ES6 实现，结合 Tauri 封装成可直接运行的桌面应用，支持 macOS 与 Windows 双平台。系统可解析 Excel 花名册、按部门规则抽签、落盘保存历史记录，并在桌面环境下自动生成 `data/draw_history.json` 与抽签结果备份。

## 功能亮点
- **Excel 花名册解析**：基于 SheetJS 解析公司花名册，自动过滤不参与人员并生成部门统计。
- **可视化抽签**：提供动画效果、补抽机制、降权策略等，确保过程公平可追溯。
- **历史记录持久化**：桌面应用会把所有抽签历史写入 `data/` 目录内的 JSON 文件，并在写入失败时降级至本地缓存。
- **双平台打包**：通过 Tauri 生成 macOS `.app` 与 Windows `.exe / .msi`，无需用户手动安装依赖。
- **离线备份**：支持一键导出历史记录与抽签结果，便于长期归档或迁移。

## 环境要求
| 工具 | 版本建议 |
| --- | --- |
| Node.js | >= 18 |
| npm | 与 Node 同步 |
| Rust toolchain | stable（1.70+）|
| Tauri CLI | 已在 `package.json` 的 devDependencies 中声明 |
| macOS 额外要求 | `xcode-select --install` 安装 Command Line Tools |
| Windows 额外要求 | 安装 Visual Studio Build Tools（含 C++ 组件） |

## 快速开始
```bash
# 安装依赖
npm install

# 开发模式（默认关闭热重载，手动重启即可）
npm run tauri:dev
```

> 开发模式下历史记录仍会写入 `data/draw_history.json`，建议使用示例或测试数据，真实数据请备份后再操作。

## 打包说明
### macOS
```bash
npm run tauri:build
```
构建完成后，发行包位于 `src-tauri/target/release/bundle/macos/DrawLots.app`，可直接分发或压缩后共享。

### Windows
1. 在 Windows 环境执行 `npm install` 与 `npm run tauri:build`。
2. 完成后产物位于 `src-tauri/target/release/bundle/msi/`，包含免安装的 `DrawLots.exe` 与标准安装包 `DrawLots.msi`。

## 数据目录策略
- 应用运行时会优先使用可执行文件同级的 `data/` 目录；若权限受限会自动退回用户数据目录，并在界面提示实际路径。
- `data/draw_history.json` 保存所有抽签历史，`data/.gitkeep` 为仓库占位文件。
- 在 `.gitignore` 中已排除 `data/*.json` 与 `data/*.xlsx`，避免真实抽签数据被提交。

## 常用命令
| 命令 | 说明 |
| --- | --- |
| `npm run tauri:dev` | 启动桌面应用（开发模式，禁用热重载） |
| `npm run build:web` | 复制静态资源到 `dist/`，供 Tauri 构建使用 |
| `npm run tauri:build` | 打包桌面发行版（默认生成 macOS `.app`） |
| `npx tauri icon <路径>` | 若需替换图标，可用 Tauri 提供的工具重新生成 |

## 目录结构
```
DrawLots/
├─ data/              # 历史记录文件（仅保留 .gitkeep）
├─ docs/              # 使用指南等文档
├─ icons/             # 应用图标及生成脚本产物
├─ scripts/           # 业务逻辑 JS 模块
├─ styles/            # 样式文件
├─ src-tauri/         # Tauri 配置与 Rust 后端
├─ tools/             # 构建辅助脚本（prepare-static、run-tauri-dev）
├─ index.html         # 单页应用入口
└─ README.md          # 项目说明（当前文件）
```

## 提交与安全提示
- 发布前请确认 `data/` 下无真实抽签结果；如需保留请私下备份后删除。
- 若生成新的包或图标记得更新 `.gitignore` 与相关文档。
- 上传 GitHub 之前可执行 `git status` 确认仅包含必要文件。

## 许可说明
本项目为公司内部使用，若需要开放或二次分发，请在提交前与负责人确认授权范围。
