import { getApiBaseUrl } from "./api-base-url";
import { isThemePreference, type ThemePreference } from "./theme";

export const PROFILE_PREFERENCES_CHANGED_EVENT = "hinora-profile-preferences-changed";

export const profilePrimaryColors = [
  { id: "blue", label: "Blue", value: "#2563eb", hover: "#1d4ed8" },
  { id: "indigo", label: "Indigo", value: "#1e3a8a", hover: "#172554" },
  { id: "purple", label: "Purple", value: "#7c3aed", hover: "#6d28d9" },
  { id: "green", label: "Green", value: "#16a34a", hover: "#15803d" },
  { id: "cyan", label: "Cyan", value: "#0891b2", hover: "#0e7490" },
  { id: "orange", label: "Orange", value: "#ea580c", hover: "#c2410c" },
  { id: "red", label: "Red", value: "#dc2626", hover: "#b91c1c" },
  { id: "pink", label: "Pink", value: "#db2777", hover: "#be185d" },
  { id: "grey", label: "Grey", value: "#64748b", hover: "#475569" },
] as const;

export type ProfilePreferences = {
  theme: ThemePreference;
  primaryColor: string;
  fontSize: string;
  compactMode: boolean;
  reduceMotion: boolean;
  language: string;
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  firstDayOfWeek: string;
  defaultDashboardView: string;
  itemsPerPage: string;
  showQuickActions: boolean;
};

export const defaultProfilePreferences: ProfilePreferences = {
  theme: "light",
  primaryColor: "blue",
  fontSize: "Medium (Default)",
  compactMode: false,
  reduceMotion: false,
  language: "English (United States)",
  dateFormat: "MMM DD, YYYY (Aug 05, 2026)",
  timeFormat: "12-hour (1:30 PM)",
  timeZone: "(GMT+08:00) Asia/Manila",
  firstDayOfWeek: "Monday",
  defaultDashboardView: "My Compliance Overview",
  itemsPerPage: "20 items",
  showQuickActions: true,
};

const PREFERENCES_STORAGE_PREFIX = "hinora_prefs_";

const fontSizeMap: Record<string, string> = {
  Small: "15px",
  "Medium (Default)": "16px",
  Large: "17px",
  "Extra Large": "18px",
};

function preferencesStorageKey(userId: string) {
  return `${PREFERENCES_STORAGE_PREFIX}${userId}`;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseProfilePreferences(value: unknown): ProfilePreferences {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const theme = isThemePreference(source.theme)
    ? source.theme
    : defaultProfilePreferences.theme;
  const primaryColor = profilePrimaryColors.some((color) => color.id === source.primaryColor)
    ? String(source.primaryColor)
    : defaultProfilePreferences.primaryColor;

  return {
    theme,
    primaryColor,
    fontSize: readString(source.fontSize, defaultProfilePreferences.fontSize),
    compactMode: readBoolean(source.compactMode, defaultProfilePreferences.compactMode),
    reduceMotion: readBoolean(source.reduceMotion, defaultProfilePreferences.reduceMotion),
    language: readString(source.language, defaultProfilePreferences.language),
    dateFormat: readString(source.dateFormat, defaultProfilePreferences.dateFormat),
    timeFormat: readString(source.timeFormat, defaultProfilePreferences.timeFormat),
    timeZone: readString(source.timeZone, defaultProfilePreferences.timeZone),
    firstDayOfWeek: readString(source.firstDayOfWeek, defaultProfilePreferences.firstDayOfWeek),
    defaultDashboardView: readString(
      source.defaultDashboardView,
      defaultProfilePreferences.defaultDashboardView,
    ),
    itemsPerPage: readString(source.itemsPerPage, defaultProfilePreferences.itemsPerPage),
    showQuickActions: readBoolean(
      source.showQuickActions,
      defaultProfilePreferences.showQuickActions,
    ),
  };
}

export function loadProfilePreferences(userId?: string | null) {
  if (typeof window === "undefined" || !userId?.trim()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(preferencesStorageKey(userId.trim()));
    if (!raw) return null;
    return parseProfilePreferences(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveProfilePreferences(userId: string, preferences: ProfilePreferences) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }

  window.localStorage.setItem(
    preferencesStorageKey(userId.trim()),
    JSON.stringify(preferences),
  );
  window.dispatchEvent(
    new CustomEvent(PROFILE_PREFERENCES_CHANGED_EVENT, {
      detail: { userId: userId.trim(), preferences },
    }),
  );
}

export function applyDisplayPreferences(preferences: ProfilePreferences) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const color =
    profilePrimaryColors.find((item) => item.id === preferences.primaryColor) ??
    profilePrimaryColors[0];

  root.style.setProperty("--color-active-menu", color.value);
  root.style.setProperty("--color-hover", color.hover);
  root.style.fontSize = fontSizeMap[preferences.fontSize] ?? "16px";
  root.classList.toggle("compact-ui", preferences.compactMode);
  root.classList.toggle("reduce-motion", preferences.reduceMotion);
}

export async function persistProfilePreferences(
  userId: string,
  preferences: ProfilePreferences,
) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("Unable to reach the server.");
  }

  const response = await fetch(`${apiBaseUrl}/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { preferences?: unknown; message?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to save preferences.");
  }

  const saved = parseProfilePreferences(payload?.preferences ?? preferences);
  saveProfilePreferences(userId, saved);
  applyDisplayPreferences(saved);
  return saved;
}
