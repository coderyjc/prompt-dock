# Prompt Dock

Prompt Dock 是一个面向 Windows 的轻量级 prompt 编辑器桌面应用。它常驻后台，在需要输入 prompt 时通过快捷键唤出一个纯净编辑窗口，用键盘完成编辑、模板套用、复制退出和草稿恢复。

当前版本聚焦自用场景：输入时少打断、切换时不丢稿、常用模板能快速插入，管理操作集中放在独立窗口中。

## 核心能力

- 全局快捷键唤起编辑窗口：`Ctrl + L`
- 纯净编辑窗口：大文本框、底部状态信息、右上角管理入口
- 鼠标拖动编辑窗口：使用编辑窗口顶部的拖动条移动位置
- 默认居中显示：每次唤起编辑窗口时自动移动到屏幕中央
- 固定模板：保存常用 prompt，并通过 `Ctrl + P` 快速选择插入
- 自动草稿：编辑中的内容自动保存，下次打开继续恢复
- 复制并退出：`Ctrl + Enter` 复制当前 prompt，保存到历史记录，清空编辑框并隐藏窗口
- 独立管理窗口：模板、历史、快捷键、输出、外观、数据集中管理
- 后台托盘运行：可从托盘打开编辑窗口、管理窗口或退出应用
- 单实例运行：重复打开 exe 时会唤起管理窗口

## 快捷键

| 快捷键 | 作用 | 位置 |
| --- | --- | --- |
| `Ctrl + L` | 唤起或隐藏编辑窗口 | 全局 |
| `Ctrl + Enter` | 复制当前 prompt、写入历史、清空编辑框并退出 | 编辑窗口 |
| `Ctrl + P` | 打开模板选择窗口 | 编辑窗口 |
| `Ctrl + Shift + S` | 将当前内容保存为固定模板 | 编辑窗口 |
| `Ctrl + H` | 打开管理窗口并查看历史相关内容 | 编辑窗口 |
| `Ctrl + ,` | 打开管理窗口 | 编辑窗口 |
| `Esc` | 先关闭命令弹层，再隐藏编辑窗口并保留草稿 | 编辑窗口 |

## 窗口设计

### 编辑窗口

编辑窗口保持低干扰：主体是文本编辑区，底部显示保存状态、字符数、估算 token、历史数量和快捷键提示。右上角齿轮按钮会打开独立管理窗口。

编辑窗口没有标题栏，可以通过顶部的细拖动条移动。窗口通过 `Ctrl + L` 唤起时会居中显示，并保持在前台，方便跨应用快速写 prompt。

### 管理窗口

管理窗口标题为 Prompt Dock，采用两栏布局：

- 左栏：模板、历史、快捷键、输出、外观、数据
- 右栏：显示当前选中模块的具体内容

管理窗口用于低频配置和内容维护。关闭管理窗口时会隐藏到后台，再次通过齿轮按钮、托盘菜单或重复打开 exe 都可以重新显示。

## 数据与历史

- 草稿：输入过程中自动覆盖保存同一条草稿
- 历史：仅在执行 `Ctrl + Enter` 复制并退出时新增一条记录
- 模板：当前版本使用固定模板，变量填充留到后续版本
- 存储：当前前端状态使用浏览器本地存储，后续可迁移到 SQLite

## 技术栈

- 桌面框架：Tauri 2
- 前端：React 18 + TypeScript + Vite
- 原生能力：Rust command、Tauri tray、global shortcut、single instance
- UI 图标：lucide-react
- 构建目标：Windows 桌面 exe / 安装包

## 开发环境

建议环境：

- Windows
- Node.js 18+
- Rust stable
- WebView2 Runtime

安装依赖：

```powershell
npm.cmd install
```

启动前端开发服务器：

```powershell
npm.cmd run dev
```

启动 Tauri 开发模式：

```powershell
npm.cmd run tauri -- dev
```

## 构建桌面端

生成可测试的 Windows 桌面程序：

```powershell
npm.cmd run tauri -- build
```

常见产物位置：

- `src-tauri/target/release/prompt-dock.exe`
- `src-tauri/target/release/bundle/nsis/Prompt Dock_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/Prompt Dock_0.1.0_x64_en-US.msi`

## 开发验收规则

后续每次完成功能或修复后，默认执行：

```powershell
npm.cmd run tauri -- build
```

验收目标是产出可测试的桌面 exe。文档类改动可以只做文本检查；功能或修复类改动需要完成桌面端构建，并在结果中说明构建是否通过以及产物位置。

## 项目结构

```text
.
├─ docs/
│  └─ demandlist.md
├─ src/
│  ├─ components/
│  ├─ data/
│  ├─ lib/
│  ├─ styles/
│  ├─ App.tsx
│  └─ main.tsx
├─ src-tauri/
│  ├─ capabilities/
│  ├─ icons/
│  ├─ src/
│  │  └─ main.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ package.json
└─ README.md
```

## 当前限制

- 目前只做 Windows
- `Ctrl + Enter` 当前以复制到剪贴板为主
- 固定模板已支持，变量填充暂未实现
- 本地持久化当前使用前端 localStorage，SQLite 数据层留作后续增强

## 需求文档

详细技术选型、功能设计和 UI/UX 设计见：

- [docs/demandlist.md](docs/demandlist.md)
