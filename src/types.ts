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

export type PromptStatItem = {
  id: string;
  charCount: number;
  action: "copied";
  createdAt: string;
};

export type StashItem = {
  id: string;
  body: string;
  createdAt: string;
};

export type ShortcutItem = {
  id: string;
  action: string;
  keys: string;
  scope: "全局" | "编辑窗口" | "工作台" | "编辑窗口/工作台";
  locked?: boolean;
};

export type OutputMode = "clipboardPaste" | "directInput" | "copyOnly";
export type EditorBackgroundFit = "center" | "cover";

export type SettingsState = {
  outputMode: OutputMode;
  afterSubmit: "hide" | "keep";
  restoreClipboard: boolean;
  launchAtStartup: boolean;
  theme: "system" | "light" | "dark";
  visualTheme: string;
  autoSaveMs: number;
  historyDays: number;
  historyLimit: number;
  editOpacity: number;
  editWindowWidth: number;
  editWindowHeight: number;
  editorLineNumbers: boolean;
  editorCurrentLineHighlight: boolean;
  windowPlacement: "center" | "cursor" | "last";
  editorBackgroundImageId: string;
  editorBackgroundImage: string;
  editorBackgroundImagePath: string;
  editorBackgroundFit: EditorBackgroundFit;
  editorBackgroundScale: number;
  editorBackgroundX: number;
  editorBackgroundY: number;
};
