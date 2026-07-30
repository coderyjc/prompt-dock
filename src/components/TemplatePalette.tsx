import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TemplateItem } from "../types";

type TemplatePaletteProps = {
  open: boolean;
  query: string;
  selectedIndex: number;
  templates: TemplateItem[];
  onQueryChange: (value: string) => void;
  onSelectIndex: (index: number) => void;
  onApply: (template: TemplateItem) => void;
  onClose: () => void;
};

export function TemplatePalette({
  open,
  query,
  selectedIndex,
  templates,
  onQueryChange,
  onSelectIndex,
  onApply,
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
      aria-label="模板选择器"
      aria-modal="true"
      onPointerDown={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="palette" onPointerDown={(event) => event.stopPropagation()}>
        <div className="palette-search">
          <Search size={17} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索固定模板"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" role="listbox">
          {templates.map((template, index) => (
            <button
              key={template.id}
              className={`template-option ${index === selectedIndex ? "is-selected" : ""}`}
              onMouseEnter={() => onSelectIndex(index)}
              onClick={() => onApply(template)}
              role="option"
              aria-selected={index === selectedIndex}
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
              <span>换个关键词试试，或在工作台中新建模板。</span>
            </div>
          ) : null}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            选择
          </span>
          <span>
            <kbd>Enter</kbd>
            插入模板
          </span>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
