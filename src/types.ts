export type WindowMode = "edit" | "manage";

export type TemplateItem = {
  id: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  updatedAt: string;
  lastUsedAt?: string;
};

export type HistoryItem = {
  id: string;
  body: string;
  action: "copied";
  createdAt: string;
  targetApp?: string;
};

export type ShortcutItem = {
  id: string;
  action: string;
  keys: string;
  scope: "全局" | "编辑窗口" | "工作台";
  locked?: boolean;
};

export type OutputMode = "clipboardPaste" | "directInput" | "copyOnly";

export type SettingsState = {
  outputMode: OutputMode;
  afterSubmit: "hide" | "keep";
  restoreClipboard: boolean;
  launchAtStartup: boolean;
  theme: "system" | "light" | "dark";
  autoSaveMs: number;
  historyDays: number;
  windowPlacement: "center" | "cursor" | "last";
};
