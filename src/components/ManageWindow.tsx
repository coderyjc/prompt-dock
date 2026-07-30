import {
  Archive,
  Clock3,
  Copy,
  Database,
  Download,
  FileText,
  Keyboard,
  MonitorUp,
  Palette,
  Pin,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { defaultShortcuts } from "../data/defaults";
import { copyText, startWindowDrag } from "../lib/desktop";
import { formatKeyboardShortcut } from "../lib/shortcuts";
import type { HistoryItem, SettingsState, ShortcutItem, TemplateItem } from "../types";

type Section = "templates" | "history" | "shortcuts" | "output" | "appearance" | "data";

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type TemplateMenuState = {
  templateId: string;
  x: number;
  y: number;
};

type ManageWindowProps = {
  draft: string;
  templates: TemplateItem[];
  history: HistoryItem[];
  shortcuts: ShortcutItem[];
  settings: SettingsState;
  onTemplatesChange: (templates: TemplateItem[]) => void;
  onHistoryChange: (history: HistoryItem[]) => void;
  onShortcutsChange: (shortcuts: ShortcutItem[]) => void;
  onSettingsChange: (settings: SettingsState) => void;
  onRestoreHistory: (history: HistoryItem) => void;
  onOpenEdit: () => void;
};

const navItems: Array<{ id: Section; label: string; icon: typeof FileText }> = [
  { id: "templates", label: "模板", icon: FileText },
  { id: "history", label: "历史", icon: Clock3 },
  { id: "shortcuts", label: "快捷键", icon: Keyboard },
  { id: "output", label: "输出", icon: MonitorUp },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "data", label: "数据", icon: Database }
];

const sortTemplates = (items: TemplateItem[]) => {
  return [...items].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
};

