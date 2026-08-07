import { useEffect, useMemo, useState } from "react";
import { defaultHistory, defaultSettings, defaultShortcuts, defaultTemplates, nowIso } from "./data/defaults";
import { getVisualTheme, getVisualThemeSeriesId } from "./data/themeCatalog";
import { copyText, hideEditWindow, openEditWindow, openManageWindow, setEditWindowLayout, setGlobalToggleShortcut } from "./lib/desktop";
import { storageKeys, usePersistentState, writeValue } from "./lib/persistence";
import { EditWindow } from "./components/EditWindow";
import { ManageWindow } from "./components/ManageWindow";
import type { HistoryItem, PromptStatItem, SettingsState, ShortcutItem, StashItem, TemplateItem, WindowMode } from "./types";

const readInitialMode = (): WindowMode => {
  const mode = new URLSearchParams(window.location.search).get("window");
  return mode === "manage" ? "manage" : "edit";
};

const makeHistory = (body: string, action: HistoryItem["action"]): HistoryItem => ({
  id: `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  body,
  action,
  createdAt: nowIso()
});

const makePromptStat = (historyItem: HistoryItem): PromptStatItem => ({
  id: historyItem.id,
  charCount: historyItem.body.length,
  action: historyItem.action,
  createdAt: historyItem.createdAt
});

const makeStashItem = (body: string): StashItem => ({
  id: `stash-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  body,
  createdAt: nowIso()
});

const mergeShortcutsWithDefaults = (items: ShortcutItem[]) => {
  const defaultIds = new Set(defaultShortcuts.map((shortcut) => shortcut.id));
  const currentById = new Map(items.map((shortcut) => [shortcut.id, shortcut]));
  const merged = defaultShortcuts.map((shortcut) => {
    const current = currentById.get(shortcut.id);
    return current ? { ...shortcut, keys: current.keys } : shortcut;
  });
  const extras = items.filter((shortcut) => !defaultIds.has(shortcut.id));
  return [...merged, ...extras];
};

const shortcutsEqual = (left: ShortcutItem[], right: ShortcutItem[]) => JSON.stringify(left) === JSON.stringify(right);

const clampNumber = (value: number, min: number, max: number, fallback: number) => {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numeric));
};

