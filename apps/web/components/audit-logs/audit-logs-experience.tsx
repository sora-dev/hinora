"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api-base-url";
import { recordClientAuditEvent } from "../../lib/record-audit-event";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { DateRangeField } from "../reports/reports-date-range";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  actionTone,
  auditActions,
  auditColumns,
  auditStatuses,
  defaultAuditModules,
  defaultAuditResourceTypes,
  downloadAuditCsv,
  formatAuditTimestamp,
  mergeFilterOptions,
  type AuditColumnKey,
  type AuditLogRecord,
} from "./audit-logs-data";

type FilterDraft = {
  from: Date;
  to: Date;
  user: string;
  action: string;
  module: string;
  resourceType: string;
  resource: string;
  ipAddress: string;
  status: string;
};

const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

function defaultFilters(): FilterDraft {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  from.setHours(0, 0, 0, 0);
  return {
    from,
    to,
    user: "",
    action: "",
    module: "",
    resourceType: "",
    resource: "",
    ipAddress: "",
    status: "",
  };
}

function toDateParam(date: Date, endOfDay: boolean) {
  const copy = new Date(date);
  if (endOfDay) {
    copy.setHours(23, 59, 59, 999);
  } else {
    copy.setHours(0, 0, 0, 0);
  }
  return copy.toISOString();
}

