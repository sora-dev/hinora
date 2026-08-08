"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import type { ReactNode } from "react";
import {
  CircleHelp,
  Copy,
  Eye,
  FileDown,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { DashboardPanel, DashboardTopbar } from "../../../components/dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../../../components/dashboard/dashboard-nav";
import { DropdownSelect } from "../../../components/ui/dropdown-select";
import {
  displayModuleLabel,
  getPermissionModule,
  groupPermissionsBySection,
  permissionModules,
} from "../../../components/dashboard/permission-modules";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type RoleType = "SYSTEM" | "CUSTOM";

type RoleSummary = {
  id: string;
  name: string;
  code: string;
  type: RoleType;
  description: string | null;
  userCount: number;
  viewModules: string[];
};

type RoleDetail = {
  id: string;
  name: string;
  code: string;
  type: RoleType;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedUsers: number;
  permissions: Array<{
    moduleKey: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canPublish: boolean;
  }>;
};

type RolePermission = RoleDetail["permissions"][number];

type RolesResponse = {
  data: RoleSummary[];
};

type CreateRoleForm = {
  name: string;
  code: string;
  description: string;
  type: RoleType;
};

type DeleteRoleResponse = {
  success: boolean;
  message: string;
};

const defaultCreateRoleForm: CreateRoleForm = {
  name: "",
  code: "",
  description: "",
  type: "CUSTOM",
};

function roleTone(type: RoleType) {
  return type === "SYSTEM"
    ? "bg-blue-50 text-[var(--color-active-menu)]"
    : "bg-violet-50 text-[var(--color-ai-accent)]";
}

function roleAvatarTone(code: string) {
  const map: Record<string, string> = {
    ADMIN: "bg-blue-600 text-white",
    PADMIN: "bg-violet-600 text-white",
    COMP: "bg-amber-500 text-white",
    AUD: "bg-red-500 text-white",
    HR: "bg-indigo-600 text-white",
    DH: "bg-teal-700 text-white",
    IT: "bg-emerald-600 text-white",
    USER: "bg-yellow-500 text-white",
    GST: "bg-slate-400 text-white",
  };

  return map[code] ?? "bg-slate-500 text-white";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function permissionIndicator(value: boolean | null) {
  if (value === null) {
    return <span className="text-slate-300">-</span>;
  }

  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[10px] font-bold ${
        value
          ? "bg-[var(--color-active-menu)] text-white"
          : "border border-slate-300 bg-white text-transparent"
      }`}
    >
      {value ? "✓" : ""}
    </span>
  );
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? "Request failed.");
  }

  return payload as T;
}

export default function AdminRolesPermissionsClient() {
  const [activeTab, setActiveTab] = useState<"roles" | "matrix">("roles");
  const [rolesResponse, setRolesResponse] = useState<RoleSummary[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDetail | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<RolePermission[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState<CreateRoleForm>(defaultCreateRoleForm);
  const [editRoleForm, setEditRoleForm] = useState<CreateRoleForm>(defaultCreateRoleForm);

  const filteredRoles = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    if (!query) {
      return rolesResponse;
    }

    return rolesResponse.filter((role) =>
      [role.name, role.code, role.description ?? ""].join(" ").toLowerCase().includes(query),
    );
  }, [rolesResponse, searchInput]);

  const hasPendingPermissionChanges = useMemo(() => {
    if (!selectedRoleDetail) {
      return false;
    }

    return JSON.stringify(selectedRoleDetail.permissions) !== JSON.stringify(draftPermissions);
  }, [draftPermissions, selectedRoleDetail]);

  const loadRoles = useCallback(async () => {
    const response = await requestJson<RolesResponse>("/roles-permissions/roles");
    setRolesResponse(response.data);

    if (!selectedRoleId && response.data.length > 0) {
      setSelectedRoleId(response.data[0].id);
    }
  }, [selectedRoleId]);

  const loadRoleDetail = useCallback(async (roleId: string) => {
    const response = await requestJson<RoleDetail>(`/roles-permissions/roles/${roleId}`);
    setSelectedRoleDetail(response);
    setDraftPermissions(response.permissions);
  }, []);

  useEffect(() => {
    void (async () => {
      setErrorMessage("");

      try {
        await loadRoles();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load roles.");
      } finally {
      }
    })();
  }, [loadRoles]);

  useEffect(() => {
    if (!selectedRoleId) {
      return;
    }

    void (async () => {
      try {
        await loadRoleDetail(selectedRoleId);
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load role details.");
      }
    })();
  }, [loadRoleDetail, selectedRoleId]);

  function handleToggleView(moduleKey: string, canView: boolean) {
    setDraftPermissions((current) =>
      current.map((permission) =>
        permission.moduleKey === moduleKey ? { ...permission, canView } : permission,
      ),
    );
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleResetDraftPermissions() {
    if (!selectedRoleDetail) {
      return;
    }

    setDraftPermissions(selectedRoleDetail.permissions);
    setErrorMessage("");
    setSuccessMessage("Discarded unsaved permission changes.");
  }

  async function handleSavePermissions() {
    if (!selectedRoleId || !selectedRoleDetail || !hasPendingPermissionChanges) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedRole = await requestJson<RoleDetail>(
        `/roles-permissions/roles/${selectedRoleId}/permissions`,
        {
          method: "PATCH",
          body: JSON.stringify({
            permissions: draftPermissions,
          }),
        },
      );

      setSelectedRoleDetail(updatedRole);
      setDraftPermissions(updatedRole.permissions);
      await loadRoles();
      setSuccessMessage(`Saved permission changes for ${updatedRole.name}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save permission changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateRole() {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const createdRole = await requestJson<RoleDetail>("/roles-permissions/roles", {
        method: "POST",
        body: JSON.stringify({
          ...createRoleForm,
          createdBy: "John Dela Cruz",
        }),
      });

      setShowCreateRoleModal(false);
      setCreateRoleForm(defaultCreateRoleForm);
      setSelectedRoleId(createdRole.id);
      setSelectedRoleDetail(createdRole);
      await loadRoles();
      setSuccessMessage(`Created role ${createdRole.name}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create role.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditRoleModal() {
    if (!selectedRoleDetail) {
      return;
    }

    setEditRoleForm({
      name: selectedRoleDetail.name,
      code: selectedRoleDetail.code,
      description: selectedRoleDetail.description ?? "",
      type: selectedRoleDetail.type,
    });
    setShowEditRoleModal(true);
  }

  async function handleEditRole() {
    if (!selectedRoleId) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedRole = await requestJson<RoleDetail>(
        `/roles-permissions/roles/${selectedRoleId}`,
        {
          method: "PATCH",
          body: JSON.stringify(editRoleForm),
        },
      );

      setSelectedRoleDetail(updatedRole);
      setShowEditRoleModal(false);
      await loadRoles();
      setSuccessMessage(`Updated role ${updatedRole.name}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update role.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloneRole() {
    if (!selectedRoleId || !selectedRoleDetail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const clonedRole = await requestJson<RoleDetail>(
        `/roles-permissions/roles/${selectedRoleId}/clone`,
        {
          method: "POST",
        },
      );

      setSelectedRoleId(clonedRole.id);
      setSelectedRoleDetail(clonedRole);
      await loadRoles();
      setSuccessMessage(`Cloned role ${selectedRoleDetail.name} to ${clonedRole.name}.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to clone role.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRole() {
    if (!selectedRoleId || !selectedRoleDetail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await requestJson<DeleteRoleResponse>(
        `/roles-permissions/roles/${selectedRoleId}`,
        {
          method: "DELETE",
        },
      );

      const deletedRoleId = selectedRoleId;
      setShowDeleteRoleModal(false);
      setSelectedRoleDetail(null);

      const rolesResult = await requestJson<RolesResponse>("/roles-permissions/roles");
      setRolesResponse(rolesResult.data);

      const nextRole = rolesResult.data.find((role) => role.id !== deletedRoleId) ?? null;
      setSelectedRoleId(nextRole?.id ?? "");

      if (nextRole) {
        await loadRoleDetail(nextRole.id);
      }

      setSuccessMessage(response.message);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete role.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleExportMatrix() {
    const header = ["Module", "Visible To", ...rolesResponse.map((role) => role.name)];
    const rows = matrixRows.map((row) => [
      displayModuleLabel(row.key),
      String(row.totalPermissions),
      ...rolesResponse.map((role) => (role.viewModules.includes(row.key) ? "Allowed" : "Not Allowed")),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "roles-permission-matrix.csv";
    link.click();
    URL.revokeObjectURL(url);
    setSuccessMessage("Exported permission matrix.");
  }

  const matrixRows = useMemo(() => {
    return permissionModules.map((moduleDefinition) => {
      const totals = rolesResponse.reduce(
        (count, role) => count + (role.viewModules.includes(moduleDefinition.key) ? 1 : 0),
        0,
      );

      return {
        ...moduleDefinition,
        totalPermissions: totals,
      };
    });
  }, [rolesResponse]);

  const permissionGroups = useMemo(
    () => groupPermissionsBySection(draftPermissions),
    [draftPermissions],
  );

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search roles, modules, or permissions..."
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
          <div className="mb-5">
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Roles &amp; Permissions</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-600">Dashboard</span>
              <span>›</span>
              <span>Roles &amp; Permissions</span>
              <span>›</span>
              <span>{activeTab === "roles" ? "Roles" : "Permission Matrix"}</span>
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

          <div className="mb-5 flex items-center gap-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`border-b-2 px-2 pb-3 text-sm font-bold transition ${
                activeTab === "roles"
                  ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Roles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`border-b-2 px-2 pb-3 text-sm font-bold transition ${
                activeTab === "matrix"
                  ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Permission Matrix
            </button>
          </div>

          {activeTab === "roles" ? (
            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <DashboardPanel title="Roles" className="p-0">
                <div className="border-b border-slate-200 px-4 py-4">
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
                    <Search className="h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoleModal(true)}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Role</span>
                  </button>
                </div>

                <div className="px-4 py-4">
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-slate-400">System Roles</div>
                  <div className="space-y-2">
                    {filteredRoles.filter((role) => role.type === "SYSTEM").map((role) => (
                      <RoleListItem
                        key={role.id}
                        role={role}
                        active={selectedRoleId === role.id}
                        onSelect={() => setSelectedRoleId(role.id)}
                      />
                    ))}
                  </div>

                  <div className="mb-3 mt-5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-slate-400">Custom Roles</div>
                  <div className="space-y-2">
                    {filteredRoles.filter((role) => role.type === "CUSTOM").map((role) => (
                      <RoleListItem
                        key={role.id}
                        role={role}
                        active={selectedRoleId === role.id}
                        onSelect={() => setSelectedRoleId(role.id)}
                      />
                    ))}
                  </div>
                </div>
              </DashboardPanel>

              <div className="space-y-4">
                <DashboardPanel title="" className="p-0">
                  {selectedRoleDetail ? (
                    <div className="flex flex-col gap-5 px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${roleAvatarTone(selectedRoleDetail.code)}`}>
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-xl font-bold text-slate-900">{selectedRoleDetail.name}</h2>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleTone(selectedRoleDetail.type)}`}>
                                {selectedRoleDetail.type === "SYSTEM" ? "System Role" : "Custom Role"}
                              </span>
                            </div>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">
                              {selectedRoleDetail.description ?? "This role controls access to modules across the Hinora admin system."}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={openEditRoleModal}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Edit Role</span>
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetaItem label="Created By" value={selectedRoleDetail.createdBy} />
                        <MetaItem label="Created On" value={formatDate(selectedRoleDetail.createdAt)} />
                        <MetaItem label="Last Updated" value={formatDate(selectedRoleDetail.updatedAt)} />
                        <MetaItem label="Assigned Users" value={`${selectedRoleDetail.assignedUsers} users`} />
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-sm text-slate-500">Select a role to view details.</div>
                  )}
                </DashboardPanel>

                <DashboardPanel title="Permissions" className="p-0">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-sm text-slate-500">
                        Starter mode: only the <span className="font-semibold text-slate-700">View</span>{" "}
                        permission is live. Tick View to control what appears in a user&apos;s sidebar —
                        custom roles like HR Manager or Compliance Officer do not need to be named
                        Administrator. Granting any admin module sends them to the admin portal on sign-in.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSuccessMessage("Already viewing permissions by module.")}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View by Module</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Module</th>
                          <th className="px-4 py-3 text-center">View</th>
                          <th className="px-4 py-3 text-center">Create</th>
                          <th className="px-4 py-3 text-center">Edit</th>
                          <th className="px-4 py-3 text-center">Delete</th>
                          <th className="px-4 py-3 text-center">Approve</th>
                          <th className="px-4 py-3 text-center">Publish</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                        {permissionGroups.map((group, groupIndex) => (
                          <Fragment key={`${group.section}-${group.permissions[0]?.moduleKey ?? groupIndex}`}>
                            <tr className="bg-slate-50/80">
                              <td
                                colSpan={7}
                                className="px-4 py-2 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-400"
                              >
                                {group.section}
                              </td>
                            </tr>
                            {group.permissions.map((permission) => {
                              const moduleDefinition = getPermissionModule(permission.moduleKey);
                              const Icon = moduleDefinition?.Icon ?? ShieldCheck;

                              return (
                                <tr key={permission.moduleKey}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
                                        <Icon className="h-4 w-4" />
                                      </span>
                                      <span className="min-w-0 font-semibold text-slate-900">
                                        {displayModuleLabel(permission.moduleKey)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() =>
                                        handleToggleView(permission.moduleKey, !permission.canView)
                                      }
                                      className="rounded-lg p-1 transition hover:bg-blue-50 disabled:opacity-60"
                                      aria-label={`Toggle view permission for ${displayModuleLabel(permission.moduleKey)}`}
                                    >
                                      {permissionIndicator(permission.canView)}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 text-center opacity-60">
                                    {permissionIndicator(permission.canCreate)}
                                  </td>
                                  <td className="px-4 py-3 text-center opacity-60">
                                    {permissionIndicator(permission.canEdit)}
                                  </td>
                                  <td className="px-4 py-3 text-center opacity-60">
                                    {permissionIndicator(permission.canDelete)}
                                  </td>
                                  <td className="px-4 py-3 text-center opacity-60">
                                    {permissionIndicator(permission.canApprove)}
                                  </td>
                                  <td className="px-4 py-3 text-center opacity-60">
                                    {permissionIndicator(permission.canPublish)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleCloneRole()}
                        disabled={isSaving || !selectedRoleDetail}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Clone Role</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteRoleModal(true)}
                        disabled={isSaving || !selectedRoleDetail}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-[var(--color-error)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Role</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="text-sm text-slate-500">
                        Saved <span className="font-semibold text-slate-700">View</span> changes apply to users with this role when they sign in.
                      </div>
                      <button
                        type="button"
                        onClick={handleResetDraftPermissions}
                        disabled={isSaving || !hasPendingPermissionChanges}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSavePermissions()}
                        disabled={isSaving || !selectedRoleDetail || !hasPendingPermissionChanges}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </div>

                    <div className="text-sm text-slate-500">
                      {hasPendingPermissionChanges ? "You have unsaved permission changes." : "No pending permission changes."}
                    </div>
                  </div>
                </DashboardPanel>
              </div>
            </div>
          ) : (
            <DashboardPanel title="Permission Matrix" className="p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-slate-500">Starter mode matrix based on saved database view access for each role.</p>
                  <button
                    type="button"
                    onClick={handleExportMatrix}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3 text-center">Visible To</th>
                      {rolesResponse.map((role) => (
                        <th key={role.id} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.68rem] font-bold ${roleAvatarTone(role.code)}`}>
                              {role.code.slice(0, 2)}
                            </span>
                            <span className="max-w-[90px] text-[0.7rem] font-bold normal-case leading-4 text-slate-700">
                              {role.name}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                    {matrixRows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
                              <row.Icon className="h-4 w-4" />
                            </span>
                            <span className="font-semibold text-slate-900">{displayModuleLabel(row.key)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-600">{row.totalPermissions}</td>
                        {rolesResponse.map((role) => (
                          <td key={`${row.key}-${role.id}`} className="px-4 py-3 text-center">
                            {permissionIndicator(role.viewModules.includes(row.key))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          )}
        </div>
      </section>

      {showCreateRoleModal ? (
        <Modal
          title="Create Role"
          description="Add a role title that can be assigned to users and configured with module view access."
          onClose={() => setShowCreateRoleModal(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Role Name">
              <input
                value={createRoleForm.name}
                onChange={(event) =>
                  setCreateRoleForm((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClassName}
                placeholder="e.g. Location Manager"
              />
            </FormField>
            <FormField label="Role Code">
              <input
                value={createRoleForm.code}
                onChange={(event) =>
                  setCreateRoleForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                }
                className={inputClassName}
                placeholder="e.g. BM"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Description">
                <input
                  value={createRoleForm.description}
                  onChange={(event) =>
                    setCreateRoleForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className={inputClassName}
                  placeholder="Describe the role purpose"
                />
              </FormField>
            </div>
            <FormField label="Role Type">
              <DropdownSelect
                value={createRoleForm.type}
                onChange={(value) => {
                  if (value) setCreateRoleForm((current) => ({ ...current, type: value as RoleType }));
                }}
                options={[
                  { value: "CUSTOM", label: "Custom" },
                  { value: "SYSTEM", label: "System" },
                ]}
                allowClear={false}
                aria-label="Role Type"
              />
            </FormField>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateRoleModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateRole()}
              disabled={isSaving || !createRoleForm.name.trim()}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditRoleModal ? (
        <Modal
          title="Edit Role"
          description="Update the selected role details. If you rename it, linked users will keep matching the new role title."
          onClose={() => setShowEditRoleModal(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Role Name">
              <input
                value={editRoleForm.name}
                onChange={(event) =>
                  setEditRoleForm((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClassName}
              />
            </FormField>
            <FormField label="Role Code">
              <input
                value={editRoleForm.code}
                onChange={(event) =>
                  setEditRoleForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                }
                className={inputClassName}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Description">
                <input
                  value={editRoleForm.description}
                  onChange={(event) =>
                    setEditRoleForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className={inputClassName}
                />
              </FormField>
            </div>
            <FormField label="Role Type">
              <DropdownSelect
                value={editRoleForm.type}
                onChange={(value) => {
                  if (value) setEditRoleForm((current) => ({ ...current, type: value as RoleType }));
                }}
                options={[
                  { value: "CUSTOM", label: "Custom" },
                  { value: "SYSTEM", label: "System" },
                ]}
                allowClear={false}
                aria-label="Role Type"
              />
            </FormField>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowEditRoleModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleEditRole()}
              disabled={isSaving || !editRoleForm.name.trim()}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showDeleteRoleModal && selectedRoleDetail ? (
        <Modal
          title="Delete Role"
          description="Delete this role from the system. System roles and roles assigned to users cannot be deleted."
          onClose={() => setShowDeleteRoleModal(false)}
        >
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="text-sm font-bold text-[var(--color-error)]">Role to delete</div>
            <p className="mt-1 text-sm text-slate-700">{selectedRoleDetail.name}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteRoleModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteRole()}
              disabled={isSaving}
              className="h-11 rounded-xl bg-[var(--color-error)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Deleting..." : "Delete Role"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100";

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

function RoleListItem({
  role,
  active,
  onSelect,
}: {
  role: RoleSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-blue-200 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,0.08)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${roleAvatarTone(role.code)}`}>
        {role.code.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">{role.name}</span>
        <span className="text-xs text-slate-500">{role.userCount} users</span>
      </span>
      <span className={`inline-flex rounded-full px-2 py-1 text-[0.68rem] font-semibold ${roleTone(role.type)}`}>
        {role.type === "SYSTEM" ? "System" : "Custom"}
      </span>
    </button>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
