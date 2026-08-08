"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { DashboardMobileNav, DashboardSidebar } from "./dashboard-nav";
import { DashboardTopbar } from "./primitives";
import type { NavVariant } from "./navigation";

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

  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
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
