"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  AtSign,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  CircleHelp,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  IdCard,
  Import,
  Info,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Unlock,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserRoundMinus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  DashboardPanel,
  DashboardStatCard,
  DashboardTopbar,
} from "../../../components/dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../../../components/dashboard/dashboard-nav";
import {
  DropdownSelect,
  type DropdownOption,
} from "../../../components/ui/dropdown-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";

type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED";
type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

type OrgOption = {
  id: string;
  name: string;
  code: string;
};

type UserRecord = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  phone: string | null;
  employeeId: string | null;
  fullName: string;
  department: string;
  departmentId: string | null;
  location: string | null;
  locationId: string | null;
  jobTitle: string | null;
  reportsToUserId: string | null;
  reportsTo: {
    id: string;
    fullName: string;
    email: string;
    jobTitle: string | null;
  } | null;
  dateHired: string | null;
  role: Role;
  roleTitle: string;
  status: UserStatus;
  mustChangePassword?: boolean;
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
    departmentOptions: OrgOption[];
    locations: string[];
    locationOptions: OrgOption[];
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

type AccessRoleOption = {
  id: string;
  name: string;
  code: string;
  type: "SYSTEM" | "CUSTOM";
  description?: string | null;
};

type RoleTitlesResponse = {
  data: AccessRoleOption[];
};

const statusSelectOptions: DropdownOption<UserStatus>[] = [
  { value: "ACTIVE", label: "Active", badgeClassName: "bg-emerald-50 text-[var(--color-success)]" },
  { value: "INACTIVE", label: "Inactive", badgeClassName: "bg-amber-50 text-[var(--color-warning)]" },
  { value: "LOCKED", label: "Locked", badgeClassName: "bg-red-50 text-[var(--color-error)]" },
];

const accountTypeOptions: DropdownOption<Role>[] = [
  { value: "ADMIN", label: "Administrator" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
];

type UserFormState = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
  employeeId: string;
  departmentId: string;
  locationId: string;
  jobTitle: string;
  reportsToUserId: string;
  dateHired: string;
  role: Role;
  roleTitle: string;
  status: UserStatus;
  password: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function generateSecurePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";
  const all = `${upper}${lower}${numbers}${special}`;

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  const rest = Array.from({ length: 10 }, () => all[Math.floor(Math.random() * all.length)]);
  const chars = [...required, ...rest];

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join("");
}

