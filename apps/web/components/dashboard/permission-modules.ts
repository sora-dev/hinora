import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Building2,
  ChartColumn,
  ClipboardCheck,
  FilePenLine,
  FileText,
  House,
  LayoutGrid,
  Network,
  ScrollText,
  Settings,
  Shield,
  SquarePen,
  UserLock,
  Users,
} from "lucide-react";

export type PermissionAudience = "admin" | "employee" | "both";

export type PermissionModuleDefinition = {
  key: string;
  label: string;
  section: string;
  audience: PermissionAudience;
  Icon: LucideIcon;
};

/** Sidebar-aligned modules. Keys must match the backend moduleOrder list. */
export const permissionModules: readonly PermissionModuleDefinition[] = [
  { key: "Dashboard", label: "Dashboard", section: "MAIN", audience: "both", Icon: House },
  { key: "Policy Library", label: "Policy Library", section: "MAIN", audience: "both", Icon: FileText },
  { key: "Policy Management", label: "Policy Management", section: "MAIN", audience: "admin", Icon: FilePenLine },
  { key: "Policy Assignments", label: "Policy Assignments", section: "MAIN", audience: "admin", Icon: ClipboardCheck },
  { key: "Categories", label: "Categories", section: "MAIN", audience: "admin", Icon: LayoutGrid },
  {
    key: "Compliance Center",
    label: "Compliance Center",
    section: "COMPLIANCE",
    audience: "admin",
    Icon: BadgeCheck,
  },
  { key: "Assessment Builder", label: "Assessment Builder", section: "COMPLIANCE", audience: "admin", Icon: SquarePen },
  { key: "Reports", label: "Reports", section: "COMPLIANCE", audience: "admin", Icon: ChartColumn },
  { key: "Users", label: "Users", section: "ADMINISTRATION", audience: "admin", Icon: Users },
  { key: "Departments", label: "Departments", section: "ADMINISTRATION", audience: "both", Icon: Network },
  { key: "Location", label: "Location", section: "ADMINISTRATION", audience: "both", Icon: Building2 },
  {
    key: "Roles & Permissions",
    label: "Roles & Permissions",
    section: "ADMINISTRATION",
    audience: "admin",
    Icon: UserLock,
  },
  { key: "Audit Logs", label: "Audit Logs", section: "ADMINISTRATION", audience: "admin", Icon: ScrollText },
  { key: "Settings", label: "Settings", section: "ACCOUNT", audience: "both", Icon: Settings },
  { key: "My Compliance", label: "My Compliance", section: "MY COMPLIANCE", audience: "employee", Icon: Shield },
  { key: "Bookmarks", label: "Bookmarks", section: "MY COMPLIANCE", audience: "employee", Icon: Bookmark },
  { key: "Notifications", label: "Notifications", section: "MY COMPLIANCE", audience: "employee", Icon: Bell },
] as const;

export const moduleOrder = permissionModules.map((module) => module.key);

const moduleMap = new Map(permissionModules.map((module) => [module.key, module]));

export function getPermissionModule(moduleKey: string) {
  return moduleMap.get(moduleKey);
}

export function groupPermissionsBySection<T extends { moduleKey: string }>(permissions: T[]) {
  const orderIndex = new Map(moduleOrder.map((key, index) => [key, index]));
  const sorted = [...permissions].sort(
    (left, right) => (orderIndex.get(left.moduleKey) ?? 999) - (orderIndex.get(right.moduleKey) ?? 999),
  );

  const groups: Array<{ section: string; permissions: T[] }> = [];

  for (const permission of sorted) {
    const section = getPermissionModule(permission.moduleKey)?.section ?? "OTHER";
    const current = groups[groups.length - 1];

    if (current?.section === section) {
      current.permissions.push(permission);
    } else {
      groups.push({ section, permissions: [permission] });
    }
  }

  return groups;
}

export function displayModuleLabel(moduleKey: string) {
  return getPermissionModule(moduleKey)?.label ?? moduleKey;
}

/** Modules that only appear on the admin sidebar. Any View grant routes the user to the admin portal. */
export const adminOnlyModuleKeys = new Set(
  permissionModules.filter((module) => module.audience === "admin").map((module) => module.key),
);

export function hasAdminPortalAccess(allowedModules: Iterable<string>) {
  for (const moduleKey of allowedModules) {
    if (adminOnlyModuleKeys.has(moduleKey)) {
      return true;
    }
  }

  return false;
}
