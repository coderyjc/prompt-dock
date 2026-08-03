export const invokeCommand = async <T,>(command: string, args?: Record<string, unknown>) => {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
};

export const startWindowDrag = async () => {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startDragging();
  } catch {
    return undefined;
  }
};

export const setGlobalToggleShortcut = async (keys: string) => {
  try {
    await invokeCommand("set_global_toggle_shortcut", { keys });
    return true;
  } catch {
    return false;
  }
};

export const setEditWindowSize = async (width: number, height: number) => {
  try {
    await invokeCommand("set_edit_window_size", { width, height });
    return true;
  } catch {
    return false;
  }
};

export const setEditWindowLayout = async (width: number, height: number, placement: "center" | "cursor" | "last", alwaysOnTop: boolean) => {
  try {
    await invokeCommand("set_edit_window_layout", { width, height, placement, alwaysOnTop });
    return true;
  } catch {
    return false;
  }
};

export const copyText = async (text: string) => {
  try {
    await invokeCommand("copy_prompt", { text });
    return true;
  } catch {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }
};

export const openExternalUrl = async (url: string) => {
  try {
    await invokeCommand("open_external_url", { url });
    return true;
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
};

export const openManageWindow = async () => {
  try {
    await invokeCommand("open_manage_window");
  } catch {
    window.open(`${window.location.origin}${window.location.pathname}?window=manage`, "prompt-dock-workbench", "width=1080,height=720");
  }
};

export const openEditWindow = async () => {
  try {
    await invokeCommand("open_edit_window");
  } catch {
    window.open(`${window.location.origin}${window.location.pathname}?window=edit`, "prompt-dock-edit", "width=760,height=520");
  }
};

export const hideManageWindow = async () => {
  try {
    await invokeCommand("hide_manage_window");
  } catch {
    return undefined;
  }
};

export const hideEditWindow = async () => {
  try {
    await invokeCommand("hide_edit_window");
  } catch {
    return undefined;
  }
};
