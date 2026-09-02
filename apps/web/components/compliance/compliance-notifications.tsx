"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  Info,
  Mail,
  MessageSquare,
  Minus,
  MoreVertical,
  Plus,
  Send,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  createComplianceNotificationRule,
  deleteComplianceNotificationRule,
  fetchComplianceNotifications,
  formatComplianceDate,
  sendComplianceNotification,
  updateComplianceNotificationRule,
  type ComplianceNotificationHistory,
  type ComplianceNotificationRule,
  type ComplianceNotificationsPayload,
  type NotificationAudience,
  type NotificationChannel,
  type NotificationTrigger,
} from "./compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ChannelIcons({ channels }: { channels: NotificationChannel[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {channels.includes("email") ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]" title="Email">
          <Mail className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {channels.includes("inapp") ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-[var(--color-ai-accent)]" title="In-App">
          <Bell className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
}

function nextLabel(nextAt: string | null) {
  if (!nextAt) return "None scheduled";
  const date = new Date(nextAt);
  if (Number.isNaN(date.getTime())) return formatComplianceDate(nextAt);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return formatComplianceDate(nextAt);
  if (days === 0) return "Next today";
  if (days === 1) return "Next in 1 day";
  return `Next in ${days} days`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: "" };
  return {
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

export default function ComplianceNotificationsTab({
  policyId,
}: {
  policyId: string;
}) {
  const [data, setData] = useState<ComplianceNotificationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [audience, setAudience] = useState<NotificationAudience>("PENDING_OVERDUE");
  const [templateId, setTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [ruleModal, setRuleModal] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function reload() {
    const payload = await fetchComplianceNotifications(policyId);
    setData(payload);
    setTemplateId((current) => current || payload.templates[0]?.id || "");
    return payload;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    void fetchComplianceNotifications(policyId)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setTemplateId(payload.templates.find((item) => item.kind === "OVERDUE")?.id || payload.templates[0]?.id || "");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load notifications.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId]);

  const visibleRules = useMemo(() => {
    if (!data) return [];
    return data.rules.filter((rule) => (showInactive ? !rule.enabled : rule.enabled));
  }, [data, showInactive]);

  const historyRows = useMemo(() => {
    if (!data) return [];
    return historyOpen ? data.history : data.history.slice(0, 8);
  }, [data, historyOpen]);

  async function toggleRule(rule: ComplianceNotificationRule) {
    await updateComplianceNotificationRule(policyId, rule.id, { enabled: !rule.enabled });
    await reload();
  }

  async function handleSend(rule?: ComplianceNotificationRule) {
    if (!data) return;
    setSending(true);
    setSendError("");
    setSendNote("");
    try {
      await sendComplianceNotification(policyId, {
        audience: rule?.audience ?? audience,
        templateId: rule?.templateId ?? templateId,
        ruleId: rule?.id,
        channels: rule?.channels?.length ? rule.channels : ["email", "inapp"],
      });
      await reload();
      setSendNote("Notification sent.");
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Unable to send notification.");
    } finally {
      setSending(false);
      setMenuId(null);
    }
  }

  async function handleDelete(ruleId: string) {
    await deleteComplianceNotificationRule(policyId, ruleId);
    setMenuId(null);
    await reload();
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Bell}
        title="Unable to load notifications"
        description={error || "Select a policy and try again."}
      />
    );
  }

  const counts = data.audienceCounts;

  return (
    <div className="min-w-0 space-y-4 overflow-x-clip">
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Upcoming Notifications
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{data.stats.upcoming}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{nextLabel(data.stats.nextAt)}</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
              <CalendarClock className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Sent (Last 30 Days)
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{data.stats.sent}</div>
              <div className="mt-1 text-xs font-semibold text-[var(--color-success)]">
                {data.stats.deliveredPct}% Delivered
              </div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-success)]">
              <Send className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Failed</div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{data.stats.failed}</div>
              <div className="mt-1 text-xs font-semibold text-[var(--color-error)]">
                {data.stats.failedPct}% Failed
              </div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[var(--color-error)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Channels Used</div>
          <ul className="mt-3 space-y-2.5">
            {[
              { label: "Email", pct: data.stats.channels.email, Icon: Mail, tone: "text-[var(--color-active-menu)]" },
              { label: "In-App", pct: data.stats.channels.inapp, Icon: MessageSquare, tone: "text-[var(--color-ai-accent)]" },
            ].map((channel) => (
              <li key={channel.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={cx("inline-flex items-center gap-2 font-medium text-slate-600", channel.tone)}>
                  <channel.Icon className="h-3.5 w-3.5" />
                  {channel.label}
                </span>
                <span className="font-bold text-slate-800">{channel.pct}%</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,20rem)]">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notification Rules</h3>
              <p className="mt-1 text-sm text-slate-500">
                Configure when and how employees are notified about this policy.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRuleModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add Rule</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Rule</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {visibleRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      {showInactive ? "No inactive rules." : "No active rules yet."}
                    </td>
                  </tr>
                ) : (
                  visibleRules.map((rule, index) => (
                    <tr key={rule.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{rule.name}</td>
                      <td className="px-4 py-3 text-slate-600">{rule.when}</td>
                      <td className="px-4 py-3">
                        <ChannelIcons channels={rule.channels} />
                      </td>
                      <td className="px-4 py-3">{rule.recipients}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.enabled}
                          onClick={() => void toggleRule(rule)}
                          className={cx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition",
                            rule.enabled ? "bg-[var(--color-success)]" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cx(
                              "inline-block h-5 w-5 rounded-full bg-white shadow transition",
                              rule.enabled ? "translate-x-5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </td>
                      <td className="relative px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setMenuId((current) => (current === rule.id ? null : rule.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Actions for ${rule.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === rule.id ? (
                          <div className="absolute right-4 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => void handleSend(rule)}
                            >
                              Send now
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm font-medium text-[var(--color-error)] hover:bg-red-50"
                              onClick={() => void handleDelete(rule.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowInactive((current) => !current)}
              className="text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              {showInactive ? "View Active Rules" : "View Inactive Rules"}
            </button>
          </div>
        </article>

        <div className="space-y-4">
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Notification Templates</h3>
            </div>
            <ul className="space-y-2.5">
              {data.templates.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                    <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                      {item.isDefault ? "Default" : "Custom"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">Send Notification Now</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manually notify a selected audience using a template.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Audience</label>
                <DropdownSelect
                  value={audience}
                  onChange={(value) => {
                    if (value) setAudience(value as NotificationAudience);
                  }}
                  options={[
                    { value: "PENDING_OVERDUE", label: `Pending & Overdue (${counts.pendingOverdue} employees)` },
                    { value: "OVERDUE", label: `Overdue only (${counts.overdue} employees)` },
                    { value: "PENDING", label: `Pending only (${counts.pending} employees)` },
                    { value: "ALL", label: `All Assigned (${counts.all} employees)` },
                  ]}
                  allowClear={false}
                  className="mt-2"
                  aria-label="Audience"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Template</label>
                <DropdownSelect
                  value={templateId}
                  onChange={(value) => {
                    if (value) setTemplateId(value);
                  }}
                  options={data.templates.map((item) => ({ value: item.id, label: item.name }))}
                  allowClear={false}
                  className="mt-2"
                  aria-label="Template"
                />
              </div>
              {sendError ? <p className="text-xs font-medium text-[var(--color-error)]">{sendError}</p> : null}
              {sendNote ? <p className="text-xs font-medium text-[var(--color-success)]">{sendNote}</p> : null}
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{sending ? "Sending..." : "Send Now"}</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <HistoryTable rows={historyRows} total={data.history.length} onViewAll={() => setHistoryOpen(true)} />

      {ruleModal ? (
        <AddRuleModal
          templates={data.templates}
          onClose={() => setRuleModal(false)}
          onSave={async (payload) => {
            await createComplianceNotificationRule(policyId, payload);
            setRuleModal(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function HistoryTable({
  rows,
  total,
  onViewAll,
}: {
  rows: ComplianceNotificationHistory[];
  total: number;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
        <h3 className="text-sm font-bold text-slate-900">Notification History</h3>
        {total > rows.length ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-bold text-[var(--color-active-menu)] hover:underline"
          >
            View All History
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Rule / Template</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Recipients</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Delivered</th>
              <th className="px-4 py-3">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No notifications have been sent for this policy yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const when = formatDateTime(row.createdAt);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{when.date}</div>
                      <div className="text-xs text-slate-400">{when.time}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3">{row.channel}</td>
                    <td className="px-4 py-3">{row.recipients}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          row.status === "DELIVERED"
                            ? "bg-emerald-50 text-[var(--color-success)]"
                            : "bg-red-50 text-[var(--color-error)]",
                        )}
                      >
                        {row.status === "DELIVERED" ? "Delivered" : "Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.delivered}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.opened}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TRIGGER_OPTIONS: Array<{ value: NotificationTrigger; label: string }> = [
  { value: "DAYS_BEFORE_DUE", label: "Days before due date" },
  { value: "ON_DUE_DATE", label: "On due date" },
  { value: "DAYS_AFTER_DUE", label: "Days after due date" },
  { value: "EVERY_DAY_AFTER_DUE", label: "Every day after due date" },
  { value: "MANUAL", label: "Manual send only" },
];

const AUDIENCE_OPTIONS: Array<{ value: NotificationAudience; label: string }> = [
  { value: "ALL", label: "All assigned" },
  { value: "PENDING", label: "Pending employees" },
  { value: "OVERDUE", label: "Overdue employees" },
  { value: "PENDING_OVERDUE", label: "Pending & overdue" },
  { value: "MANAGER", label: "Employee's manager" },
  { value: "COMPLIANCE", label: "Compliance officers" },
];

function triggerSummary(trigger: NotificationTrigger, days: number) {
  if (trigger === "DAYS_BEFORE_DUE") {
    return `${days} day${days === 1 ? "" : "s"} before due date`;
  }
  if (trigger === "DAYS_AFTER_DUE") {
    return `${days} day${days === 1 ? "" : "s"} after due date`;
  }
  return TRIGGER_OPTIONS.find((option) => option.value === trigger)?.label ?? "Manual send only";
}

function FieldRow({
  icon: Icon,
  label,
  description,
  stacked,
  children,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3.5 py-4">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
        <Icon className="h-4 w-4" />
      </span>
      <div
        className={cx(
          "min-w-0 flex-1",
          stacked ? "" : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
        )}
      >
        <div className={cx("min-w-0", stacked ? "" : "lg:max-w-[17rem]")}>
          <div className="text-sm font-bold text-slate-900">
            {label}
            <span className="ml-0.5 text-red-500">*</span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className={cx(stacked ? "mt-2.5 w-full" : "w-full shrink-0 lg:w-[20rem]")}>{children}</div>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function AddRuleModal({
  templates,
  onClose,
  onSave,
}: {
  templates: ComplianceNotificationsPayload["templates"];
  onClose: () => void;
  onSave: (payload: {
    name: string;
    trigger: NotificationTrigger;
    offsetDays: number;
    channels: NotificationChannel[];
    audience: NotificationAudience;
    templateId?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("Custom Reminder");
  const [trigger, setTrigger] = useState<NotificationTrigger>("DAYS_BEFORE_DUE");
  const [offsetDays, setOffsetDays] = useState(7);
  const [audience, setAudience] = useState<NotificationAudience>("PENDING_OVERDUE");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [channels, setChannels] = useState<NotificationChannel[]>(["email", "inapp"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleChannel(channel: NotificationChannel) {
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel],
    );
  }

  function bumpDays(delta: number) {
    setOffsetDays((current) => Math.min(365, Math.max(0, current + delta)));
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await onSave({
        name,
        trigger,
        offsetDays,
        channels: channels.length > 0 ? channels : ["inapp"],
        audience,
        templateId: templateId || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save this rule.");
      setSaving(false);
    }
  }

  const showOffset = trigger === "DAYS_BEFORE_DUE" || trigger === "DAYS_AFTER_DUE";
  const templateName = templates.find((item) => item.id === templateId)?.name ?? "Select a template";
  const audienceLabel = AUDIENCE_OPTIONS.find((item) => item.value === audience)?.label ?? audience;
  const channelLabel =
    channels.length === 0
      ? "None selected"
      : ["email", "inapp"]
          .filter((channel) => channels.includes(channel as NotificationChannel))
          .map((channel) => (channel === "email" ? "Email" : "In-app"))
          .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[min(92vh,52rem)] w-full max-w-[64rem] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold tracking-tight text-slate-900">Add notification rule</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose when and how this policy should notify assigned employees.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 sm:px-7">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(16rem,19.5rem)_minmax(0,1fr)]">
            <aside className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <h4 className="text-sm font-extrabold text-slate-900">Rule summary</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">This is how your notification rule will work.</p>
              <div className="mt-5 space-y-4">
                <SummaryItem icon={Calendar} label="When" value={triggerSummary(trigger, offsetDays)} />
                <SummaryItem icon={Users} label="Audience" value={audienceLabel} />
                <SummaryItem icon={FileText} label="Template" value={templateName} />
                <SummaryItem icon={MessageSquare} label="Channels" value={channelLabel} />
              </div>
              <div className="mt-6 flex gap-2 rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-slate-600 xl:mt-auto">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                Employees will be notified based on the conditions you set in this rule.
              </div>
            </aside>

            <div className="min-w-0 divide-y divide-slate-100">
              <FieldRow
                icon={Bell}
                label="Rule name"
                description="Give this rule a clear name so your team can recognize it."
                stacked
              >
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </FieldRow>

              <FieldRow icon={Calendar} label="When" description="Choose the trigger that starts this notification.">
                <DropdownSelect
                  value={trigger}
                  onChange={(value) => {
                    if (value) setTrigger(value as NotificationTrigger);
                  }}
                  options={TRIGGER_OPTIONS}
                  allowClear={false}
                />
              </FieldRow>

              {showOffset ? (
                <FieldRow
                  icon={Clock3}
                  label="Number of days"
                  description="How many days before or after the due date to notify."
                >
                  <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => bumpDays(-1)}
                      className="inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-800"
                      aria-label="Decrease days"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-extrabold text-slate-900">{offsetDays}</span>
                    <button
                      type="button"
                      onClick={() => bumpDays(1)}
                      className="inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-800"
                      aria-label="Increase days"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </FieldRow>
              ) : null}

              <FieldRow icon={Users} label="Audience" description="Who should receive this notification.">
                <DropdownSelect
                  value={audience}
                  onChange={(value) => {
                    if (value) setAudience(value as NotificationAudience);
                  }}
                  options={AUDIENCE_OPTIONS}
                  allowClear={false}
                />
              </FieldRow>

              <FieldRow icon={FileText} label="Template" description="The message employees will receive.">
                <DropdownSelect
                  value={templateId}
                  onChange={(value) => {
                    if (value) setTemplateId(value);
                  }}
                  options={templates.map((item) => ({ value: item.id, label: item.name }))}
                  allowClear={false}
                  menuClassName="bottom-full mb-2 mt-0"
                />
              </FieldRow>

              <FieldRow icon={Send} label="Channels" description="How this notification should be delivered.">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "email", label: "Email", Icon: Mail },
                      { id: "inapp", label: "In-app", Icon: MessageSquare },
                    ] as const
                  ).map((channel) => {
                    const selected = channels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => toggleChannel(channel.id)}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-slate-300"
                      >
                        <span
                          className={cx(
                            "inline-flex h-5 w-5 items-center justify-center rounded-md border",
                            selected
                              ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)] text-white"
                              : "border-slate-300 bg-white",
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <channel.Icon className="h-4 w-4 text-slate-500" />
                        {channel.label}
                      </button>
                    );
                  })}
                </div>
              </FieldRow>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-[var(--color-error)]">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void submit()}
            className="inline-flex h-11 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
