"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Bot,
  BookOpenText,
  Building2,
  CircleHelp,
  Eye,
  Files,
  Filter,
  FolderTree,
  Import,
  KeyRound,
  LayoutDashboard,
  Lock,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
  UserRoundCheck,
  UserRoundMinus,
  Workflow,
  ChartColumn,
  ClipboardList,
  HardDrive,
  X,
} from "lucide-react";
import {
  DashboardMobileNav,
  DashboardPanel,
  DashboardSidebar,
  DashboardStatCard,
  DashboardTopbar,
  type DashboardNavSection,
} from "../../../components/dashboard/primitives";
import { useSidebarPermissions } from "../../../components/dashboard/use-sidebar-permissions";

type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED";
type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

type UserRecord = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  role: Role;
  roleTitle: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  data: UserRecord[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    lockedUsers: number;
  };
  filters: {
    departments: string[];
    roles: string[];
    statuses: UserStatus[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type RoleTitlesResponse = {
  data: Array<{
    id: string;
    name: string;
    code: string;
    type: "SYSTEM" | "CUSTOM";
  }>;
};

type UserFormState = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  department: string;
  role: Role;
  roleTitle: string;
  status: UserStatus;
  password: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const sidebarSections: readonly DashboardNavSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", Icon: LayoutDashboard, href: "/admin/dashboard" },
      { label: "Policy Management", Icon: Files, href: "/admin/policy-management" },
      { label: "Policy Library", Icon: Files, href: "/admin/policy-library" },
      { label: "Categories", Icon: FolderTree, href: "/admin/categories" },
      { label: "Users", Icon: Users, href: "/admin/users", active: true },
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

const defaultUserForm: UserFormState = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  department: "",
  role: "EMPLOYEE",
  roleTitle: "User",
  status: "ACTIVE",
  password: "",
};

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(user: UserRecord) {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

function getRoleTone(roleTitle: string) {
  if (roleTitle === "Administrator") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (roleTitle.includes("Compliance")) return "bg-indigo-50 text-indigo-700";
  if (roleTitle.includes("HR")) return "bg-amber-50 text-[var(--color-warning)]";
  if (roleTitle.includes("Finance") || roleTitle.includes("Policy")) return "bg-violet-50 text-[var(--color-ai-accent)]";
  return "bg-slate-100 text-slate-600";
}

function getStatusTone(status: UserStatus) {
  if (status === "ACTIVE") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "LOCKED") return "bg-red-50 text-[var(--color-error)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function InputClassName() {
  return "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100";
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export default function AdminUsersClient() {
  const [usersResponse, setUsersResponse] = useState<UsersResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roleTitleOptions, setRoleTitleOptions] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [formState, setFormState] = useState<UserFormState>(defaultUserForm);
  const [newPassword, setNewPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const permissionSections = useSidebarPermissions(sidebarSections);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (departmentFilter !== "ALL") params.set("department", departmentFilter);

      const response = await requestJson<UsersResponse>(`/users?${params.toString()}`);
      setUsersResponse(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load users.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter, page, pageSize, roleFilter, search, statusFilter]);

  const loadRoleTitles = useCallback(async () => {
    const response = await requestJson<RoleTitlesResponse>("/roles-permissions/role-titles");
    setRoleTitleOptions(response.data.map((role) => role.name));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    void loadRoleTitles();
  }, [loadRoleTitles]);

  const stats = useMemo(
    () =>
      usersResponse?.stats ?? {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        lockedUsers: 0,
      },
    [usersResponse],
  );

  const filters = usersResponse?.filters ?? {
    departments: [],
    roles: [],
    statuses: ["ACTIVE", "INACTIVE", "LOCKED"] as UserStatus[],
  };

  const users = usersResponse?.data ?? [];

  const statCards = useMemo(
    () => [
      {
        title: "Total Users",
        value: String(stats.totalUsers),
        detail: "All system users",
        iconClassName: "bg-blue-100 text-[var(--color-active-menu)]",
        Icon: Users,
      },
      {
        title: "Active Users",
        value: String(stats.activeUsers),
        detail:
          stats.totalUsers > 0
            ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total users`
            : "0% of total users",
        iconClassName: "bg-emerald-100 text-[var(--color-success)]",
        Icon: UserRoundCheck,
      },
      {
        title: "Inactive Users",
        value: String(stats.inactiveUsers),
        detail:
          stats.totalUsers > 0
            ? `${((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)}% of total users`
            : "0% of total users",
        iconClassName: "bg-amber-100 text-[var(--color-warning)]",
        Icon: UserRoundMinus,
      },
      {
        title: "Locked Users",
        value: String(stats.lockedUsers),
        detail:
          stats.totalUsers > 0
            ? `${((stats.lockedUsers / stats.totalUsers) * 100).toFixed(1)}% of total users`
            : "0% of total users",
        iconClassName: "bg-violet-100 text-[var(--color-ai-accent)]",
        Icon: Lock,
      },
    ],
    [stats],
  );

  function resetMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCreateModal() {
    resetMessages();
    setFormState(defaultUserForm);
    setShowCreateModal(true);
  }

  function openEditModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setFormState({
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      role: user.role,
      roleTitle: user.roleTitle,
      status: user.status,
      password: "",
    });
    setShowEditModal(true);
  }

  function openViewModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setShowViewModal(true);
  }

  function openPasswordModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
  }

  function openGuideModal() {
    resetMessages();
    setShowGuideModal(true);
  }

  function closeModals() {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowPasswordModal(false);
    setShowGuideModal(false);
    setSelectedUser(null);
  }

  function updateFormField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateUser() {
    setIsSaving(true);
    resetMessages();

    try {
      await requestJson<UserRecord>("/users", {
        method: "POST",
        body: JSON.stringify(formState),
      });
      setSuccessMessage("User created successfully.");
      closeModals();
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateUser() {
    if (!selectedUser) {
      return;
    }

    setIsSaving(true);
    resetMessages();

    try {
      await requestJson<UserRecord>(`/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          email: formState.email,
          username: formState.username,
          firstName: formState.firstName,
          lastName: formState.lastName,
          department: formState.department,
          role: formState.role,
          roleTitle: formState.roleTitle,
          status: formState.status,
        }),
      });
      setSuccessMessage("User updated successfully.");
      closeModals();
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) {
      return;
    }

    setIsSaving(true);
    resetMessages();

    try {
      await requestJson<UserRecord>(`/users/${selectedUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      });
      setSuccessMessage("Password updated successfully.");
      closeModals();
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleLock(user: UserRecord) {
    resetMessages();

    try {
      await requestJson<UserRecord>(`/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: user.status === "LOCKED" ? "ACTIVE" : "LOCKED",
        }),
      });
      setSuccessMessage(
        user.status === "LOCKED" ? "User unlocked successfully." : "User locked successfully.",
      );
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update user status.");
    }
  }

  async function handleImportUsers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resetMessages();
    setIsSaving(true);

    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (rows.length < 2) {
        throw new Error("CSV file must include a header row and at least one user row.");
      }

      const headers = rows[0].split(",").map((header) => header.trim());
      const usersToImport = rows.slice(1).map((row) => {
        const values = row.split(",").map((value) => value.trim());
        const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

        return {
          email: record.email,
          username: record.username,
          password: record.password,
          firstName: record.firstName,
          lastName: record.lastName,
          department: record.department,
          role: record.role,
          roleTitle: record.roleTitle,
          status: record.status || "ACTIVE",
        };
      });

      const response = await requestJson<{ count: number }>("/users/import", {
        method: "POST",
        body: JSON.stringify({ users: usersToImport }),
      });

      setSuccessMessage(`${response.count} user(s) imported successfully.`);
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to import users.");
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar
        className="bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_20%),linear-gradient(180deg,var(--color-sidebar)_0%,var(--color-sidebar-end)_100%)]"
        sections={permissionSections}
        footer={
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Rural Bank of Itogon</div>
              <div className="text-[0.8rem] text-white/70">Organization</div>
            </div>
          </div>
        }
      />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search users, roles, departments..."
          notificationCount={3}
          secondaryActionIcon={CircleHelp}
          secondaryActionLabel="Help"
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          avatarClassName="from-[var(--color-sidebar)] to-[var(--color-sidebar-end)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav sections={permissionSections} />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Users</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Users</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportUsers}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
              >
                <Import className="h-4 w-4" />
                <span>Import Users</span>
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
              >
                <Plus className="h-4 w-4" />
                <span>Add New User</span>
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--color-success)]">
              {successMessage}
            </div>
          ) : null}

          <section className="mb-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                Icon={card.Icon}
                iconClassName={card.iconClassName}
              />
            ))}
          </section>

          <DashboardPanel title="User Directory" className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name, email, username..."
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className={InputClassName()}
                  >
                    <option value="ALL">All Status</option>
                    {filters.statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value);
                      setPage(1);
                    }}
                    className={InputClassName()}
                  >
                    <option value="ALL">All Roles</option>
                    {filters.roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <select
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value);
                      setPage(1);
                    }}
                    className={InputClassName()}
                  >
                    <option value="ALL">All Departments</option>
                    {filters.departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setStatusFilter("ALL");
                      setRoleFilter("ALL");
                      setDepartmentFilter("ALL");
                      setPage(1);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">Loading users...</div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Last Login</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {users.map((user) => (
                        <tr key={user.id} className="text-sm text-slate-700">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {getInitials(user)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{user.fullName}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                                <div className="text-xs text-slate-400">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{user.department}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleTone(user.roleTitle)}`}>
                              {user.roleTitle}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(user.status)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <ActionButton label="View user" onClick={() => openViewModal(user)}>
                                <Eye className="h-4 w-4" />
                              </ActionButton>
                              <ActionButton label="Edit user" onClick={() => openEditModal(user)}>
                                <Pencil className="h-4 w-4" />
                              </ActionButton>
                              <ActionButton label="Reset password" onClick={() => openPasswordModal(user)}>
                                <KeyRound className="h-4 w-4" />
                              </ActionButton>
                              <ActionButton label={user.status === "LOCKED" ? "Unlock user" : "Lock user"} onClick={() => handleToggleLock(user)}>
                                {user.status === "LOCKED" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-4 lg:hidden">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {getInitials(user)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.fullName}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusTone(user.status)}`}>
                          {user.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <div><span className="font-semibold text-slate-700">Username:</span> @{user.username}</div>
                        <div><span className="font-semibold text-slate-700">Department:</span> {user.department}</div>
                        <div><span className="font-semibold text-slate-700">Role:</span> {user.roleTitle}</div>
                        <div><span className="font-semibold text-slate-700">Last Login:</span> {formatDateTime(user.lastLoginAt)}</div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <ActionTextButton label="View" onClick={() => openViewModal(user)} />
                        <ActionTextButton label="Edit" onClick={() => openEditModal(user)} />
                        <ActionTextButton label="Password" onClick={() => openPasswordModal(user)} />
                        <ActionTextButton
                          label={user.status === "LOCKED" ? "Unlock" : "Lock"}
                          onClick={() => handleToggleLock(user)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
                  <span>
                    Showing {Math.min(
                      ((usersResponse?.pagination.page ?? 1) - 1) *
                        (usersResponse?.pagination.pageSize ?? 10) +
                        1,
                      usersResponse?.pagination.total ?? 0,
                    )}
                    {" "}to{" "}
                    {Math.min(
                      (usersResponse?.pagination.page ?? 1) * (usersResponse?.pagination.pageSize ?? 10),
                      usersResponse?.pagination.total ?? 0,
                    )}{" "}
                    of {usersResponse?.pagination.total ?? 0} users
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"
                    >
                      {[5, 10, 20, 50].map((value) => (
                        <option key={value} value={value}>
                          {value} per page
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={(usersResponse?.pagination.page ?? 1) <= 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
                      >
                        ‹
                      </button>
                      <span className="rounded-lg bg-[var(--color-active-menu)] px-3 py-2 text-sm font-semibold text-white">
                        {usersResponse?.pagination.page ?? 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((current) =>
                            Math.min(usersResponse?.pagination.totalPages ?? current, current + 1),
                          )
                        }
                        disabled={
                          (usersResponse?.pagination.page ?? 1) >=
                          (usersResponse?.pagination.totalPages ?? 1)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DashboardPanel>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)] xl:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-active-menu)] to-[var(--color-hover)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">User Management Guide</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Create, manage and organize system users. Assign roles and permissions to control access to policies and features.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openGuideModal}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-100"
                >
                  <BookOpenText className="h-4 w-4" />
                  <span>View User Guide</span>
                </button>
              </div>
            </div>

          </div>

          <footer className="flex flex-col gap-2 px-1 pt-5 text-[0.82rem] text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>© 2026 Hinora. All rights reserved.</span>
            <span>Hinora AI Policy Library &amp; Knowledge Management System</span>
          </footer>
        </div>
      </section>

      {showCreateModal ? (
        <Modal
          title="Add New User"
          description="Create a new user and assign their role, department, and initial password."
          onClose={closeModals}
        >
          <UserForm formState={formState} onChange={updateFormField} includePassword roleTitleOptions={roleTitleOptions} />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModals} className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateUser()}
              disabled={isSaving}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create User"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal
          title="Edit User"
          description="Update access, status, department, and account details."
          onClose={closeModals}
        >
          <UserForm formState={formState} onChange={updateFormField} roleTitleOptions={roleTitleOptions} />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModals} className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUpdateUser()}
              disabled={isSaving}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showViewModal && selectedUser ? (
        <Modal
          title="User Details"
          description="Review account details, status, and access information."
          onClose={closeModals}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="Full Name" value={selectedUser.fullName} />
            <InfoItem label="Email" value={selectedUser.email} />
            <InfoItem label="Username" value={`@${selectedUser.username}`} />
            <InfoItem label="Department" value={selectedUser.department} />
            <InfoItem label="System Role" value={selectedUser.role} />
            <InfoItem label="Role Title" value={selectedUser.roleTitle} />
            <InfoItem label="Status" value={selectedUser.status} />
            <InfoItem label="Last Login" value={formatDateTime(selectedUser.lastLoginAt)} />
          </div>
        </Modal>
      ) : null}

      {showPasswordModal && selectedUser ? (
        <Modal
          title="Reset Password"
          description={`Set a new password for ${selectedUser.fullName}.`}
          onClose={closeModals}
        >
          <FormField label="New Password">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={InputClassName()}
              placeholder="Enter a secure password"
            />
          </FormField>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModals} className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              disabled={isSaving || newPassword.trim().length < 6}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showGuideModal ? (
        <Modal
          title="User Management Guide"
          description="Quick reference for creating, updating, and controlling user access."
          onClose={closeModals}
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-bold text-[var(--color-active-menu)]">Create users</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use <span className="font-semibold">Add New User</span> to create individual accounts with a department, role, title, status, and temporary password.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <div className="text-sm font-bold text-[var(--color-ai-accent)]">Import users</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use <span className="font-semibold">Import Users</span> for bulk creation through CSV. Include fields for email, username, first name, last name, department, role, role title, status, and password.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-bold text-[var(--color-success)]">Manage access</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use the action icons in the table to view details, edit user data, reset passwords, and lock or unlock accounts based on employment status.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-[var(--color-active-menu)] transition hover:border-blue-200 hover:bg-blue-100"
    >
      {children}
    </button>
  );
}

function ActionTextButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-100"
    >
      {label}
    </button>
  );
}

