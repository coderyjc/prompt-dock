import { Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SettingsState, ShortcutItem, StashItem, TemplateItem } from "../types";
import { TemplatePalette } from "./TemplatePalette";
import { startWindowDrag } from "../lib/desktop";
import { loadEditorBackgroundImageUrl } from "../lib/editorBackgroundStore";
import { shortcutMatches } from "../lib/shortcuts";

type EditWindowProps = {
  draft: string;
  templates: TemplateItem[];
  stashItems: StashItem[];
  shortcuts: ShortcutItem[];
  settings: SettingsState;
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

const getLineIndexAtCaret = (value: string, caret: number) => value.slice(0, caret).split("\n").length - 1;

export function EditWindow({
  draft,
  templates,
  stashItems,
  shortcuts,
  settings,
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
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [editorViewport, setEditorViewport] = useState({ scrollTop: 0, currentLineIndex: 0 });

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
  const hasBackgroundImage = Boolean(backgroundUrl);
  const editorLines = useMemo(() => draft.split("\n"), [draft]);
  const showEditorOverlay = settings.editorLineNumbers || settings.editorCurrentLineHighlight;
  const editorFrameClass = [
    "editor-frame",
    settings.editorLineNumbers ? "show-line-numbers" : "",
    settings.editorCurrentLineHighlight ? "show-current-line" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const backgroundStyle = {
    "--editor-background-scale": `${settings.editorBackgroundScale / 100}`,
    "--editor-background-width": `${settings.editorBackgroundScale}%`,
    "--editor-background-x": `${settings.editorBackgroundX}%`,
    "--editor-background-y": `${settings.editorBackgroundY}%`
  } as CSSProperties;
  const shortcutById = useMemo(() => {
    return new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut.keys]));
  }, [shortcuts]);

  const getShortcut = (id: string, fallback: string) => shortcutById.get(id) ?? fallback;
  const formatShortcut = (shortcut: string) => shortcut.replace(/\s*\+\s*/g, "+");
  const submitShortcut = formatShortcut(getShortcut("submit", "Ctrl + Enter"));
  const templateShortcut = formatShortcut(getShortcut("template", "Ctrl + P"));
  const stashShortcut = formatShortcut(getShortcut("stash", "Ctrl + J"));
  const escapeShortcut = formatShortcut(getShortcut("escape", "Esc"));
  const defaultHint = `${submitShortcut} 复制并退出`;
  const [hint, setHint] = useState(defaultHint);
  const placeholder = [
    "内容会自动保存",
    `- ${templateShortcut} 指令窗口`,
    `- ${stashShortcut} 暂存提示词`,
    `- ${escapeShortcut} 关闭窗口并保留内容`
  ].join("\n");

  const syncEditorViewport = useCallback(
    (editor: HTMLTextAreaElement | null = editorRef.current, value = draft) => {
      if (!editor) return;

      const nextViewport = {
        scrollTop: editor.scrollTop,
        currentLineIndex: getLineIndexAtCaret(value, editor.selectionStart ?? value.length)
      };

      setEditorViewport((current) =>
        current.scrollTop === nextViewport.scrollTop && current.currentLineIndex === nextViewport.currentLineIndex
          ? current
          : nextViewport
      );
    },
    [draft]
  );

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => syncEditorViewport(editorRef.current, draft));
  }, [draft, syncEditorViewport]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    setBackgroundUrl("");

    if (!settings.editorBackgroundImageId) {
      return () => undefined;
    }

    void loadEditorBackgroundImageUrl(settings.editorBackgroundImageId).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }

      objectUrl = url;
      setBackgroundUrl(url);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings.editorBackgroundImageId]);

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
    <main
      className={`edit-shell ${hasBackgroundImage ? "has-editor-background" : ""}`}
      style={hasBackgroundImage ? backgroundStyle : undefined}
      aria-label="Prompt Dock 编辑窗口"
    >
      {hasBackgroundImage ? (
        <div className="edit-background-layer" aria-hidden="true">
          <img
            className={`edit-background-image is-${settings.editorBackgroundFit}`}
            src={backgroundUrl}
            alt=""
            draggable={false}
          />
          <div className="edit-background-overlay" />
        </div>
      ) : null}

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
        <button className="icon-button edit-close-button" type="button" onClick={() => void onExitEdit()} title={`关闭编辑窗口 ${escapeShortcut}`}>
          <X size={18} />
        </button>
      </div>

      <div className={editorFrameClass} onPointerDown={(event) => event.stopPropagation()}>
        {showEditorOverlay ? (
          <div className="editor-visual-layer" aria-hidden="true">
            <div
              className="editor-visual-scroll"
              style={{ transform: `translateY(-${editorViewport.scrollTop}px)` }}
            >
              {editorLines.map((line, index) => (
                <div
                  className={`editor-visual-line ${index === editorViewport.currentLineIndex ? "is-current" : ""}`}
                  key={`${index}-${editorLines.length}`}
                >
                  <span className="editor-line-number">{index + 1}</span>
                  <span className="editor-line-content">{line || "\u00a0"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <textarea
          ref={editorRef}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            syncEditorViewport(event.currentTarget, event.target.value);
          }}
          onClick={(event) => syncEditorViewport(event.currentTarget)}
          onFocus={(event) => syncEditorViewport(event.currentTarget)}
          onKeyUp={(event) => syncEditorViewport(event.currentTarget)}
          onScroll={(event) => syncEditorViewport(event.currentTarget)}
          onSelect={(event) => syncEditorViewport(event.currentTarget)}
          spellCheck={false}
          autoFocus
          placeholder={placeholder}
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
