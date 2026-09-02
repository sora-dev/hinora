"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  Network,
  Phone,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { DashboardStatCard } from "../dashboard/primitives";
import { type LocationRecord, type LocationStatus } from "../locations/location-data";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import { API_BASE_URL } from "../../lib/api-base-url";

const PAGE_SIZE = 8;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusTone(status: LocationStatus) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }
  if (status === "Maintenance") {
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
  }
  return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
}

function statusDot(status: LocationStatus) {
  if (status === "Active") return "bg-emerald-500";
  if (status === "Maintenance") return "bg-amber-500";
  return "bg-slate-400";
}

function codeTone(code: string) {
  const tones = [
    "bg-violet-50 text-violet-700",
    "bg-sky-50 text-sky-700",
    "bg-amber-50 text-amber-700",
    "bg-emerald-50 text-emerald-700",
    "bg-rose-50 text-rose-700",
  ];
  return tones[(code.charCodeAt(0) || 0) % tones.length];
}

export default function EmployeeLocationsExperience() {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LocationStatus>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}/locations`);
        const payload = (await response.json().catch(() => null)) as
          | { data?: LocationRecord[]; message?: string }
          | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load locations.");
        }
        if (!cancelled) {
          setLocations(payload?.data ?? []);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
          setLocations([]);
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
    return locations.filter((location) => {
      if (statusFilter && location.status !== statusFilter) return false;
      if (!query) return true;
      return (
        location.name.toLowerCase().includes(query) ||
        location.code.toLowerCase().includes(query) ||
        location.subtitle.toLowerCase().includes(query) ||
        location.manager.name.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query)
      );
    });
  }, [locations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const active = locations.filter((item) => item.status === "Active").length;
    return {
      total: locations.length,
      active,
      employees: locations.reduce((sum, item) => sum + item.employees, 0),
      departments: locations.reduce((sum, item) => sum + item.departments, 0),
    };
  }, [locations]);

  const statCards: Array<{
    title: string;
    value: string;
    detail: string;
    Icon: LucideIcon;
    iconClassName: string;
  }> = [
    {
      title: "Total Locations",
      value: String(stats.total),
      detail: "All offices",
      Icon: Building2,
      iconClassName: "bg-violet-50 text-violet-600",
    },
    {
      title: "Active Locations",
      value: String(stats.active),
      detail: "Currently operating",
      Icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "People",
      value: String(stats.employees),
      detail: "Across all locations",
      Icon: Users,
      iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
    },
    {
      title: "Departments",
      value: String(stats.departments),
      detail: "Mapped to locations",
      Icon: Network,
      iconClassName: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <DashboardShell variant="employee">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5">
          <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Locations</h1>
          <p className="mt-1 text-sm text-slate-500">
            See offices, contacts, and the teams at each site.
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
            <h2 className="text-[1.08rem] font-bold text-slate-900">All Locations ({filtered.length})</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 sm:min-w-[220px]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search locations..."
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
                      onChange={(value) => setStatusFilter(value as "" | LocationStatus)}
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "Maintenance", label: "Maintenance" },
                        { value: "Inactive", label: "Inactive" },
                      ]}
                      placeholder="All Statuses"
                      allowClear
                      size="sm"
                      aria-label="Filter by location status"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Loading locations...</div>
          ) : null}

          {!loading && locations.length === 0 && !error ? (
            <EmptyState
              icon={Building2}
              title="No locations yet"
              description="Offices will appear here once an administrator adds them."
            />
          ) : null}

          {!loading && locations.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Manager</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">People</th>
                      <th className="px-4 py-3">Departments</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageItems.map((location) => (
                      <tr key={location.id} className="text-sm text-slate-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">{location.name}</div>
                              <div className="truncate text-xs text-slate-500">{location.subtitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", codeTone(location.code))}>
                            {location.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{location.manager.name}</div>
                          <div className="text-xs text-slate-500">{location.manager.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-xs text-slate-600">
                            {location.email ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {location.email}
                              </span>
                            ) : null}
                            {location.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                {location.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400">No phone listed</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{location.employees}</td>
                        <td className="px-4 py-3 font-semibold">{location.departments}</td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", statusTone(location.status))}>
                            <span className={cx("h-1.5 w-1.5 rounded-full", statusDot(location.status))} />
                            {location.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 lg:hidden">
                {pageItems.map((location) => (
                  <article key={location.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{location.name}</div>
                        <div className="text-xs text-slate-500">{location.subtitle}</div>
                      </div>
                      <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold", statusTone(location.status))}>
                        {location.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {location.manager.name} · {location.code}
                    </div>
                  </article>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matching locations"
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
