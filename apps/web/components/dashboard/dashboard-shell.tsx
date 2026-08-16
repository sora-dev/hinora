"use client";

import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { getApiBaseUrl } from "../../lib/api-base-url";
import { collectDeviceClientInfo } from "../../lib/device-info";
import { DashboardMobileNav, DashboardSidebar } from "./dashboard-nav";
import { DashboardTopbar } from "./primitives";
import type { NavVariant } from "./navigation";
import { getHinoraSession, patchHinoraSession } from "./session";

const shellDefaults: Record<
  NavVariant,
  {
    searchPlaceholder: string;
    profileName: string;
    profileRole: string;
    avatarText: string;
    notificationCount: number;
  }
> = {
  admin: {
    searchPlaceholder: "Search policies, users, documents, or ask Hinora...",
    profileName: "Admin User",
    profileRole: "System Administrator",
    avatarText: "AU",
    notificationCount: 2,
  },
  employee: {
    searchPlaceholder: "Search policies, manuals, or ask Hinora...",
    profileName: "Employee User",
    profileRole: "Employee",
    avatarText: "EU",
    notificationCount: 3,
  },
};

type DashboardShellProps = {
  variant: NavVariant;
  children: ReactNode;
  searchPlaceholder?: string;
  profileName?: string;
  profileRole?: string;
  avatarText?: string;
  notificationCount?: number;
  secondaryActionIcon?: LucideIcon;
  secondaryActionLabel?: string;
};

export default function DashboardShell({
  variant,
  children,
  searchPlaceholder,
  profileName,
  profileRole,
  avatarText,
  notificationCount,
  secondaryActionIcon,
  secondaryActionLabel,
}: DashboardShellProps) {
  const defaults = shellDefaults[variant];

  useEffect(() => {
    const session = getHinoraSession();
    const userId = session?.userId?.trim();
    const apiBaseUrl = getApiBaseUrl();
    if (!userId || !apiBaseUrl) {
      return;
    }

    let cancelled = false;

    async function touchSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/sessions/touch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            sessionId: session?.sessionId,
            ...collectDeviceClientInfo(),
          }),
        });
        const payload = (await response.json().catch(() => null)) as { id?: string } | null;
        if (!cancelled && response.ok && payload?.id) {
          patchHinoraSession({ sessionId: payload.id });
        }
      } catch {
        // Device capture is best-effort and should not block the dashboard.
      }
    }

    void touchSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant={variant} />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder={searchPlaceholder ?? defaults.searchPlaceholder}
          notificationCount={notificationCount ?? defaults.notificationCount}
          secondaryActionIcon={secondaryActionIcon}
          secondaryActionLabel={secondaryActionLabel}
          profileName={profileName ?? defaults.profileName}
          profileRole={profileRole ?? defaults.profileRole}
          avatarText={avatarText ?? defaults.avatarText}
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant={variant} />

        {children}
      </section>
    </main>
  );
}
