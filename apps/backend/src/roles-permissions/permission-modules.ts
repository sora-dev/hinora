/**
 * Canonical module keys for Roles & Permissions.
 *
 * Order matches the admin sidebar, then employee-only entries.
 * Keep in sync with apps/web/components/dashboard/permission-modules.ts
 */
export const moduleOrder = [
  'Dashboard',
  'Policy Library',
  'Policy Management',
  'Policy Assignments',
  'Categories',
  'Compliance Center',
  'Assessment Builder',
  'Reports',
  'Users',
  'Departments',
  'Location',
  'Roles & Permissions',
  'Audit Logs',
  'Settings',
  'My Compliance',
  'Bookmarks',
  'Notifications',
] as const;

export type ModuleKey = (typeof moduleOrder)[number];

export const legacyModuleKeyMap: Record<string, ModuleKey> = {
  Acknowledgments: 'Compliance Center',
  'Acknowledgement Management': 'Compliance Center',
  'Compliance Management': 'Compliance Center',
  Branches: 'Location',
};

export function isModuleKey(value: string): value is ModuleKey {
  return (moduleOrder as readonly string[]).includes(value);
}

/** Modules that only appear on the admin sidebar. Any View grant routes the user to the admin portal. */
export const adminOnlyModuleKeys = new Set<ModuleKey>([
  'Policy Management',
  'Policy Assignments',
  'Categories',
  'Compliance Center',
  'Assessment Builder',
  'Reports',
  'Users',
  'Roles & Permissions',
  'Audit Logs',
]);

export function hasAdminPortalAccess(viewModules: readonly string[]) {
  return viewModules.some((moduleKey) =>
    adminOnlyModuleKeys.has(moduleKey as ModuleKey),
  );
}
