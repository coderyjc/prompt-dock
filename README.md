# Prompt Dock

![Prompt Dock banner](./assets/banner.png)

Prompt Dock 是一个 Windows 优先的桌面 prompt 编辑器。它常驻后台，通过全局快捷键唤出一个轻量编辑框，让你在任意写作、聊天、编程或 AI 工具使用场景里快速整理 prompt、调用模板、暂存草稿、复制提交和查看历史。

当前版本：`1.1.0`

## 功能概览

- 全局唤起：默认 `Ctrl + L` 显示或隐藏编辑窗口。
- 快速提交：默认 `Ctrl + Enter` 复制当前 prompt、写入历史、更新统计、清空编辑框并退出。
- 暂存机制：默认 `Ctrl + J` 暂存并清除当前内容，默认 `Ctrl + S` 暂存/保存当前内容并保留编辑区。
- 模板指令框：默认 `Ctrl + P` 打开模板选择，支持键盘上下移动和回车插入。
- 工作台：集中管理统计、模板、历史、暂存、外观、设置和关于信息。
- 历史检索：历史默认分页加载，每次 20 条，支持关键词包含检索和日期筛选。
- 编辑器增强：支持行号、当前行高亮、编辑器背景图、编辑框宽高、透明度、窗口位置和置顶设置。
- 快捷键设置：工作台里可修改快捷键，并对软件内已有快捷键做冲突检测。
- 主题系统：内置简约、活泼、冰晶三套主题系列，每套包含 5 个子主题。
- 托盘常驻：系统托盘可打开编辑窗口、工作台或退出应用。
- 单实例运行：重复打开 exe 会唤起已有工作台窗口。

## 快捷键

快捷键可在 `工作台 -> 设置` 中修改。编辑窗口中的提示文案会读取当前快捷键设置。

| 默认快捷键 | 作用 | 范围 |
| --- | --- | --- |
| `Ctrl + L` | 唤起或隐藏编辑窗口 | 全局 |
| `Ctrl + Enter` | 复制当前 prompt、写入历史、清空编辑框并退出 | 编辑窗口 |
| `Ctrl + P` | 打开模板选择指令框 | 编辑窗口 |
| `Ctrl + S` | 暂存/保存当前内容，不清空编辑区 | 编辑窗口 |
| `Ctrl + J` | 暂存当前内容并清空编辑区 | 编辑窗口 |
| `Ctrl + Shift + S` | 保存当前内容为固定模板 | 编辑窗口 |
| `Ctrl + H` | 打开工作台并查看历史 | 编辑窗口 |
| `Ctrl + ,` | 打开工作台 | 编辑窗口 |
| `Esc` | 先关闭弹层，再隐藏编辑窗口并保留内容 | 编辑窗口 |

## 窗口与工作流

### 编辑窗口

编辑窗口用于高频写作。主体是一个无边框透明窗口，顶部细条可拖动，右上角提供工作台入口和关闭按钮，底部状态栏显示保存状态、字数、估算 token 和提交提示。

编辑窗口会自动保存草稿。关闭窗口不会丢失内容；再次唤起时会恢复上一次输入。工作台外观设置中可以调整编辑框宽度、高度、透明度、窗口位置、是否置顶、是否显示行号、是否高亮当前行，以及编辑器背景图片。

### 模板指令框

在编辑窗口按 `Ctrl + P` 打开指令框。根层包含“暂存箱”入口和固定模板列表，支持搜索、键盘上下选择、回车插入。模板可在工作台里新增、编辑、复制、删除和置顶。

### 暂存

暂存适合保存尚未完成的 prompt：

- `Ctrl + S`：保存当前内容到暂存箱，编辑区保持原样，并在顶部显示 1 秒提示。
- `Ctrl + J`：保存当前内容到暂存箱，然后清空编辑区。
- 工作台 `暂存` 页支持查看、展开/收起、继续书写和删除。
- 从暂存继续书写时，如果编辑区已有内容，会先把当前内容放入暂存箱。

### 历史

历史只记录通过 `Ctrl + Enter` 提交的 prompt。工作台 `历史` 页默认显示 20 条，底部按钮可继续加载更多。历史支持关键词包含检索和日期筛选，可查看详情、复制、保存为模板或删除。

### 统计

统计页展示 prompt 提交行为，包括热力图、模板使用频率、总提示词数、总字数、平均字数和最长 prompt 等信息。暂存内容不会进入统计。

## 主题

Prompt Dock 有三套视觉主题系列：

- 简约：克制留白、纸面质感和清晰线条。
- 活泼：粗描边、彩色胶片、鲜亮背景和更强的卡片感。
- 冰晶：冰面折射、极光微光、通透晶格和半透明组件。

每个系列包含 5 个子主题，覆盖日间和夜间配色。主题会影响工作台、编辑窗口、指令框、模板列表、按钮、选中态、背景纹理和文本选区。

## 技术栈

- 桌面框架：Tauri 2
- 前端：React 18 + TypeScript + Vite
- 原生能力：Rust command、系统托盘、全局快捷键、单实例运行、窗口位置控制
- 图标：lucide-react + Tauri icon assets
- 数据存储：localStorage + IndexedDB 背景图存储
- 目标平台：Windows

## 开发

安装依赖：

```powershell
npm.cmd install
```

启动前端开发服务：

```powershell
npm.cmd run dev
```

启动 Tauri 开发模式：

```powershell
npm.cmd run tauri -- dev
```

前端生产构建：

```powershell
npm.cmd run build
```

打包桌面端：

```powershell
npm.cmd run tauri -- build
```

常见产物位置：

- `src-tauri/target/release/prompt-dock.exe`
- `src-tauri/target/release/bundle/nsis/Prompt Dock_1.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/Prompt Dock_1.1.0_x64_en-US.msi`

如果本地正在运行 release exe，Windows 可能会锁定 `prompt-dock.exe`。关闭正在运行的应用后重新构建，或临时指定备用 target 目录：

```powershell
$env:CARGO_TARGET_DIR='E:\code\github\prompt-dock\src-tauri\target-codex'
npm.cmd run tauri -- build --bundles nsis
```

## 项目结构

```text
.
├─ assets/
│  └─ banner.png
├─ scripts/
│  └─ dev-server.ps1
├─ src/
│  ├─ components/
│  │  ├─ EditWindow.tsx
│  │  ├─ ManageWindow.tsx
│  │  └─ TemplatePalette.tsx
│  ├─ data/
│  │  ├─ defaults.ts
│  │  └─ themeCatalog.ts
│  ├─ lib/
│  │  ├─ desktop.ts
│  │  ├─ editorBackgroundStore.ts
│  │  ├─ persistence.ts
│  │  └─ shortcuts.ts
│  ├─ styles/
│  │  └─ app.css
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ types.ts
├─ src-tauri/
│  ├─ capabilities/
│  ├─ icons/
│  ├─ src/
│  │  └─ main.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ codex.md
├─ package.json
└─ README.md
```

## 发布

当前版本号需要同时维护：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

发布前建议执行：

```powershell
npm.cmd run tauri -- build
```

创建 tag 示例：

```powershell
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```
