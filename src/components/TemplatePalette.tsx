import { Search } from "lucide-react";
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
  if (!open) return null;

  return (
    <div
      className="palette-layer"
      role="dialog"
      aria-label="模板选择器"
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
              <span className="option-title">{template.title}</span>
              <span className="option-description">{template.description}</span>
            </button>
          ))}
          {templates.length === 0 ? (
            <div className="empty-state">
              <strong>没有匹配模板</strong>
              <span>换个关键词试试，或在管理窗口中新建模板。</span>
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
