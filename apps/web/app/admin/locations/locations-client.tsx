"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Filter,
  MoreVertical,
  Network,
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
import {
  type LocationRecord,
  type LocationStatus,
} from "../../../components/locations/location-data";
import LocationFormModal, {
  emptyLocationFormValues,
  managerFromLocation,
  type LocationFormValues,
  type LocationManagerOption,
} from "../../../components/locations/location-form-modal";
import { DropdownSelect } from "../../../components/ui/dropdown-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";
import { API_BASE_URL } from "../../../lib/api-base-url";

const PAGE_SIZE = 5;

type LocationsListResponse = {
  data: LocationRecord[];
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
    const message = payload && typeof payload === "object" && "message" in payload
      ? Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message
      : "Request failed.";
    throw new Error(message || "Request failed.");
  }

  return payload as T;
}

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
  const index = code.charCodeAt(0) % tones.length;
  return tones[index];
}

export default function AdminLocationsClient() {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LocationStatus>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Partial<LocationFormValues>>(
    emptyLocationFormValues(),
  );
  const [formInitialManager, setFormInitialManager] = useState<LocationManagerOption | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function loadLocations() {
    setLoading(true);
    setError(null);
    try {
      const response = await requestJson<LocationsListResponse>("/locations");
      setLocations(response.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load locations.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return locations.filter((location) => {
      if (statusFilter && location.status !== statusFilter) return false;
      if (!query) return true;
      return (
        location.name.toLowerCase().includes(query) ||
        location.code.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query) ||
        location.province.toLowerCase().includes(query) ||
        location.manager.name.toLowerCase().includes(query) ||
        location.subtitle.toLowerCase().includes(query)
      );
    });
  }, [locations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalEmployees = locations.reduce((sum, item) => sum + item.employees, 0);
    const totalDepartments = locations.reduce((sum, item) => sum + item.departments, 0);
    const activeLocations = locations.filter((location) => location.status === "Active").length;

    return {
      totalLocations: locations.length,
      activeLocations,
      totalEmployees,
      totalDepartments,
    };
  }, [locations]);

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
    setEditingLocationId(null);
    setFormInitialValues(emptyLocationFormValues());
    setFormInitialManager(null);
  }

  function openCreateModal() {
    setFormMode("create");
    setEditingLocationId(null);
    setFormInitialValues(emptyLocationFormValues());
    setFormInitialManager(null);
    setMenuOpenId(null);
  }

  function openEditModal(location: LocationRecord) {
    setFormMode("edit");
    setEditingLocationId(location.id);
    setFormInitialValues({
      name: location.name,
      code: location.code,
      managerUserId: location.manager.id ?? "",
      status: location.status,
      streetAddress: location.streetAddress,
      city: location.city,
      province: location.province,
      postalCode: location.postalCode,
      email: location.email,
      phone: location.phone,
      description: location.description,
    });
    setFormInitialManager(managerFromLocation(location.manager));
    setMenuOpenId(null);
  }

  async function handleSubmitLocation(
    values: LocationFormValues,
    _manager: LocationManagerOption | null,
  ) {
    if (!values.name.trim() || !values.code.trim() || saving) return;

    const payload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase().slice(0, 8),
      streetAddress: values.streetAddress.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      postalCode: values.postalCode.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      description: values.description.trim(),
      status: values.status,
      managerUserId: values.managerUserId || null,
    };

    setSaving(true);
    setError(null);
    try {
      if (formMode === "edit" && editingLocationId) {
        await requestJson<{ data: LocationRecord }>(`/locations/${editingLocationId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson<{ data: LocationRecord }>("/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeFormModal();
      await loadLocations();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  }

  const statCards: Array<{
    title: string;
    value: string;
    detail: string;
    Icon: LucideIcon;
    iconClassName: string;
  }> = [
    {
      title: "Total Locations",
      value: String(stats.totalLocations),
      detail: "All locations",
      Icon: Building2,
      iconClassName: "bg-violet-50 text-violet-600",
    },
    {
      title: "Active Locations",
      value: String(stats.activeLocations),
      detail: "Currently operating",
      Icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Total Employees",
      value: String(stats.totalEmployees),
      detail: "Across all locations",
      Icon: Users,
      iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
    },
    {
      title: "Departments",
      value: String(stats.totalDepartments),
      detail: "Mapped to locations",
      Icon: Network,
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
          searchPlaceholder="Search locations..."
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
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">
                Locations
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Location</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage all organizational offices and locations.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Location</span>
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
                All Locations ({filtered.length})
              </h2>
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
                    <span>Filter</span>
                  </button>
                  {filterOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </div>
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

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
                Loading locations...
              </div>
            ) : null}

            {!loading && locations.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No locations have been added yet."
                description="Locations help organize users and policy assignments by physical location."
                actionLabel="Add First Location"
                onAction={openCreateModal}
              />
            ) : null}

            {!loading && locations.length > 0 ? (
              <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Location Code</th>
                    <th className="px-4 py-3">Location Manager</th>
                    <th className="px-4 py-3">Employees</th>
                    <th className="px-4 py-3">Departments</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pageItems.map((location) => (
                    <tr key={location.id} className="text-sm text-slate-700 transition hover:bg-slate-50">
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
                        <span
                          className={cx(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                            codeTone(location.code),
                          )}
                        >
                          {location.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.68rem] font-bold text-slate-600">
                            {location.manager.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">
                              {location.manager.name}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {location.manager.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{location.employees}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{location.departments}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                            statusTone(location.status),
                          )}
                        >
                          <span className={cx("h-1.5 w-1.5 rounded-full", statusDot(location.status))} />
                          {location.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="relative inline-flex"
                          ref={menuOpenId === location.id ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenId((current) => (current === location.id ? null : location.id))
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Actions for ${location.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpenId === location.id ? (
                            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                              <button
                                type="button"
                                onClick={() => openEditModal(location)}
                                className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 lg:hidden">
              {pageItems.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => openEditModal(location)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{location.name}</div>
                          <div className="text-xs text-slate-500">{location.subtitle}</div>
                        </div>
                        <span
                          className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                            statusTone(location.status),
                          )}
                        >
                          <span className={cx("h-1.5 w-1.5 rounded-full", statusDot(location.status))} />
                          {location.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{location.manager.name}</span>
                        <span className="font-semibold text-slate-700">{location.code}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matching locations"
                description="Try another search term or clear filters to see all locations."
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
          <ModuleGuide guideKey="Location" />
        </div>
      </section>

      {formMode ? (
        <LocationFormModal
          mode={formMode}
          initialValues={formInitialValues}
          initialManager={formInitialManager}
          onClose={closeFormModal}
          onSubmit={handleSubmitLocation}
        />
      ) : null}
    </main>
  );
}
