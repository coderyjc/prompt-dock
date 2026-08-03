import {
  AlertTriangle,
  Archive,
  BarChart3,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
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
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent
} from "react";
import { defaultShortcuts } from "../data/defaults";
import { visualThemeSeries } from "../data/themeCatalog";
import { copyText, openExternalUrl, startWindowDrag } from "../lib/desktop";
import { deleteEditorBackgroundImage, loadEditorBackgroundImageUrl, saveEditorBackgroundImage } from "../lib/editorBackgroundStore";
import { formatKeyboardShortcut } from "../lib/shortcuts";
import { storageKeys } from "../lib/persistence";
import type { HistoryItem, PromptStatItem, SettingsState, ShortcutItem, StashItem, TemplateItem } from "../types";

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

type ShortcutConflictState = {
  action: string;
  keys: string;
} | null;

type BackgroundImageView = Pick<
  SettingsState,
  | "editorBackgroundImageId"
  | "editorBackgroundImagePath"
  | "editorBackgroundFit"
  | "editorBackgroundScale"
  | "editorBackgroundX"
  | "editorBackgroundY"
>;

type ManageWindowProps = {
  draft: string;
  templates: TemplateItem[];
  history: HistoryItem[];
  promptStats: PromptStatItem[];
  stashItems: StashItem[];
  shortcuts: ShortcutItem[];
  settings: SettingsState;
  onTemplatesChange: (templates: TemplateItem[]) => void;
  onHistoryChange: (history: HistoryItem[]) => void;
  onShortcutsChange: (shortcuts: ShortcutItem[]) => void;
  onSettingsChange: (settings: SettingsState) => void;
  onResumeStash: (item: StashItem) => void | Promise<void>;
  onDeleteStash: (item: StashItem) => void;
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
const historyPageSize = 20;
const historyModalCloseMs = 240;
const shortcutModifierOrder = ["ctrl", "alt", "shift", "win"];

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

const normalizeShortcutPart = (part: string) => {
  const value = part.trim().toLowerCase();
  if (value === "control") return "ctrl";
  if (value === "escape") return "esc";
  if (value === "meta" || value === "cmd" || value === "super") return "win";
  return value;
};

const normalizeShortcutForConflict = (shortcut: string) => {
  const parts = shortcut.split(/\s*\+\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  const key = normalizeShortcutPart(parts[parts.length - 1]);
  const modifiers = Array.from(new Set(parts.slice(0, -1).map(normalizeShortcutPart))).sort(
    (left, right) => shortcutModifierOrder.indexOf(left) - shortcutModifierOrder.indexOf(right)
  );
  return [...modifiers, key].join("+");
};

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

const makeBackgroundStyle = (value: BackgroundImageView) =>
  ({
    "--editor-background-scale": `${value.editorBackgroundScale / 100}`,
    "--editor-background-width": `${value.editorBackgroundScale}%`,
    "--editor-background-x": `${value.editorBackgroundX}%`,
    "--editor-background-y": `${value.editorBackgroundY}%`
  }) as CSSProperties;

const makeBackgroundPreviewStyle = (settings: SettingsState) =>
  ({
    ...makeBackgroundStyle(settings),
    aspectRatio: `${settings.editWindowWidth} / ${settings.editWindowHeight}`
  }) as CSSProperties;

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
  stashItems,
  shortcuts,
  settings,
  onTemplatesChange,
  onHistoryChange,
  onShortcutsChange,
  onSettingsChange,
  onResumeStash,
  onDeleteStash,
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
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(historyPageSize);
  const [historyModalPhase, setHistoryModalPhase] = useState<"open" | "closing">("open");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [recordingShortcutId, setRecordingShortcutId] = useState<string | null>(null);
  const [shortcutConflict, setShortcutConflict] = useState<ShortcutConflictState>(null);
  const [heatTooltip, setHeatTooltip] = useState<HeatTooltipState | null>(null);
  const [expandedStashIds, setExpandedStashIds] = useState<Set<string>>(() => new Set());
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState("");
  const [navIndicator, setNavIndicator] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLElement | null>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
  const navButtonRefs = useRef<Partial<Record<Section, HTMLButtonElement>>>({});
  const switchTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const historyClearTimer = useRef<number | undefined>(undefined);
  const historyModalCloseTimer = useRef<number | undefined>(undefined);

  const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);
  const statsModel = useMemo(() => buildStatsModel(promptStats, templates), [promptStats, templates]);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? sortedTemplates[0];
  const activeHistory = history.find((item) => item.id === activeHistoryId) ?? null;
  const contextTemplate = templateMenu ? templates.find((template) => template.id === templateMenu.templateId) : null;
  const filteredHistory = useMemo(() => {
    const keyword = historyKeyword.trim().toLowerCase();
    return history.filter((item) => {
      const matchesKeyword = !keyword || item.body.toLowerCase().includes(keyword);
      const matchesDate = !historyDateFilter || toDateKey(item.createdAt) === historyDateFilter;
      return matchesKeyword && matchesDate;
    });
  }, [history, historyDateFilter, historyKeyword]);
  const visibleHistory = useMemo(() => filteredHistory.slice(0, historyVisibleCount), [filteredHistory, historyVisibleCount]);
  const hasMoreHistory = visibleHistory.length < filteredHistory.length;
  const hasHistoryFilters = Boolean(historyKeyword.trim() || historyDateFilter);

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

  const openHistoryModal = (itemId: string) => {
    window.clearTimeout(historyModalCloseTimer.current);
    setHistoryModalPhase("open");
    setActiveHistoryId(itemId);
  };

  const closeHistoryModal = () => {
    if (!activeHistoryId || historyModalPhase === "closing") return;

    setHistoryModalPhase("closing");
    window.clearTimeout(historyModalCloseTimer.current);
    historyModalCloseTimer.current = window.setTimeout(() => {
      setActiveHistoryId(null);
      setHistoryModalPhase("open");
    }, historyModalCloseMs);
  };

  const resetHistoryFilters = () => {
    setHistoryKeyword("");
    setHistoryDateFilter("");
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

  const askDeleteStash = (item: StashItem) => {
    setConfirmRequest({
      title: "删除暂存",
      message: "确认删除这条暂存 prompt？",
      confirmLabel: "删除",
      onConfirm: () => onDeleteStash(item)
    });
  };

  const updateShortcut = (shortcutId: string, keys: string) => {
    setShortcutConflict(null);
    onShortcutsChange(shortcuts.map((shortcut) => (shortcut.id === shortcutId ? { ...shortcut, keys } : shortcut)));
  };

  const findShortcutConflict = (shortcutId: string, keys: string) => {
    const normalizedKeys = normalizeShortcutForConflict(keys);
    if (!normalizedKeys) return null;

    return (
      shortcuts.find((shortcut) => shortcut.id !== shortcutId && normalizeShortcutForConflict(shortcut.keys) === normalizedKeys) ??
      null
    );
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

  const handleBackgroundFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const savedImage = await saveEditorBackgroundImage(file);
      if (settings.editorBackgroundImageId && settings.editorBackgroundImageId !== savedImage.id) {
        void deleteEditorBackgroundImage(settings.editorBackgroundImageId);
      }

      onSettingsChange({
        ...settings,
        editorBackgroundImage: "",
        editorBackgroundImageId: savedImage.id,
        editorBackgroundImagePath: savedImage.name,
        editorBackgroundFit: "cover",
        editorBackgroundScale: 100,
        editorBackgroundX: 50,
        editorBackgroundY: 50
      });
    } catch {
      return;
    }
  };

  const updateBackgroundSettings = (patch: Partial<SettingsState>) => {
    onSettingsChange({
      ...settings,
      ...patch,
      editorBackgroundImage: ""
    });
  };

  const removeBackgroundImage = () => {
    if (settings.editorBackgroundImageId) {
      void deleteEditorBackgroundImage(settings.editorBackgroundImageId);
    }

    onSettingsChange({
      ...settings,
      editorBackgroundImageId: "",
      editorBackgroundImage: "",
      editorBackgroundImagePath: "",
      editorBackgroundFit: "cover",
      editorBackgroundScale: 100,
      editorBackgroundX: 50,
      editorBackgroundY: 50
    });
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(switchTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(historyClearTimer.current);
      window.clearTimeout(historyModalCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    setHistoryVisibleCount(historyPageSize);
  }, [historyDateFilter, historyKeyword]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    setBackgroundPreviewUrl("");

    if (!settings.editorBackgroundImageId) {
      return () => undefined;
    }

    void loadEditorBackgroundImageUrl(settings.editorBackgroundImageId).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }

      objectUrl = url;
      setBackgroundPreviewUrl(url);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings.editorBackgroundImageId]);

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
      const conflict = findShortcutConflict(recordingShortcutId, keys);
      if (conflict) {
        setShortcutConflict({ action: conflict.action, keys });
        setRecordingShortcutId(null);
        return;
      }

      updateShortcut(recordingShortcutId, keys);
      setRecordingShortcutId(null);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recordingShortcutId, shortcuts]);

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
        closeHistoryModal();
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

          <div className="stats-summary-grid">
            <MetricCard label="总提示词" value={formatNumber(statsModel.totalPrompts)} caption="包含已删除历史" />
            <MetricCard label="总字数" value={formatNumber(statsModel.totalChars)} caption="按提交时文本长度统计" />
            <MetricCard label="平均字数" value={formatNumber(statsModel.averageChars)} caption="每条 prompt 平均长度" />
            <MetricCard label="连续写作" value={`${statsModel.currentStreak} 天`} caption="从今天向前连续统计" />
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
          <div className="history-filter-row">
            <label className="search-box history-search-box">
              <Search size={16} />
              <input
                value={historyKeyword}
                onChange={(event) => setHistoryKeyword(event.target.value)}
                placeholder="搜索历史关键词"
              />
            </label>
            <label className="history-date-filter">
              <span>日期</span>
              <input type="date" value={historyDateFilter} onChange={(event) => setHistoryDateFilter(event.target.value)} />
            </label>
            <span className="history-result-count">
              {filteredHistory.length}/{history.length}
            </span>
            {hasHistoryFilters ? (
              <button className="tool-button history-filter-reset" type="button" onClick={resetHistoryFilters}>
                清空
              </button>
            ) : null}
          </div>
          <div className="history-list">
            {visibleHistory.map((item) => (
              <div className="history-item" key={item.id}>
                <button className="history-open" type="button" onClick={() => openHistoryModal(item.id)}>
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
            {hasMoreHistory ? (
              <div className="history-list-footer">
                <button
                  className="tool-button history-load-more"
                  type="button"
                  onClick={() => setHistoryVisibleCount((count) => count + historyPageSize)}
                >
                  加载更多
                  <span>{Math.min(historyPageSize, filteredHistory.length - visibleHistory.length)} 条</span>
                </button>
              </div>
            ) : null}
            {history.length === 0 ? (
              <div className="empty-state">
                <strong>还没有历史</strong>
                <span>执行复制并退出后，这里会保留 prompt 痕迹。</span>
              </div>
            ) : null}
            {history.length > 0 && filteredHistory.length === 0 ? (
              <div className="empty-state">
                <strong>没有匹配的历史</strong>
                <span>换一个关键词或日期再试。</span>
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
              <p className="eyebrow">续写队列</p>
              <h2>暂存</h2>
            </div>
          </div>
          <div className="stash-list">
            {stashItems.map((item) => {
              const expanded = expandedStashIds.has(item.id);
              const canExpand = item.body.split("\n").length > 5 || item.body.length > 360;
              return (
                <article className={`stash-item ${expanded ? "is-expanded" : ""}`} key={item.id}>
                  <div className="stash-item-head">
                    <span>
                      <time>{new Date(item.createdAt).toLocaleString()}</time>
                      <small>{item.body.length} 字</small>
                    </span>
                    <div>
                      <button className="tool-button" type="button" onClick={() => void onResumeStash(item)}>
                        <FileText size={16} />
                        书写
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => askDeleteStash(item)} title="删除暂存">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <pre>{item.body}</pre>
                  {canExpand ? (
                    <button
                      className="stash-expand-button"
                      type="button"
                      onClick={() =>
                        setExpandedStashIds((ids) => {
                          const next = new Set(ids);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          return next;
                        })
                      }
                    >
                      {expanded ? "收起" : "展开"}
                    </button>
                  ) : null}
                </article>
              );
            })}
            {stashItems.length === 0 ? (
              <div className="empty-state">
                <strong>暂无暂存</strong>
                <span>在编辑窗口按 Ctrl+S 保存，或按 Ctrl+J 暂存并清除。</span>
              </div>
            ) : null}
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
                    setShortcutConflict(null);
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
                      onClick={() => {
                        setRecordingShortcutId(shortcut.id);
                        setShortcutConflict(null);
                      }}
                    >
                      <span>{shortcut.action}</span>
                      <kbd>{isRecording ? "按下新快捷键" : shortcut.keys}</kbd>
                      <small>{isRecording ? "Esc 取消" : shortcut.scope}</small>
                    </button>
                  );
                })}
              </div>
              {shortcutConflict ? (
                <div className="shortcut-conflict-alert" role="alert">
                  <AlertTriangle size={16} />
                  <span>
                    快捷键 <kbd>{shortcutConflict.keys}</kbd> 已被「{shortcutConflict.action}」使用，请换一个。
                  </span>
                </div>
              ) : null}
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
              <div className="setting-stack data-setting-stack">
                <NumberSetting
                  label="历史记录保留数"
                  value={settings.historyLimit}
                  min={30}
                  max={3000}
                  unit="条"
                  onChange={(value) => onSettingsChange({ ...settings, historyLimit: value })}
                />
                <div className="data-grid">
                  <ActionTile icon={Archive} title="本地数据库" body="%APPDATA%/PromptDock/prompt-dock.sqlite" />
                  <ActionTile icon={Download} title="导出数据" body="导出模板、设置和历史备份。" />
                  <ActionTile icon={Upload} title="恢复备份" body="从 JSON 备份恢复本地数据。" />
                  <CompactToggleTile
                    icon={Settings}
                    title="开机自启动"
                    body="启动系统时自动唤起 Prompt Dock。"
                    value={settings.launchAtStartup}
                    onChange={(value) => onSettingsChange({ ...settings, launchAtStartup: value })}
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      );
    }

    if (currentSection === "appearance") {
      return (
        <section className="single-panel appearance-panel">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">主题系列</p>
              <h2>外观</h2>
            </div>
          </div>
          <div className="setting-stack">
            <ThemeSeriesPicker value={settings.visualTheme} onChange={(value) => onSettingsChange({ ...settings, visualTheme: value })} />
            <input
              ref={backgroundFileInputRef}
              className="background-file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml"
              onChange={(event) => void handleBackgroundFileChange(event)}
            />
            <BackgroundImageSetting
              imagePath={settings.editorBackgroundImagePath}
              hasImage={Boolean(settings.editorBackgroundImageId)}
              onBrowse={() => backgroundFileInputRef.current?.click()}
            />
            {settings.editorBackgroundImageId ? (
              <BackgroundImageControls
                settings={settings}
                previewUrl={backgroundPreviewUrl}
                onChange={updateBackgroundSettings}
                onRemove={removeBackgroundImage}
              />
            ) : null}
            <div className="setting-row editor-measure-row" role="group" aria-label="编辑框尺寸与透明度">
              <CompactNumberSetting
                label="宽度"
                value={settings.editWindowWidth}
                min={520}
                max={1600}
                unit="px"
                onChange={(value) => onSettingsChange({ ...settings, editWindowWidth: value })}
              />
              <CompactNumberSetting
                label="高度"
                value={settings.editWindowHeight}
                min={360}
                max={1000}
                unit="px"
                onChange={(value) => onSettingsChange({ ...settings, editWindowHeight: value })}
              />
              <CompactSliderSetting
                label="透明度"
                value={settings.editOpacity}
                min={35}
                max={100}
                step={5}
                unit="%"
                onChange={(value) => onSettingsChange({ ...settings, editOpacity: value })}
              />
            </div>
            <div className="setting-row appearance-toggle-row" role="group" aria-label="编辑器辅助显示">
              <InlineToggle label="显示行号" value={settings.editorLineNumbers} onChange={(value) => onSettingsChange({ ...settings, editorLineNumbers: value })} />
              <InlineToggle
                label="高亮当前行"
                value={settings.editorCurrentLineHighlight}
                onChange={(value) => onSettingsChange({ ...settings, editorCurrentLineHighlight: value })}
              />
              <InlineToggle
                label="编辑框始终显示在窗口顶部"
                value={settings.editAlwaysOnTop}
                onChange={(value) => onSettingsChange({ ...settings, editAlwaysOnTop: value })}
              />
            </div>
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
    <main className="manage-shell" aria-label="Prompt Dock">
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
            <strong>Prompt Dock</strong>
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
        <div className={`modal-layer ${historyModalPhase === "closing" ? "is-closing" : ""}`} role="presentation" onPointerDown={closeHistoryModal}>
          <section className="history-modal" role="dialog" aria-modal="true" aria-label="历史详情" onPointerDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">prompt 历史</p>
                <h2>{new Date(activeHistory.createdAt).toLocaleString()}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeHistoryModal} title="关闭">
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

function ThemeSeriesPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="theme-series-list">
      {visualThemeSeries.map((series) => (
        <section className="theme-series-row" key={series.id}>
          <div className="theme-series-copy">
            <strong>{series.name}</strong>
            <span>{series.description}</span>
          </div>
          <div className="theme-choice-list" aria-label={`${series.name}主题`}>
            {series.themes.map((theme) => (
              <button
                className={`theme-choice ${value === theme.id ? "is-active" : ""}`}
                type="button"
                key={theme.id}
                onClick={() => onChange(theme.id)}
                aria-pressed={value === theme.id}
              >
                <span className="theme-choice-preview" aria-hidden="true">
                  {theme.swatches.map((swatch, index) => (
                    <span key={`${theme.id}-${swatch}-${index}`} style={{ background: swatch }} />
                  ))}
                </span>
                <span className="theme-choice-meta">
                  <strong>{theme.name}</strong>
                  <small>{theme.mode === "day" ? "日间" : "夜间"}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BackgroundImageSetting({
  imagePath,
  hasImage,
  onBrowse
}: {
  imagePath: string;
  hasImage: boolean;
  onBrowse: () => void;
}) {
  const displayPath = hasImage ? imagePath || "自定义背景图" : "图片地址";
  const title = `编辑器背景：${displayPath}`;

  return (
    <div className="background-setting-row">
      <button className={`background-address-button ${hasImage ? "" : "is-empty"}`} type="button" onClick={onBrowse} title={title}>
        <ImageIcon size={16} />
        <span className="background-address-label">编辑器背景</span>
        <span className="background-address-value">{displayPath}</span>
      </button>
      <button className="tool-button" type="button" onClick={onBrowse}>
        <FolderOpen size={16} />
        浏览
      </button>
    </div>
  );
}

function BackgroundImageControls({
  settings,
  previewUrl,
  onChange,
  onRemove
}: {
  settings: SettingsState;
  previewUrl: string;
  onChange: (patch: Partial<SettingsState>) => void;
  onRemove: () => void;
}) {
  return (
    <section className="background-inline-panel">
      <div className="background-inline-preview" style={makeBackgroundPreviewStyle(settings)}>
        {previewUrl ? (
          <div className="edit-background-layer background-preview-layer" aria-hidden="true">
            <img
              className={`edit-background-image is-${settings.editorBackgroundFit}`}
              src={previewUrl}
              alt=""
              draggable={false}
            />
            <div className="edit-background-overlay" />
          </div>
        ) : (
          <div className="background-preview-empty">
            <ImageIcon size={20} />
            <span>读取背景图</span>
          </div>
        )}
      </div>
      <div className="background-inline-controls">
        <Segmented
          label="展开模式"
          value={settings.editorBackgroundFit}
          options={[
            ["cover", "扩张"],
            ["center", "居中"]
          ]}
          onChange={(value) => onChange({ editorBackgroundFit: value as SettingsState["editorBackgroundFit"] })}
        />
        <SliderSetting
          label="图片大小"
          value={settings.editorBackgroundScale}
          min={30}
          max={220}
          step={5}
          unit="%"
          onChange={(value) => onChange({ editorBackgroundScale: value })}
        />
        <SliderSetting
          label="横向位置"
          value={settings.editorBackgroundX}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(value) => onChange({ editorBackgroundX: value })}
        />
        <SliderSetting
          label="纵向位置"
          value={settings.editorBackgroundY}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(value) => onChange({ editorBackgroundY: value })}
        />
        <div className="background-inline-actions">
          <span>修改会立即应用到编辑器窗口。</span>
          <button className="tool-button danger" type="button" onClick={onRemove}>
            <Trash2 size={16} />
            移除背景
          </button>
        </div>
      </div>
    </section>
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

function InlineToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-toggle">
      <span>{label}</span>
      <button className={`toggle ${value ? "is-on" : ""}`} type="button" onClick={() => onChange(!value)} aria-pressed={value}>
        <span />
      </button>
    </label>
  );
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="setting-row slider-setting">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>
        {value}
        {unit}
      </strong>
    </label>
  );
}

function NumberSetting({
  label,
  value,
  min,
  max,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <label className="setting-row number-setting">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <small>
        {min}-{max}
        {unit}
      </small>
    </label>
  );
}

function CompactNumberSetting({
  label,
  value,
  min,
  max,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <label className="editor-measure-control">
      <span>{label}</span>
      <span className="editor-measure-input">
        <input
          type="number"
          min={min}
          max={max}
          value={draft}
          onBlur={commit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <small>{unit}</small>
      </span>
    </label>
  );
}

function CompactSliderSetting({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="editor-measure-control">
      <span>{label}</span>
      <span className="editor-measure-input">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <strong>
          {value}
          {unit}
        </strong>
      </span>
    </label>
  );
}

function ActionTile({ icon: Icon, title, body }: { icon: typeof Archive; title: string; body: string }) {
  return (
    <button className="action-tile" type="button">
      <Icon size={20} />
      <span className="action-tile-copy">
        <strong>{title}</strong>
        <span>{body}</span>
      </span>
    </button>
  );
}

function CompactToggleTile({
  icon: Icon,
  title,
  body,
  value,
  onChange
}: {
  icon: typeof Archive;
  title: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="action-tile compact-toggle-tile">
      <Icon size={20} />
      <span className="action-tile-copy">
        <strong>{title}</strong>
        <span>{body}</span>
      </span>
      <button className={`toggle ${value ? "is-on" : ""}`} type="button" onClick={() => onChange(!value)} aria-label={title} aria-pressed={value}>
        <span />
      </button>
    </div>
  );
}
