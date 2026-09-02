"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  MailOpen,
  Megaphone,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import type { NavVariant } from "../dashboard/navigation";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  categoryLabel,
  deleteInboxItem,
  fetchInbox,
  formatInboxDateTime,
  INBOX_CHANGED_EVENT,
  markAllInboxRead,
  markInboxRead,
  priorityLabel,
  relativeTime,
  type InboxCategory,
  type InboxCounts,
  type InboxItem,
  type InboxPriority,
  type InboxTab,
} from "./inbox-data";
import { subscribeInboxLive } from "./inbox-live";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

const PREFS_KEY = "hinora_notification_preferences";

type NotificationPrefs = {
  email: boolean;
  inapp: boolean;
  assignments: boolean;
  compliance: boolean;
  system: boolean;
  updates: boolean;
};

const defaultPrefs: NotificationPrefs = {
  email: true,
  inapp: true,
  assignments: true,
  compliance: true,
  system: true,
  updates: true,
};

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

function writePrefs(prefs: NotificationPrefs) {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function categoryStyle(category: InboxCategory) {
  if (category === "ASSIGNMENT") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (category === "COMPLIANCE") return "bg-emerald-50 text-[var(--color-success)]";
  if (category === "SYSTEM") return "bg-violet-50 text-[var(--color-ai-accent)]";
  return "bg-teal-50 text-teal-700";
}

function priorityStyle(priority: InboxPriority) {
  if (priority === "HIGH") return "bg-red-50 text-[var(--color-error)]";
  if (priority === "LOW") return "bg-emerald-50 text-[var(--color-success)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

function categoryIcon(category: InboxCategory): { Icon: LucideIcon; tone: string } {
  if (category === "ASSIGNMENT") {
    return { Icon: FileText, tone: "bg-blue-50 text-[var(--color-active-menu)]" };
  }
  if (category === "COMPLIANCE") {
    return { Icon: ClipboardCheck, tone: "bg-red-50 text-[var(--color-error)]" };
  }
  if (category === "SYSTEM") {
    return { Icon: Megaphone, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
  }
  return { Icon: Sparkles, tone: "bg-emerald-50 text-[var(--color-success)]" };
}

function policyHref(variant: NavVariant, policyId: string) {
  return `/${variant}/policy-library/${policyId}`;
}

export default function InboxExperience({ variant }: { variant: NavVariant }) {
  const [tab, setTab] = useState<InboxTab>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<InboxCategory | "">("");
  const [priority, setPriority] = useState<InboxPriority | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [counts, setCounts] = useState<InboxCounts>({
    all: 0,
    unread: 0,
    assignments: 0,
    compliance: 0,
    system: 0,
    updates: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [note, setNote] = useState("");
  const reloadRef = useRef<(keepId?: string | null) => Promise<void>>(async () => {});

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, category, priority, pageSize]);

  async function reload(keepId?: string | null) {
    try {
      const payload = await fetchInbox({
        tab,
        search: debouncedSearch,
        category,
        priority,
        page,
        pageSize: Number(pageSize) || 10,
      });
      setItems(payload.items);
      setCounts(payload.counts);
      setTotal(payload.pagination.total);
      setTotalPages(payload.pagination.totalPages);
      setSelectedId((current) => {
        const wanted = keepId === undefined ? current : keepId;
        if (wanted && payload.items.some((item) => item.id === wanted)) return wanted;
        return payload.items[0]?.id ?? null;
      });
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    }
  }

  reloadRef.current = reload;

  useEffect(() => {
    subscribeInboxLive();
    function onChanged() {
      void reloadRef.current();
    }
    window.addEventListener(INBOX_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(INBOX_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchInbox({
      tab,
      search: debouncedSearch,
      category,
      priority,
      page,
      pageSize: Number(pageSize) || 10,
    })
      .then((payload) => {
        if (cancelled) return;
        setItems(payload.items);
        setCounts(payload.counts);
        setTotal(payload.pagination.total);
        setTotalPages(payload.pagination.totalPages);
        setSelectedId((current) => {
          const fromUrl = new URLSearchParams(window.location.search).get("id");
          const wanted = fromUrl || current;
          if (wanted && payload.items.some((item) => item.id === wanted)) return wanted;
          return payload.items[0]?.id ?? null;
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load notifications.");
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, debouncedSearch, category, priority, page, pageSize]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const size = Number(pageSize) || 10;
  const pageStart = total === 0 ? 0 : (page - 1) * size;
  const pageEnd = Math.min(pageStart + items.length, total);
  const tabs: Array<{ id: InboxTab; label: string; count?: number }> = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread", count: counts.unread },
    { id: "assignments", label: "Assignments" },
    { id: "compliance", label: "Compliance" },
    { id: "system", label: "System" },
    { id: "updates", label: "Updates" },
  ];

  async function handleMarkAll() {
    await markAllInboxRead();
    setNote("All notifications marked as read.");
    await reload(selectedId);
  }

  async function handleToggleRead(item: InboxItem) {
    const next = await markInboxRead(item.id, !item.read);
    setItems((current) => current.map((row) => (row.id === next.id ? next : row)));
    setCounts((current) => ({
      ...current,
      unread: Math.max(0, current.unread + (next.read ? -1 : 1)),
    }));
  }

  async function handleDelete(item: InboxItem) {
    await deleteInboxItem(item.id);
    setNote("Notification deleted.");
    await reload(null);
  }

  return (
    <DashboardShell variant={variant}>
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Notification Center</h1>
            <p className="mt-1 text-sm text-slate-500">View and manage all system notifications.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              Preferences
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cx(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold",
                tab === item.id
                  ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
              {item.id === "unread" && (item.count ?? 0) > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1.5 text-[0.68rem] font-bold text-white">
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {note ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {note}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notifications..."
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <DropdownSelect
                  value={category}
                  onChange={(value) => setCategory((value as InboxCategory | "") || "")}
                  options={[
                    { value: "ASSIGNMENT", label: "Assignment" },
                    { value: "COMPLIANCE", label: "Compliance" },
                    { value: "SYSTEM", label: "System" },
                    { value: "UPDATES", label: "Updates" },
                  ]}
                  placeholder="All Types"
                  allowClear
                  size="sm"
                  className="min-w-0 sm:w-36"
                />
                <DropdownSelect
                  value={priority}
                  onChange={(value) => setPriority((value as InboxPriority | "") || "")}
                  options={[
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                  placeholder="All Priorities"
                  allowClear
                  size="sm"
                  className="min-w-0 sm:w-36"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-50" />
                ))}
              </div>
            ) : error ? (
              <EmptyState icon={Bell} title="Unable to load notifications" description={error} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You're all caught up. New assignments, reminders, and system updates will appear here."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const { Icon, tone } = categoryIcon(item.category);
                  const active = item.id === selectedId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cx(
                          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition",
                          active ? "bg-blue-50/70" : "hover:bg-slate-50",
                          !item.read ? "bg-slate-50/80" : "",
                        )}
                      >
                        <span
                          className={cx(
                            "mt-2 h-2 w-2 shrink-0 rounded-full",
                            item.read ? "bg-transparent" : "bg-[var(--color-active-menu)]",
                          )}
                        />
                        <span className={cx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-sm font-bold text-slate-900">{item.title}</span>
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                              {relativeTime(item.createdAt)}
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-2 text-sm text-slate-500">{item.body}</span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-[0.7rem] font-bold", categoryStyle(item.category))}>
                              {categoryLabel(item.category)}
                            </span>
                            <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-[0.7rem] font-bold", priorityStyle(item.priority))}>
                              {priorityLabel(item.priority)}
                            </span>
                          </span>
                        </span>
                        <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-slate-500">
                Showing {total === 0 ? 0 : pageStart + 1} to {pageEnd} of {total.toLocaleString()} notifications
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                  {pageSize} per page
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
                  <PagerButton label="First page" disabled={page <= 1} onClick={() => setPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </PagerButton>
                  <PagerButton label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </PagerButton>
                  {pageNumbers(page, totalPages).map((item, index) =>
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
                          item === page
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
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PagerButton>
                  <PagerButton label="Last page" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                    <ChevronsRight className="h-4 w-4" />
                  </PagerButton>
                </div>
              </div>
            </div>
          </section>

          {selected ? (
            <InboxDetail
              item={selected}
              variant={variant}
              onClose={() => setSelectedId(null)}
              onToggleRead={() => void handleToggleRead(selected)}
              onDelete={() => void handleDelete(selected)}
            />
          ) : (
            <aside className="hidden min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500 xl:flex">
              Select a notification to see the details.
            </aside>
          )}
        </div>

        <div className="mt-5">
          <ModuleGuide guideKey="Notifications" />
        </div>
      </div>

      {prefsOpen ? <PreferencesModal onClose={() => setPrefsOpen(false)} /> : null}
    </DashboardShell>
  );
}

function InboxDetail({
  item,
  variant,
  onClose,
  onToggleRead,
  onDelete,
}: {
  item: InboxItem;
  variant: NavVariant;
  onClose: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  const { Icon, tone } = categoryIcon(item.category);
  const stamped = formatInboxDateTime(item.createdAt);
  const href = item.policyId ? policyHref(variant, item.policyId) : null;

  return (
    <aside className="fixed inset-0 z-40 flex items-end bg-slate-900/40 p-3 xl:static xl:z-0 xl:block xl:bg-transparent xl:p-0">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] xl:max-h-none">
        <div className="flex justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-5">
          <span className={cx("inline-flex h-14 w-14 items-center justify-center rounded-2xl", tone)}>
            <Icon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">{item.title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-[0.7rem] font-bold", categoryStyle(item.category))}>
              {categoryLabel(item.category)}
            </span>
            <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-[0.7rem] font-bold", priorityStyle(item.priority))}>
              {priorityLabel(item.priority)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {stamped.date} at {stamped.time}
            </span>
            <span>·</span>
            <span>{relativeTime(item.createdAt)}</span>
            <span
              className={cx(
                "inline-flex h-6 items-center rounded-md px-2",
                item.read ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-[var(--color-active-menu)]",
              )}
            >
              {item.read ? "Read" : "Unread"}
            </span>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">Message</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </div>

          {item.policyName || item.assignedBy || item.dueDate ? (
            <dl className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {item.policyName ? <DetailRow label="Policy Name" value={item.policyName} /> : null}
              {item.assignedBy ? <DetailRow label="Assigned By" value={item.assignedBy} /> : null}
              {item.assignedDate ? <DetailRow label="Assigned Date" value={item.assignedDate} /> : null}
              {item.dueDate ? <DetailRow label="Due Date" value={item.dueDate} /> : null}
              {item.scope ? <DetailRow label="Scope" value={item.scope} last /> : null}
            </dl>
          ) : null}

          {item.steps.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900">What you need to do</h3>
              <ul className="mt-2 space-y-2">
                {item.steps.map((step) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {href && item.actionLabel ? (
            <Link
              href={href}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] text-sm font-bold text-white hover:bg-[var(--color-hover)]"
            >
              {item.actionLabel}
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleRead}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {item.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
              {item.read ? "Unread" : "Mark as Read"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-100 text-xs font-semibold text-[var(--color-error)] hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cx("grid grid-cols-2 gap-3 px-3 py-2.5 text-sm", !last && "border-b border-slate-100")}>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
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

function PreferencesModal({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readPrefs());

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
  }

  function save() {
    writePrefs(prefs);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-3 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Notification preferences</h3>
            <p className="mt-1 text-sm text-slate-500">Choose how Hinora should notify you.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Channels</p>
          <PrefToggle label="Email" description="Send copies to your work email." checked={prefs.email} onToggle={() => toggle("email")} />
          <PrefToggle label="In-app" description="Show alerts in Notification Center." checked={prefs.inapp} onToggle={() => toggle("inapp")} />
          <p className="pt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Topics</p>
          <PrefToggle label="Assignments" checked={prefs.assignments} onToggle={() => toggle("assignments")} />
          <PrefToggle label="Compliance" checked={prefs.compliance} onToggle={() => toggle("compliance")} />
          <PrefToggle label="System" checked={prefs.system} onToggle={() => toggle("system")} />
          <PrefToggle label="Updates" checked={prefs.updates} onToggle={() => toggle("updates")} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-10 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function PrefToggle({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <span
        className={cx(
          "relative h-6 w-10 rounded-full transition",
          checked ? "bg-[var(--color-active-menu)]" : "bg-slate-200",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[1.15rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
