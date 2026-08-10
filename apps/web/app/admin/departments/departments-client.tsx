"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DashboardMobileNav, DashboardSidebar } from "../../../components/dashboard/dashboard-nav";
import {
  DashboardStatCard,
  DashboardTopbar,
} from "../../../components/dashboard/primitives";
import { ORGANIZATION_WIDE_SCOPE } from "../../../components/departments/location-options";
import DepartmentFormModal, {
  emptyDepartmentFormValues,
  type DepartmentFormValues,
  type DepartmentHeadOption,
} from "../../../components/departments/department-form-modal";
import { DropdownSelect } from "../../../components/ui/dropdown-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";
import { API_BASE_URL } from "../../../lib/api-base-url";


type DepartmentStatus = "Active" | "Inactive";

type DepartmentHead = {
  id?: string;
  name: string;
  email: string;
  initials: string;
  jobTitle?: string | null;
};

type DepartmentEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  status: "Active" | "On Leave";
};

type DepartmentPolicy = {
  id: string;
  title: string;
  status: "Assigned" | "Completed" | "Overdue";
  dueAt: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
};

type Department = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  description: string;
  head: DepartmentHead;
  employees: number;
  compliance: number;
  policies: number;
  status: DepartmentStatus;
  locations: string[];
  createdAt: string;
  establishedDate?: string;
  displayOrder?: number;
  parentDepartmentId?: string;
  locationScope?: string;
  costCenter?: string;
  autoAssignMandatory?: boolean;
  enableNotifications?: boolean;
  inheritAssignments?: boolean;
  avatarTone: string;
  employeeList: DepartmentEmployee[];
  policyList: DepartmentPolicy[];
  activity: ActivityItem[];
  complianceTrend: number[];
};

const PAGE_SIZE = 7;

const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

type DepartmentsListResponse = {
  data: Array<Omit<Department, "avatarTone"> & { avatarTone?: string }>;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(", ")
          : payload.message
        : "Request failed.";
    throw new Error(message || "Request failed.");
  }

  return payload as T;
}

function mapDepartment(
  record: Omit<Department, "avatarTone"> & { avatarTone?: string },
  index: number,
): Department {
  return {
    ...record,
    shortName: record.shortName || record.name,
    createdAt:
      typeof record.createdAt === "string"
        ? formatEstablishedDate(
            record.establishedDate ||
              (record.createdAt.includes("T")
                ? record.createdAt.slice(0, 10)
                : record.createdAt),
          ) || record.createdAt
        : String(record.createdAt),
    avatarTone: record.avatarTone ?? AVATAR_TONES[index % AVATAR_TONES.length],
    employeeList: record.employeeList ?? [],
    policyList: record.policyList ?? [],
    activity: record.activity ?? [],
    complianceTrend: record.complianceTrend ?? [0, 0, 0, 0],
  };
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function complianceBarTone(value: number) {
  if (value >= 95) return "bg-emerald-500";
  if (value >= 85) return "bg-amber-400";
  return "bg-orange-500";
}

function statusTone(status: DepartmentStatus) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
}

function formatEstablishedDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDepartmentsClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DepartmentStatus>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Partial<DepartmentFormValues>>(
    emptyDepartmentFormValues(),
  );
  const [formInitialHead, setFormInitialHead] = useState<DepartmentHeadOption | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function loadDepartments() {
    setLoading(true);
    setError(null);
    try {
      const response = await requestJson<DepartmentsListResponse>("/departments");
      setDepartments((response.data ?? []).map(mapDepartment));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load departments.");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter((department) => {
      if (statusFilter && department.status !== statusFilter) return false;
      if (!query) return true;
      return (
        department.name.toLowerCase().includes(query) ||
        department.shortName.toLowerCase().includes(query) ||
        department.code.toLowerCase().includes(query) ||
        department.head.name.toLowerCase().includes(query)
      );
    });
  }, [departments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalEmployees = departments.reduce((sum, item) => sum + item.employees, 0);
    const totalPolicies = departments.reduce((sum, item) => sum + item.policies, 0);
    const averageCompliance =
      departments.length === 0
        ? 0
        : Math.round(
            departments.reduce((sum, item) => sum + item.compliance, 0) / departments.length,
          );

    return {
      totalDepartments: departments.length,
      totalEmployees,
      averageCompliance,
      totalPolicies,
    };
  }, [departments]);

  useEffect(() => {
    if (!filterOpen && !menuOpenId) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (filterOpen && !filterRef.current?.contains(target)) {
        setFilterOpen(false);
      }
      if (menuOpenId && !menuRef.current?.contains(target)) {
        setMenuOpenId(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [filterOpen, menuOpenId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function closeFormModal() {
    setFormMode(null);
    setEditingDepartmentId(null);
    setFormInitialValues(emptyDepartmentFormValues());
    setFormInitialHead(null);
  }

  function openCreateModal() {
    setFormMode("create");
    setEditingDepartmentId(null);
    setFormInitialValues(emptyDepartmentFormValues());
    setFormInitialHead(null);
    setMenuOpenId(null);
  }

  function openEditModal(department: Department) {
    setFormMode("edit");
    setEditingDepartmentId(department.id);
    setFormInitialValues({
      name: department.name,
      status: department.status,
      code: department.code,
      establishedDate: department.establishedDate ?? "",
      description: department.description,
      displayOrder: String(department.displayOrder ?? 1),
      headUserId: department.head.id ?? "",
      parentDepartmentId: department.parentDepartmentId ?? "",
      locationScope: department.locationScope ?? ORGANIZATION_WIDE_SCOPE,
      costCenter: department.costCenter ?? "",
      autoAssignMandatory: department.autoAssignMandatory ?? true,
      enableNotifications: department.enableNotifications ?? true,
      inheritAssignments: department.inheritAssignments ?? true,
    });
    setFormInitialHead(
      department.head.id
        ? {
            id: department.head.id,
            fullName: department.head.name,
            email: department.head.email,
            jobTitle: department.head.jobTitle ?? null,
            department: department.name,
            initials: department.head.initials,
          }
        : department.head.name !== "Unassigned"
          ? {
              id: "",
              fullName: department.head.name,
              email: department.head.email,
              jobTitle: department.head.jobTitle ?? null,
              department: department.name,
              initials: department.head.initials,
            }
          : null,
    );
    setMenuOpenId(null);
  }

  async function handleSubmitDepartment(
    values: DepartmentFormValues,
    _head: DepartmentHeadOption | null,
  ) {
    if (!values.name.trim() || !values.code.trim() || saving) return;

    const payload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase().slice(0, 8),
      description: values.description.trim(),
      status: values.status,
      establishedDate: values.establishedDate || null,
      displayOrder: Number(values.displayOrder) || 1,
      headUserId: values.headUserId || null,
      parentDepartmentId: values.parentDepartmentId || null,
      locationScope: values.locationScope || ORGANIZATION_WIDE_SCOPE,
      costCenter: values.costCenter.trim() || null,
      autoAssignMandatory: values.autoAssignMandatory,
      enableNotifications: values.enableNotifications,
      inheritAssignments: values.inheritAssignments,
    };

    setSaving(true);
    setError(null);
    try {
      if (formMode === "edit" && editingDepartmentId) {
        await requestJson(`/departments/${editingDepartmentId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeFormModal();
      await loadDepartments();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save department.");
    } finally {
      setSaving(false);
    }
  }

  const parentDepartmentOptions = useMemo(
    () =>
      departments
        .filter((department) => department.id !== editingDepartmentId)
        .map((department) => ({ id: department.id, name: department.name })),
    [departments, editingDepartmentId],
  );

  const statCards: Array<{
    title: string;
    value: string;
    detail: string;
    Icon: LucideIcon;
    iconClassName: string;
  }> = [
    {
      title: "Total Departments",
      value: String(stats.totalDepartments),
      detail: "Active departments",
      Icon: Users,
      iconClassName: "bg-violet-50 text-violet-600",
    },
    {
      title: "Total Employees",
      value: String(stats.totalEmployees),
      detail: "Across all departments",
      Icon: Users,
      iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
    },
    {
      title: "Average Compliance",
      value: `${stats.averageCompliance}%`,
      detail: "Across all departments",
      Icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Policies Assigned",
      value: String(stats.totalPolicies),
      detail: "Across all departments",
      Icon: BookOpen,
      iconClassName: "bg-amber-50 text-amber-600",
    },
  ];

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search departments..."
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
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Departments</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Departments</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </button>
          </div>

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

          <article className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-[1.08rem] font-bold text-slate-900">
                  All Departments ({filtered.length})
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 sm:min-w-[220px]">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by department name..."
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                    />
                  </label>
                  <div ref={filterRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((current) => !current)}
                      className={cx(
                        "inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition",
                        filterOpen || statusFilter
                          ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300",
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                    </button>
                    {filterOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </div>
                        <DropdownSelect
                          value={statusFilter}
                          onChange={(value) => setStatusFilter(value as "" | DepartmentStatus)}
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                          ]}
                          placeholder="All Statuses"
                          allowClear
                          size="sm"
                          aria-label="Filter by status"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
                Loading departments...
              </div>
            ) : null}

            {!loading && departments.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No departments have been added yet."
                description="Departments help organize users and policy assignments across your organization."
                actionLabel="Add First Department"
                onAction={openCreateModal}
              />
            ) : null}

            {!loading && departments.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Department Head</th>
                      <th className="px-4 py-3">Employees</th>
                      <th className="px-4 py-3">Compliance</th>
                      <th className="px-4 py-3">Policies</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageItems.map((department) => {
                      return (
                        <tr
                          key={department.id}
                          className="text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={cx(
                                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  department.avatarTone,
                                )}
                              >
                                {department.code}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {department.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {department.shortName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.68rem] font-bold text-slate-600">
                                {department.head.initials}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {department.head.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {department.head.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {department.employees}
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[110px]">
                              <div className="mb-1 text-sm font-bold text-slate-800">
                                {department.compliance}%
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={cx(
                                    "h-full rounded-full",
                                    complianceBarTone(department.compliance),
                                  )}
                                  style={{ width: `${department.compliance}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {department.policies}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cx(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                                statusTone(department.status),
                              )}
                            >
                              {department.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className="relative inline-flex"
                              ref={menuOpenId === department.id ? menuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMenuOpenId((current) =>
                                    current === department.id ? null : department.id,
                                  );
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={`Actions for ${department.name}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {menuOpenId === department.id ? (
                                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditModal(department);
                                    }}
                                    className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 lg:hidden">
                {pageItems.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => openEditModal(department)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          department.avatarTone,
                        )}
                      >
                        {department.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{department.name}</div>
                            <div className="text-xs text-slate-500">{department.head.name}</div>
                          </div>
                          <span
                            className={cx(
                              "inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                              statusTone(department.status),
                            )}
                          >
                            {department.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{department.employees} employees</span>
                          <span className="font-semibold text-slate-700">
                            {department.compliance}% compliance
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matching departments"
                  description="Try another search term or clear filters to see all departments."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setSearch("");
                    setStatusFilter("");
                  }}
                  className="py-12"
                />
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {rangeStart} to {rangeEnd} of {filtered.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cx(
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition",
                        pageNumber === currentPage
                          ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] shadow-[0_0_0_1px_var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              </>
            ) : null}
          </article>
          <ModuleGuide guideKey="Departments" />
        </div>
      </section>

      {formMode ? (
        <DepartmentFormModal
          mode={formMode}
          initialValues={formInitialValues}
          initialHead={formInitialHead}
          parentDepartments={parentDepartmentOptions}
          onClose={closeFormModal}
          onSubmit={handleSubmitDepartment}
        />
      ) : null}
    </main>
  );
}
