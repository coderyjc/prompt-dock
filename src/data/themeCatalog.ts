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
    name: "水墨",
    description: "宣纸、墨色与一点朱砂。",
    themes: [
      theme("ink-rice", "宣纸", "day", ["#f6f1e4", "#29251f", "#8f3d2e"], {
        bg: "#efe8d7",
        surface: "rgba(250, 246, 235, 0.9)",
        surfaceSolid: "#faf6eb",
        surfaceMuted: "#e6dcc8",
        text: "#29251f",
        muted: "#6d6558",
        faint: "#9c917f",
        line: "rgba(54, 44, 32, 0.16)",
        accent: "#8f3d2e",
        accentStrong: "#6b281d",
        accentSoft: "rgba(143, 61, 46, 0.13)",
        warning: "#9a6b23",
        danger: "#9a392f",
        shadow: "0 24px 70px rgba(48, 39, 27, 0.14)",
        bodyStart: "rgba(250, 246, 235, 0.92)",
        bodyEnd: "rgba(229, 219, 199, 0.82)",
        bodyGrid: "rgba(62, 48, 31, 0.045)"
      }),
      theme("ink-bamboo", "竹青", "day", ["#edf2e4", "#1f2b21", "#52734d"], {
        bg: "#e6eddc",
        surface: "rgba(248, 251, 242, 0.9)",
        surfaceSolid: "#f8fbf2",
        surfaceMuted: "#dbe6d1",
        text: "#1f2b21",
        muted: "#5f6d5f",
        faint: "#8a9888",
        line: "rgba(40, 60, 42, 0.15)",
        accent: "#52734d",
        accentStrong: "#395a35",
        accentSoft: "rgba(82, 115, 77, 0.14)",
        warning: "#947020",
        danger: "#9d4237",
        shadow: "0 24px 70px rgba(36, 54, 36, 0.13)",
        bodyStart: "rgba(248, 251, 242, 0.92)",
        bodyEnd: "rgba(217, 230, 205, 0.82)",
        bodyGrid: "rgba(59, 87, 55, 0.045)"
      }),
      theme("ink-cinnabar", "朱砂", "day", ["#f5e8dc", "#30221d", "#b24832"], {
        bg: "#eee0d1",
        surface: "rgba(251, 244, 237, 0.9)",
        surfaceSolid: "#fbf4ed",
        surfaceMuted: "#e8d3c2",
        text: "#30221d",
        muted: "#765f54",
        faint: "#a98d80",
        line: "rgba(75, 45, 32, 0.15)",
        accent: "#b24832",
        accentStrong: "#84301f",
        accentSoft: "rgba(178, 72, 50, 0.14)",
        warning: "#a36b1c",
        danger: "#a33d35",
        shadow: "0 24px 70px rgba(74, 45, 31, 0.14)",
        bodyStart: "rgba(251, 244, 237, 0.92)",
        bodyEnd: "rgba(229, 207, 192, 0.82)",
        bodyGrid: "rgba(138, 62, 42, 0.045)"
      }),
      theme("ink-night", "墨夜", "night", ["#111310", "#edf1e8", "#c35b40"], {
        bg: "#0d100d",
        surface: "rgba(24, 29, 24, 0.9)",
        surfaceSolid: "#181d18",
        surfaceMuted: "#222921",
        text: "#edf1e8",
        muted: "#b5beb0",
        faint: "#798375",
        line: "rgba(233, 241, 229, 0.13)",
        accent: "#c35b40",
        accentStrong: "#e18366",
        accentSoft: "rgba(195, 91, 64, 0.16)",
        warning: "#d1a24f",
        danger: "#d46758",
        shadow: "0 24px 88px rgba(0, 0, 0, 0.48)",
        bodyStart: "rgba(27, 33, 27, 0.92)",
        bodyEnd: "rgba(9, 12, 9, 0.96)",
        bodyGrid: "rgba(226, 237, 222, 0.03)"
      }),
      theme("ink-bluestone", "青石", "night", ["#101719", "#eaf2ef", "#6eb7b1"], {
        bg: "#0d1416",
        surface: "rgba(22, 33, 36, 0.9)",
        surfaceSolid: "#162124",
        surfaceMuted: "#202d31",
        text: "#eaf2ef",
        muted: "#a9bab6",
        faint: "#71847f",
        line: "rgba(226, 240, 236, 0.13)",
        accent: "#6eb7b1",
        accentStrong: "#99ded8",
        accentSoft: "rgba(110, 183, 177, 0.16)",
        warning: "#cca156",
        danger: "#cf6357",
        shadow: "0 24px 88px rgba(0, 0, 0, 0.48)",
        bodyStart: "rgba(24, 37, 40, 0.92)",
        bodyEnd: "rgba(8, 14, 16, 0.96)",
        bodyGrid: "rgba(214, 235, 230, 0.03)"
      })
    ]
  },
  {
    id: "geek",
    name: "极客",
    description: "终端、蓝图和高对比信息面板。",
    themes: [
      theme("geek-terminal-day", "终端白", "day", ["#f4f7f1", "#172116", "#2f9e44"], {
        bg: "#edf3e9",
        surface: "rgba(248, 252, 246, 0.9)",
        surfaceSolid: "#f8fcf6",
        surfaceMuted: "#e0eadc",
        text: "#172116",
        muted: "#5b6b5a",
        faint: "#849482",
        line: "rgba(23, 45, 22, 0.15)",
        accent: "#2f9e44",
        accentStrong: "#16752b",
        accentSoft: "rgba(47, 158, 68, 0.14)",
        warning: "#a36f13",
        danger: "#b23a42",
        shadow: "0 24px 70px rgba(26, 62, 31, 0.14)",
        bodyStart: "rgba(248, 252, 246, 0.92)",
        bodyEnd: "rgba(219, 233, 214, 0.82)",
        bodyGrid: "rgba(47, 158, 68, 0.05)"
      }),
      theme("geek-solar", "日冕", "day", ["#fdf7df", "#242016", "#e67700"], {
        bg: "#f5edcb",
        surface: "rgba(255, 252, 239, 0.9)",
        surfaceSolid: "#fffcef",
        surfaceMuted: "#eee0b0",
        text: "#242016",
        muted: "#6f6549",
        faint: "#9d9270",
        line: "rgba(77, 60, 22, 0.15)",
        accent: "#e67700",
        accentStrong: "#ad5600",
        accentSoft: "rgba(230, 119, 0, 0.15)",
        warning: "#b06f00",
        danger: "#b33d32",
        shadow: "0 24px 70px rgba(105, 73, 12, 0.14)",
        bodyStart: "rgba(255, 252, 239, 0.92)",
        bodyEnd: "rgba(238, 221, 170, 0.82)",
        bodyGrid: "rgba(186, 105, 0, 0.045)"
      }),
      theme("geek-blueprint", "蓝图", "day", ["#e8f3ff", "#182532", "#1c7ed6"], {
        bg: "#dceaf7",
        surface: "rgba(245, 251, 255, 0.9)",
        surfaceSolid: "#f5fbff",
        surfaceMuted: "#d0e2f2",
        text: "#182532",
        muted: "#5a6f82",
        faint: "#879cad",
        line: "rgba(25, 66, 104, 0.15)",
        accent: "#1c7ed6",
        accentStrong: "#0b5fa7",
        accentSoft: "rgba(28, 126, 214, 0.14)",
        warning: "#a46d17",
        danger: "#ad3d4a",
        shadow: "0 24px 72px rgba(25, 72, 112, 0.14)",
        bodyStart: "rgba(245, 251, 255, 0.92)",
        bodyEnd: "rgba(202, 224, 242, 0.82)",
        bodyGrid: "rgba(28, 126, 214, 0.05)"
      }),
      theme("geek-matrix", "矩阵", "night", ["#06100a", "#d9ffe0", "#34d399"], {
        bg: "#050c08",
        surface: "rgba(10, 22, 14, 0.92)",
        surfaceSolid: "#0a160e",
        surfaceMuted: "#102417",
        text: "#d9ffe0",
        muted: "#9ccba8",
        faint: "#5e8067",
        line: "rgba(164, 255, 185, 0.13)",
        accent: "#34d399",
        accentStrong: "#7bf2bd",
        accentSoft: "rgba(52, 211, 153, 0.16)",
        warning: "#d8b451",
        danger: "#ef6b6b",
        shadow: "0 24px 90px rgba(0, 0, 0, 0.55)",
        bodyStart: "rgba(11, 25, 16, 0.94)",
        bodyEnd: "rgba(3, 8, 5, 0.98)",
        bodyGrid: "rgba(52, 211, 153, 0.045)"
      }),
      theme("geek-cyber", "赛博", "night", ["#0b1020", "#edf4ff", "#38bdf8"], {
        bg: "#070b18",
        surface: "rgba(16, 24, 45, 0.92)",
        surfaceSolid: "#10182d",
        surfaceMuted: "#182341",
        text: "#edf4ff",
        muted: "#a9bbd6",
        faint: "#6f82a0",
        line: "rgba(217, 231, 255, 0.13)",
        accent: "#38bdf8",
        accentStrong: "#7dd3fc",
        accentSoft: "rgba(56, 189, 248, 0.16)",
        warning: "#f4bf50",
        danger: "#fb7185",
        shadow: "0 24px 92px rgba(0, 0, 0, 0.55)",
        bodyStart: "rgba(18, 27, 52, 0.94)",
        bodyEnd: "rgba(5, 8, 18, 0.98)",
        bodyGrid: "rgba(56, 189, 248, 0.04)"
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
