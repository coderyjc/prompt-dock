import { Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShortcutItem, StashItem, TemplateItem } from "../types";
import { TemplatePalette } from "./TemplatePalette";
import { startWindowDrag } from "../lib/desktop";
import { shortcutMatches } from "../lib/shortcuts";

type EditWindowProps = {
  draft: string;
  templates: TemplateItem[];
  stashItems: StashItem[];
  shortcuts: ShortcutItem[];
  saveState: "saved" | "saving";
  onDraftChange: (value: string) => void;
  onApplyTemplate: (template: TemplateItem, cursorStart?: number, cursorEnd?: number) => void;
  onSubmit: () => void | Promise<void>;
  onOpenManage: () => void;
  onOpenHistory: () => void;
  onStashDraft: () => boolean;
  onResumeStash: (item: StashItem) => void | Promise<void>;
  onSaveTemplate: () => void;
  onExitEdit: () => void | Promise<void>;
};

const estimateTokens = (value: string) => {
  const chinese = (value.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = value.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0, Math.ceil(chinese * 0.75 + words * 1.3));
};

export function EditWindow({
  draft,
  templates,
  stashItems,
  shortcuts,
  saveState,
  onDraftChange,
  onApplyTemplate,
  onSubmit,
  onOpenManage,
  onOpenHistory,
  onStashDraft,
  onResumeStash,
  onSaveTemplate,
  onExitEdit
}: EditWindowProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"root" | "stash">("root");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const defaultHint = "Ctrl+Enter 复制并退出";
  const [hint, setHint] = useState(defaultHint);

  const filteredTemplates = useMemo(() => {
    const text = query.trim().toLowerCase();
    const sorted = [...templates].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.usageCount - a.usageCount;
    });
    if (!text) return sorted;
    return sorted.filter((template) => {
      const haystack = [template.title, template.description, template.body, template.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(text);
    });
  }, [query, templates]);

  const filteredStashItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return stashItems;
    return stashItems.filter((item) => item.body.toLowerCase().includes(text));
  }, [query, stashItems]);

  const paletteOptionCount = paletteMode === "stash" ? filteredStashItems.length : filteredTemplates.length + 1;
  const tokenCount = estimateTokens(draft);
  const shortcutById = useMemo(() => {
    return new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut.keys]));
  }, [shortcuts]);

  const getShortcut = (id: string, fallback: string) => shortcutById.get(id) ?? fallback;

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (selectedIndex >= paletteOptionCount) {
      setSelectedIndex(Math.max(0, paletteOptionCount - 1));
    }
  }, [paletteOptionCount, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paletteMode, query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (paletteOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setPaletteOpen(false);
          editorRef.current?.focus();
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((index) => Math.min(index + 1, Math.max(0, paletteOptionCount - 1)));
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((index) => Math.max(index - 1, 0));
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (paletteMode === "stash") {
            const selectedStash = filteredStashItems[selectedIndex];
            if (selectedStash) void resumeStash(selectedStash);
            return;
          }
          if (selectedIndex === 0) {
            setPaletteMode("stash");
            setQuery("");
            setSelectedIndex(0);
            return;
          }
          const selectedTemplate = filteredTemplates[selectedIndex - 1];
          if (selectedTemplate) applyTemplate(selectedTemplate);
        }
        return;
      }

      if (shortcutMatches(event, getShortcut("template", "Ctrl + P"))) {
        event.preventDefault();
        setPaletteMode("root");
        setQuery("");
        setSelectedIndex(0);
        setPaletteOpen(true);
      }
      if (shortcutMatches(event, getShortcut("manage", "Ctrl + ,"))) {
        event.preventDefault();
        onOpenManage();
      }
      if (shortcutMatches(event, getShortcut("save-template", "Ctrl + Shift + S"))) {
        event.preventDefault();
        onSaveTemplate();
        setHint("已保存为固定模板");
      }
      if (shortcutMatches(event, getShortcut("submit", "Ctrl + Enter"))) {
        event.preventDefault();
        void onSubmit();
      }
      if (shortcutMatches(event, getShortcut("history", "Ctrl + H"))) {
        event.preventDefault();
        onOpenHistory();
      }
      if (shortcutMatches(event, getShortcut("stash", "Ctrl + J"))) {
        event.preventDefault();
        setHint(onStashDraft() ? "已放入暂存箱" : "没有内容可暂存");
        window.requestAnimationFrame(() => editorRef.current?.focus());
      }
      if (shortcutMatches(event, getShortcut("escape", "Esc"))) {
        event.preventDefault();
        void onExitEdit();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    filteredStashItems,
    filteredTemplates,
    getShortcut,
    onExitEdit,
    onOpenHistory,
    onOpenManage,
    onSaveTemplate,
    onStashDraft,
    onSubmit,
    paletteMode,
    paletteOpen,
    paletteOptionCount,
    selectedIndex
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (hint !== defaultHint) setHint(defaultHint);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [defaultHint, hint]);

  const applyTemplate = (template: TemplateItem) => {
    const editor = editorRef.current;
    onApplyTemplate(template, editor?.selectionStart, editor?.selectionEnd);
    setPaletteOpen(false);
    setQuery("");
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  const resumeStash = async (item: StashItem) => {
    await onResumeStash(item);
    setPaletteOpen(false);
    setPaletteMode("root");
    setQuery("");
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  return (
    <main className="edit-shell" aria-label="Prompt Dock 编辑窗口">
      <button
        className="edit-drag-handle"
        type="button"
        title="拖动移动编辑窗口"
        onPointerDown={(event) => {
          event.preventDefault();
          void startWindowDrag();
        }}
      />

      <div className="edit-corner-actions" onPointerDown={(event) => event.stopPropagation()}>
        <button className="icon-button subtle" type="button" onClick={onOpenManage} title="打开工作台 Ctrl+,">
          <Settings size={18} />
        </button>
      </div>

      <div className="editor-frame" onPointerDown={(event) => event.stopPropagation()}>
        <textarea
          ref={editorRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          spellCheck={false}
          autoFocus
          placeholder="在这里写 prompt。Ctrl+Enter 复制并退出。"
        />
      </div>

      <div className="edit-bottom-bar" onPointerDown={(event) => event.stopPropagation()}>
        <div className="edit-status" aria-live="polite">
          <span className={`save-dot ${saveState}`} />
          <span>{saveState === "saving" ? "保存中" : "已保存"}</span>
          <span>{draft.length} 字符</span>
          <span>约 {tokenCount} tokens</span>
          <strong>{hint}</strong>
        </div>
      </div>

      <TemplatePalette
        open={paletteOpen}
        mode={paletteMode}
        query={query}
        selectedIndex={selectedIndex}
        templates={filteredTemplates}
        stashItems={filteredStashItems}
        stashCount={stashItems.length}
        onQueryChange={setQuery}
        onSelectIndex={setSelectedIndex}
        onApplyTemplate={applyTemplate}
        onOpenStashBox={() => {
          setPaletteMode("stash");
          setQuery("");
          setSelectedIndex(0);
        }}
        onBackToRoot={() => {
          setPaletteMode("root");
          setQuery("");
          setSelectedIndex(0);
        }}
        onResumeStash={(item) => void resumeStash(item)}
        onClose={() => setPaletteOpen(false)}
      />
    </main>
  );
}
