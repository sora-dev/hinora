"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  History,
  Info,
  MoreVertical,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";

type ExportStep = 1 | 2 | 3 | 4;
type ExportFormat = "zip" | "sql" | "csv";
type ExportDestination = "download" | "storage";
type CategoryId = "database" | "documents" | "users" | "config" | "audit" | "app";

type ExportCategory = {
  id: CategoryId;
  label: string;
  description: string;
  count: string;
  sizeLabel: string;
  sizeMb: number;
  info: string;
  Icon: LucideIcon;
  iconWrap: string;
};

type ExportHistoryType =
  | "Full Export"
  | "Custom Export"
  | "Database Export"
  | "Policy Export"
  | "Report Export";
type ExportHistoryStatus = "Completed" | "Failed";
type ExportHistoryFormat = "ZIP" | "SQL" | "CSV";

type ExportHistoryItem = {
  id: string;
  name: string;
  type: ExportHistoryType;
  format: ExportHistoryFormat;
  size: string;
  date: string;
  dateValue: string;
  requestedBy: string;
  requestedByRole: string;
  status: ExportHistoryStatus;
  errorDetail?: string;
};

const exportSteps = [
  { id: 1, label: "Select Data", hint: "Choose data to export." },
  { id: 2, label: "Configure Options", hint: "Set export preferences." },
  { id: 3, label: "Review & Confirm", hint: "Verify and confirm." },
  { id: 4, label: "Export Data", hint: "Download or store export." },
] as const;

const categories: ExportCategory[] = [
  {
    id: "database",
    label: "Database",
    description: "All database tables and records.",
    count: "125 Tables",
    sizeLabel: "2.45 GB",
    sizeMb: 2450,
    info: "Includes schema, tables, and relational records used by Hinora.",
    Icon: Database,
    iconWrap: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "documents",
    label: "Documents & Files",
    description: "Uploaded files and policy documents.",
    count: "18,742 Files",
    sizeLabel: "3.12 GB",
    sizeMb: 3120,
    info: "Includes policy PDFs, attachments, and uploaded media.",
    Icon: FolderOpen,
    iconWrap: "bg-amber-50 text-amber-600",
  },
  {
    id: "users",
    label: "Users & Permissions",
    description: "Accounts, roles, and access settings.",
    count: "1,248 Users",
    sizeLabel: "2.8 MB",
    sizeMb: 2.8,
    info: "Includes user profiles, roles, and permission assignments.",
    Icon: Users,
    iconWrap: "bg-blue-50 text-[var(--color-active-menu)]",
  },
  {
    id: "config",
    label: "System Configurations",
    description: "Organization and system settings.",
    count: "Settings",
    sizeLabel: "1.6 MB",
    sizeMb: 1.6,
    info: "Includes organization, backup, and module configuration.",
    Icon: Settings,
    iconWrap: "bg-slate-100 text-slate-600",
  },
  {
    id: "audit",
    label: "Audit Logs",
    description: "Activity history and compliance records.",
    count: "2.1M Records",
    sizeLabel: "850 MB",
    sizeMb: 850,
    info: "Includes sign-in, policy, and administrative audit events.",
    Icon: FileText,
    iconWrap: "bg-sky-50 text-sky-700",
  },
  {
    id: "app",
    label: "Application Data",
    description: "App-specific records and cached data.",
    count: "App data",
    sizeLabel: "45 MB",
    sizeMb: 45,
    info: "Includes application records that are not stored in other categories.",
    Icon: Server,
    iconWrap: "bg-violet-50 text-violet-600",
  },
];

const formatOptions: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  Icon: LucideIcon;
  iconWrap: string;
  recommended?: boolean;
}> = [
  {
    id: "zip",
    label: "ZIP",
    description: "Compressed archive file.",
    Icon: Archive,
    iconWrap: "bg-emerald-50 text-emerald-600",
    recommended: true,
  },
  {
    id: "sql",
    label: "SQL",
    description: "Best for migrations.",
    Icon: Database,
    iconWrap: "bg-violet-50 text-violet-600",
  },
  {
    id: "csv",
    label: "CSV",
    description: "Best for data analysis.",
    Icon: FileSpreadsheet,
    iconWrap: "bg-amber-50 text-amber-600",
  },
];

