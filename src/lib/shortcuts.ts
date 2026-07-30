const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

const codeLabels: Record<string, string> = {
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Delete: "Delete",
  Backspace: "Backspace",
  End: "End",
  Enter: "Enter",
  Equal: "=",
  Escape: "Esc",
  Home: "Home",
  Insert: "Insert",
  Minus: "-",
  PageDown: "PageDown",
  PageUp: "PageUp",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  NumpadAdd: "NumpadAdd",
  NumpadDecimal: "NumpadDecimal",
  NumpadDivide: "NumpadDivide",
  NumpadEnter: "NumpadEnter",
  NumpadMultiply: "NumpadMultiply",
  NumpadSubtract: "NumpadSubtract"
};

const keyFromEvent = (event: KeyboardEvent) => {
  if (modifierKeys.has(event.key)) return null;
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^Numpad[0-9]$/.test(event.code)) return event.code;
  if (/^F[0-9]{1,2}$/.test(event.code)) return event.code;
  if (codeLabels[event.code]) return codeLabels[event.code];
  if (event.key.length === 1) return event.key.toUpperCase();
  if (event.key === "Escape") return "Esc";
  if (event.key === " ") return "Space";
  return event.key || null;
};

export const formatKeyboardShortcut = (event: KeyboardEvent) => {
  const key = keyFromEvent(event);
  if (!key) return null;

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Win");
  parts.push(key);
  return parts.join(" + ");
};

const normalizeKey = (key: string) => {
  const trimmed = key.trim();
  if (trimmed.length === 1) return trimmed.toUpperCase();
  if (trimmed.toLowerCase() === "escape") return "Esc";
  return trimmed;
};

const parseShortcut = (shortcut: string) => {
  const parts = shortcut.split(/\s+\+\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const key = normalizeKey(parts[parts.length - 1]);
  const modifiers = new Set(parts.slice(0, -1).map((part) => part.toLowerCase()));
  return {
    key,
    ctrl: modifiers.has("ctrl") || modifiers.has("control"),
    alt: modifiers.has("alt"),
    shift: modifiers.has("shift"),
    meta: modifiers.has("win") || modifiers.has("meta") || modifiers.has("cmd") || modifiers.has("super")
  };
};

export const shortcutMatches = (event: KeyboardEvent, shortcut: string) => {
  const parsed = parseShortcut(shortcut);
  const key = keyFromEvent(event);
  if (!parsed || !key) return false;

  return (
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta &&
    normalizeKey(key) === parsed.key
  );
};