const makeTemplateId = () => `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ManageWindow({
  draft,
  templates,
  history,
  shortcuts,
  settings,
  onTemplatesChange,
  onHistoryChange,
  onShortcutsChange,
  onSettingsChange,
  onRestoreHistory,
  onOpenEdit
}: ManageWindowProps) {
  const [activeSection, setActiveSection] = useState<Section>("templates");
  const [visibleSection, setVisibleSection] = useState<Section>("templates");
  const [contentPhase, setContentPhase] = useState<"ready" | "leaving" | "entering">("ready");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [templateMenu, setTemplateMenu] = useState<TemplateMenuState | null>(null);
  const [historyClearArmed, setHistoryClearArmed] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [recordingShortcutId, setRecordingShortcutId] = useState<string | null>(null);
  const [navIndicator, setNavIndicator] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLElement | null>(null);
  const navButtonRefs = useRef<Partial<Record<Section, HTMLButtonElement>>>({});
  const switchTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const historyClearTimer = useRef<number | undefined>(undefined);

  const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? sortedTemplates[0];
  const activeHistory = history.find((item) => item.id === activeHistoryId) ?? null;
  const contextTemplate = templateMenu ? templates.find((template) => template.id === templateMenu.templateId) : null;

  const filteredTemplates = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return sortedTemplates;
    return sortedTemplates.filter((template) =>
      [template.title, template.description, template.body].join(" ").toLowerCase().includes(text)
    );
  }, [query, sortedTemplates]);

  const switchSection = (nextSection: Section) => {
    if (nextSection === activeSection) return;

    window.clearTimeout(switchTimer.current);
    window.clearTimeout(settleTimer.current);
    setActiveSection(nextSection);
    setContentPhase("leaving");

    switchTimer.current = window.setTimeout(() => {
      setVisibleSection(nextSection);
      setContentPhase("entering");
      settleTimer.current = window.setTimeout(() => setContentPhase("ready"), 300);
    }, 170);
  };

  const updateSelectedTemplate = (patch: Partial<TemplateItem>) => {
    if (!selectedTemplate) return;
    onTemplatesChange(
      templates.map((template) =>
        template.id === selectedTemplate.id ? { ...template, ...patch, updatedAt: new Date().toISOString() } : template
      )
    );
  };

  const createTemplate = () => {
    const id = makeTemplateId();
    const next: TemplateItem = {
      id,
      title: "新固定模板",
      description: "描述这个模板适合什么场景。",
      body: draft || "请在这里写固定模板正文。",
      tags: [],
      isFavorite: false,
      usageCount: 0,
      updatedAt: new Date().toISOString()
    };
    onTemplatesChange([next, ...templates]);
    setSelectedTemplateId(id);
  };

  const duplicateTemplate = (template: TemplateItem) => {
    const index = templates.findIndex((item) => item.id === template.id);
    const nextTemplate: TemplateItem = {
      ...template,
      id: makeTemplateId(),
      title: `${template.title} copy`,
      updatedAt: new Date().toISOString()
    };
    const next = [...templates];
    next.splice(index >= 0 ? index + 1 : 0, 0, nextTemplate);
    onTemplatesChange(next);
    setSelectedTemplateId(nextTemplate.id);
    setTemplateMenu(null);
  };

  const deleteTemplateById = (templateId: string) => {
    const next = templates.filter((template) => template.id !== templateId);
    onTemplatesChange(next);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(sortTemplates(next)[0]?.id ?? "");
    }
    setTemplateMenu(null);
  };

  const askDeleteTemplate = (template: TemplateItem) => {
    setTemplateMenu(null);
    setConfirmRequest({
      title: "删除模板",
      message: `确认删除「${template.title}」？这个操作会移除模板正文和说明。`,
      confirmLabel: "删除",
      onConfirm: () => deleteTemplateById(template.id)
    });
  };

  const askDeleteHistory = (item: HistoryItem) => {
    setConfirmRequest({
      title: "删除历史",
      message: "确认删除这条 prompt 历史？",
      confirmLabel: "删除",
      onConfirm: () => {
        onHistoryChange(history.filter((historyItem) => historyItem.id !== item.id));
        if (activeHistoryId === item.id) setActiveHistoryId(null);
      }
    });
  };

  const requestClearHistory = () => {
    if (historyClearArmed) {
      window.clearTimeout(historyClearTimer.current);
      setHistoryClearArmed(false);
      onHistoryChange([]);
      setActiveHistoryId(null);
      return;
    }

    setHistoryClearArmed(true);
    window.clearTimeout(historyClearTimer.current);
    historyClearTimer.current = window.setTimeout(() => setHistoryClearArmed(false), 3200);
  };

  const saveHistoryAsTemplate = (item: HistoryItem) => {
    const id = makeTemplateId();
    const next: TemplateItem = {
      id,
      title: `历史模板 ${new Date(item.createdAt).toLocaleDateString()}`,
      description: "从历史记录保存。",
      body: item.body,
      tags: ["历史"],
      isFavorite: false,
      usageCount: 0,
      updatedAt: new Date().toISOString()
    };
    onTemplatesChange([next, ...templates]);
    setSelectedTemplateId(id);
    setActiveHistoryId(null);
    switchSection("templates");
  };

  const updateShortcut = (shortcutId: string, keys: string) => {
    onShortcutsChange(shortcuts.map((shortcut) => (shortcut.id === shortcutId ? { ...shortcut, keys } : shortcut)));
  };

  const runConfirm = () => {
    const action = confirmRequest?.onConfirm;
    setConfirmRequest(null);
    action?.();
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(switchTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(historyClearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!recordingShortcutId) return;

    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingShortcutId(null);
        return;
      }

      const keys = formatKeyboardShortcut(event);
      if (!keys) return;

      updateShortcut(recordingShortcutId, keys);
      setRecordingShortcutId(null);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recordingShortcutId, shortcuts]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (confirmRequest) {
        event.preventDefault();
        setConfirmRequest(null);
        return;
      }
      if (templateMenu) {
        event.preventDefault();
        setTemplateMenu(null);
        return;
      }
      if (activeHistoryId) {
        event.preventDefault();
        setActiveHistoryId(null);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeHistoryId, confirmRequest, templateMenu]);

  useEffect(() => {
    if (!templateMenu) return;

    const closeMenu = () => setTemplateMenu(null);
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, [templateMenu]);

  useEffect(() => {
    if (activeHistoryId && !activeHistory) setActiveHistoryId(null);
  }, [activeHistory, activeHistoryId]);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const nav = navRef.current;
      const button = navButtonRefs.current[activeSection];
      if (!nav || !button) return;

      const navRect = nav.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setNavIndicator({
        top: buttonRect.top - navRect.top,
        height: buttonRect.height
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeSection]);

  const renderContent = (currentSection: Section) => {
    if (currentSection === "templates") {
      return (
        <div className="manage-content-grid">
          <section className="list-panel" aria-label="模板列表">
            <div className="panel-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索模板" />
              </div>
              <button className="icon-button" type="button" onClick={createTemplate} title="新建模板">
                <Plus size={17} />
              </button>
            </div>

            <div className="template-list">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  className={`manage-list-item ${template.id === selectedTemplate?.id ? "is-active" : ""} ${template.isFavorite ? "is-pinned" : ""}`}
                  onClick={() => setSelectedTemplateId(template.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setTemplateMenu({
                      templateId: template.id,
                      x: Math.min(event.clientX, window.innerWidth - 190),
                      y: Math.min(event.clientY, window.innerHeight - 110)
                    });
                  }}
                >
                  <span className="list-title">
                    {template.isFavorite ? <span className="pin-glyph" aria-label="置顶">📌</span> : null}
                    {template.title}
                  </span>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-panel" aria-label="模板详情">
            {selectedTemplate ? (
              <>
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">固定模板</p>
                    <h2>
                      {selectedTemplate.isFavorite ? <span className="pin-glyph" aria-label="置顶">📌</span> : null}
                      {selectedTemplate.title}
                    </h2>
                  </div>
                  <div className="action-row">
                    <button
                      className={`icon-button ${selectedTemplate.isFavorite ? "is-pinned" : ""}`}
                      type="button"
                      onClick={() => updateSelectedTemplate({ isFavorite: !selectedTemplate.isFavorite })}
                      title={selectedTemplate.isFavorite ? "取消置顶" : "置顶"}
                    >
                      <Pin size={17} fill={selectedTemplate.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button className="icon-button" type="button" onClick={() => askDeleteTemplate(selectedTemplate)} title="删除模板">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <label className="field">
                  标题
                  <input value={selectedTemplate.title} onChange={(event) => updateSelectedTemplate({ title: event.target.value })} />
                </label>
                <label className="field">
                  用途说明
                  <input value={selectedTemplate.description} onChange={(event) => updateSelectedTemplate({ description: event.target.value })} />
                </label>
                <label className="field grow template-body-field">
                  模板正文
                  <textarea value={selectedTemplate.body} onChange={(event) => updateSelectedTemplate({ body: event.target.value })} />
                </label>

                <div className="template-stats">
                  <span>使用 {selectedTemplate.usageCount} 次</span>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>还没有模板</strong>
                <span>新建一个固定模板后即可在编辑窗口中快速插入。</span>
              </div>
            )}
          </section>
        </div>
      );
    }

    if (currentSection === "history") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">草稿与提交记录</p>
              <h2>历史</h2>
            </div>
            <button
              className={`tool-button ${historyClearArmed ? "danger" : ""}`}
              type="button"
              disabled={history.length === 0}
              onClick={requestClearHistory}
            >
              <Trash2 size={16} />
              {historyClearArmed ? "确认清理所有历史" : "清理所有历史"}
            </button>
          </div>
          <div className="history-list">
            {history.map((item) => (
              <div className="history-item" key={item.id}>
                <button className="history-open" type="button" onClick={() => setActiveHistoryId(item.id)}>
                  <span className="history-meta">
                    已复制
                    <time>{new Date(item.createdAt).toLocaleString()}</time>
                  </span>
                  <span>{item.body}</span>
                </button>
                <button className="history-delete-button" type="button" onClick={() => askDeleteHistory(item)} title="删除历史">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {history.length === 0 ? (
              <div className="empty-state">
                <strong>还没有历史</strong>
                <span>执行复制并退出后，这里会保留 prompt 痕迹。</span>
              </div>
            ) : null}
          </div>
        </section>
      );
    }

    if (currentSection === "shortcuts") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">键盘优先</p>
              <h2>快捷键</h2>
            </div>
            <button
              className="tool-button"
              type="button"
              onClick={() => {
                setRecordingShortcutId(null);
                onShortcutsChange(defaultShortcuts);
              }}
            >
              <Save size={16} />
              恢复默认
            </button>
          </div>
          <div className="shortcut-table">
            {shortcuts.map((shortcut) => {
              const isRecording = recordingShortcutId === shortcut.id;
              return (
                <button
                  className={`shortcut-row ${isRecording ? "is-recording" : ""}`}
                  key={shortcut.id}
                  type="button"
                  onClick={() => setRecordingShortcutId(shortcut.id)}
                >
                  <span>{shortcut.action}</span>
                  <kbd>{isRecording ? "按下新快捷键" : shortcut.keys}</kbd>
                  <small>{isRecording ? "Esc 取消" : shortcut.scope}</small>
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (currentSection === "output") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">交付 prompt</p>
              <h2>输出</h2>
            </div>
          </div>
          <div className="setting-stack">
            <Segmented
              label="输出模式"
              value={settings.outputMode}
              options={[
                ["clipboardPaste", "剪贴板粘贴"],
                ["directInput", "直接输入"],
                ["copyOnly", "仅复制"]
              ]}
              onChange={(value) => onSettingsChange({ ...settings, outputMode: value as SettingsState["outputMode"] })}
            />
            <Segmented
              label="提交后行为"
              value={settings.afterSubmit}
              options={[
                ["hide", "隐藏编辑窗口"],
                ["keep", "保持打开"]
              ]}
              onChange={(value) => onSettingsChange({ ...settings, afterSubmit: value as SettingsState["afterSubmit"] })}
            />
            <Toggle label="提交后恢复原剪贴板" value={settings.restoreClipboard} onChange={(value) => onSettingsChange({ ...settings, restoreClipboard: value })} />
          </div>
        </section>
      );
    }

    if (currentSection === "appearance") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">安静材质</p>
              <h2>外观</h2>
            </div>
          </div>
          <div className="setting-stack">
            <Segmented
              label="主题"
              value={settings.theme}
              options={[
                ["system", "跟随系统"],
                ["light", "浅色"],
                ["dark", "深色"]
              ]}
              onChange={(value) => onSettingsChange({ ...settings, theme: value as SettingsState["theme"] })}
            />
            <Segmented
              label="窗口位置"
              value={settings.windowPlacement}
              options={[
                ["center", "屏幕中央"],
                ["cursor", "鼠标附近"],
                ["last", "上次位置"]
              ]}
              onChange={(value) => onSettingsChange({ ...settings, windowPlacement: value as SettingsState["windowPlacement"] })}
            />
          </div>
        </section>
      );
    }

    return (
      <section className="single-panel">
        <div className="detail-heading">
          <div>
            <p className="eyebrow">本地优先</p>
            <h2>数据</h2>
          </div>
        </div>
        <div className="data-grid">
          <ActionTile icon={Archive} title="本地数据库" body="%APPDATA%/PromptDock/prompt-dock.sqlite" />
          <ActionTile icon={Download} title="导出数据" body="导出模板、设置和历史备份。" />
          <ActionTile icon={Upload} title="恢复备份" body="从 JSON 备份恢复本地数据。" />
          <Toggle label="开机自启动" value={settings.launchAtStartup} onChange={(value) => onSettingsChange({ ...settings, launchAtStartup: value })} />
        </div>
      </section>
    );
  };

  return (
    <main className="manage-shell" aria-label="工作台">
      <button
        className="workbench-drag-strip"
        type="button"
        title="拖动移动工作台"
        onPointerDown={(event) => {
          event.preventDefault();
          void startWindowDrag();
        }}
      />
      <aside className="sidebar">
        <div className="brand-block">
          <span className="app-mark">PD</span>
          <div>
            <strong>工作台</strong>
            <span>本地 prompt 工作台</span>
          </div>
        </div>
        <nav className="workbench-tabs" ref={navRef}>
          <span
            className="nav-indicator"
            style={{
              height: `${navIndicator.height}px`,
              transform: `translateY(${navIndicator.top}px)`
            }}
          />
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  if (node) navButtonRefs.current[item.id] = node;
                }}
                className={activeSection === item.id ? "is-active" : ""}
                onClick={() => switchSection(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="tool-button sidebar-action" type="button" onClick={onOpenEdit}>
          打开编辑窗口
        </button>
      </aside>
      <div className="manage-content">
        <div key={visibleSection} className={`manage-content-motion is-${contentPhase}`}>
          {renderContent(visibleSection)}
        </div>
      </div>

      {templateMenu && contextTemplate ? (
        <div
          className="context-menu"
          style={{ left: `${templateMenu.x}px`, top: `${templateMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => duplicateTemplate(contextTemplate)}>
            <Copy size={15} />
            复制
          </button>
          <button className="danger" type="button" onClick={() => askDeleteTemplate(contextTemplate)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      ) : null}

      {activeHistory ? (
        <div className="modal-layer" role="presentation" onPointerDown={() => setActiveHistoryId(null)}>
          <section className="history-modal" role="dialog" aria-modal="true" aria-label="历史详情" onPointerDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">prompt 历史</p>
                <h2>{new Date(activeHistory.createdAt).toLocaleString()}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setActiveHistoryId(null)} title="关闭">
                <X size={17} />
              </button>
            </div>
            <pre className="prompt-preview">{activeHistory.body}</pre>
            <div className="modal-actions">
              <button className="tool-button" type="button" onClick={() => saveHistoryAsTemplate(activeHistory)}>
                <Save size={16} />
                保存为模板
              </button>
              <button className="tool-button" type="button" onClick={() => void copyText(activeHistory.body)}>
                <Copy size={16} />
                复制
              </button>
              <button className="tool-button danger" type="button" onClick={() => askDeleteHistory(activeHistory)}>
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {confirmRequest ? (
        <div className="modal-layer is-top" role="presentation" onPointerDown={() => setConfirmRequest(null)}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={confirmRequest.title} onPointerDown={(event) => event.stopPropagation()}>
            <h2>{confirmRequest.title}</h2>
            <p>{confirmRequest.message}</p>
            <div className="confirm-actions">
              <button className="tool-button" type="button" onClick={() => setConfirmRequest(null)}>
                取消
              </button>
              <button className="tool-button danger" type="button" onClick={runConfirm}>
                {confirmRequest.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

type SegmentedProps = {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
};

function Segmented({ label, value, options, onChange }: SegmentedProps) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <span className="segmented">
        {options.map(([id, name]) => (
          <button key={id} className={value === id ? "is-active" : ""} type="button" onClick={() => onChange(id)}>
            {name}
          </button>
        ))}
      </span>
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <button className={`toggle ${value ? "is-on" : ""}`} type="button" onClick={() => onChange(!value)} aria-pressed={value}>
        <span />
      </button>
    </label>
  );
}

function ActionTile({ icon: Icon, title, body }: { icon: typeof Archive; title: string; body: string }) {
  return (
    <button className="action-tile" type="button">
      <Icon size={20} />
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  );
}
