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

export const openManageWindow = async () => {
  try {
    await invokeCommand("open_manage_window");
  } catch {
    window.open(`${window.location.origin}${window.location.pathname}?window=manage`, "prompt-dock-manage", "width=920,height=640");
  }
};

export const openEditWindow = async () => {
  try {
    await invokeCommand("open_edit_window");
  } catch {
    window.open(`${window.location.origin}${window.location.pathname}?window=edit`, "prompt-dock-edit", "width=760,height=520");
  }
};

export const hideEditWindow = async () => {
  try {
    await invokeCommand("hide_edit_window");
  } catch {
    return undefined;
  }
};
