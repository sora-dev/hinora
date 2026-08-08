import {
  BadgeCheck,
  Bell,
  Bookmark,
  BookOpenText,
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
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavVariant = "admin" | "employee";

export type NavItem = {
  label: string;
  href: string;
  Icon: LucideIcon;
  badge?: string;
  /**
   * Matches RoleModulePermission.moduleKey on the backend. Items without one are
   * always visible because the backend module list does not cover them yet.
   */
  moduleKey?: string;
};

export type NavSection = {
  label?: string;
  items: readonly NavItem[];
};

export const adminNavSections: readonly NavSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", Icon: House, moduleKey: "Dashboard" },
      { label: "Policy Library", href: "/admin/policy-library", Icon: FileText, moduleKey: "Policy Library" },
      { label: "Policy Management", href: "/admin/policy-management", Icon: FilePenLine, moduleKey: "Policy Management" },
      { label: "Policy Assignments", href: "/admin/policy-assignments", Icon: ClipboardCheck, moduleKey: "Policy Assignments" },
      { label: "Categories", href: "/admin/categories", Icon: LayoutGrid, moduleKey: "Categories" },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      {
        label: "Compliance Center",
        href: "/admin/compliance",
        Icon: BadgeCheck,
        moduleKey: "Compliance Center",
      },
      { label: "Assessment Builder", href: "/admin/assessments", Icon: SquarePen, moduleKey: "Assessment Builder" },
      { label: "Reports", href: "/admin/reports", Icon: ChartColumn, moduleKey: "Reports" },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Users", href: "/admin/users", Icon: Users, moduleKey: "Users" },
      { label: "Departments", href: "/admin/departments", Icon: Network, moduleKey: "Departments" },
      { label: "Location", href: "/admin/locations", Icon: Building2, moduleKey: "Location" },
      { label: "Roles & Permissions", href: "/admin/roles-permissions", Icon: UserLock, moduleKey: "Roles & Permissions" },
      { label: "Audit Logs", href: "/admin/audit-logs", Icon: ScrollText, moduleKey: "Audit Logs" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/admin/profile", Icon: UserRound },
      { label: "Settings", href: "/admin/settings", Icon: Settings, moduleKey: "Settings" },
    ],
  },
];

export const employeeNavSections: readonly NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/employee/dashboard", Icon: House, moduleKey: "Dashboard" },
      { label: "Policy Library", href: "/employee/policy-library", Icon: BookOpenText, moduleKey: "Policy Library" },
    ],
  },
  {
    label: "MY COMPLIANCE",
    items: [
      { label: "My Compliance", href: "/employee/compliance", Icon: Shield, moduleKey: "My Compliance" },
      { label: "Bookmarks", href: "/employee/bookmarks", Icon: Bookmark, moduleKey: "Bookmarks" },
      { label: "Notifications", href: "/employee/notifications", Icon: Bell, moduleKey: "Notifications", badge: "3" },
    ],
  },
  {
    label: "ORGANIZATION",
    items: [
      { label: "Departments", href: "/employee/departments", Icon: Network, moduleKey: "Departments" },
      { label: "Location", href: "/employee/locations", Icon: Building2, moduleKey: "Location" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/employee/profile", Icon: UserRound },
      { label: "Settings", href: "/employee/settings", Icon: Settings, moduleKey: "Settings" },
    ],
  },
];

const employeeExtraModuleKeys = new Set(["My Compliance", "Bookmarks", "Notifications"]);

export function getNavSections(variant: NavVariant) {
  return variant === "admin" ? adminNavSections : employeeNavSections;
}

/**
 * Builds the sidebar from role permissions instead of the user's system role.
 * Admin-portal roles see the admin nav plus any granted employee-only items.
 */
export function getUnifiedNavSections(hasAdminPortalAccess: boolean): readonly NavSection[] {
  if (!hasAdminPortalAccess) {
    return employeeNavSections;
  }

  const employeeExtraSections = employeeNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.moduleKey && employeeExtraModuleKeys.has(item.moduleKey),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return [...adminNavSections, ...employeeExtraSections];
}

export function getAskHinoraHref(variant: NavVariant) {
  return `/${variant}/ask-hinora`;
}

export function getProfileHref(variant: NavVariant) {
  return `/${variant}/profile`;
}

export function getProfileHrefFromPathname(pathname: string | null) {
  return pathname?.startsWith("/admin") ? getProfileHref("admin") : getProfileHref("employee");
}

export function isNavItemActive(href: string, pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
