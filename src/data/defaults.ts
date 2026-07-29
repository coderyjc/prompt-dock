import type { HistoryItem, SettingsState, ShortcutItem, TemplateItem } from "../types";

export const nowIso = () => new Date().toISOString();

export const defaultTemplates: TemplateItem[] = [
  {
    id: "tpl-code-review",
    title: "代码审查",
    description: "检查变更风险、边界条件、测试缺口，并给出可操作建议。",
    body: [
      "请以代码审查的方式检查下面的改动。",
      "",
      "重点关注：",
      "- 可能的 bug 或回归风险",
      "- 边界条件和错误处理",
      "- 是否缺少必要测试",
      "- 是否符合现有代码风格",
      "",
      "请按严重程度排序输出问题，并引用具体文件或代码位置。"
    ].join("\n"),
    tags: ["开发", "审查"],
    isFavorite: true,
    usageCount: 8,
    updatedAt: nowIso(),
    lastUsedAt: nowIso()
  },
  {
    id: "tpl-rewrite",
    title: "表达改写",
    description: "把松散想法改成更清晰、有对象感的表达。",
    body: [
      "请帮我改写下面这段话。",
      "",
      "目标：",
      "- 语言更具体",
      "- 逻辑更顺",
      "- 保留我的原意",
      "- 避免空泛口号",
      "",
      "原文："
    ].join("\n"),
    tags: ["写作", "表达"],
    isFavorite: false,
    usageCount: 5,
    updatedAt: nowIso()
  },
  {
    id: "tpl-task-breakdown",
    title: "任务拆解",
    description: "把模糊目标拆成可执行计划、风险和验收标准。",
    body: [
      "请帮我把下面的目标拆成可执行计划。",
      "",
      "输出包含：",
      "- 关键假设",
      "- 分阶段步骤",
      "- 每一步的产物",
      "- 风险与应对",
      "- 验收标准",
      "",
      "目标："
    ].join("\n"),
    tags: ["规划", "执行"],
    isFavorite: true,
    usageCount: 12,
    updatedAt: nowIso()
  }
];

export const defaultHistory: HistoryItem[] = [];

export const defaultShortcuts: ShortcutItem[] = [
  { id: "toggle", action: "唤起/隐藏", keys: "Ctrl + L", scope: "全局", locked: true },
  { id: "submit", action: "复制并退出", keys: "Ctrl + Enter", scope: "编辑窗口" },
  { id: "template", action: "打开模板选择", keys: "Ctrl + P", scope: "编辑窗口" },
  { id: "save-template", action: "保存为模板", keys: "Ctrl + Shift + S", scope: "编辑窗口" },
  { id: "history", action: "打开历史草稿", keys: "Ctrl + H", scope: "编辑窗口" },
  { id: "manage", action: "打开管理窗口", keys: "Ctrl + ,", scope: "编辑窗口" },
  { id: "escape", action: "关闭弹层/隐藏", keys: "Esc", scope: "编辑窗口" }
];

export const defaultSettings: SettingsState = {
  outputMode: "clipboardPaste",
  afterSubmit: "hide",
  restoreClipboard: true,
  launchAtStartup: false,
  theme: "system",
  autoSaveMs: 500,
  historyDays: 30,
  windowPlacement: "center"
};
