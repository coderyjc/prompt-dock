import {
  Archive,
  BarChart3,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  Info,
  Palette,
  Pin,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { defaultShortcuts } from "../data/defaults";
import { copyText, openExternalUrl, startWindowDrag } from "../lib/desktop";
import { formatKeyboardShortcut, shortcutMatches } from "../lib/shortcuts";
import { storageKeys } from "../lib/persistence";
import type { HistoryItem, PromptStatItem, SettingsState, ShortcutItem, TemplateItem } from "../types";

type Section = "stats" | "templates" | "history" | "stash" | "appearance" | "settings" | "about";

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

type HeatTooltipState = {
  date: string;
  chars: number;
  count: number;
  x: number;
  y: number;
};

type ManageWindowProps = {
  draft: string;
  templates: TemplateItem[];
  history: HistoryItem[];
  promptStats: PromptStatItem[];
  shortcuts: ShortcutItem[];
  settings: SettingsState;
  onTemplatesChange: (templates: TemplateItem[]) => void;
  onHistoryChange: (history: HistoryItem[]) => void;
  onShortcutsChange: (shortcuts: ShortcutItem[]) => void;
  onSettingsChange: (settings: SettingsState) => void;
  onDraftChange: (draft: string) => void;
  onRestoreHistory: (history: HistoryItem) => void;
};

const navItems: Array<{ id: Section; label: string; icon: typeof FileText }> = [
  { id: "stats", label: "统计", icon: BarChart3 },
  { id: "templates", label: "模板", icon: FileText },
  { id: "history", label: "历史", icon: Clock3 },
  { id: "stash", label: "暂存", icon: ClipboardList },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "settings", label: "设置", icon: Settings },
  { id: "about", label: "关于", icon: Info }
];

const appIconUrl = new URL("../../src-tauri/icons/icon.png", import.meta.url).href;
const githubUrl = "https://github.com/coderyjc/prompt-dock";

const isSection = (value: string | null): value is Section => {
  return navItems.some((item) => item.id === value);
};

const sortTemplates = (items: TemplateItem[]) => {
  return [...items].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
};

const makeTemplateId = () => `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);

const toDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}年${month}月${day}日`;
};

