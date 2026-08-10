"use client";

import { useEffect, useMemo, useState } from "react";
import { hasAdminPortalAccess } from "./permission-modules";
import { getUnifiedNavSections, type NavItem, type NavSection, type NavVariant } from "./navigation";
import { API_BASE_URL } from "../../lib/api-base-url";

const sessionStorageKey = "hinora_session";
const permissionsCacheKey = "hinora_sidebar_permissions";

type SessionPayload = {
  roleTitle?: string;
  role?: string;
};

type SidebarPermissionsState = {
  allowedModules: Set<string> | null;
  portal: "admin" | "employee" | null;
};

type CachedPermissionsPayload = {
  roleTitle: string;
  modules: string[];
  portal: "admin" | "employee" | null;
};

const memoryCache = new Map<string, CachedPermissionsPayload>();

const legacyModuleAliases: Record<string, string[]> = {
  "Compliance Center": [
    "Compliance Management",
    "Acknowledgement Management",
    "Acknowledgments",
  ],
  Location: ["Branches"],
};

function hasModuleAccess(allowedModules: Set<string>, item: NavItem) {
  // The backend module list does not cover every navigation entry yet, so items
  // without a moduleKey stay visible instead of disappearing for every role.
  if (!item.moduleKey) {
    return true;
  }

  if (allowedModules.has(item.moduleKey)) {
    return true;
  }

  const aliases = legacyModuleAliases[item.moduleKey] ?? [];
  return aliases.some((alias) => allowedModules.has(alias));
}

function resolveRoleTitle(roleTitleOverride?: string) {
  if (roleTitleOverride) {
    return roleTitleOverride;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  const session = JSON.parse(
    window.localStorage.getItem(sessionStorageKey) ?? "null",
  ) as SessionPayload | null;

  if (session?.roleTitle) {
    return session.roleTitle;
  }

  if (session?.role === "ADMIN") {
    return "Administrator";
  }

  if (session?.role === "MANAGER") {
    return "Compliance Officer";
  }

  if (session?.role === "EMPLOYEE") {
    return "User";
  }

  return undefined;
}

function normalizeCachedModules(modules: string[]) {
  const normalized = new Set<string>();

  for (const moduleKey of modules) {
    if (
      moduleKey === "Compliance Management" ||
      moduleKey === "Acknowledgement Management" ||
      moduleKey === "Acknowledgments"
    ) {
      normalized.add("Compliance Center");
      continue;
    }
    normalized.add(moduleKey);
  }

  return Array.from(normalized);
}

function readCachedPermissions(roleTitle: string): CachedPermissionsPayload | null {
  const fromMemory = memoryCache.get(roleTitle);
  if (fromMemory) {
    return {
      ...fromMemory,
      modules: normalizeCachedModules(fromMemory.modules),
    };
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(permissionsCacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedPermissionsPayload;
    if (parsed.roleTitle !== roleTitle || !Array.isArray(parsed.modules)) {
      return null;
    }

    const normalized: CachedPermissionsPayload = {
      ...parsed,
      modules: normalizeCachedModules(parsed.modules),
    };

    memoryCache.set(roleTitle, normalized);
    return normalized;
  } catch {
    return null;
  }
}

function writeCachedPermissions(payload: CachedPermissionsPayload) {
  memoryCache.set(payload.roleTitle, payload);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(permissionsCacheKey, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
}

function toState(cache: CachedPermissionsPayload | null): SidebarPermissionsState {
  if (!cache) {
    return {
      allowedModules: null,
      portal: null,
    };
  }

  return {
    allowedModules: new Set(cache.modules),
    portal: cache.portal,
  };
}

function filterSections(sections: readonly NavSection[], allowedModules: Set<string> | null) {
  if (!allowedModules) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasModuleAccess(allowedModules, item)),
    }))
    .filter((section) => section.items.length > 0);
}

export function useSidebarPermissions(roleTitleOverride?: string, fallbackVariant: NavVariant = "employee") {
  // Keep the first server/client render identical — never read storage during init.
  const [state, setState] = useState<SidebarPermissionsState>({
    allowedModules: null,
    portal: null,
  });

  useEffect(() => {
    let cancelled = false;
    const resolvedRoleTitle = resolveRoleTitle(roleTitleOverride);

    async function loadModules(options?: { background?: boolean }) {
      if (!resolvedRoleTitle) {
        if (!cancelled && !options?.background) {
          setState({ allowedModules: null, portal: null });
        }
        return;
      }

      // Restore cache after mount so menus update without a hydration mismatch.
      const cached = readCachedPermissions(resolvedRoleTitle);
      if (cached && !options?.background) {
        setState(toState(cached));
      }

      try {
        const params = new URLSearchParams();
        params.set("roleTitle", resolvedRoleTitle);
        const response = await fetch(`${API_BASE_URL}/roles-permissions/sidebar?${params.toString()}`);
        const payload = (await response.json()) as {
          modules?: string[];
          portal?: "admin" | "employee";
        };

        if (!response.ok) {
          throw new Error("Failed to load sidebar permissions.");
        }

        const nextCache: CachedPermissionsPayload = {
          roleTitle: resolvedRoleTitle,
          modules: normalizeCachedModules(payload.modules ?? []),
          portal: payload.portal ?? null,
        };

        writeCachedPermissions(nextCache);

        if (!cancelled) {
          setState(toState(nextCache));
        }
      } catch {
        // Keep the last known good sidebar instead of clearing it mid-navigation.
        if (!cancelled && !cached && !options?.background) {
          setState({ allowedModules: null, portal: null });
        }
      }
    }

    void loadModules();

    function handleFocus() {
      void loadModules({ background: true });
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [roleTitleOverride]);

  return useMemo(() => {
    const resolvedHasAdminPortalAccess =
      state.portal === "admin"
        ? true
        : state.portal === "employee"
          ? false
          : state.allowedModules
            ? hasAdminPortalAccess(state.allowedModules)
            : fallbackVariant === "admin";

    const baseSections = getUnifiedNavSections(resolvedHasAdminPortalAccess);
    const sections = filterSections(baseSections, state.allowedModules);

    return {
      sections,
      hasAdminPortalAccess: resolvedHasAdminPortalAccess,
    };
  }, [fallbackVariant, state.allowedModules, state.portal]);
}
