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
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { useMemo, useState } from "react";
import type { HistoryItem, SettingsState, ShortcutItem, TemplateItem } from "../types";

type Section = "templates" | "history" | "shortcuts" | "output" | "appearance" | "data";

type ManageWindowProps = {
  draft: string;
  templates: TemplateItem[];
  history: HistoryItem[];
  shortcuts: ShortcutItem[];
  settings: SettingsState;
  onTemplatesChange: (templates: TemplateItem[]) => void;
  onHistoryChange: (history: HistoryItem[]) => void;
  onSettingsChange: (settings: SettingsState) => void;
  onUseTemplate: (template: TemplateItem) => void;
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

export function ManageWindow({
  draft,
  templates,
  history,
  shortcuts,
  settings,
  onTemplatesChange,
  onHistoryChange,
  onSettingsChange,
  onUseTemplate,
  onRestoreHistory,
  onOpenEdit
}: ManageWindowProps) {
  const [section, setSection] = useState<Section>("templates");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const filteredTemplates = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return templates;
    return templates.filter((template) =>
      [template.title, template.description, template.body].join(" ").toLowerCase().includes(text)
    );
  }, [query, templates]);

  const updateSelectedTemplate = (patch: Partial<TemplateItem>) => {
    if (!selectedTemplate) return;
    onTemplatesChange(
      templates.map((template) =>
        template.id === selectedTemplate.id ? { ...template, ...patch, updatedAt: new Date().toISOString() } : template
      )
    );
  };

  const createTemplate = () => {
    const id = `tpl-${Date.now()}`;
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

  const deleteSelectedTemplate = () => {
    if (!selectedTemplate) return;
    const next = templates.filter((template) => template.id !== selectedTemplate.id);
    onTemplatesChange(next);
    setSelectedTemplateId(next[0]?.id ?? "");
  };

  const renderContent = () => {
    if (section === "templates") {
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
                  className={`manage-list-item ${template.id === selectedTemplate?.id ? "is-active" : ""}`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <span className="list-title">
                    {template.isFavorite ? <Star size={14} fill="currentColor" /> : null}
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
                    <h2>{selectedTemplate.title}</h2>
                  </div>
                  <div className="action-row">
                    <button className="icon-button" type="button" onClick={() => updateSelectedTemplate({ isFavorite: !selectedTemplate.isFavorite })} title="收藏">
                      <Star size={17} fill={selectedTemplate.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button className="icon-button" type="button" onClick={deleteSelectedTemplate} title="删除模板">
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
                <label className="field grow">
                  模板正文
                  <textarea value={selectedTemplate.body} onChange={(event) => updateSelectedTemplate({ body: event.target.value })} />
                </label>

                <div className="detail-footer">
                  <span>使用 {selectedTemplate.usageCount} 次</span>
                  <button className="tool-button primary" type="button" onClick={() => onUseTemplate(selectedTemplate)}>
                    <Copy size={16} />
                    插入编辑窗口
                  </button>
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

    if (section === "history") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">草稿与提交记录</p>
              <h2>历史</h2>
            </div>
            <button className="tool-button" type="button" onClick={() => onHistoryChange([])}>
              <Trash2 size={16} />
              清理历史
            </button>
          </div>
          <div className="history-list">
            {history.map((item) => (
              <button className="history-item" key={item.id} onClick={() => onRestoreHistory(item)}>
                <span className="history-meta">
                  已复制
                  <time>{new Date(item.createdAt).toLocaleString()}</time>
                </span>
                <span>{item.body}</span>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (section === "shortcuts") {
      return (
        <section className="single-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">键盘优先</p>
              <h2>快捷键</h2>
            </div>
            <button className="tool-button" type="button">
              <Save size={16} />
              恢复默认
            </button>
          </div>
          <div className="shortcut-table">
            {shortcuts.map((shortcut) => (
              <div className="shortcut-row" key={shortcut.id}>
                <span>{shortcut.action}</span>
                <kbd>{shortcut.keys}</kbd>
                <small>{shortcut.scope}</small>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (section === "output") {
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

    if (section === "appearance") {
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
    <main className="manage-shell" aria-label="Prompt Dock 管理窗口">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="app-mark">PD</span>
          <div>
            <strong>Prompt Dock</strong>
            <span>本地 prompt 工作台</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)}>
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
      <div className="manage-content">{renderContent()}</div>
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
