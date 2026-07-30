# Prompt Dock Codex 备忘录

这份文档给后续 Codex 对话使用，记录项目现状、用户偏好、重要指令和已经踩过的坑。

## 项目信息

- 项目名：Prompt Dock
- 当前版本：`1.0.0`
- 目标平台：Windows
- 技术栈：Tauri 2、React 18、TypeScript、Vite、Rust
- 入口窗口：
  - `edit`：编辑窗口，`index.html?window=edit`
  - `manage`：工作台，`index.html?window=manage`
- 主要源码：
  - 前端入口：[src/App.tsx](src/App.tsx)
  - 编辑窗口：[src/components/EditWindow.tsx](src/components/EditWindow.tsx)
  - 工作台：[src/components/ManageWindow.tsx](src/components/ManageWindow.tsx)
  - 主题目录：[src/data/themeCatalog.ts](src/data/themeCatalog.ts)
  - 全局样式：[src/styles/app.css](src/styles/app.css)
  - Tauri 后端：[src-tauri/src/main.rs](src-tauri/src/main.rs)

## 用户重要指令

- 后续每次完成功能或修复后，默认直接执行：

```powershell
npm.cmd run tauri -- build
```

- 验收目标是可测试桌面 exe，不能只停在前端构建或 dev server。
- 当前只做 Windows。
- UI/UX 参考 Apple 风格时，要注意克制、流畅、明确反馈；主题系统可以更大胆。
- 用户偏好全程键盘操作，快捷键必须和用户设置保持一致。
- 不做变量填充，第一版只做固定模板。
- 统计只统计 `Ctrl + Enter` 提交的 prompt；暂存不纳入统计。
- 写作时遵守仓库级中文表达约束，避免使用 AGENTS.md 禁用的转折句式。

## 当前产品行为

- 默认全局快捷键：`Ctrl + L` 唤起或隐藏编辑窗口。
- 编辑窗口默认尺寸：`760 x 520`，设置中可改，范围宽 `520-1600`、高 `360-1000`。
- 编辑窗口右上角：
  - 齿轮：打开工作台
  - 红色叉号：关闭编辑窗口并保留内容
- 编辑窗口 placeholder 从快捷键设置动态生成。
- 编辑窗口底部信息栏显示保存状态、字符数、估算 tokens 和提交提示。
- `Ctrl + Enter`：复制当前 prompt、写入历史、更新统计、清空编辑框、隐藏编辑窗口。
- `Ctrl + J`：将当前草稿放入暂存箱并清空编辑框。
- `Ctrl + P`：打开指令窗口，根层包含“暂存箱”和模板列表。
- 工作台 tab 顺序：统计、模板、历史、暂存、外观、设置、关于。
- 工作台关闭时隐藏，重复打开 exe 会唤起工作台。

## 主题系统

- 当前保留 3 个主题系列：简约、水墨、极客。
- 每个系列有 5 个子主题：3 个日间、2 个夜间。
- `themeCatalog.ts` 提供：
  - `visualThemeSeries`
  - `defaultVisualThemeId`
  - `visualThemes`
  - `getVisualTheme`
  - `getVisualThemeSeriesId`
- `App.tsx` 会把主题写入：
  - `data-theme`
  - `data-visual-theme`
  - `data-visual-series`
  - CSS 变量，如 `--bg`、`--surface-solid`、`--accent`
- 系列级样式覆盖在 `app.css` 后段，按 `data-visual-series` 区分组件材质和背景。

## 已遇到的坑

- 编辑窗口偶发变成很小一块：
  - 原因判断：隐藏/显示无边框透明窗口时，Windows/Tauri 可能保留异常尺寸；旧逻辑显示时只执行 `show/center/focus`。
  - 处理：后端新增 `EditWindowSizeState`，`set_edit_window_size` 同步记录尺寸；每次显示编辑窗口前调用 `restore_edit_window_size`，并重设最小尺寸。
- 管理窗口关闭后再次打开无反应：
  - 工作台关闭事件必须 `prevent_close()` 并执行 `hide()`，打开时需要 `show + focus`。
- 全局快捷键修改：
  - 前端设置变更后调用 `set_global_toggle_shortcut`。
  - Rust 端需要把 `Win` 归一到 `Super`。
- 编辑器底部小绿点被裁剪：
  - `edit-status` 有 `overflow: hidden`，小绿点外圈贴边会被裁剪。
  - 处理：给状态区增加 `padding-left: 5px`。
- 关闭按钮主题覆盖：
  - 用户要求背景和边框保持普通按钮风格，只有叉号红色。
  - 后段 `data-visual-series` 覆盖也要同步改，防止主题样式覆盖基础样式。
- 主题系统第一版只换颜色，用户指出需要系列级视觉语言。
  - 处理：用 `data-visual-series` 对背景、面板、按钮、边框、阴影、毛玻璃等做系列级覆盖。
- `活泼` 主题系列已删除：
  - 目录和 CSS 覆盖中不能残留 `playful/活泼`。
  - 如果旧 localStorage 里还指向活泼子主题，`getVisualTheme` 会回落到默认简约主题。
- Windows 正在运行旧 exe 时，默认构建可能无法覆盖 `src-tauri/target/release/prompt-dock.exe`：
  - 现象：`failed to remove file ... prompt-dock.exe`，Windows 返回拒绝访问。
  - 处理：不要强行结束用户进程；可以用备用 target 目录构建，例如 `$env:CARGO_TARGET_DIR='E:\code\github\prompt-dock\src-tauri\target-codex'; npm.cmd run tauri -- build --bundles nsis`。

## 构建与产物

常用命令：

```powershell
npm.cmd run build
npm.cmd run tauri -- build
```

版本 `1.0.0` 常见产物：

- `src-tauri/target/release/prompt-dock.exe`
- `src-tauri/target/release/bundle/nsis/Prompt Dock_1.0.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/Prompt Dock_1.0.0_x64_en-US.msi`
- 备用构建目录：`src-tauri/target-codex/release/prompt-dock.exe`
- 备用 NSIS 安装包：`src-tauri/target-codex/release/bundle/nsis/Prompt Dock_1.0.0_x64-setup.exe`

## 后续开发建议

- 做 UI 改动时，优先检查 `src/styles/app.css` 中基础样式和后段 `data-visual-series` 覆盖是否冲突。
- 做快捷键改动时，同步检查默认值、设置页、编辑窗口 placeholder、Rust 全局快捷键注册。
- 做窗口行为改动时，同时检查 Tauri `show/hide/focus/center/min_size/size` 顺序。
- 做功能修复后执行完整 Tauri 构建，并在回复中给出 exe 和安装包路径。