function UserForm({
  formState,
  onChange,
  roleTitleOptions,
  includePassword = false,
}: {
  formState: UserFormState;
  onChange: <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => void;
  roleTitleOptions: string[];
  includePassword?: boolean;
}) {
  const inputClassName =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="First Name">
        <input value={formState.firstName} onChange={(event) => onChange("firstName", event.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Last Name">
        <input value={formState.lastName} onChange={(event) => onChange("lastName", event.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Email Address">
        <input type="email" value={formState.email} onChange={(event) => onChange("email", event.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Username">
        <input value={formState.username} onChange={(event) => onChange("username", event.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Department">
        <input value={formState.department} onChange={(event) => onChange("department", event.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Role Title">
        <select value={formState.roleTitle} onChange={(event) => onChange("roleTitle", event.target.value)} className={inputClassName}>
          {roleTitleOptions.map((roleTitle) => (
            <option key={roleTitle} value={roleTitle}>
              {roleTitle}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="System Role">
        <select value={formState.role} onChange={(event) => onChange("role", event.target.value as Role)} className={inputClassName}>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Status">
        <select value={formState.status} onChange={(event) => onChange("status", event.target.value as UserStatus)} className={inputClassName}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="LOCKED">LOCKED</option>
        </select>
      </FormField>
      {includePassword ? (
        <div className="sm:col-span-2">
          <FormField label="Temporary Password">
            <input
              type="password"
              value={formState.password}
              onChange={(event) => onChange("password", event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
