"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Network,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { DashboardStatCard } from "../dashboard/primitives";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import { API_BASE_URL } from "../../lib/api-base-url";

const PAGE_SIZE = 8;
const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

type DepartmentStatus = "Active" | "Inactive";

type Department = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  description: string;
  head: { name: string; email: string; initials: string };
  employees: number;
  compliance: number;
  policies: number;
  status: DepartmentStatus;
  locations: string[];
  avatarTone?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusTone(status: DepartmentStatus) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
}

function complianceBarTone(value: number) {
  if (value >= 95) return "bg-emerald-500";
  if (value >= 85) return "bg-amber-400";
  return "bg-orange-500";
}

export default function EmployeeDepartmentsExperience() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DepartmentStatus>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}/departments`);
        const payload = (await response.json().catch(() => null)) as
          | { data?: Department[]; message?: string }
          | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load departments.");
        }
        if (!cancelled) {
          setDepartments(
            (payload?.data ?? []).map((record, index) => ({
              ...record,
              avatarTone: record.avatarTone ?? AVATAR_TONES[index % AVATAR_TONES.length],
            })),
          );
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
          setDepartments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter((department) => {
      if (statusFilter && department.status !== statusFilter) return false;
      if (!query) return true;
      return (
        department.name.toLowerCase().includes(query) ||
        department.code.toLowerCase().includes(query) ||
        department.head.name.toLowerCase().includes(query) ||
        department.locations.join(" ").toLowerCase().includes(query)
      );
    });
  }, [departments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const active = departments.filter((item) => item.status === "Active");
    const totalEmployees = departments.reduce((sum, item) => sum + item.employees, 0);
    const averageCompliance =
      active.length === 0
        ? 0
        : Math.round(active.reduce((sum, item) => sum + item.compliance, 0) / active.length);
    return {
      total: departments.length,
      employees: totalEmployees,
      averageCompliance,
      policies: departments.reduce((sum, item) => sum + item.policies, 0),
    };
  }, [departments]);

  const statCards: Array<{
    title: string;
    value: string;
    detail: string;
    Icon: LucideIcon;
    iconClassName: string;
  }> = [
    {
      title: "Total Departments",
      value: String(stats.total),
      detail: "In the organization",
      Icon: Network,
      iconClassName: "bg-violet-50 text-violet-600",
    },
    {
      title: "People",
      value: String(stats.employees),
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
      value: String(stats.policies),
      detail: "Across all departments",
      Icon: BookOpen,
      iconClassName: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <DashboardShell variant="employee">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5">
          <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse departments, heads, and contacts across the organization.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
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

        <article className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-[1.08rem] font-bold text-slate-900">All Departments ({filtered.length})</h2>
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
                  Filter
                </button>
                {filterOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Status</div>
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

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Loading departments...</div>
          ) : null}

          {!loading && departments.length === 0 && !error ? (
            <EmptyState
              icon={Building2}
              title="No departments yet"
              description="Departments will appear here once an administrator adds them."
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
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Employees</th>
                      <th className="px-4 py-3">Compliance</th>
                      <th className="px-4 py-3">Policies</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageItems.map((department) => (
                      <tr key={department.id} className="text-sm text-slate-700">
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
                              <div className="truncate font-semibold text-slate-900">{department.name}</div>
                              <div className="truncate text-xs text-slate-500">{department.shortName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.68rem] font-bold text-slate-600">
                              {department.head.initials}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">{department.head.name}</div>
                              <div className="truncate text-xs text-slate-500">{department.head.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {department.locations.length > 0 ? department.locations.join(", ") : "Organization-wide"}
                        </td>
                        <td className="px-4 py-3 font-semibold">{department.employees}</td>
                        <td className="px-4 py-3">
                          <div className="min-w-[110px]">
                            <div className="mb-1 text-sm font-bold text-slate-800">{department.compliance}%</div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cx("h-full rounded-full", complianceBarTone(department.compliance))}
                                style={{ width: `${department.compliance}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{department.policies}</td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", statusTone(department.status))}>
                            {department.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 lg:hidden">
                {pageItems.map((department) => (
                  <article key={department.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{department.name}</div>
                        <div className="text-xs text-slate-500">{department.head.name}</div>
                      </div>
                      <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold", statusTone(department.status))}>
                        {department.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {department.employees} people · {department.policies} policies
                    </div>
                  </article>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matching departments"
                  description="Try another search term or clear filters."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setSearch("");
                    setStatusFilter("");
                  }}
                  className="py-12"
                />
              ) : (
                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    Showing {rangeStart} to {rangeEnd} of {filtered.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
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
                          "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold",
                          pageNumber === currentPage
                            ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                            : "border-slate-200 bg-white text-slate-600",
                        )}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </article>
      </div>
    </DashboardShell>
  );
}