const buildStatsModel = (promptStats: PromptStatItem[], templates: TemplateItem[]) => {
  const sortedStats = [...promptStats].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const totalPrompts = sortedStats.length;
  const totalChars = sortedStats.reduce((sum, item) => sum + item.charCount, 0);
  const averageChars = totalPrompts > 0 ? Math.round(totalChars / totalPrompts) : 0;
  const longestPrompt = sortedStats.reduce((max, item) => Math.max(max, item.charCount), 0);
  const dailyMap = new Map<string, { chars: number; count: number }>();

  sortedStats.forEach((item) => {
    const key = toDateKey(item.createdAt);
    const current = dailyMap.get(key) ?? { chars: 0, count: 0 };
    dailyMap.set(key, { chars: current.chars + item.charCount, count: current.count + 1 });
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const heatmapDays = Array.from({ length: 56 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (55 - index));
    const key = toDateKey(date);
    const value = dailyMap.get(key) ?? { chars: 0, count: 0 };
    return { key, ...value };
  });
  const maxDailyChars = Math.max(1, ...heatmapDays.map((item) => item.chars));

  const busiestDay = [...dailyMap.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.chars - a.chars)[0];

  let currentStreak = 0;
  for (let offset = 0; offset < 3650; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const value = dailyMap.get(toDateKey(date));
    if (!value || value.count === 0) break;
    currentStreak += 1;
  }

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const last7Days = sortedStats.filter((item) => new Date(item.createdAt) >= sevenDaysAgo);
  const last7Chars = last7Days.reduce((sum, item) => sum + item.charCount, 0);
  const activeDays = [...dailyMap.values()].filter((item) => item.count > 0).length;

  const templateUses = templates.reduce((sum, template) => sum + template.usageCount, 0);
  const topTemplates = [...templates]
    .filter((template) => template.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);

  return {
    activeDays,
    averageChars,
    busiestDay,
    currentStreak,
    heatmapDays,
    last7Chars,
    last7Count: last7Days.length,
    longestPrompt,
    maxDailyChars,
    templateUses,
    topTemplates,
    totalChars,
    totalPrompts
  };
};

export function ManageWindow({
  draft,
  templates,
  history,
  promptStats,
  shortcuts,
  settings,
  onTemplatesChange,
  onHistoryChange,
  onShortcutsChange,
  onSettingsChange,
  onDraftChange,
  onRestoreHistory
}: ManageWindowProps) {
  const [activeSection, setActiveSection] = useState<Section>("stats");
  const [visibleSection, setVisibleSection] = useState<Section>("stats");
  const [contentPhase, setContentPhase] = useState<"ready" | "leaving" | "entering">("ready");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [templateMenu, setTemplateMenu] = useState<TemplateMenuState | null>(null);
  const [historyClearArmed, setHistoryClearArmed] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [recordingShortcutId, setRecordingShortcutId] = useState<string | null>(null);
  const [heatTooltip, setHeatTooltip] = useState<HeatTooltipState | null>(null);
  const [navIndicator, setNavIndicator] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLElement | null>(null);
  const navButtonRefs = useRef<Partial<Record<Section, HTMLButtonElement>>>({});
  const switchTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const historyClearTimer = useRef<number | undefined>(undefined);

  const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
  const statsModel = useMemo(() => buildStatsModel(promptStats, templates), [promptStats, templates]);
  const shortcutById = useMemo(() => new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut.keys])), [shortcuts]);
  const stashedDraft = useMemo(() => draft.trim(), [draft]);
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
    setHeatTooltip(null);
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

  const askClearStash = () => {
    setConfirmRequest({
      title: "删除暂存",
      message: "确认删除当前自动保存的暂存 prompt？",
      confirmLabel: "删除",
      onConfirm: () => onDraftChange("")
    });
  };

  const updateShortcut = (shortcutId: string, keys: string) => {
    onShortcutsChange(shortcuts.map((shortcut) => (shortcut.id === shortcutId ? { ...shortcut, keys } : shortcut)));
  };

  const runConfirm = () => {
    const action = confirmRequest?.onConfirm;
    setConfirmRequest(null);
    action?.();
  };

  const placeHeatTooltip = (
    event: ReactMouseEvent<HTMLElement>,
    day: { key: string; chars: number; count: number }
  ) => {
    const offset = 14;
    const tooltipWidth = 176;
    const tooltipHeight = 90;
    setHeatTooltip({
      date: formatDateLabel(day.key),
      chars: day.chars,
      count: day.count,
      x: Math.max(8, Math.min(event.clientX + offset, window.innerWidth - tooltipWidth)),
      y: Math.max(8, Math.min(event.clientY + offset, window.innerHeight - tooltipHeight))
    });
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
      if (recordingShortcutId) return;

      if (shortcutMatches(event, shortcutById.get("stash") ?? "Ctrl + J")) {
        event.preventDefault();
        switchSection("stash");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSection, recordingShortcutId, shortcutById]);

  useEffect(() => {
    const consumeRequestedSection = () => {
      const requested = window.localStorage.getItem(storageKeys.manageSection);
      if (!isSection(requested)) return;

      window.localStorage.removeItem(storageKeys.manageSection);
      switchSection(requested);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKeys.manageSection) consumeRequestedSection();
    };

    consumeRequestedSection();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", consumeRequestedSection);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", consumeRequestedSection);
    };
  }, [activeSection]);

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
    if (currentSection === "stats") {
      const busiestText = statsModel.busiestDay
        ? `${formatDateLabel(statsModel.busiestDay.key)} · ${formatNumber(statsModel.busiestDay.chars)} 字`
        : "暂无数据";

      return (
        <section className="single-panel stats-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">长期写作痕迹</p>
              <h2>统计</h2>
            </div>
          </div>

          <div className="stats-summary-grid">
            <MetricCard label="总提示词" value={formatNumber(statsModel.totalPrompts)} caption="包含已删除历史" />
            <MetricCard label="总字数" value={formatNumber(statsModel.totalChars)} caption="按提交时文本长度统计" />
            <MetricCard label="平均字数" value={formatNumber(statsModel.averageChars)} caption="每条 prompt 平均长度" />
            <MetricCard label="连续写作" value={`${statsModel.currentStreak} 天`} caption="从今天向前连续统计" />
          </div>

          <div className="stats-content-grid">
            <section className="stats-card heatmap-card">
              <div className="stats-card-heading">
                <div>
                  <strong>最近 56 天字数热力图</strong>
                  <span>颜色越深，表示当天提交 prompt 的总字数越多。</span>
                </div>
                <small>峰值 {formatNumber(statsModel.maxDailyChars)} 字</small>
              </div>
              <div className="heatmap-grid" aria-label="最近 56 天提示词字数热力图">
                {statsModel.heatmapDays.map((day) => {
                  const level = day.chars === 0 ? 0 : Math.max(1, Math.ceil((day.chars / statsModel.maxDailyChars) * 4));
                  return (
                    <span
                      key={day.key}
                      className={`heat-cell level-${level}`}
                      aria-label={`${formatDateLabel(day.key)}：${formatNumber(day.chars)} 字，${formatNumber(day.count)} 条`}
                      onMouseEnter={(event) => placeHeatTooltip(event, day)}
                      onMouseMove={(event) => placeHeatTooltip(event, day)}
                      onMouseLeave={() => setHeatTooltip(null)}
                    />
                  );
                })}
              </div>
              <div className="heatmap-legend">
                <span>少</span>
                <i className="heat-cell level-0" />
                <i className="heat-cell level-1" />
                <i className="heat-cell level-2" />
                <i className="heat-cell level-3" />
                <i className="heat-cell level-4" />
                <span>多</span>
              </div>
            </section>

            <section className="stats-card">
              <div className="stats-card-heading">
                <div>
                  <strong>模板使用频率</strong>
                  <span>按插入次数排序。</span>
                </div>
                <small>{formatNumber(statsModel.templateUses)} 次</small>
              </div>
              <div className="template-rank-list">
                {statsModel.topTemplates.map((template, index) => {
                  const width = statsModel.topTemplates[0]?.usageCount
                    ? Math.max(8, Math.round((template.usageCount / statsModel.topTemplates[0].usageCount) * 100))
                    : 0;
                  return (
                    <div className="template-rank-row" key={template.id}>
                      <span>{index + 1}</span>
                      <strong>{template.title}</strong>
                      <small>{formatNumber(template.usageCount)} 次</small>
                      <i style={{ width: `${width}%` }} />
                    </div>
                  );
                })}
                {statsModel.topTemplates.length === 0 ? (
                  <div className="empty-state compact">
                    <strong>还没有模板使用记录</strong>
                    <span>从编辑窗口插入模板后，这里会出现排行。</span>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="stats-secondary-grid">
            <MetricCard label="最近 7 天" value={`${formatNumber(statsModel.last7Count)} 条`} caption={`${formatNumber(statsModel.last7Chars)} 字`} />
            <MetricCard label="活跃天数" value={`${formatNumber(statsModel.activeDays)} 天`} caption="有提交记录的日期" />
            <MetricCard label="单条最长" value={`${formatNumber(statsModel.longestPrompt)} 字`} caption="最长一次 prompt" />
            <MetricCard label="峰值日期" value={statsModel.busiestDay ? formatDateLabel(statsModel.busiestDay.key).slice(5) : "暂无"} caption={busiestText} />
          </div>
        </section>
      );
    }

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
        <section className="single-panel history-panel">
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

    if (currentSection === "stash") {
      return (
        <section className="single-panel stash-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">自动保存</p>
              <h2>暂存</h2>
            </div>
          </div>
          <div className="stash-list">
            {stashedDraft ? (
              <article className="stash-item">
                <pre>{draft}</pre>
                <button className="icon-button danger" type="button" onClick={askClearStash} title="删除暂存">
                  <Trash2 size={17} />
                </button>
              </article>
            ) : (
              <div className="empty-state">
                <strong>暂无暂存</strong>
                <span>编辑窗口中未提交的 prompt 会显示在这里。</span>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (currentSection === "settings") {
      return (
        <section className="single-panel settings-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">系统偏好</p>
              <h2>设置</h2>
            </div>
          </div>

          <div className="settings-groups">
            <section className="settings-group">
              <div className="settings-group-heading">
                <div>
                  <strong>快捷键</strong>
                  <span>点击任意快捷键行后录入新的按键。</span>
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

            <section className="settings-group">
              <div className="settings-group-heading">
                <div>
                  <strong>输出</strong>
                  <span>控制提交 prompt 后的处理方式。</span>
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

            <section className="settings-group">
              <div className="settings-group-heading">
                <div>
                  <strong>数据</strong>
                  <span>本地数据与启动项。</span>
                </div>
              </div>
              <div className="data-grid">
                <ActionTile icon={Archive} title="本地数据库" body="%APPDATA%/PromptDock/prompt-dock.sqlite" />
                <ActionTile icon={Download} title="导出数据" body="导出模板、设置和历史备份。" />
                <ActionTile icon={Upload} title="恢复备份" body="从 JSON 备份恢复本地数据。" />
                <Toggle label="开机自启动" value={settings.launchAtStartup} onChange={(value) => onSettingsChange({ ...settings, launchAtStartup: value })} />
              </div>
            </section>
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
      <section className="single-panel about-panel">
        <div className="detail-heading">
          <div>
            <p className="eyebrow">Prompt Dock</p>
            <h2>关于</h2>
          </div>
        </div>
        <div className="about-card">
          <img src={appIconUrl} alt="" aria-hidden="true" />
          <div>
            <strong>Prompt Dock</strong>
            <span>轻量 prompt 工作台</span>
          </div>
          <button className="tool-button" type="button" onClick={() => void openExternalUrl(githubUrl)}>
            <ExternalLink size={16} />
            GitHub
          </button>
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
          <img className="app-mark" src={appIconUrl} alt="" aria-hidden="true" />
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
                data-section={item.id}
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

      {heatTooltip ? (
        <div className="heat-tooltip" role="tooltip" style={{ left: `${heatTooltip.x}px`, top: `${heatTooltip.y}px` }}>
          <strong>{heatTooltip.date}</strong>
          <span>{formatNumber(heatTooltip.chars)} 字</span>
          <span>{formatNumber(heatTooltip.count)} 条</span>
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

function MetricCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}

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
