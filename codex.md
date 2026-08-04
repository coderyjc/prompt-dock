# Prompt Dock Codex 维护备忘

这份文档给后续 Codex 或维护者快速接手项目使用，记录当前产品状态、实现入口、开发约定和容易踩到的问题。

## 项目快照

- 项目名：Prompt Dock
- 当前版本：`1.1.0`
- 目标平台：Windows
- 技术栈：Tauri 2、React 18、TypeScript、Vite、Rust
- 数据存储：localStorage 保存模板、历史、设置、暂存；IndexedDB 保存编辑器背景图片 blob
- 主要窗口：
  - `edit`：编辑窗口，入口 `index.html?window=edit`
  - `manage`：工作台窗口，入口 `index.html?window=manage`

## 关键文件

- `src/App.tsx`：应用状态、窗口分流、主题变量注入、提交/暂存/模板主流程。
- `src/components/EditWindow.tsx`：编辑窗口、快捷键响应、行号、当前行高亮、顶部保存气泡、模板指令框入口。
- `src/components/TemplatePalette.tsx`：`Ctrl + P` 指令框，包含模板和暂存箱选择。
- `src/components/ManageWindow.tsx`：工作台，包含统计、模板、历史、暂存、外观、设置、关于。
- `src/data/defaults.ts`：默认模板、快捷键和设置。
- `src/data/themeCatalog.ts`：主题系列、子主题和 CSS 变量。
- `src/styles/app.css`：全局样式、编辑器布局、工作台布局、主题系列覆盖。
- `src/lib/shortcuts.ts`：快捷键格式化、匹配和冲突检测依赖逻辑。
- `src/lib/persistence.ts`：localStorage 持久化 key。
- `src/lib/editorBackgroundStore.ts`：编辑器背景图片 IndexedDB 存储。
- `src-tauri/src/main.rs`：Tauri 命令、托盘、全局快捷键、窗口显示/隐藏/位置/尺寸控制。
- `src-tauri/tauri.conf.json`：Tauri 窗口、版本、bundle 配置。

## 当前产品行为

- 默认全局快捷键 `Ctrl + L` 唤起或隐藏编辑窗口。
- 编辑窗口默认尺寸为 `760 x 520`，设置范围：宽 `520-1600`，高 `360-1000`。
- 编辑窗口默认置顶、显示行号、开启当前行高亮。
- 编辑窗口右上角：
  - 齿轮按钮打开工作台。
  - 红色关闭按钮隐藏编辑窗口并保留内容。
- 编辑窗口底部状态栏显示保存状态、字符数、估算 token 和提交提示。
- `Ctrl + Enter`：复制当前 prompt，写入历史和统计，清空编辑框，隐藏编辑窗口。
- `Ctrl + S`：暂存/保存当前内容，编辑区保持原样，顶部气泡提示 1 秒。
- `Ctrl + J`：暂存当前内容并清空编辑区。
- `Ctrl + P`：打开指令框，根层包含“暂存箱”和模板列表，支持键盘上下选择。
- `Ctrl + Shift + S`：保存当前内容为固定模板。
- `Ctrl + H`：打开工作台历史。
- `Ctrl + ,`：打开工作台。
- `Esc`：先关闭弹层，再隐藏编辑窗口并保留内容。
- 工作台关闭时隐藏窗口，重复打开 exe 会唤起工作台。

## 工作台模块

- 统计：热力图和模板频率在顶部，统计只纳入 `Ctrl + Enter` 提交的 prompt。
- 模板：支持新建、编辑、复制、删除、置顶，列表选中态要兼容所有主题。
- 历史：默认加载 20 条，底部“加载更多”每次继续加载 20 条；支持关键词和日期筛选。
- 暂存：支持展开/收起、继续书写、删除；删除确认弹窗关闭时有退出动画。
- 外观：顺序为主题、编辑器背景、宽高透明度、行号/当前行高亮/置顶、窗口位置。
- 设置：快捷键设置有冲突检测；数据设置中历史保留数在最上方。
- 关于：项目说明和外部链接。