function evaluatePassword(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    {
      label: "Uppercase and lowercase letters",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "At least one number", met: /\d/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function isPasswordStrong(password: string) {
  return evaluatePassword(password).every((requirement) => requirement.met);
}

const defaultUserForm: UserFormState = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  preferredName: "",
  phone: "",
  employeeId: "",
  departmentId: "",
  locationId: "",
  jobTitle: "",
  reportsToUserId: "",
  dateHired: "",
  role: "EMPLOYEE",
  roleTitle: "",
  status: "ACTIVE",
  password: "",
};

function formatDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function accountTypeLabel(role: Role) {
  if (role === "ADMIN") return "Administrator";
  if (role === "MANAGER") return "Manager";
  return "Employee";
}

function deriveSystemRole(accessRole: string): Role {
  const normalized = accessRole.trim().toLowerCase();
  if (normalized.includes("admin")) return "ADMIN";
  if (
    normalized.includes("manager") ||
    normalized.includes("officer") ||
    normalized.includes("head") ||
    normalized.includes("compliance")
  ) {
    return "MANAGER";
  }
  return "EMPLOYEE";
}

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
  icon: Icon,
  maxWidthClassName = "sm:max-w-2xl",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  maxWidthClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className={`w-full rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${maxWidthClassName}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="block space-y-2">
      <div className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </div>
      {children}
    </div>
  );
}

function FormSection({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--color-active-menu)]" />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
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
  const [accessRoleOptions, setAccessRoleOptions] = useState<AccessRoleOption[]>([]);
  const [managerOptions, setManagerOptions] = useState<
    Array<{ id: string; fullName: string; jobTitle: string | null }>
  >([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formState, setFormState] = useState<UserFormState>(defaultUserForm);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [requirePasswordChangeOnReset, setRequirePasswordChangeOnReset] = useState(true);
  const [enableMfa, setEnableMfa] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setAccessRoleOptions(response.data);
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
    departmentOptions: [] as OrgOption[],
    locations: [],
    locationOptions: [] as OrgOption[],
    roles: [],
    statuses: ["ACTIVE", "INACTIVE", "LOCKED"] as UserStatus[],
  };

  const departmentOptions = filters.departmentOptions?.length
    ? filters.departmentOptions
    : filters.departments.map((name) => ({ id: name, name, code: name }));
  const locationOptions = filters.locationOptions ?? [];

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

  async function loadManagerOptions(excludeUserId?: string | null) {
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
        status: "ACTIVE",
      });
      const response = await requestJson<UsersResponse>(`/users?${params.toString()}`);
      setManagerOptions(
        (response.data ?? [])
          .filter((user) => user.id !== excludeUserId)
          .map((user) => ({
            id: user.id,
            fullName: user.fullName,
            jobTitle: user.jobTitle,
          })),
      );
    } catch {
      setManagerOptions([]);
    }
  }

  function openCreateModal() {
    resetMessages();
    setFormState({
      ...defaultUserForm,
      password: generateSecurePassword(),
    });
    setShowTempPassword(false);
    setRequirePasswordChange(true);
    setEnableMfa(true);
    setShowCreateModal(true);
    void loadManagerOptions();
  }

  function openEditModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setEditingUserId(user.id);
    setFormState({
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredName: user.preferredName ?? "",
      phone: user.phone ?? "",
      employeeId: user.employeeId ?? "",
      departmentId: user.departmentId ?? "",
      locationId: user.locationId ?? "",
      jobTitle: user.jobTitle ?? "",
      reportsToUserId: user.reportsToUserId ?? "",
      dateHired: formatDateInput(user.dateHired),
      role: user.role,
      roleTitle: user.roleTitle,
      status: user.status,
      password: "",
    });
    setShowEditModal(true);
    void loadManagerOptions(user.id);
  }

  function openViewModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setShowViewModal(true);
  }

  function openPasswordModal(user: UserRecord) {
    resetMessages();
    setSelectedUser(user);
    setPasswordUserId(user.id);
    setNewPassword(generateSecurePassword());
    setConfirmPassword("");
    setShowNewPassword(true);
    setShowConfirmPassword(false);
    setRequirePasswordChangeOnReset(true);
    setShowPasswordModal(true);
  }

  function closeModals() {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowPasswordModal(false);
    setSelectedUser(null);
    setEditingUserId(null);
    setPasswordUserId(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }

  function updateFormField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function buildUserPayload(includePassword = false) {
    const jobTitle = formState.jobTitle.trim();
    const preferredName = formState.preferredName.trim();
    const phone = formState.phone.trim();
    const employeeId = formState.employeeId.trim();

    return {
      email: formState.email,
      username: formState.username,
      firstName: formState.firstName,
      lastName: formState.lastName,
      preferredName: preferredName.length > 0 ? preferredName : null,
      phone: phone.length > 0 ? phone : null,
      employeeId: employeeId.length > 0 ? employeeId : null,
      departmentId: formState.departmentId,
      locationId: formState.locationId || null,
      jobTitle: jobTitle.length > 0 ? jobTitle : null,
      reportsToUserId: formState.reportsToUserId || null,
      dateHired: formState.dateHired || null,
      roleTitle: formState.roleTitle.trim(),
      role: formState.role,
      status: formState.status,
      ...(includePassword
        ? {
            password: formState.password,
            mustChangePassword: requirePasswordChange,
          }
        : {}),
    };
  }

  async function handleCreateUser() {
    setIsSaving(true);
    resetMessages();

    try {
      if (!isPasswordStrong(formState.password)) {
        throw new Error(
          "Temporary password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
        );
      }
      await requestJson<UserRecord>("/users", {
        method: "POST",
        body: JSON.stringify(buildUserPayload(true)),
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
    const userId = editingUserId ?? selectedUser?.id;
    if (!userId) {
      setErrorMessage("Unable to update user. Please reopen the edit form and try again.");
      return;
    }

    setIsSaving(true);
    resetMessages();

    try {
      await requestJson<UserRecord>(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(buildUserPayload()),
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
    const userId = passwordUserId ?? selectedUser?.id;
    if (!userId) {
      setErrorMessage("Unable to reset password. Please reopen the form and try again.");
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      setErrorMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setIsSaving(true);
    resetMessages();

    try {
      await requestJson<UserRecord>(`/users/${userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({
          password: newPassword,
          mustChangePassword: requirePasswordChangeOnReset,
          unlockAccount: selectedUser?.status === "LOCKED",
        }),
      });
      setSuccessMessage("Password reset successfully.");
      closeModals();
      await loadUsers();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reset password.");
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
      <DashboardSidebar variant="admin" />

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
        <DashboardMobileNav variant="admin" />

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

                <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
                  <DropdownSelect
                    value={statusFilter === "ALL" ? "" : statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value || "ALL");
                      setPage(1);
                    }}
                    options={filters.statuses.map((status) => ({
                      value: status,
                      label: status.charAt(0) + status.slice(1).toLowerCase(),
                    }))}
                    placeholder="All Status"
                    allowClear
                    className="min-w-[10rem]"
                  />
                  <DropdownSelect
                    value={roleFilter === "ALL" ? "" : roleFilter}
                    onChange={(value) => {
                      setRoleFilter(value || "ALL");
                      setPage(1);
                    }}
                    options={filters.roles.map((role) => ({ value: role, label: role }))}
                    placeholder="All Roles"
                    allowClear
                    className="min-w-[10rem]"
                  />
                  <DropdownSelect
                    value={departmentFilter === "ALL" ? "" : departmentFilter}
                    onChange={(value) => {
                      setDepartmentFilter(value || "ALL");
                      setPage(1);
                    }}
                    options={filters.departments.map((department) => ({
                      value: department,
                      label: department,
                    }))}
                    placeholder="All Departments"
                    allowClear
                    className="min-w-[10rem]"
                  />
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
            ) : users.length === 0 ? (
              (usersResponse?.stats.totalUsers ?? 0) === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No users have been added yet."
                  description="Users are the people who will read, acknowledge, and manage policies in Hinora."
                  actionLabel="Add First User"
                  onAction={openCreateModal}
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching users"
                  description="Try another search term or reset filters to see all users."
                  actionLabel="Reset Filters"
                  onAction={() => {
                    setSearchInput("");
                    setSearch("");
                    setStatusFilter("ALL");
                    setRoleFilter("ALL");
                    setDepartmentFilter("ALL");
                    setPage(1);
                  }}
                />
              )
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Access Role</th>
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
                        <div><span className="font-semibold text-slate-700">Access Role:</span> {user.roleTitle}</div>
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
                    <DropdownSelect
                      value={String(pageSize)}
                      onChange={(value) => {
                        if (!value) return;
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                      options={[5, 10, 20, 50].map((value) => ({
                        value: String(value),
                        label: `${value} per page`,
                      }))}
                      size="sm"
                      className="w-[8.5rem]"
                      aria-label="Rows per page"
                    />

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

          <ModuleGuide guideKey="Users" />
        </div>
      </section>

      {showCreateModal ? (
        <Modal
          title="Add New User"
          description="Create a new user with personal, work, and account details."
          onClose={closeModals}
          icon={UserPlus}
          maxWidthClassName="sm:max-w-4xl"
        >
          <UserAccountForm
            formState={formState}
            onChange={updateFormField}
            departmentOptions={departmentOptions}
            locationOptions={locationOptions}
            managerOptions={managerOptions}
            accessRoleOptions={accessRoleOptions}
            includeSecurity
            showPassword={showTempPassword}
            onTogglePassword={() => setShowTempPassword((current) => !current)}
            onRegeneratePassword={() => updateFormField("password", generateSecurePassword())}
            requirePasswordChange={requirePasswordChange}
            onRequirePasswordChangeChange={setRequirePasswordChange}
            enableMfa={enableMfa}
            onEnableMfaChange={setEnableMfa}
          />
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
            <p className="text-sm leading-5 text-slate-600">
              An email with login instructions and temporary password will be sent to the user.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModals}
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateUser()}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-5 font-semibold text-white transition hover:bg-[var(--color-hover)] disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {isSaving ? "Creating..." : "Create User"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal
          title="Edit User"
          description="Update personal details, work information, and account status."
          onClose={closeModals}
          icon={Pencil}
          maxWidthClassName="sm:max-w-4xl"
        >
          <UserAccountForm
            formState={formState}
            onChange={updateFormField}
            departmentOptions={departmentOptions}
            locationOptions={locationOptions}
            managerOptions={managerOptions}
            accessRoleOptions={accessRoleOptions}
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModals}
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUpdateUser()}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-5 font-semibold text-white transition hover:bg-[var(--color-hover)] disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
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
          icon={UserRound}
          maxWidthClassName="sm:max-w-3xl"
        >
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Account Overview</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Full Name"
                  value={selectedUser.fullName}
                  Icon={UserRound}
                  iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
                />
                <DetailCard
                  label="Preferred Name"
                  value={selectedUser.preferredName?.trim() || selectedUser.firstName}
                  Icon={UserRound}
                  iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
                />
                <DetailCard
                  label="Email"
                  value={selectedUser.email}
                  Icon={Mail}
                  iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
                />
                <DetailCard
                  label="Phone Number"
                  value={selectedUser.phone?.trim() || "—"}
                  Icon={Phone}
                  iconClassName="bg-sky-50 text-sky-600"
                />
                <DetailCard
                  label="Username"
                  value={`@${selectedUser.username}`}
                  Icon={AtSign}
                  iconClassName="bg-violet-50 text-violet-600"
                />
                <DetailCard
                  label="Employee ID"
                  value={selectedUser.employeeId?.trim() || "—"}
                  Icon={IdCard}
                  iconClassName="bg-slate-100 text-slate-600"
                />
                <DetailCard
                  label="Department"
                  value={selectedUser.department}
                  Icon={Building2}
                  iconClassName="bg-emerald-50 text-[var(--color-success)]"
                />
                <DetailCard
                  label="Location"
                  value={selectedUser.location || "Unassigned"}
                  Icon={Building2}
                  iconClassName="bg-sky-50 text-sky-600"
                />
                <DetailCard
                  label="Position / Job Title"
                  value={selectedUser.jobTitle?.trim() || "—"}
                  Icon={Briefcase}
                  iconClassName="bg-orange-50 text-orange-600"
                />
                <DetailCard
                  label="Account Type"
                  value={accountTypeLabel(selectedUser.role)}
                  Icon={Shield}
                  iconClassName="bg-indigo-50 text-indigo-600"
                />
                <DetailCard
                  label="Role"
                  value={selectedUser.roleTitle}
                  Icon={Shield}
                  iconClassName="bg-violet-50 text-violet-600"
                />
                <DetailCard
                  label="Reporting To"
                  value={selectedUser.reportsTo?.fullName || "—"}
                  Icon={UserRound}
                  iconClassName="bg-amber-50 text-amber-700"
                />
                <DetailCard
                  label="Date Hired"
                  value={formatDisplayDate(selectedUser.dateHired)}
                  Icon={CalendarDays}
                  iconClassName="bg-teal-50 text-teal-700"
                />
                <DetailCard
                  label="Status"
                  Icon={CircleDot}
                  iconClassName={
                    selectedUser.status === "ACTIVE"
                      ? "bg-emerald-50 text-[var(--color-success)]"
                      : selectedUser.status === "LOCKED"
                        ? "bg-red-50 text-[var(--color-error)]"
                        : "bg-amber-50 text-[var(--color-warning)]"
                  }
                  valueNode={
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusTone(selectedUser.status)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedUser.status === "ACTIVE"
                            ? "bg-[var(--color-success)]"
                            : selectedUser.status === "LOCKED"
                              ? "bg-[var(--color-error)]"
                              : "bg-[var(--color-warning)]"
                        }`}
                      />
                      {selectedUser.status.charAt(0) + selectedUser.status.slice(1).toLowerCase()}
                    </span>
                  }
                />
                <DetailCard
                  label="Last Login"
                  value={formatDateTime(selectedUser.lastLoginAt)}
                  Icon={Clock3}
                  iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
                />
              </div>
            </div>

            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
                selectedUser.status === "ACTIVE"
                  ? "border-blue-100 bg-blue-50"
                  : selectedUser.status === "LOCKED"
                    ? "border-red-100 bg-red-50"
                    : "border-amber-100 bg-amber-50"
              }`}
            >
              <Info
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  selectedUser.status === "ACTIVE"
                    ? "text-[var(--color-active-menu)]"
                    : selectedUser.status === "LOCKED"
                      ? "text-[var(--color-error)]"
                      : "text-[var(--color-warning)]"
                }`}
              />
              <div>
                <div
                  className={`text-sm font-bold ${
                    selectedUser.status === "ACTIVE"
                      ? "text-[var(--color-active-menu)]"
                      : selectedUser.status === "LOCKED"
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-warning)]"
                  }`}
                >
                  {selectedUser.status === "ACTIVE"
                    ? "Account is Active"
                    : selectedUser.status === "LOCKED"
                      ? "Account is Locked"
                      : "Account is Inactive"}
                </div>
                <p className="mt-0.5 text-sm leading-5 text-slate-600">
                  {selectedUser.status === "ACTIVE"
                    ? "This user can access the system and assigned resources."
                    : selectedUser.status === "LOCKED"
                      ? "This user is locked and cannot sign in until unlocked."
                      : "This user is inactive and currently cannot access the system."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const user = selectedUser;
                  closeModals();
                  openEditModal(user);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4" />
                Edit User
              </button>
              <button
                type="button"
                onClick={() => {
                  const user = selectedUser;
                  closeModals();
                  openPasswordModal(user);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-hover)]"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {showPasswordModal && selectedUser ? (
        <Modal
          title="Reset Password"
          description="Generate or enter a new secure password for this user account."
          onClose={closeModals}
          icon={KeyRound}
          maxWidthClassName="sm:max-w-2xl"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[var(--color-active-menu)]">
                {getInitials(selectedUser)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900">{selectedUser.fullName}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {selectedUser.email} · @{selectedUser.username}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-4">
                <FormField label="New Password" required>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className={`${InputClassName()} pr-20 font-mono`}
                      placeholder="Enter or generate a secure password"
                      autoComplete="new-password"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((current) => !current)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPassword = generateSecurePassword();
                          setNewPassword(nextPassword);
                          setConfirmPassword(nextPassword);
                          setShowNewPassword(true);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Generate password"
                        title="Generate password"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Use the refresh icon to generate a strong password automatically.
                  </p>
                </FormField>

                <FormField label="Confirm Password" required>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`${InputClassName()} pr-11 font-mono`}
                      placeholder="Re-enter the new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
                      aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword ? (
                    <p className="mt-2 text-xs font-medium text-[var(--color-error)]">
                      Passwords do not match.
                    </p>
                  ) : null}
                </FormField>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={requirePasswordChangeOnReset}
                    onChange={(event) => setRequirePasswordChangeOnReset(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)] focus:ring-[var(--color-active-menu)]"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">
                      Require password change on next login
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      User must create a new password the next time they sign in.
                    </span>
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-active-menu)]">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Password must contain:</div>
                    <ul className="mt-3 space-y-2">
                      {evaluatePassword(newPassword).map((requirement) => (
                        <li
                          key={requirement.label}
                          className="flex items-start gap-2 text-sm font-medium text-slate-600"
                        >
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              requirement.met ? "text-[var(--color-success)]" : "text-slate-300"
                            }`}
                          />
                          <span>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
              <p className="text-sm leading-5 text-slate-600">
                Share this password securely with the user. For security, they should change it after signing in.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModals}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={
                  isSaving ||
                  !isPasswordStrong(newPassword) ||
                  newPassword !== confirmPassword
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-5 font-semibold text-white transition hover:bg-[var(--color-hover)] disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {isSaving ? "Resetting..." : "Reset Password"}
              </button>
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

function UserAccountForm({
  formState,
  onChange,
  departmentOptions,
  locationOptions,
  managerOptions,
  accessRoleOptions,
  includeSecurity = false,
  showPassword = false,
  onTogglePassword,
  onRegeneratePassword,
  requirePasswordChange = true,
  onRequirePasswordChangeChange,
  enableMfa = true,
  onEnableMfaChange,
}: {
  formState: UserFormState;
  onChange: <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => void;
  departmentOptions: OrgOption[];
  locationOptions: OrgOption[];
  managerOptions: Array<{ id: string; fullName: string; jobTitle: string | null }>;
  accessRoleOptions: AccessRoleOption[];
  includeSecurity?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onRegeneratePassword?: () => void;
  requirePasswordChange?: boolean;
  onRequirePasswordChangeChange?: (value: boolean) => void;
  enableMfa?: boolean;
  onEnableMfaChange?: (value: boolean) => void;
}) {
  const inputClassName =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100";

  const departmentSelectOptions = departmentOptions.map((department) => ({
    value: department.id,
    label: department.name,
  }));

  const locationSelectOptions = locationOptions.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  const managerSelectOptions = managerOptions.map((manager) => ({
    value: manager.id,
    label: manager.jobTitle
      ? `${manager.fullName} · ${manager.jobTitle}`
      : manager.fullName,
  }));

  const accessSelectOptions = accessRoleOptions.map((role) => ({
    value: role.name,
    label: role.name,
  }));

  return (
    <div className="space-y-6">
      <FormSection title="Personal Information" Icon={UserRound}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FormField label="First Name" required>
            <input
              value={formState.firstName}
              onChange={(event) => onChange("firstName", event.target.value)}
              className={inputClassName}
              placeholder="e.g. Juan"
            />
          </FormField>
          <FormField label="Last Name" required>
            <input
              value={formState.lastName}
              onChange={(event) => onChange("lastName", event.target.value)}
              className={inputClassName}
              placeholder="e.g. Dela Cruz"
            />
          </FormField>
          <FormField label="Preferred Name">
            <input
              value={formState.preferredName}
              onChange={(event) => onChange("preferredName", event.target.value)}
              className={inputClassName}
              placeholder="e.g. Juan"
            />
          </FormField>
          <FormField label="Position / Job Title">
            <input
              value={formState.jobTitle}
              onChange={(event) => onChange("jobTitle", event.target.value)}
              className={inputClassName}
              placeholder="e.g. IT Specialist"
            />
          </FormField>
          <FormField label="Department" required>
            <DropdownSelect
              value={formState.departmentId}
              onChange={(value) => onChange("departmentId", value)}
              options={departmentSelectOptions}
              placeholder={
                departmentSelectOptions.length > 0
                  ? "Select department"
                  : "Add departments first"
              }
            />
          </FormField>
          <FormField label="Location">
            <DropdownSelect
              value={formState.locationId}
              onChange={(value) => onChange("locationId", value)}
              options={locationSelectOptions}
              placeholder={
                locationSelectOptions.length > 0 ? "Select location" : "Add locations first"
              }
              allowClear
            />
          </FormField>
          <FormField label="Employee ID">
            <input
              value={formState.employeeId}
              onChange={(event) => onChange("employeeId", event.target.value)}
              className={inputClassName}
              placeholder="e.g. EMP-2026-00123"
            />
          </FormField>
          <FormField label="Email Address" required>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => onChange("email", event.target.value)}
              className={inputClassName}
              placeholder="e.g. juan.delacruz@ruralbank.com.ph"
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              value={formState.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              className={inputClassName}
              placeholder="e.g. +63 917 123 4567"
            />
          </FormField>
          <FormField label="Username" required>
            <input
              value={formState.username}
              onChange={(event) => onChange("username", event.target.value)}
              className={inputClassName}
              placeholder="e.g. jdelacruz"
            />
          </FormField>
        </div>
      </FormSection>

      <div className="border-t border-slate-100" />

      <FormSection title="Work Information" Icon={Briefcase}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FormField label="Account Type" required>
            <DropdownSelect
              value={formState.role}
              onChange={(value) => {
                if (value) onChange("role", value);
              }}
              options={accountTypeOptions}
              placeholder="Select account type"
              allowClear={false}
            />
          </FormField>
          <FormField label="Role" required>
            <DropdownSelect
              value={formState.roleTitle}
              onChange={(value) => onChange("roleTitle", value)}
              options={accessSelectOptions}
              placeholder="Select role"
            />
          </FormField>
          <FormField label="Reporting To">
            <DropdownSelect
              value={formState.reportsToUserId}
              onChange={(value) => onChange("reportsToUserId", value)}
              options={managerSelectOptions}
              placeholder="Select manager"
              allowClear
            />
          </FormField>
          <FormField label="Date Hired">
            <input
              type="date"
              value={formState.dateHired}
              onChange={(event) => onChange("dateHired", event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Status" required>
            <DropdownSelect
              value={formState.status}
              onChange={(value) => {
                if (value) onChange("status", value);
              }}
              options={statusSelectOptions}
              placeholder="Select status"
              allowClear={false}
              renderValue={(option) =>
                option ? (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${option.badgeClassName}`}>
                    {option.label}
                  </span>
                ) : (
                  <span className="font-medium text-slate-400">Select status</span>
                )
              }
            />
          </FormField>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Department, location, role, and reporting lines are managed here and shown as locked fields on the
          employee profile.
        </p>
      </FormSection>

      {includeSecurity ? (
        <>
          <div className="border-t border-slate-100" />

          <FormSection title="Account Security" Icon={Lock}>
            <FormField label="Temporary Password" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formState.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  className={`${inputClassName} pr-20 font-mono`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5">
                  <button
                    type="button"
                    onClick={onTogglePassword}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={onRegeneratePassword}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Regenerate password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                The user will be required to change this password on first login.
              </p>
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={requirePasswordChange}
                  onChange={(event) => onRequirePasswordChangeChange?.(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)] focus:ring-[var(--color-active-menu)]"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Require password change on first login
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    User must create a new password when they first sign in.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={enableMfa}
                  onChange={(event) => onEnableMfaChange?.(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)] focus:ring-[var(--color-active-menu)]"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Enable Multi-Factor Authentication
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    User will be required to set up MFA on first login.
                  </span>
                </span>
              </label>
            </div>
          </FormSection>
        </>
      ) : null}
    </div>
  );
}

function DetailCard({
  label,
  value,
  valueNode,
  Icon,
  iconClassName,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  Icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-400">{label}</div>
        <div className="mt-1 text-sm font-bold text-slate-900">
          {valueNode ?? value}
        </div>
      </div>
    </div>
  );
}
