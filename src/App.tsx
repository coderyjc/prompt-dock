import { useEffect, useMemo, useState } from "react";
import { defaultHistory, defaultSettings, defaultShortcuts, defaultTemplates, nowIso } from "./data/defaults";
import { copyText, hideEditWindow, openEditWindow, openManageWindow, setGlobalToggleShortcut } from "./lib/desktop";
import { storageKeys, usePersistentState, writeValue } from "./lib/persistence";
import { EditWindow } from "./components/EditWindow";
import { ManageWindow } from "./components/ManageWindow";
import type { HistoryItem, PromptStatItem, SettingsState, ShortcutItem, TemplateItem, WindowMode } from "./types";

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

export function App() {
  const [mode] = useState<WindowMode>(() => readInitialMode());
  const [draft, setDraft] = usePersistentState(storageKeys.draft, "");
  const [templates, setTemplates] = usePersistentState(storageKeys.templates, defaultTemplates);
  const [history, setHistory] = usePersistentState(storageKeys.history, defaultHistory);
  const [promptStats, setPromptStats] = usePersistentState<PromptStatItem[]>(storageKeys.promptStats, []);
  const [shortcuts, setShortcuts] = usePersistentState<ShortcutItem[]>(storageKeys.shortcuts, defaultShortcuts);
  const [settings, setSettings] = usePersistentState<SettingsState>(storageKeys.settings, defaultSettings);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const sortedHistory = useMemo(() => [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 120), [history]);

  useEffect(() => {
    setSaveState("saving");
    const timeout = window.setTimeout(() => setSaveState("saved"), settings.autoSaveMs);
    return () => window.clearTimeout(timeout);
  }, [draft, settings.autoSaveMs]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.window = mode;
  }, [mode]);

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
    setHistory((items) => [nextHistory, ...items].slice(0, 120));
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
        shortcuts={shortcuts}
        settings={settings}
        onTemplatesChange={setTemplates}
        onHistoryChange={setHistory}
        onShortcutsChange={setShortcuts}
        onSettingsChange={setSettings}
        onDraftChange={setDraft}
        onRestoreHistory={restoreHistory}
      />
    );
  }

  return (
    <EditWindow
      draft={draft}
      templates={templates}
      shortcuts={shortcuts}
      saveState={saveState}
      onDraftChange={setDraft}
      onApplyTemplate={applyTemplate}
      onSubmit={handleSubmit}
      onOpenManage={openManage}
      onOpenHistory={() => openManageSection("history")}
      onOpenStash={() => openManageSection("stash")}
      onSaveTemplate={handleSaveTemplate}
      onExitEdit={exitEdit}
    />
  );
}
