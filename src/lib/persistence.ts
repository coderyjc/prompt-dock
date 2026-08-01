import { useEffect, useState } from "react";

const readValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeValue = <T,>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

export const usePersistentState = <T,>(key: string, fallback: T) => {
  const [value, setValue] = useState<T>(() => readValue(key, fallback));

  useEffect(() => {
    writeValue(key, value);
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return;

      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        setValue(fallback);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fallback, key]);

  return [value, setValue] as const;
};

export const storageKeys = {
  draft: "prompt-dock:draft",
  templates: "prompt-dock:templates",
  history: "prompt-dock:history",
  promptStats: "prompt-dock:prompt-stats",
  stash: "prompt-dock:stash",
  manageSection: "prompt-dock:manage-section",
  shortcuts: "prompt-dock:shortcuts",
  settings: "prompt-dock:settings"
};
