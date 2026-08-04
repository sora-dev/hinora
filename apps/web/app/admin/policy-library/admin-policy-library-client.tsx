"use client";

import {
  Activity,
  BadgeCheck,
  Bot,
  Building2,
  ChartColumn,
  ClipboardList,
  Files,
  FolderTree,
  HardDrive,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import type { DashboardNavSection } from "../../../components/dashboard/primitives";
import PolicyLibraryExperience from "../../../components/policy-library/policy-library-experience";
import { useSidebarPermissions } from "../../../components/dashboard/use-sidebar-permissions";

const sidebarSections: readonly DashboardNavSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", Icon: LayoutDashboard, href: "/admin/dashboard" },
      { label: "Policy Management", Icon: Files, href: "/admin/policy-management" },
      { label: "Policy Library", Icon: Files, href: "/admin/policy-library", active: true },
      { label: "Categories", Icon: FolderTree, href: "/admin/categories" },
      { label: "Users", Icon: Users, href: "/admin/users" },
      { label: "Roles & Permissions", Icon: ShieldCheck, href: "/admin/roles-permissions" },
      { label: "Acknowledgments", Icon: BadgeCheck, href: "#" },
      { label: "AI Assistant Analytics", Icon: Bot, href: "#" },
      { label: "Reports", Icon: ChartColumn, href: "#" },
      { label: "Audit Logs", Icon: ClipboardList, href: "#" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Company", Icon: Building2, href: "#" },
      { label: "Settings", Icon: Settings2, href: "#" },
      { label: "Integrations", Icon: Workflow, href: "#" },
      { label: "System Health", Icon: Activity, href: "#" },
      { label: "Backup & Restore", Icon: HardDrive, href: "#" },
    ],
  },
];

export default function AdminPolicyLibraryClient() {
  const permissionSections = useSidebarPermissions(sidebarSections);

  return (
    <PolicyLibraryExperience
      mode="admin"
      sections={permissionSections}
      profileName="John Dela Cruz"
      profileRole="Administrator"
      avatarText="JD"
      footer={
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Rural Bank of Itogon</div>
            <div className="text-[0.8rem] text-slate-200/70">Administrator</div>
          </div>
        </div>
      }
    />
  );
}
