import { Archive, ChevronLeft, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StashItem, TemplateItem } from "../types";

type TemplatePaletteProps = {
  open: boolean;
  mode: "root" | "stash";
  query: string;
  selectedIndex: number;
  templates: TemplateItem[];
  stashItems: StashItem[];
  stashCount: number;
  onQueryChange: (value: string) => void;
  onSelectIndex: (index: number) => void;
  onApplyTemplate: (template: TemplateItem) => void;
  onOpenStashBox: () => void;
  onBackToRoot: () => void;
  onResumeStash: (item: StashItem) => void;
  onClose: () => void;
};

export function TemplatePalette({
  open,
  mode,
  query,
  selectedIndex,
  templates,
  stashItems,
  stashCount,
  onQueryChange,
  onSelectIndex,
  onApplyTemplate,
  onOpenStashBox,
  onBackToRoot,
  onResumeStash,
  onClose
}: TemplatePaletteProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
  const enterTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(closeTimer.current);

    if (open) {
      setShouldRender(true);
      setPhase("entering");
      enterTimer.current = window.setTimeout(() => setPhase("open"), 320);
      return;
    }

    if (shouldRender) {
      setPhase("closing");
      closeTimer.current = window.setTimeout(() => setShouldRender(false), 230);
    }
  }, [open, shouldRender]);

  useEffect(() => {
    return () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`palette-layer is-${phase}`}
      role="dialog"
      aria-label="指令台"
      aria-modal="true"
      onPointerDown={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="palette" onPointerDown={(event) => event.stopPropagation()}>
        <div className="palette-search">
          {mode === "stash" ? (
            <button className="palette-back-button" type="button" onClick={onBackToRoot} title="返回指令台">
              <ChevronLeft size={17} />
            </button>
          ) : null}
          <Search size={17} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={mode === "stash" ? "搜索暂存 prompt" : "搜索固定模板"}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" role="listbox">
          {mode === "root" ? (
            <>
              <button
                className={`template-option command-option ${selectedIndex === 0 ? "is-selected" : ""}`}
                onMouseEnter={() => onSelectIndex(0)}
                onClick={onOpenStashBox}
                role="option"
                aria-selected={selectedIndex === 0}
              >
                <span className="option-title">
                  <Archive size={16} />
                  暂存箱
                </span>
                <span className="option-description">{stashCount} 条暂存 prompt</span>
              </button>
              {templates.map((template, index) => (
                <button
                  key={template.id}
                  className={`template-option ${index + 1 === selectedIndex ? "is-selected" : ""}`}
                  onMouseEnter={() => onSelectIndex(index + 1)}
                  onClick={() => onApplyTemplate(template)}
                  role="option"
                  aria-selected={index + 1 === selectedIndex}
                >
                  <span className="option-title">
                    {template.isFavorite ? <span className="pin-glyph" aria-label="置顶">📌</span> : null}
                    {template.title}
                  </span>
                  <span className="option-description">{template.description}</span>
                </button>
              ))}
              {templates.length === 0 ? (
                <div className="empty-state">
                  <strong>没有匹配模板</strong>
                  <span>换个关键词试试，或进入暂存箱续写。</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {stashItems.map((item, index) => (
                <button
                  key={item.id}
                  className={`template-option stash-palette-option ${index === selectedIndex ? "is-selected" : ""}`}
                  onMouseEnter={() => onSelectIndex(index)}
                  onClick={() => onResumeStash(item)}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <span className="option-title">{item.body}</span>
                  <span className="option-description stash-palette-meta">
                    {new Date(item.createdAt).toLocaleString()} · {item.body.length} 字
                  </span>
                </button>
              ))}
              {stashItems.length === 0 ? (
                <div className="empty-state">
                  <strong>暂存箱为空</strong>
                  <span>按 Ctrl+S 保存，或按 Ctrl+J 暂存并清除后，这里会出现内容。</span>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            选择
          </span>
          <span>
            <kbd>Enter</kbd>
            {mode === "stash" ? "续写暂存" : "进入/插入"}
          </span>
          <button type="button" onClick={mode === "stash" ? onBackToRoot : onClose}>
            {mode === "stash" ? "返回" : "关闭"}
          </button>
        </div>
      </div>
    </div>
  );
}
