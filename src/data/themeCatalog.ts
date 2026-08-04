export type VisualThemeMode = "day" | "night";

export type VisualTheme = {
  id: string;
  name: string;
  mode: VisualThemeMode;
  swatches: [string, string, string];
  vars: Record<string, string>;
};

export type VisualThemeSeries = {
  id: string;
  name: string;
  description: string;
  themes: VisualTheme[];
};

const theme = (
  id: string,
  name: string,
  mode: VisualThemeMode,
  swatches: [string, string, string],
  vars: Record<string, string>
): VisualTheme => ({
  id,
  name,
  mode,
  swatches,
  vars
});

export const visualThemeSeries: VisualThemeSeries[] = [
  {
    id: "minimal",
    name: "简约",
    description: "克制留白、纸面和冷静线条。",
    themes: [
      theme("minimal-paper", "纸白", "day", ["#f7f6f1", "#1f2b2b", "#2f7d6f"], {
        bg: "#f1f0ea",
        surface: "rgba(255, 254, 249, 0.9)",
        surfaceSolid: "#fffefa",
        surfaceMuted: "#ebe9df",
        text: "#1d2828",
        muted: "#65706d",
        faint: "#969d98",
        line: "rgba(31, 45, 44, 0.14)",
        accent: "#2f7d6f",
        accentStrong: "#1d5f55",
        accentSoft: "rgba(47, 125, 111, 0.12)",
        warning: "#98671d",
        danger: "#aa3f35",
        shadow: "0 22px 70px rgba(31, 39, 37, 0.13)",
        bodyStart: "rgba(255, 254, 249, 0.92)",
        bodyEnd: "rgba(234, 233, 224, 0.82)",
        bodyGrid: "rgba(37, 48, 46, 0.045)"
      }),
      theme("minimal-frost", "霜玻", "day", ["#eef6f8", "#203035", "#4f8fab"], {
        bg: "#e8f0f2",
        surface: "rgba(250, 254, 255, 0.82)",
        surfaceSolid: "#fbfeff",
        surfaceMuted: "#e2eef1",
        text: "#203035",
        muted: "#61747a",
        faint: "#8fa0a5",
        line: "rgba(32, 48, 53, 0.13)",
        accent: "#4f8fab",
        accentStrong: "#2d6d88",
        accentSoft: "rgba(79, 143, 171, 0.14)",
        warning: "#9b6a20",
        danger: "#a94343",
        shadow: "0 24px 72px rgba(32, 48, 53, 0.13)",
        bodyStart: "rgba(250, 254, 255, 0.9)",
        bodyEnd: "rgba(218, 235, 240, 0.82)",
        bodyGrid: "rgba(54, 85, 96, 0.045)"
      }),
      theme("minimal-pearl", "珠灰", "day", ["#f3f1f4", "#28252d", "#8b6f9f"], {
        bg: "#eeeaf0",
        surface: "rgba(252, 250, 253, 0.88)",
        surfaceSolid: "#fcfbfd",
        surfaceMuted: "#e9e4ec",
        text: "#28252d",
        muted: "#6e6873",
        faint: "#99919d",
        line: "rgba(48, 42, 54, 0.13)",
        accent: "#8b6f9f",
        accentStrong: "#6c527d",
        accentSoft: "rgba(139, 111, 159, 0.13)",
        warning: "#9a6a21",
        danger: "#a33d55",
        shadow: "0 22px 66px rgba(38, 32, 44, 0.12)",
        bodyStart: "rgba(252, 250, 253, 0.9)",
        bodyEnd: "rgba(229, 224, 233, 0.8)",
        bodyGrid: "rgba(71, 60, 79, 0.04)"
      }),
      theme("minimal-graphite", "石墨", "night", ["#161a1d", "#edf1ef", "#7db9aa"], {
        bg: "#111518",
        surface: "rgba(27, 33, 36, 0.88)",
        surfaceSolid: "#1b2124",
        surfaceMuted: "#242b2e",
        text: "#edf1ef",
        muted: "#aab4b3",
        faint: "#748080",
        line: "rgba(230, 238, 236, 0.13)",
        accent: "#7db9aa",
        accentStrong: "#9dd6c9",
        accentSoft: "rgba(125, 185, 170, 0.16)",
        warning: "#d0a24d",
        danger: "#d56a63",
        shadow: "0 24px 80px rgba(0, 0, 0, 0.44)",
        bodyStart: "rgba(28, 35, 38, 0.9)",
        bodyEnd: "rgba(15, 20, 22, 0.95)",
        bodyGrid: "rgba(219, 234, 230, 0.035)"
      }),
      theme("minimal-moon", "月影", "night", ["#151820", "#eef0f7", "#a7b4e6"], {
        bg: "#10131b",
        surface: "rgba(25, 29, 40, 0.88)",
        surfaceSolid: "#191d28",
        surfaceMuted: "#222737",
        text: "#eef0f7",
        muted: "#aeb6c9",
        faint: "#737b92",
        line: "rgba(229, 234, 250, 0.13)",
        accent: "#a7b4e6",
        accentStrong: "#c6d0ff",
        accentSoft: "rgba(167, 180, 230, 0.16)",
        warning: "#d9ad59",
        danger: "#dc6f79",
        shadow: "0 24px 84px rgba(0, 0, 0, 0.46)",
        bodyStart: "rgba(28, 32, 46, 0.9)",
        bodyEnd: "rgba(10, 13, 21, 0.95)",
        bodyGrid: "rgba(216, 222, 250, 0.035)"
      })
    ]
  },
  {
    id: "ink",
    name: "活泼",
    description: "粗描边、彩色胶片和活泼档案卡。",
    themes: [
      theme("ink-rice", "酸橙档案", "day", ["#dce879", "#172033", "#ffcf36"], {
        bg: "#dce879",
        surface: "rgba(255, 253, 238, 0.94)",
        surfaceSolid: "#fffdf0",
        surfaceMuted: "#c5f0f5",
        text: "#172033",
        muted: "#57627a",
        faint: "#7d879e",
        line: "rgba(23, 32, 51, 0.26)",
        accent: "#ffcf36",
        accentStrong: "#0f1b33",
        accentSoft: "rgba(255, 207, 54, 0.36)",
        warning: "#ff9d2e",
        danger: "#ff3f79",
        shadow: "6px 6px 0 rgba(23, 32, 51, 0.2)",
        bodyStart: "rgba(224, 235, 127, 0.95)",
        bodyEnd: "rgba(185, 225, 136, 0.9)",
        bodyGrid: "rgba(23, 32, 51, 0.12)"
      }),
      theme("ink-bamboo", "海盐电波", "day", ["#aeeef4", "#172033", "#ff4da6"], {
        bg: "#aeeef4",
        surface: "rgba(255, 250, 239, 0.94)",
        surfaceSolid: "#fff9ef",
        surfaceMuted: "#f4f6a5",
        text: "#172033",
        muted: "#53617a",
        faint: "#7b89a1",
        line: "rgba(23, 32, 51, 0.25)",
        accent: "#ff4da6",
        accentStrong: "#10204c",
        accentSoft: "rgba(255, 77, 166, 0.22)",
        warning: "#ffcf36",
        danger: "#ff4f3f",
        shadow: "6px 6px 0 rgba(23, 32, 51, 0.19)",
        bodyStart: "rgba(174, 238, 244, 0.95)",
        bodyEnd: "rgba(244, 246, 165, 0.86)",
        bodyGrid: "rgba(23, 32, 51, 0.1)"
      }),
      theme("ink-cinnabar", "草莓胶片", "day", ["#ffe66d", "#1a2140", "#33d6c9"], {
        bg: "#ffe66d",
        surface: "rgba(255, 252, 241, 0.94)",
        surfaceSolid: "#fffcf1",
        surfaceMuted: "#ffd0e4",
        text: "#1a2140",
        muted: "#626989",
        faint: "#858ca8",
        line: "rgba(26, 33, 64, 0.25)",
        accent: "#33d6c9",
        accentStrong: "#101d48",
        accentSoft: "rgba(51, 214, 201, 0.26)",
        warning: "#ffae3d",
        danger: "#ff3d8b",
        shadow: "6px 6px 0 rgba(26, 33, 64, 0.2)",
        bodyStart: "rgba(255, 230, 109, 0.94)",
        bodyEnd: "rgba(255, 166, 204, 0.78)",
        bodyGrid: "rgba(26, 33, 64, 0.1)"
      }),
      theme("ink-night", "夜市霓虹", "night", ["#171329", "#f9f5d7", "#f7c531"], {
        bg: "#171329",
        surface: "rgba(32, 26, 54, 0.92)",
        surfaceSolid: "#201a36",
        surfaceMuted: "#2d2550",
        text: "#fff7d8",
        muted: "#d8cfeb",
        faint: "#9b94c2",
        line: "rgba(255, 247, 216, 0.2)",
        accent: "#f7c531",
        accentStrong: "#7df4ff",
        accentSoft: "rgba(247, 197, 49, 0.22)",
        warning: "#ff9f3d",
        danger: "#ff4f9a",
        shadow: "7px 7px 0 rgba(0, 0, 0, 0.36)",
        bodyStart: "rgba(28, 22, 54, 0.96)",
        bodyEnd: "rgba(9, 15, 43, 0.98)",
        bodyGrid: "rgba(125, 244, 255, 0.11)"
      }),
      theme("ink-bluestone", "像素蓝夜", "night", ["#061a3b", "#effbff", "#3f70ff"], {
        bg: "#061a3b",
        surface: "rgba(13, 31, 70, 0.92)",
        surfaceSolid: "#0d1f46",
        surfaceMuted: "#162d5d",
        text: "#effbff",
        muted: "#c2d7ff",
        faint: "#8ba8dc",
        line: "rgba(239, 251, 255, 0.2)",
        accent: "#3f70ff",
        accentStrong: "#ffcf36",
        accentSoft: "rgba(63, 112, 255, 0.24)",
        warning: "#ffcf36",
        danger: "#ff5f79",
        shadow: "7px 7px 0 rgba(0, 0, 0, 0.34)",
        bodyStart: "rgba(6, 26, 59, 0.96)",
        bodyEnd: "rgba(19, 86, 135, 0.92)",
        bodyGrid: "rgba(255, 207, 54, 0.1)"
      })
    ]
  },
  {
    id: "geek",
    name: "冰晶",
    description: "冰面折射、极光微光和通透晶格。",
    themes: [
      theme("geek-terminal-day", "冰川昼", "day", ["#ecfbff", "#173240", "#4ac7e8"], {
        bg: "#e5f8fb",
        surface: "rgba(251, 254, 255, 0.76)",
        surfaceSolid: "#fbfeff",
        surfaceMuted: "#d8f1f6",
        text: "#173240",
        muted: "#55737e",
        faint: "#88a4ad",
        line: "rgba(47, 117, 139, 0.2)",
        accent: "#4ac7e8",
        accentStrong: "#16708d",
        accentSoft: "rgba(74, 199, 232, 0.18)",
        warning: "#d6a94f",
        danger: "#c85d7d",
        shadow: "0 26px 76px rgba(74, 152, 180, 0.2)",
        bodyStart: "rgba(247, 254, 255, 0.88)",
        bodyEnd: "rgba(202, 238, 244, 0.76)",
        bodyGrid: "rgba(74, 199, 232, 0.08)"
      }),
      theme("geek-solar", "薄荷冰", "day", ["#e9fff7", "#153536", "#5bd9b9"], {
        bg: "#def8ef",
        surface: "rgba(250, 255, 252, 0.78)",
        surfaceSolid: "#fbfffd",
        surfaceMuted: "#d0f1ea",
        text: "#153536",
        muted: "#577a76",
        faint: "#8ba9a5",
        line: "rgba(45, 133, 119, 0.2)",
        accent: "#5bd9b9",
        accentStrong: "#1a7d71",
        accentSoft: "rgba(91, 217, 185, 0.18)",
        warning: "#d8b45f",
        danger: "#c75f80",
        shadow: "0 26px 76px rgba(64, 150, 134, 0.18)",
        bodyStart: "rgba(250, 255, 252, 0.9)",
        bodyEnd: "rgba(198, 239, 229, 0.76)",
        bodyGrid: "rgba(91, 217, 185, 0.08)"
      }),
      theme("geek-blueprint", "霞光冰", "day", ["#f7f5ff", "#202c42", "#8bc9ff"], {
        bg: "#edf3ff",
        surface: "rgba(253, 252, 255, 0.78)",
        surfaceSolid: "#fdfcff",
        surfaceMuted: "#e7def8",
        text: "#202c42",
        muted: "#647087",
        faint: "#929cb1",
        line: "rgba(92, 118, 166, 0.2)",
        accent: "#8bc9ff",
        accentStrong: "#4a66b7",
        accentSoft: "rgba(139, 201, 255, 0.18)",
        warning: "#d1a85d",
        danger: "#c7609d",
        shadow: "0 26px 78px rgba(102, 128, 180, 0.18)",
        bodyStart: "rgba(253, 252, 255, 0.9)",
        bodyEnd: "rgba(217, 230, 255, 0.78)",
        bodyGrid: "rgba(139, 201, 255, 0.08)"
      }),
      theme("geek-matrix", "极夜冰", "night", ["#102932", "#eefcff", "#7ce7f7"], {
        bg: "#0b222a",
        surface: "rgba(16, 41, 50, 0.8)",
        surfaceSolid: "#102932",
        surfaceMuted: "#173946",
        text: "#eefcff",
        muted: "#b5d8df",
        faint: "#7d9ea7",
        line: "rgba(210, 251, 255, 0.2)",
        accent: "#7ce7f7",
        accentStrong: "#c8fff5",
        accentSoft: "rgba(124, 231, 247, 0.18)",
        warning: "#f0c76b",
        danger: "#f178a1",
        shadow: "0 28px 92px rgba(0, 0, 0, 0.46)",
        bodyStart: "rgba(15, 43, 53, 0.94)",
        bodyEnd: "rgba(5, 18, 26, 0.98)",
        bodyGrid: "rgba(124, 231, 247, 0.07)"
      }),
      theme("geek-cyber", "蓝焰冰", "night", ["#111b35", "#f0f7ff", "#a7d8ff"], {
        bg: "#0e1930",
        surface: "rgba(20, 31, 56, 0.82)",
        surfaceSolid: "#141f38",
        surfaceMuted: "#1d2b4b",
        text: "#f0f7ff",
        muted: "#c3d2ed",
        faint: "#8798ba",
        line: "rgba(225, 241, 255, 0.2)",
        accent: "#a7d8ff",
        accentStrong: "#9cf6de",
        accentSoft: "rgba(167, 216, 255, 0.18)",
        warning: "#f0c56f",
        danger: "#f078b0",
        shadow: "0 28px 92px rgba(0, 0, 0, 0.46)",
        bodyStart: "rgba(21, 32, 62, 0.94)",
        bodyEnd: "rgba(8, 14, 29, 0.98)",
        bodyGrid: "rgba(156, 246, 222, 0.07)"
      })
    ]
  }
];

export const defaultVisualThemeId = "minimal-paper";

export const visualThemes = visualThemeSeries.flatMap((series) => series.themes);

export const getVisualTheme = (id: string | undefined) => {
  return visualThemes.find((item) => item.id === id) ?? visualThemes.find((item) => item.id === defaultVisualThemeId)!;
};

export const getVisualThemeSeriesId = (id: string | undefined) => {
  return visualThemeSeries.find((series) => series.themes.some((item) => item.id === id))?.id ?? "minimal";
};