type AuditLogsResponse = {
  items?: AuditLogRecord[];
  total?: number;
  stats?: {
    total: number;
    uniqueUsers: number;
    success: number;
    failed: number;
  };
  filters?: {
    users?: string[];
    modules?: string[];
    resourceTypes?: string[];
  };
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export default function AuditLogsExperience() {
  const [draft, setDraft] = useState<FilterDraft>(defaultFilters);
  const [applied, setApplied] = useState<FilterDraft>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [visibleColumns, setVisibleColumns] = useState<AuditColumnKey[]>(auditColumns.map((column) => column.key));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);
  const [pageItems, setPageItems] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, uniqueUsers: 0, success: 0, failed: 0 });
  const [filterUsers, setFilterUsers] = useState<string[]>([]);
  const [filterModules, setFilterModules] = useState<string[]>(defaultAuditModules);
  const [filterResourceTypes, setFilterResourceTypes] = useState<string[]>(defaultAuditResourceTypes);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * size;
  const pageEnd = pageStart + pageItems.length;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setLoading(false);
      setErrorMessage("API URL is not configured.");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      from: toDateParam(applied.from, false),
      to: toDateParam(applied.to, true),
      page: String(page),
      pageSize: String(size),
    });
    if (applied.user) params.set("user", applied.user);
    if (applied.action) params.set("action", applied.action);
    if (applied.module) params.set("module", applied.module);
    if (applied.resourceType) params.set("resourceType", applied.resourceType);
    if (applied.resource) params.set("resource", applied.resource);
    if (applied.ipAddress) params.set("ipAddress", applied.ipAddress);
    if (applied.status) params.set("status", applied.status);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    setLoading(true);
    void fetch(`${apiBaseUrl}/audit-logs?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as AuditLogsResponse | null;
        if (!response.ok || !payload) {
          throw new Error("Unable to load audit logs.");
        }
        setPageItems(payload.items ?? []);
        setTotal(payload.total ?? 0);
        setStats(payload.stats ?? { total: 0, uniqueUsers: 0, success: 0, failed: 0 });
        setFilterUsers(payload.filters?.users ?? []);
        setFilterModules(mergeFilterOptions(payload.filters?.modules, defaultAuditModules));
        setFilterResourceTypes(mergeFilterOptions(payload.filters?.resourceTypes, defaultAuditResourceTypes));
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPageItems([]);
        setTotal(0);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load audit logs.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [applied, page, debouncedSearch, size]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (columnsRef.current && !columnsRef.current.contains(target)) setColumnsOpen(false);
      if (menuRef.current && !menuRef.current.contains(target)) setMenuId(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function updateDraft<K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setApplied(draft);
    setPage(1);
  }

  function resetFilters() {
    const next = defaultFilters();
    setDraft(next);
    setApplied(next);
    setSearch("");
    setPage(1);
  }

  function toggleColumn(key: AuditColumnKey) {
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  function copyIp(address: string) {
    void navigator.clipboard?.writeText(address);
    setMenuId(null);
  }

  async function exportLogs() {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) return;

    const params = new URLSearchParams({
      from: toDateParam(applied.from, false),
      to: toDateParam(applied.to, true),
      export: "1",
    });
    if (applied.user) params.set("user", applied.user);
    if (applied.action) params.set("action", applied.action);
    if (applied.module) params.set("module", applied.module);
    if (applied.resourceType) params.set("resourceType", applied.resourceType);
    if (applied.resource) params.set("resource", applied.resource);
    if (applied.ipAddress) params.set("ipAddress", applied.ipAddress);
    if (applied.status) params.set("status", applied.status);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    try {
      const response = await fetch(`${apiBaseUrl}/audit-logs?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as AuditLogsResponse | null;
      const rows = payload?.items ?? [];
      downloadAuditCsv("hinora-audit-logs", rows);
      recordClientAuditEvent({
        action: "EXPORT",
        module: "Reports",
        resourceType: "Report",
        resource: "Audit Logs",
        details: `Exported ${rows.length} audit log${rows.length === 1 ? "" : "s"}`,
      });
    } catch {
      downloadAuditCsv("hinora-audit-logs", pageItems);
    }
  }

  const shownColumns = auditColumns.filter((column) => visibleColumns.includes(column.key));

  return (
    <DashboardShell variant="admin">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">Track and review all system activities and changes.</p>
          </div>
          <button
            type="button"
            onClick={() => void exportLogs()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export Logs
          </button>
        </div>

        <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <Filter className="h-4 w-4 text-[var(--color-active-menu)]" />
              Filters
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="text-sm font-semibold text-[var(--color-active-menu)]"
            >
              {filtersOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {filtersOpen ? (
            <div className="border-t border-slate-100 px-5 pb-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Date Range</span>
                  <DateRangeField
                    from={draft.from}
                    to={draft.to}
                    onChange={(from, to) => {
                      updateDraft("from", from);
                      updateDraft("to", to);
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">User</span>
                  <DropdownSelect
                    value={draft.user}
                    onChange={(value) => updateDraft("user", value)}
                    options={filterUsers.map((user) => ({ value: user, label: user }))}
                    placeholder="All users"
                    allowClear
                    aria-label="User"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Action</span>
                  <DropdownSelect
                    value={draft.action}
                    onChange={(value) => updateDraft("action", value)}
                    options={auditActions.map((action) => ({ value: action, label: action }))}
                    placeholder="All actions"
                    allowClear
                    aria-label="Action"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Module</span>
                  <DropdownSelect
                    value={draft.module}
                    onChange={(value) => updateDraft("module", value)}
                    options={filterModules.map((module) => ({ value: module, label: module }))}
                    placeholder="All modules"
                    allowClear
                    aria-label="Module"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Resource Type</span>
                  <DropdownSelect
                    value={draft.resourceType}
                    onChange={(value) => updateDraft("resourceType", value)}
                    options={filterResourceTypes.map((type) => ({ value: type, label: type }))}
                    placeholder="All resource types"
                    allowClear
                    aria-label="Resource Type"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Resource</span>
                  <input
                    value={draft.resource}
                    onChange={(event) => updateDraft("resource", event.target.value)}
                    placeholder="Search resource..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">IP Address</span>
                  <input
                    value={draft.ipAddress}
                    onChange={(event) => updateDraft("ipAddress", event.target.value)}
                    placeholder="Search IP address..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-600">Status</span>
                  <DropdownSelect
                    value={draft.status}
                    onChange={(value) => updateDraft("status", value)}
                    options={auditStatuses.map((status) => ({ value: status, label: status }))}
                    placeholder="All status"
                    allowClear
                    aria-label="Status"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white hover:brightness-110"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filters
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Logs" value={stats.total.toLocaleString()} Icon={FileText} iconClassName="bg-blue-50 text-[var(--color-active-menu)]" />
          <StatCard title="Unique Users" value={String(stats.uniqueUsers)} Icon={Users} iconClassName="bg-violet-50 text-violet-600" />
          <StatCard title="Successful Actions" value={stats.success.toLocaleString()} Icon={Activity} iconClassName="bg-emerald-50 text-emerald-600" />
          <StatCard title="Failed Actions" value={stats.failed.toLocaleString()} Icon={AlertTriangle} iconClassName="bg-orange-50 text-orange-600" />
        </div>

        <section className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-end">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 lg:w-72">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search logs..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <div className="relative" ref={columnsRef}>
              <button
                type="button"
                onClick={() => setColumnsOpen((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Columns3 className="h-4 w-4" />
                Column
              </button>
              {columnsOpen ? (
                <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                  {auditColumns.map((column) => (
                    <label key={column.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column.key)}
                        onChange={() => toggleColumn(column.key)}
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-[13px] font-semibold text-slate-500">
                  {shownColumns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap px-4 py-3 first:pl-5">
                      {column.label}
                    </th>
                  ))}
                  <th className="w-12 px-4 py-3 last:pr-5" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    {shownColumns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3.5 first:pl-5">
                        <AuditCell log={log} column={column.key} onOpen={() => setSelected(log)} />
                      </td>
                    ))}
                    <td className="px-4 py-3.5 last:pr-5">
                      <div className="relative flex justify-end" ref={menuId === log.id ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setMenuId((current) => (current === log.id ? null : log.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`Actions for ${log.resource}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === log.id ? (
                          <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(log);
                                setMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4 text-slate-400" />
                              View details
                            </button>
                            <button
                              type="button"
                              onClick={() => copyIp(log.ipAddress)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Copy className="h-4 w-4 text-slate-400" />
                              Copy IP
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={shownColumns.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">
                      {loading
                        ? "Loading audit logs..."
                        : errorMessage || "No audit logs match the current filters."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">
              Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {total.toLocaleString()} logs
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                {pageSize} per page
                <DropdownSelect
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value || "10");
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                  size="sm"
                  className="w-[4.5rem]"
                  aria-label="Rows per page"
                />
              </label>
              <div className="flex items-center gap-1.5">
                <PagerButton label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </PagerButton>
                <PagerButton label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </PagerButton>
                {pageNumbers(currentPage, totalPages).map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="px-1 text-sm font-semibold text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={cx(
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold",
                        item === currentPage
                          ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
                <PagerButton
                  label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </PagerButton>
                <PagerButton label="Last page" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
                  <ChevronsRight className="h-4 w-4" />
                </PagerButton>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <ModuleGuide guideKey="Audit Logs" />
        </div>
      </div>

      {selected ? <AuditDetailModal log={selected} onClose={() => setSelected(null)} /> : null}
    </DashboardShell>
  );
}

function StatCard({
  title,
  value,
  Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  Icon: typeof FileText;
  iconClassName: string;
}) {
  return (
    <article className="flex items-center gap-3.5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
      <div className={cx("flex h-[52px] w-[52px] items-center justify-center rounded-[14px]", iconClassName)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[0.82rem] font-bold text-slate-600">{title}</div>
        <div className="mt-1 text-[1.7rem] font-extrabold leading-none text-slate-900">{value}</div>
      </div>
    </article>
  );
}

function AuditCell({
  log,
  column,
  onOpen,
}: {
  log: AuditLogRecord;
  column: AuditColumnKey;
  onOpen: () => void;
}) {
  if (column === "at") return <span className="font-medium text-slate-700">{formatAuditTimestamp(log.at)}</span>;
  if (column === "user") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={cx("inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", log.user.tone)}>
          {log.user.initials}
        </span>
        <span className="font-semibold text-slate-800">{log.user.name}</span>
      </span>
    );
  }
  if (column === "action") {
    return (
      <span className={cx("inline-flex rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em]", actionTone(log.action))}>
        {log.action}
      </span>
    );
  }
  if (column === "resource") {
    return (
      <button type="button" onClick={onOpen} className="font-semibold text-[var(--color-active-menu)] hover:underline">
        {log.resource}
      </button>
    );
  }
  if (column === "status") {
    return (
      <span
        className={cx(
          "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
          log.status === "Success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600",
        )}
      >
        {log.status}
      </span>
    );
  }
  if (column === "details") return <span className="text-slate-600">{log.details}</span>;
  if (column === "ipAddress") return <span className="font-medium text-slate-600">{log.ipAddress}</span>;
  if (column === "module") return <span className="text-slate-700">{log.module}</span>;
  return <span className="text-slate-700">{log.resourceType}</span>;
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function AuditDetailModal({ log, onClose }: { log: AuditLogRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Audit event</h2>
            <p className="mt-1 text-sm text-slate-500">{formatAuditTimestamp(log.at)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-sm">
          <DetailRow label="User" value={log.user.name} />
          <DetailRow label="Action" value={log.action} />
          <DetailRow label="Module" value={log.module} />
          <DetailRow label="Resource type" value={log.resourceType} />
          <DetailRow label="Resource" value={log.resource} />
          <DetailRow label="Details" value={log.details} />
          <DetailRow label="IP address" value={log.ipAddress} />
          <DetailRow label="Status" value={log.status} />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="font-semibold text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
