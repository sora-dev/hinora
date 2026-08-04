"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardNavSection } from "./primitives";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const sessionStorageKey = "hinora_session";

type SessionPayload = {
  roleTitle?: string;
  role?: string;
};

function hasModuleAccess(allowedModules: Set<string>, label: string) {
  if (allowedModules.has(label)) {
    return true;
  }

  if (label === "Policy Management" && allowedModules.has("Policy Library")) {
    return true;
  }

  return false;
}

export function useSidebarPermissions(
  sections: readonly DashboardNavSection[],
  roleTitleOverride?: string,
) {
  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    const session =
      typeof window !== "undefined"
        ? (JSON.parse(window.localStorage.getItem(sessionStorageKey) ?? "null") as SessionPayload | null)
        : null;

    const fallbackRoleTitle =
      session?.role === "ADMIN"
        ? "Administrator"
        : session?.role === "MANAGER"
          ? "Compliance Officer"
          : session?.role === "EMPLOYEE"
            ? "User"
            : undefined;

    const roleTitle = roleTitleOverride ?? session?.roleTitle ?? fallbackRoleTitle;

    if (!roleTitle) {
      setAllowedModules(null);
      return;
    }

    const resolvedRoleTitle = roleTitle;

    let cancelled = false;

    async function loadModules() {
      try {
        const params = new URLSearchParams();
        params.set("roleTitle", resolvedRoleTitle);
        const response = await fetch(`${API_BASE_URL}/roles-permissions/sidebar?${params.toString()}`);
        const payload = (await response.json()) as { modules?: string[] };

        if (!response.ok) {
          throw new Error("Failed to load sidebar permissions.");
        }

        if (!cancelled) {
          setAllowedModules(new Set(payload.modules ?? []));
        }
      } catch {
        if (!cancelled) {
          setAllowedModules(null);
        }
      }
    }

    void loadModules();

    return () => {
      cancelled = true;
    };
  }, [roleTitleOverride]);

  return useMemo(() => {
    if (!allowedModules) {
      return sections;
    }

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => hasModuleAccess(allowedModules, item.label)),
      }))
      .filter((section) => section.items.length > 0);
  }, [allowedModules, sections]);
}