const cssVariableName = (key: string) => `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

const mergeSettingsWithDefaults = (items: SettingsState) => {
  const partial = items as Partial<SettingsState>;
  const editorBackgroundFit = partial.editorBackgroundFit === "center" || partial.editorBackgroundFit === "cover" ? partial.editorBackgroundFit : defaultSettings.editorBackgroundFit;
  return {
    ...defaultSettings,
    ...items,
    visualTheme: getVisualTheme(partial.visualTheme).id,
    historyLimit: clampNumber(Math.round(partial.historyLimit ?? defaultSettings.historyLimit), 30, 3000, defaultSettings.historyLimit),
    editOpacity: clampNumber(Math.round(partial.editOpacity ?? defaultSettings.editOpacity), 35, 100, defaultSettings.editOpacity),
    editWindowWidth: clampNumber(Math.round(partial.editWindowWidth ?? defaultSettings.editWindowWidth), 520, 1600, defaultSettings.editWindowWidth),
    editWindowHeight: clampNumber(Math.round(partial.editWindowHeight ?? defaultSettings.editWindowHeight), 360, 1000, defaultSettings.editWindowHeight),
    editorFontSize: clampNumber(Math.round(partial.editorFontSize ?? defaultSettings.editorFontSize), 12, 28, defaultSettings.editorFontSize),
    editorFontFamily: typeof partial.editorFontFamily === "string" && partial.editorFontFamily.trim() ? partial.editorFontFamily.trim() : defaultSettings.editorFontFamily,
    editorLineNumbers: typeof partial.editorLineNumbers === "boolean" ? partial.editorLineNumbers : defaultSettings.editorLineNumbers,
    editorCurrentLineHighlight: typeof partial.editorCurrentLineHighlight === "boolean" ? partial.editorCurrentLineHighlight : defaultSettings.editorCurrentLineHighlight,
    editAlwaysOnTop: typeof partial.editAlwaysOnTop === "boolean" ? partial.editAlwaysOnTop : defaultSettings.editAlwaysOnTop,
    editorBackgroundImageId: typeof partial.editorBackgroundImageId === "string" ? partial.editorBackgroundImageId : defaultSettings.editorBackgroundImageId,
    editorBackgroundImage: "",
    editorBackgroundImagePath: typeof partial.editorBackgroundImagePath === "string" ? partial.editorBackgroundImagePath : defaultSettings.editorBackgroundImagePath,
    editorBackgroundFit,
    editorBackgroundScale: clampNumber(Math.round(partial.editorBackgroundScale ?? defaultSettings.editorBackgroundScale), 30, 220, defaultSettings.editorBackgroundScale),
    editorBackgroundX: clampNumber(Math.round(partial.editorBackgroundX ?? defaultSettings.editorBackgroundX), 0, 100, defaultSettings.editorBackgroundX),
    editorBackgroundY: clampNumber(Math.round(partial.editorBackgroundY ?? defaultSettings.editorBackgroundY), 0, 100, defaultSettings.editorBackgroundY)
  };
};

const settingsEqual = (left: SettingsState, right: SettingsState) => JSON.stringify(left) === JSON.stringify(right);

export function App() {
  const [mode] = useState<WindowMode>(() => readInitialMode());
  const [draft, setDraft] = usePersistentState(storageKeys.draft, "");
  const [templates, setTemplates] = usePersistentState(storageKeys.templates, defaultTemplates);
  const [history, setHistory] = usePersistentState(storageKeys.history, defaultHistory);
  const [promptStats, setPromptStats] = usePersistentState<PromptStatItem[]>(storageKeys.promptStats, []);
  const [stashItems, setStashItems] = usePersistentState<StashItem[]>(storageKeys.stash, []);
  const [shortcuts, setShortcuts] = usePersistentState<ShortcutItem[]>(storageKeys.shortcuts, defaultShortcuts);
  const [settings, setSettings] = usePersistentState<SettingsState>(storageKeys.settings, defaultSettings);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const normalizedSettings = useMemo(() => mergeSettingsWithDefaults(settings), [settings]);
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, normalizedSettings.historyLimit),
    [history, normalizedSettings.historyLimit]
  );

  useEffect(() => {
    setSaveState("saving");
    const timeout = window.setTimeout(() => setSaveState("saved"), normalizedSettings.autoSaveMs);
    return () => window.clearTimeout(timeout);
  }, [draft, normalizedSettings.autoSaveMs]);

  useEffect(() => {
    if (!settingsEqual(settings, normalizedSettings)) {
      setSettings(normalizedSettings);
    }
  }, [normalizedSettings, setSettings, settings]);

  useEffect(() => {
    const visualTheme = getVisualTheme(normalizedSettings.visualTheme);
    const root = document.documentElement;
    root.dataset.theme = visualTheme.mode === "night" ? "dark" : "light";
    root.dataset.visualTheme = visualTheme.id;
    root.dataset.visualSeries = getVisualThemeSeriesId(visualTheme.id);
    Object.entries(visualTheme.vars).forEach(([key, value]) => {
      root.style.setProperty(cssVariableName(key), value);
    });
  }, [normalizedSettings.visualTheme]);

  useEffect(() => {
    document.documentElement.dataset.window = mode;
  }, [mode]);

  useEffect(() => {
    document.documentElement.style.setProperty("--editor-opacity-percent", `${normalizedSettings.editOpacity}%`);
    document.documentElement.style.setProperty("--editor-background-tint-percent", `${Math.max(32, Math.round(normalizedSettings.editOpacity * 0.58))}%`);
  }, [normalizedSettings.editOpacity]);

  useEffect(() => {
    void setEditWindowLayout(
      normalizedSettings.editWindowWidth,
      normalizedSettings.editWindowHeight,
      normalizedSettings.windowPlacement,
      normalizedSettings.editAlwaysOnTop
    );
  }, [
    normalizedSettings.editAlwaysOnTop,
    normalizedSettings.editWindowHeight,
    normalizedSettings.editWindowWidth,
    normalizedSettings.windowPlacement
  ]);

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventPrintShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
      }
    };

    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("keydown", preventPrintShortcut, true);
    return () => {
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("keydown", preventPrintShortcut, true);
    };
  }, []);

  useEffect(() => {
    const toggleShortcut = shortcuts.find((shortcut) => shortcut.id === "toggle");
    if (toggleShortcut) void setGlobalToggleShortcut(toggleShortcut.keys);
  }, [shortcuts]);

  useEffect(() => {
    setShortcuts((items) => {
      const merged = mergeShortcutsWithDefaults(items);
      return shortcutsEqual(items, merged) ? items : merged;
    });
  }, [setShortcuts]);

  useEffect(() => {
    if (history.length === 0) return;

    setPromptStats((items) => {
      const knownIds = new Set(items.map((item) => item.id));
      const missing = history.filter((item) => !knownIds.has(item.id)).map(makePromptStat);
      return missing.length > 0 ? [...items, ...missing] : items;
    });
  }, [history, setPromptStats]);

  useEffect(() => {
    setHistory((items) => (items.length > normalizedSettings.historyLimit ? items.slice(0, normalizedSettings.historyLimit) : items));
  }, [normalizedSettings.historyLimit, setHistory]);

  const updateTemplateUsage = (target: TemplateItem) => {
    setTemplates((items) =>
      items.map((item) =>
        item.id === target.id ? { ...item, usageCount: item.usageCount + 1, lastUsedAt: nowIso() } : item
      )
    );
  };

  const applyTemplate = (template: TemplateItem, cursorStart?: number, cursorEnd?: number) => {
    const start = cursorStart ?? draft.length;
    const end = cursorEnd ?? draft.length;
    const prefix = draft.slice(0, start);
    const suffix = draft.slice(end);
    const spacerBefore = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
    const spacerAfter = suffix && !template.body.endsWith("\n") ? "\n\n" : "";
    const nextDraft = `${prefix}${spacerBefore}${template.body}${spacerAfter}${suffix}`;
    setDraft(nextDraft);
    writeValue(storageKeys.draft, nextDraft);
    updateTemplateUsage(template);
  };

  const handleSubmit = async () => {
    if (!draft.trim()) {
      await exitEdit();
      return;
    }

    const committedDraft = draft;
    const ok = await copyText(committedDraft);
    if (!ok) return;

    const nextHistory = makeHistory(committedDraft, "copied");
    setHistory((items) => [nextHistory, ...items].slice(0, normalizedSettings.historyLimit));
    setPromptStats((items) => [...items, makePromptStat(nextHistory)]);
    setDraft("");
    writeValue(storageKeys.draft, "");
    setSaveState("saved");
    await hideEditWindow();
  };

  const handleSaveTemplate = () => {
    if (!draft.trim()) return;
    const next: TemplateItem = {
      id: `tpl-${Date.now()}`,
      title: `固定模板 ${templates.length + 1}`,
      description: "从当前编辑内容保存。",
      body: draft,
      tags: ["自定义"],
      isFavorite: false,
      usageCount: 0,
      updatedAt: nowIso()
    };
    setTemplates((items) => [next, ...items]);
  };

  const saveDraftToStash = ({ clearDraft }: { clearDraft: boolean }) => {
    if (!draft.trim()) return false;
    const savedAt = nowIso();
    const nextBody = draft;
    setStashItems((items) => {
      const existing = items.find((item) => item.body === nextBody);
      const nextStash = existing ? { ...existing, createdAt: savedAt } : { ...makeStashItem(nextBody), createdAt: savedAt };
      const rest = items.filter((item) => item.id !== nextStash.id && item.body !== nextBody);
      return [nextStash, ...rest];
    });

    if (clearDraft) {
      setDraft("");
      writeValue(storageKeys.draft, "");
    } else {
      writeValue(storageKeys.draft, nextBody);
    }

    setSaveState("saved");
    return true;
  };

  const stashCurrentDraft = () => saveDraftToStash({ clearDraft: true });

  const saveCurrentDraftToStash = () => saveDraftToStash({ clearDraft: false });

  const resumeStash = async (item: StashItem) => {
    const currentDraft = draft;
    setStashItems((items) => {
      const rest = items.filter((stashItem) => stashItem.id !== item.id);
      return currentDraft.trim() && currentDraft !== item.body ? [makeStashItem(currentDraft), ...rest] : rest;
    });
    setDraft(item.body);
    writeValue(storageKeys.draft, item.body);
    setSaveState("saved");
    await openEditWindow();
  };

  const deleteStash = (item: StashItem) => {
    setStashItems((items) => items.filter((stashItem) => stashItem.id !== item.id));
  };

  const openManage = async () => {
    await openManageWindow();
  };

  const openManageSection = async (section: string) => {
    writeValue(storageKeys.manageSection, section);
    await openManageWindow();
  };

  const restoreHistory = async (item: HistoryItem) => {
    setDraft(item.body);
    writeValue(storageKeys.draft, item.body);
    await openEditWindow();
  };

  const exitEdit = async () => {
    writeValue(storageKeys.draft, draft);
    setSaveState("saved");
    await hideEditWindow();
  };

  if (mode === "manage") {
    return (
      <ManageWindow
        draft={draft}
        templates={templates}
        history={sortedHistory}
        promptStats={promptStats}
        stashItems={stashItems}
        shortcuts={shortcuts}
        settings={normalizedSettings}
        onTemplatesChange={setTemplates}
        onHistoryChange={setHistory}
        onShortcutsChange={setShortcuts}
        onSettingsChange={setSettings}
        onResumeStash={resumeStash}
        onDeleteStash={deleteStash}
        onRestoreHistory={restoreHistory}
      />
    );
  }

  return (
    <EditWindow
      draft={draft}
      templates={templates}
      stashItems={stashItems}
      shortcuts={shortcuts}
      settings={normalizedSettings}
      saveState={saveState}
      onDraftChange={setDraft}
      onApplyTemplate={applyTemplate}
      onSubmit={handleSubmit}
      onOpenManage={openManage}
      onOpenHistory={() => openManageSection("history")}
      onStashDraft={stashCurrentDraft}
      onSaveStashDraft={saveCurrentDraftToStash}
      onResumeStash={resumeStash}
      onSaveTemplate={handleSaveTemplate}
      onExitEdit={exitEdit}
    />
  );
}
