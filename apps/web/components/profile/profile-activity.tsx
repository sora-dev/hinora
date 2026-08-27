"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Laptop,
  LogIn,
  LogOut,
  MapPin,
  Monitor,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { getHinoraSession } from "../dashboard/session";
import { getApiBaseUrl } from "../../lib/api-base-url";

type ActivityKind = "login" | "failed_login" | "logout" | "password" | "profile" | "device" | "export";
type ActivityStatus = "Success" | "Failed";

export type AccountActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  status: ActivityStatus;
  deviceType: string;
  deviceName: string;
  browser: string;
  os?: string;
  location: string;
  ip: string;
  date: string;
  dateValue: string;
  extra: string;
};

export type ActivityDevice = {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  location: string;
  isCurrent?: boolean;
};

const kindOptions: Array<{ value: ActivityKind; label: string }> = [
  { value: "login", label: "Logins" },
  { value: "failed_login", label: "Failed logins" },
  { value: "logout", label: "Logouts" },
  { value: "password", label: "Password changes" },
  { value: "profile", label: "Profile updates" },
  { value: "device", label: "Device activity" },
  { value: "export", label: "Data exports" },
];
const dateOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];
const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];
const summaryRangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function deviceIcon(kind: string) {
  if (kind === "mobile") return Smartphone;
  if (kind === "tablet") return Tablet;
  if (kind === "desktop") return Monitor;
  return Laptop;
}

function kindMeta(kind: ActivityKind): { Icon: LucideIcon; wrap: string } {
  if (kind === "failed_login") return { Icon: ShieldAlert, wrap: "bg-red-50 text-red-600" };
  if (kind === "logout") return { Icon: LogOut, wrap: "bg-slate-100 text-slate-600" };
  if (kind === "password") return { Icon: KeyRound, wrap: "bg-amber-50 text-amber-600" };
  if (kind === "profile") return { Icon: UserRound, wrap: "bg-blue-50 text-[var(--color-active-menu)]" };
  if (kind === "device") return { Icon: Smartphone, wrap: "bg-emerald-50 text-emerald-600" };
  if (kind === "export") return { Icon: Download, wrap: "bg-sky-50 text-sky-700" };
  return { Icon: LogIn, wrap: "bg-emerald-50 text-[var(--color-success)]" };
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function inRange(item: AccountActivity, days: string) {
  if (!days) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));
  return new Date(item.dateValue) >= cutoff;
}