const HISTORY_COUNT = 127;
const historyTypeOptions = [
  { value: "Full Export", label: "Full Export" },
  { value: "Custom Export", label: "Custom Export" },
  { value: "Database Export", label: "Database Export" },
  { value: "Policy Export", label: "Policy Export" },
  { value: "Report Export", label: "Report Export" },
];
const historyStatusOptions = [
  { value: "Completed", label: "Completed" },
  { value: "Failed", label: "Failed" },
];
const historyDateOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];
const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

const historyRequesters = [
  { name: "Jethro Simbulan", role: "System Administrator" },
  { name: "Maria Santos", role: "IT Specialist" },
  { name: "Ana Reyes", role: "Compliance Officer" },
];

const historyTypes: ExportHistoryType[] = [
  "Custom Export",
  "Full Export",
  "Database Export",
  "Policy Export",
  "Report Export",
];
const historyFormats: ExportHistoryFormat[] = ["ZIP", "SQL", "CSV"];

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function formatHistoryDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hour = date.getUTCHours();
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} ${padTime(hour12)}:${padTime(date.getUTCMinutes())} ${ampm}`;
}

function historyFileName(date: Date, format: ExportHistoryFormat) {
  const stamp = `${date.getUTCFullYear()}-${padTime(date.getUTCMonth() + 1)}-${padTime(date.getUTCDate())}`;
  return `hinora-export-${stamp}.${format.toLowerCase()}`;
}

function historySize(index: number, format: ExportHistoryFormat) {
  if (format === "CSV") return `${(8.4 + (index % 18) * 0.6).toFixed(1)} MB`;
  if (format === "SQL") return `${(1.18 + (index % 9) * 0.28).toFixed(2)} GB`;
  return `${(2.15 + (index % 12) * 0.34).toFixed(2)} GB`;
}

function createInitialHistory(): ExportHistoryItem[] {
  const featured: ExportHistoryItem[] = [
    {
      id: "exp-001",
      name: "hinora-export-2026-05-12.zip",
      type: "Custom Export",
      format: "ZIP",
      size: "5.42 GB",
      date: "May 12, 2026 03:20 PM",
      dateValue: "2026-05-12T07:20:00.000Z",
      requestedBy: "Jethro Simbulan",
      requestedByRole: "System Administrator",
      status: "Completed",
    },
    {
      id: "exp-002",
      name: "hinora-export-2026-04-01.zip",
      type: "Full Export",
      format: "ZIP",
      size: "6.18 GB",
      date: "Apr 1, 2026 09:00 AM",
      dateValue: "2026-04-01T01:00:00.000Z",
      requestedBy: "Jethro Simbulan",
      requestedByRole: "System Administrator",
      status: "Completed",
    },
    {
      id: "exp-003",
      name: "hinora-export-2026-03-18.sql",
      type: "Custom Export",
      format: "SQL",
      size: "2.41 GB",
      date: "Mar 18, 2026 11:44 AM",
      dateValue: "2026-03-18T03:44:00.000Z",
      requestedBy: "Maria Santos",
      requestedByRole: "IT Specialist",
      status: "Failed",
      errorDetail: "Export stopped after the database dump exceeded the storage quota.",
    },
  ];

  const start = new Date("2026-05-11T16:00:00.000Z");
  const generated = Array.from({ length: HISTORY_COUNT - featured.length }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - index);
    date.setUTCHours(2 + (index % 12), (index * 7) % 60, 0, 0);
    const format = historyFormats[index % historyFormats.length];
    const requester = historyRequesters[index % historyRequesters.length];
    const failed = index % 11 === 4;
    return {
      id: `exp-${padTime(index + 4)}`,
      name: historyFileName(date, format),
      type: historyTypes[index % historyTypes.length],
      format,
      size: historySize(index, format),
      date: formatHistoryDate(date),
      dateValue: date.toISOString(),
      requestedBy: requester.name,
      requestedByRole: requester.role,
      status: failed ? "Failed" : "Completed",
      errorDetail: failed ? "The export job timed out before all selected data could be written." : undefined,
    } satisfies ExportHistoryItem;
  });

  return [...featured, ...generated].sort((a, b) => (a.dateValue < b.dateValue ? 1 : -1));
}

const initialHistory = createInitialHistory();

const defaultSelected: CategoryId[] = ["database", "documents", "users"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatSize(mb: number) {
  if (mb >= 1024) return `~ ${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `~ ${mb.toFixed(1)} MB`;
  return `~ ${(mb * 1024).toFixed(0)} KB`;
}

function estimateDuration(mb: number) {
  if (mb <= 0) return "—";
  if (mb < 100) return "1 - 2 minutes";
  if (mb < 1024) return "3 - 8 minutes";
  if (mb < 6000) return "15 - 25 minutes";
  return "20 - 35 minutes";
}

function historyPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function formatMeta(format: ExportHistoryFormat) {
  if (format === "SQL") {
    return { Icon: Database, wrap: "bg-violet-50 text-violet-600" };
  }
  if (format === "CSV") {
    return { Icon: FileSpreadsheet, wrap: "bg-amber-50 text-amber-600" };
  }
  return { Icon: Archive, wrap: "bg-emerald-50 text-emerald-600" };
}

function ExportHistoryDialog({
  history,
  onChangeHistory,
  onClose,
  onBanner,
}: {
  history: ExportHistoryItem[];
  onChangeHistory: (next: ExportHistoryItem[] | ((current: ExportHistoryItem[]) => ExportHistoryItem[])) => void;
  onClose: () => void;
  onBanner: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ExportHistoryItem | null>(null);

  const newestValue = history[0]?.dateValue ?? "2026-05-13T02:00:00.000Z";
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((item) => {
      if (query) {
        const haystack = `${item.name} ${item.type} ${item.requestedBy} ${item.format}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (typeFilter && item.type !== typeFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (dateFilter) {
        const cutoff = new Date(newestValue);
        cutoff.setUTCDate(cutoff.getUTCDate() - Number(dateFilter));
        if (new Date(item.dateValue) < cutoff) return false;
      }
      return true;
    });
  }, [dateFilter, history, newestValue, search, statusFilter, typeFilter]);

  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);
  const pageEnd = pageStart + pageItems.length;

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, dateFilter, pageSize]);

  function deleteItem(item: ExportHistoryItem) {
    onChangeHistory((current) => current.filter((entry) => entry.id !== item.id));
    setMenuId(null);
    if (detailItem?.id === item.id) setDetailItem(null);
    onBanner(`${item.name} removed from export history. This is a mockup and no file was deleted.`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-history-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="export-history-title" className="text-lg font-bold text-slate-900">
              Export History
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">Previous export jobs prepared in this workspace.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exports by file name..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <DropdownSelect
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={historyTypeOptions}
              placeholder="All Types"
              allowClear
              size="sm"
              className="min-w-[8.5rem]"
              aria-label="Filter by type"
            />
            <DropdownSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={historyStatusOptions}
              placeholder="All Status"
              allowClear
              size="sm"
              className="min-w-[8.5rem]"
              aria-label="Filter by status"
            />
            <DropdownSelect
              value={dateFilter}
              onChange={(value) => setDateFilter(value)}
              options={historyDateOptions}
              placeholder="All Dates"
              allowClear
              size="sm"
              className="min-w-[9.5rem]"
              leadingIcon={CalendarDays}
              aria-label="Filter by date"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStatusFilter("");
                setDateFilter("");
                onBanner("Export history refreshed.");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-5 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Date
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => {
                const meta = formatMeta(item.format);
                const Icon = meta.Icon;
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.wrap)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900">{item.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{item.format}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{item.type}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{item.size}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{item.date}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{item.requestedBy}</div>
                      <div className="text-xs text-slate-400">{item.requestedByRole}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 text-sm font-semibold",
                          item.status === "Completed" ? "text-[var(--color-success)]" : "text-red-600",
                        )}
                      >
                        <span
                          className={cx(
                            "h-1.5 w-1.5 rounded-full",
                            item.status === "Completed" ? "bg-[var(--color-success)]" : "bg-red-500",
                          )}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative flex items-center justify-end gap-1">
                        {item.status === "Completed" ? (
                          <button
                            type="button"
                            onClick={() => onBanner(`Download started for ${item.name}. This is a mockup.`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            aria-label={`Download ${item.name}`}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuId(null);
                              setDetailItem(item);
                            }}
                            className="inline-flex h-8 items-center rounded-lg px-2 text-sm font-semibold text-[var(--color-active-menu)] hover:bg-blue-50"
                          >
                            Details
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setMenuId((current) => (current === item.id ? null : item.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`More actions for ${item.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === item.id ? (
                          <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                            {item.status === "Failed" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuId(null);
                                  onBanner(`Retry queued for ${item.name}. This is a mockup.`);
                                }}
                                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Retry export
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => deleteItem(item)}
                              className="flex w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete record
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No export records match the current search or filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>
              Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {filtered.length} exports
            </span>
            <label className="inline-flex items-center gap-2">
              <span>Rows</span>
              <DropdownSelect
                value={pageSize}
                onChange={(value) => setPageSize(value || "10")}
                options={pageSizeOptions}
                size="sm"
                className="w-[4.5rem]"
                aria-label="Rows per page"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {historyPageNumbers(currentPage, totalPages).map((item, index) =>
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
                        ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] shadow-[0_0_0_1px_var(--color-active-menu)]"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
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
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {detailItem ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/30 p-4"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Export failed</h4>
                <p className="mt-0.5 text-sm text-slate-500">{detailItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {detailItem.errorDetail ?? "The export job could not be completed."}
            </p>
            <button
              type="button"
              onClick={() => setDetailItem(null)}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExportStepper({ currentStep }: { currentStep: ExportStep }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-4 sm:gap-0">
      {exportSteps.map((step, index) => {
        const active = currentStep === step.id;
        const complete = currentStep > step.id;

        return (
          <li
            key={step.id}
            className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:px-2 sm:text-center"
          >
            {index < exportSteps.length - 1 ? (
              <span
                aria-hidden
                className={cx(
                  "pointer-events-none absolute left-[calc(50%+22px)] top-4 hidden h-px w-[calc(100%-44px)] sm:block",
                  complete ? "bg-[var(--color-active-menu)]" : "bg-slate-200",
                )}
              />
            ) : null}
            <span
              className={cx(
                "relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                active || complete
                  ? "bg-[var(--color-active-menu)] text-white"
                  : "border border-slate-300 bg-white text-slate-400",
              )}
            >
              {complete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.id}
            </span>
            <div className="min-w-0 pt-0.5 sm:pt-2">
              <div
                className={cx(
                  "text-sm font-bold leading-tight",
                  active ? "text-[var(--color-active-menu)]" : "text-slate-700",
                )}
              >
                {step.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{step.hint}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="inline-flex items-center gap-2 text-sm text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

export default function BackupExportPanel({ onBanner }: { onBanner: (message: string) => void }) {
  const [step, setStep] = useState<ExportStep>(1);
  const [selected, setSelected] = useState<Set<CategoryId>>(() => new Set(defaultSelected));
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [destination, setDestination] = useState<ExportDestination>("download");
  const [compress, setCompress] = useState(true);
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState("");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [infoId, setInfoId] = useState<CategoryId | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = categories.filter((item) => selected.has(item.id));
  const allSelected = selected.size === categories.length;
  const selectedMb = selectedItems.reduce((sum, item) => sum + item.sizeMb, 0);
  const exportType = allSelected ? "Full Export" : "Custom Export";
  const formatLabel = formatOptions.find((item) => item.id === format)?.label ?? "ZIP";
  const compressionLabel = format === "zip" && compress ? `Enabled (${formatLabel})` : "Disabled";
  const canContinue = selected.size > 0;

  const fileName = useMemo(() => {
    const stamp = "2026-05-13";
    return `hinora-export-${stamp}.${format}`;
  }, [format]);

  useEffect(() => {
    if (!isExporting) return;

    const timer = window.setInterval(() => {
      setExportProgress((current) => {
        if (current >= 100) {
          window.clearInterval(timer);
          setIsExporting(false);
          setExportComplete(true);
          setHistory((currentHistory) => [
            {
              id: `exp-${Date.now()}`,
              name: fileName,
              type: exportType,
              format: formatLabel as ExportHistoryFormat,
              size: formatSize(selectedMb).replace("~ ", ""),
              date: "May 13, 2026 10:53 PM",
              dateValue: "2026-05-13T14:53:00.000Z",
              requestedBy: "Jethro Simbulan",
              requestedByRole: "System Administrator",
              status: "Completed",
            },
            ...currentHistory,
          ]);
          onBanner(
            destination === "download"
              ? "Export ready. This is a mockup and no file was generated."
              : "Export saved to backup storage. This is a mockup and no file was stored.",
          );
          return 100;
        }
        return Math.min(100, current + 8);
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [destination, exportType, fileName, formatLabel, isExporting, onBanner, selectedMb]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(categories.map((item) => item.id)) : new Set());
    setError(null);
  }

  function toggleCategory(id: CategoryId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  function resetWizard() {
    setStep(1);
    setSelected(new Set(defaultSelected));
    setFormat("zip");
    setDestination("download");
    setCompress(true);
    setEncrypt(false);
    setPassword("");
    setIncludeMetadata(true);
    setAcknowledged(false);
    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    setError(null);
    setInfoId(null);
  }

  function goToConfigure() {
    if (!canContinue) {
      setError("Select at least one data category to continue.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function goToReview() {
    if (encrypt && password.trim().length < 8) {
      setError("Encryption password must be at least 8 characters.");
      return;
    }
    setError(null);
    setStep(3);
  }

  function startExport() {
    if (!acknowledged) return;
    setExportComplete(false);
    setExportProgress(6);
    setIsExporting(true);
    setStep(4);
  }

  const summaryCard = (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold text-slate-900">Export Summary (Preview)</h3>
      <dl className="mt-3 divide-y divide-slate-100">
        <SummaryRow icon={<Archive className="h-4 w-4" />} label="Export Type">
          {exportType}
        </SummaryRow>
        <SummaryRow icon={<Database className="h-4 w-4" />} label="Estimated Size">
          {selected.size ? formatSize(selectedMb) : "—"}
        </SummaryRow>
        <SummaryRow icon={<Check className="h-4 w-4" />} label="Items Selected">
          {selected.size} of {categories.length}
        </SummaryRow>
        <SummaryRow icon={<Clock3 className="h-4 w-4" />} label="Estimated Duration">
          {estimateDuration(selectedMb)}
        </SummaryRow>
        <SummaryRow icon={<Archive className="h-4 w-4" />} label="Compression">
          {compressionLabel}
        </SummaryRow>
      </dl>
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-50 px-3.5 py-3 text-sm text-[var(--color-active-menu)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>The actual export size and duration may vary depending on the amount of data and system performance.</p>
      </div>
    </section>
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <ExportStepper currentStep={step} />
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <History className="h-4 w-4" />
            Export History
          </button>
        </div>

        <div className="p-5">
          {step === 1 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Data to Export</h3>

                <label
                  className={cx(
                    "mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4",
                    allSelected
                      ? "border-[var(--color-active-menu)] bg-blue-50/40"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => toggleAll(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">All Data (Full Export)</span>
                      <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                        Recommended
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      Export all system data including database, files, and configurations.
                    </span>
                  </span>
                </label>

                <div className="mt-5 text-sm font-bold text-slate-900">Select Specific Data (Custom Export)</div>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                  {categories.map((item) => {
                    const checked = selected.has(item.id);
                    const Icon = item.Icon;
                    return (
                      <div key={item.id} className="relative flex items-center gap-3 px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(item.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                          aria-label={item.label}
                        />
                        <span
                          className={cx(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            checked ? item.iconWrap : "bg-slate-100 text-slate-400",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900">{item.label}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
                        </div>
                        <div className="hidden text-right sm:block">
                          <div className="text-sm font-semibold text-slate-800">{item.count}</div>
                          <div className="text-xs text-slate-400">{item.sizeLabel}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInfoId((current) => (current === item.id ? null : item.id))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`About ${item.label}`}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        {infoId === item.id ? (
                          <div className="absolute right-4 top-14 z-20 w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                            {item.info}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              {summaryCard}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Options</h3>
                  <p className="mt-1 text-sm text-slate-500">Set the export format, destination, and security options.</p>
                </div>
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Export Format</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {formatOptions.map((item) => {
                      const active = format === item.id;
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormat(item.id)}
                          className={cx(
                            "rounded-2xl border px-3 py-3 text-left transition",
                            active
                              ? "border-emerald-300 bg-emerald-50/40 ring-4 ring-emerald-100"
                              : "border-slate-200 bg-white hover:border-slate-300",
                          )}
                        >
                          <span className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl", item.iconWrap)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="mt-2 block text-sm font-bold text-slate-900">
                            {item.label}
                            {item.recommended ? (
                              <span className="ml-2 text-[11px] font-bold text-emerald-600">Recommended</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Destination</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDestination("download")}
                      className={cx(
                        "rounded-2xl border px-4 py-3 text-left",
                        destination === "download"
                          ? "border-[var(--color-active-menu)] bg-blue-50/40"
                          : "border-slate-200",
                      )}
                    >
                      <span className="block text-sm font-bold text-slate-900">Download to this computer</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Prepare a file you can save locally.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestination("storage")}
                      className={cx(
                        "rounded-2xl border px-4 py-3 text-left",
                        destination === "storage"
                          ? "border-[var(--color-active-menu)] bg-blue-50/40"
                          : "border-slate-200",
                      )}
                    >
                      <span className="block text-sm font-bold text-slate-900">Save to backup storage</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Store the export in Supabase Storage.</span>
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={compress}
                    disabled={format !== "zip"}
                    onChange={(event) => setCompress(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  Enable ZIP compression
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(event) => setIncludeMetadata(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  Include export metadata
                </label>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={encrypt}
                      onChange={(event) => setEncrypt(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                    />
                    Encrypt export with a password
                  </label>
                  {encrypt ? (
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      placeholder="Minimum 8 characters"
                      className="mt-2 h-11 w-full max-w-md rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                    />
                  ) : null}
                </div>
              </div>
              {summaryCard}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review & Confirm</h3>
                <p className="mt-1 text-sm text-slate-500">Verify the export details before generating the file.</p>
                <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
                  <SummaryRow icon={<Archive className="h-4 w-4" />} label="File name">
                    {fileName}
                  </SummaryRow>
                  <SummaryRow icon={<FileText className="h-4 w-4" />} label="Categories">
                    {selectedItems.map((item) => item.label).join(", ")}
                  </SummaryRow>
                  <SummaryRow icon={<Download className="h-4 w-4" />} label="Destination">
                    {destination === "download" ? "Download to this computer" : "Backup storage"}
                  </SummaryRow>
                  <SummaryRow icon={<ShieldAlert className="h-4 w-4" />} label="Encryption">
                    {encrypt ? "Password protected" : "Off"}
                  </SummaryRow>
                  <SummaryRow icon={<Info className="h-4 w-4" />} label="Metadata">
                    {includeMetadata ? "Included" : "Not included"}
                  </SummaryRow>
                </dl>
                <label className="mt-4 flex items-start gap-2.5 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  I understand this export may contain sensitive information and I will store it securely.
                </label>
              </div>
              {summaryCard}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-2xl border border-slate-200 px-5 py-8 text-center">
                {exportComplete ? (
                  <>
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[var(--color-success)]">
                      <Check className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">Export complete</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {destination === "download"
                        ? `${fileName} is ready. This mockup does not generate a real file.`
                        : `${fileName} was saved to backup storage. This mockup does not store a real file.`}
                    </p>
                    <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                      {destination === "download" ? (
                        <button
                          type="button"
                          onClick={() => onBanner("Download started. This is a mockup and no file was generated.")}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                        >
                          <Download className="h-4 w-4" />
                          Download export
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={resetWizard}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                      >
                        Start new export
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[var(--color-active-menu)]">
                      <Download className="h-7 w-7" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">Preparing export</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {fileName} · {formatSize(selectedMb)} · {estimateDuration(selectedMb)}
                    </p>
                    <div className="mx-auto mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--color-active-menu)] transition-all"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{exportProgress}%</p>
                  </>
                )}
              </div>
              {summaryCard}
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
        </div>

        {step < 4 || !exportComplete ? (
          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={step === 1 ? resetWizard : () => setStep((current) => (current === 1 ? 1 : ((current - 1) as ExportStep)))}
              disabled={isExporting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step === 1 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={goToConfigure}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Configure Options
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {step === 2 ? (
              <button
                type="button"
                onClick={goToReview}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
              >
                Review & Confirm
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {step === 3 ? (
              <button
                type="button"
                disabled={!acknowledged}
                onClick={startExport}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Start Export
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h3 className="text-base font-bold text-slate-900">Export Instructions</h3>
          <ol className="mt-4 space-y-3">
            {exportSteps.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span
                  className={cx(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step === item.id
                      ? "bg-[var(--color-active-menu)] text-white"
                      : step > item.id
                        ? "bg-emerald-50 text-[var(--color-success)]"
                        : "bg-slate-100 text-slate-500",
                  )}
                >
                  {step > item.id ? <Check className="h-3.5 w-3.5" /> : item.id}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className="text-xs text-slate-500">{item.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h3 className="text-base font-bold text-slate-900">Export Formats</h3>
          <div className="mt-3 space-y-2">
            {formatOptions.map((item) => {
              const Icon = item.Icon;
              return (
                <div
                  key={item.id}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border px-3 py-3",
                    item.recommended
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", item.iconWrap)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">
                      {item.label}
                      {item.recommended ? " (Recommended)" : ""}
                    </span>
                    <span className="text-xs text-slate-500">{item.description}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Exported data may contain sensitive information. Ensure you store and transfer files securely.</p>
        </div>
      </aside>

      {historyOpen ? (
        <ExportHistoryDialog
          history={history}
          onChangeHistory={setHistory}
          onClose={() => setHistoryOpen(false)}
          onBanner={onBanner}
        />
      ) : null}
    </div>
  );
}