## 主题系统

当前保留 3 个主题系列：

- `minimal`：简约
- `ink`：活泼
- `geek`：冰晶

主题目录在 `src/data/themeCatalog.ts`：

- `visualThemeSeries`
- `defaultVisualThemeId`
- `visualThemes`
- `getVisualTheme`
- `getVisualThemeSeriesId`

`App.tsx` 会将主题写入 DOM：

- `data-theme`
- `data-visual-theme`
- `data-visual-series`
- CSS 变量，如 `--bg`、`--surface-solid`、`--accent`

系列级样式覆盖集中在 `src/styles/app.css` 后段。做 UI 修改时要同时检查基础样式和 `data-visual-series` 覆盖，尤其是：

- `.template-option.is-selected`
- `.manage-list-item.is-active`
- `.editor-current-line-marker`
- `.edit-close-button`
- `.confirm-dialog`
- `.history-modal`

强主题容易覆盖默认交互态，修改“活泼”和“冰晶”时要单独确认键盘选中态、列表选中态、hover、active 和 focus-visible。

## 开发与验证

常用命令：

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run tauri -- dev
npm.cmd run tauri -- build
```

功能或修复类改动完成后，默认执行完整桌面端构建：

```powershell
npm.cmd run tauri -- build
```

文档类改动可以只做文本检查；涉及 React、CSS、Rust、Tauri 配置或版本号时建议至少执行：

```powershell
npm.cmd run build
```

发布产物：

- `src-tauri/target/release/prompt-dock.exe`
- `src-tauri/target/release/bundle/nsis/Prompt Dock_1.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/Prompt Dock_1.1.0_x64_en-US.msi`

如果 release exe 正在运行，Windows 可能会锁定文件并导致构建失败。可关闭应用后重试，或使用备用 target 目录：

```powershell
$env:CARGO_TARGET_DIR='E:\code\github\prompt-dock\src-tauri\target-codex'
npm.cmd run tauri -- build --bundles nsis
```

## 版本发布

版本号需要同步维护：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

`v1.1.0` tag 示例：

```powershell
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```

## 已知坑与处理方式

- 中文文档编码：README 和 codex 文档应保持 UTF-8；如果 PowerShell 输出乱码，可用编辑器或 `Get-Content -Encoding UTF8` 检查。
- 编辑窗口偶发尺寸异常：后端有 `EditWindowSizeState` 和 `restore_edit_window_size`，显示窗口前要恢复尺寸并设置最小尺寸。
- 窗口位置设置失效：`restore_edit_window_placement` 支持 `center`、`cursor`、`last`，显示前要按设置恢复位置，隐藏时记录最后位置。
- 工作台关闭后再次打开无反应：关闭事件应 `prevent_close()` 并 `hide()`，打开时执行 `show + focus`。
- 全局快捷键修改：前端设置变化后调用 `set_global_toggle_shortcut`；Rust 端要把 `Win` 归一到 `Super`。
- 行号与当前行高亮：当前行高亮不能依赖行号开关；关闭行号时也要保持 marker 正常渲染。
- 中文跨行显示：编辑器视觉层和 textarea 滚动/行高同步要谨慎，避免中文自动换行时高亮行漂移。
- 主题覆盖：强主题的普通卡片样式可能盖住 `.is-selected`，新增交互态时放在主题块后面或提高选择器优先级。
- 确认弹窗关闭动画：不要直接卸载 `confirmRequest`；先进入 `closing` phase，再由计时器卸载。

## 用户偏好

- 用户希望改完功能后通常直接重新编译 exe。
- 用户关注窗口细节、选中态、动画、主题一致性和键盘操作体验。
- 工作台界面应节省空间，避免设置项和数据卡片过度占地方。
- 编辑窗口是核心入口，任何遮挡、重叠、行号间距、当前行高亮问题都要优先处理。
- 遵守仓库级中文表达约束，避免使用 AGENTS.md 禁用句式。