export type AccountActivityState = {
  activities: AccountActivity[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useAccountActivity(enabled = true): AccountActivityState {
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const session = getHinoraSession();
    const userId = session?.userId?.trim();
    const apiBaseUrl = getApiBaseUrl();
    if (!userId || !apiBaseUrl) {
      setActivities([]);
      setLoading(false);
      setError("Sign in again to view account activity.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/activity?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error("Unable to load activity.");
      }
      const payload = (await response.json()) as AccountActivity[];
      setActivities(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load activity.");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled]);

  return { activities, loading, error, reload: load };
}

export function ProfileActivityPanel({
  activities,
  loading,
  error,
  reload,
}: AccountActivityState) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const deviceFilterOptions = useMemo(
    () =>
      Array.from(new Set(activities.map((item) => item.deviceName).filter(Boolean))).map((value) => ({
        value,
        label: value,
      })),
    [activities],
  );
  const locationFilterOptions = useMemo(
    () =>
      Array.from(new Set(activities.map((item) => item.location).filter(Boolean))).map((value) => ({
        value,
        label: value,
      })),
    [activities],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities.filter((item) => {
      if (query) {
        const haystack = `${item.title} ${item.description} ${item.deviceName} ${item.location} ${item.ip}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (kindFilter && item.kind !== kindFilter) return false;
      if (deviceFilter && item.deviceName !== deviceFilter) return false;
      if (locationFilter && item.location !== locationFilter) return false;
      return inRange(item, dateFilter);
    });
  }, [activities, dateFilter, deviceFilter, kindFilter, locationFilter, search]);

  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);
  const pageEnd = pageStart + pageItems.length;

  useEffect(() => {
    setPage(1);
  }, [search, kindFilter, deviceFilter, locationFilter, dateFilter, pageSize]);

  async function exportActivity() {
    if (filtered.length === 0) {
      setBanner("No activity to export for the current filters.");
      return;
    }
    setIsExporting(true);
    try {
      const header = ["Date", "Activity", "Details", "Status", "Device", "Browser", "Location", "IP"];
      const rows = filtered.map((item) =>
        [item.date, item.title, item.description, item.status, item.deviceName, item.browser, item.location, item.ip]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      );
      const csv = [header.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hinora-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      const session = getHinoraSession();
      const apiBaseUrl = getApiBaseUrl();
      if (session?.userId && apiBaseUrl) {
        await fetch(`${apiBaseUrl}/auth/activity/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.userId }),
        });
        await reload();
      }
      setBanner("Activity exported as a CSV file.");
    } catch {
      setBanner("Unable to export activity right now.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Account Activity</h2>
          <p className="mt-1 text-sm text-slate-500">
            View your recent account activity, logins, and profile changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportActivity()}
          disabled={isExporting || loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export Activity"}
        </button>
      </div>

      {banner ? (
        <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--color-success)]">
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-md p-0.5 opacity-70 hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mx-5 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-3 xl:flex-row xl:items-center">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search activity..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
          <DropdownSelect
            value={kindFilter}
            onChange={(value) => setKindFilter(value)}
            options={kindOptions}
            placeholder="All Activity Types"
            allowClear
            size="sm"
            className="min-w-[10.5rem]"
            aria-label="Filter by activity type"
          />
          <DropdownSelect
            value={deviceFilter}
            onChange={(value) => setDeviceFilter(value)}
            options={deviceFilterOptions}
            placeholder="All Devices"
            allowClear
            size="sm"
            className="min-w-[9rem]"
            aria-label="Filter by device"
          />
          <DropdownSelect
            value={locationFilter}
            onChange={(value) => setLocationFilter(value)}
            options={locationFilterOptions}
            placeholder="All Locations"
            allowClear
            size="sm"
            className="min-w-[9rem]"
            aria-label="Filter by location"
          />
          <DropdownSelect
            value={dateFilter}
            onChange={(value) => setDateFilter(value)}
            options={dateOptions}
            placeholder="All Dates"
            allowClear
            size="sm"
            className="min-w-[9.5rem]"
            leadingIcon={CalendarDays}
            aria-label="Filter by date"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-5 py-3">Activity</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Device / Browser</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                  Loading account activity...
                </td>
              </tr>
            ) : null}
            {!loading &&
              pageItems.map((item) => {
                const meta = kindMeta(item.kind);
                const Icon = meta.Icon;
                const DeviceIcon = deviceIcon(item.deviceType);
                const expanded = expandedId === item.id;
                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <span className={cx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.wrap)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900">{item.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                          {expanded ? (
                            <p className="mt-2 max-w-xl text-sm text-slate-600">
                              {item.extra}
                              {item.ip ? ` IP ${item.ip}.` : ""}
                              {item.os ? ` ${item.os}.` : ""}
                            </p>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                          item.status === "Success"
                            ? "bg-emerald-50 text-[var(--color-success)]"
                            : "bg-red-50 text-red-600",
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        <DeviceIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-800">{item.deviceName}</div>
                          <div className="text-xs text-slate-400">
                            {[item.browser, item.ip].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-800">{item.location}</div>
                          <div className="text-xs text-slate-400">{item.ip || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{item.date}</td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        aria-expanded={expanded}
                        aria-label={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
                      >
                        <ChevronDown className={cx("h-4 w-4 transition", expanded && "rotate-180")} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                  {activities.length === 0
                    ? "No account activity yet. Sign-ins and profile changes will appear here."
                    : "No activity matches the current search or filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-slate-500">
          Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {filtered.length} activities
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-500">
            Rows per page:
            <DropdownSelect
              value={pageSize}
              onChange={(value) => setPageSize(value || "10")}
              options={pageSizeOptions}
              size="sm"
              className="w-[4.5rem]"
              aria-label="Rows per page"
            />
          </label>
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
        </div>
      </div>
    </section>
  );
}

export function ProfileActivitySidebar({
  activities,
  devices,
  onViewDevices,
  onOpenSecurity,
}: {
  activities: AccountActivity[];
  devices: ActivityDevice[];
  onViewDevices: () => void;
  onOpenSecurity: () => void;
}) {
  const [summaryRange, setSummaryRange] = useState("7");
  const ranged = activities.filter((item) => inRange(item, summaryRange));
  const summary = [
    {
      label: "Total Logins",
      value: ranged.filter((item) => item.kind === "login").length,
      Icon: LogIn,
      wrap: "bg-emerald-50 text-[var(--color-success)]",
      valueClass: "text-slate-900",
    },
    {
      label: "Failed Login Attempts",
      value: ranged.filter((item) => item.kind === "failed_login").length,
      Icon: ShieldAlert,
      wrap: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
    {
      label: "Profile Updates",
      value: ranged.filter((item) => item.kind === "profile").length,
      Icon: UserRound,
      wrap: "bg-blue-50 text-[var(--color-active-menu)]",
      valueClass: "text-slate-900",
    },
    {
      label: "Security Changes",
      value: ranged.filter((item) => item.kind === "password").length,
      Icon: Fingerprint,
      wrap: "bg-violet-50 text-violet-600",
      valueClass: "text-slate-900",
    },
    {
      label: "Data Exports",
      value: ranged.filter((item) => item.kind === "export").length,
      Icon: Download,
      wrap: "bg-sky-50 text-sky-700",
      valueClass: "text-slate-900",
    },
  ];
  const recentDevices = devices.slice(0, 3);

  return (
    <>
      <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">Activity Summary</h3>
          <DropdownSelect
            value={summaryRange}
            onChange={(value) => setSummaryRange(value || "7")}
            options={summaryRangeOptions}
            size="sm"
            className="w-[8.5rem]"
            aria-label="Summary range"
          />
        </div>
        <ul className="mt-4 space-y-3">
          {summary.map((item) => {
            const Icon = item.Icon;
            return (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2.5 text-sm text-slate-600">
                  <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", item.wrap)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </span>
                <span className={cx("text-base font-extrabold", item.valueClass)}>{item.value}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">Recent Devices</h3>
          <button
            type="button"
            onClick={onViewDevices}
            className="text-sm font-semibold text-[var(--color-active-menu)]"
          >
            View All
          </button>
        </div>
        {recentDevices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No signed-in devices yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentDevices.map((device) => {
              const Icon = deviceIcon(device.deviceType);
              return (
                <li key={device.id} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800">{device.deviceName}</span>
                      {device.isCurrent ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[var(--color-success)]">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {[device.browser, device.os].filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-xs text-slate-400">{device.location}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-2 text-[var(--color-active-menu)]">
          <ShieldCheck className="h-4 w-4" />
          <h3 className="text-sm font-bold">Security Tip</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review your account activity regularly. If you notice any suspicious activity, change your password
          immediately.
        </p>
        <button
          type="button"
          onClick={onOpenSecurity}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-active-menu)]"
        >
          Learn more about account security
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </section>
    </>
  );
}
