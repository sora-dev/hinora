"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { installApiActorHeaders } from "../../lib/api-actor";
import { getApiBaseUrl } from "../../lib/api-base-url";
import { saveProfileAvatar } from "../../lib/profile-avatar";
import {
  applyDisplayPreferences,
  loadProfilePreferences,
  parseProfilePreferences,
  PROFILE_PREFERENCES_CHANGED_EVENT,
  saveProfilePreferences,
  type ProfilePreferences,
} from "../../lib/profile-preferences";
import {
  THEME_CHANGE_EVENT,
  applyThemeClass,
  getStoredTheme,
  resolveTheme,
  setThemePreference,
  toggleThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "../../lib/theme";
import { getHinoraSession } from "../dashboard/session";

installApiActorHeaders();

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    function syncTheme() {
      const stored = getStoredTheme();
      setThemeState(stored);
      setResolvedTheme(resolveTheme(stored));
      applyThemeClass(stored);
    }

    function applyPreferences(preferences: ProfilePreferences) {
      applyDisplayPreferences(preferences);
      if (preferences.theme !== getStoredTheme()) {
        setThemePreference(preferences.theme);
      } else {
        syncTheme();
      }
    }

    function hydrateFromCache() {
      const cached = loadProfilePreferences(getHinoraSession()?.userId);
      if (cached) {
        applyPreferences(cached);
        return;
      }
      syncTheme();
    }

    async function hydrateFromApi() {
      const userId = getHinoraSession()?.userId?.trim();
      const apiBaseUrl = getApiBaseUrl();
      if (!userId || !apiBaseUrl) {
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/users/${userId}`);
        if (!response.ok) {
          return;
        }
        const user = (await response.json()) as {
          avatarUrl?: string | null;
          preferences?: unknown;
          updatedAt?: string;
        };
        if (user.preferences) {
          const preferences = parseProfilePreferences(user.preferences);
          saveProfilePreferences(userId, preferences);
          applyPreferences(preferences);
        }
        if (user.avatarUrl) {
          const version = user.updatedAt ? `?v=${encodeURIComponent(user.updatedAt)}` : "";
          saveProfileAvatar(userId, `${user.avatarUrl}${version}`);
        }
      } catch {
        // Keep cached avatar and preferences if the profile request fails.
      }
    }

    function handlePreferenceChange(event: Event) {
      const detail = (event as CustomEvent<{ preferences?: ProfilePreferences }>).detail;
      if (detail?.preferences) {
        applyPreferences(detail.preferences);
      }
    }

    hydrateFromCache();
    void hydrateFromApi();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener("storage", syncTheme);
    window.addEventListener(PROFILE_PREFERENCES_CHANGED_EVENT, handlePreferenceChange);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncTheme);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(PROFILE_PREFERENCES_CHANGED_EVENT, handlePreferenceChange);
      media.removeEventListener("change", syncTheme);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemePreference,
      toggleTheme: toggleThemePreference,
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
