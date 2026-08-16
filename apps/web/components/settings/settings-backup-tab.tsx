"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Cloud,
  CloudUpload,
  Database,
  Download,
  FileText,
  Info,
  MoreVertical,
  RotateCcw,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import BackupHistoryPanel, {
  createInitialBackups,
  createManualBackup,
  type BackupRecord,
  type BackupType,
} from "./settings-backup-history";
import BackupRestorePanel from "./settings-backup-restore";
import BackupSchedulePanel from "./settings-backup-schedule";

type BackupSubTab =
  | "overview"
  | "history"
  | "restore"
  | "schedule"
  | "retention"
  | "export";

type ScheduleSettings = {
  frequency: string;
  time: string;
  timezone: string;
  backupType: string;
  includeDatabase: boolean;
  includeFiles: boolean;
  includeConfig: boolean;
};

type StorageSettings = {
  primary: string;
  primaryRegion: string;
  secondary: string;
  secondaryRegion: string;
};

type RetentionSettings = {
  days: string;
  keepFullWeekly: boolean;
  keepMonthly: boolean;
};

const subTabs: Array<{ id: BackupSubTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Backup History" },
  { id: "restore", label: "Restore" },
  { id: "schedule", label: "Backup Schedule" },
  { id: "retention", label: "Retention Policy" },
  { id: "export", label: "Export Data" },
];

const initialBackups = createInitialBackups();

const tabDescriptions: Record<BackupSubTab, string> = {
  overview:
    "Manage system backups, configure backup schedules, and restore data when needed to ensure business continuity.",
  history: "View and manage all system backup records. You can download, verify, or delete backups.",
  restore: "Restore your system data from a previous backup. Please review the backup details before proceeding.",
  schedule: "Manage system backups, configure backup schedules, and restore data when needed.",
  retention: "Control how long restore points are kept before they are removed.",
  export: "Download a copy of Hinora data for offline storage or migration.",
};

const defaultSchedule: ScheduleSettings = {
  frequency: "daily",
  time: "02:00",
  timezone: "asia-manila",
  backupType: "full-incremental",
  includeDatabase: true,
  includeFiles: true,
  includeConfig: true,
};

const defaultStorage: StorageSettings = {
  primary: "supabase",
  primaryRegion: "singapore",
  secondary: "s3",
  secondaryRegion: "ap-southeast-1",
};

const defaultRetention: RetentionSettings = {
  days: "30",
  keepFullWeekly: true,
  keepMonthly: true,
};

const frequencyOptions = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const timeOptions = [
  { value: "00:00", label: "12:00 AM" },
  { value: "02:00", label: "02:00 AM" },
  { value: "04:00", label: "04:00 AM" },
  { value: "22:00", label: "10:00 PM" },
];

const timezoneOptions = [
  { value: "asia-manila", label: "(UTC+08:00) Asia/Manila" },
  { value: "utc", label: "(UTC+00:00) UTC" },
  { value: "asia-singapore", label: "(UTC+08:00) Asia/Singapore" },
];

const backupTypeOptions = [
  { value: "full", label: "Full only" },
  { value: "incremental", label: "Incremental only" },
  { value: "full-incremental", label: "Full + Incremental" },
];

const retentionOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const exportFormatOptions = [
  { value: "sql", label: "SQL dump" },
  { value: "json", label: "JSON archive" },
  { value: "zip", label: "ZIP package" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function typeBadge(type: BackupType) {
  return type === "Full"
    ? "bg-violet-50 text-violet-600"
    : "bg-blue-50 text-[var(--color-active-menu)]";
}

function SummaryCard({
  Icon,
  iconClassName,
  title,
  value,
  valueClassName,
  detail,
  meta,
}: {
  Icon: LucideIcon;
  iconClassName: string;
  title: string;
  value: string;
  valueClassName?: string;
  detail: string;
  meta?: string;
}) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            {title}
          </div>
          <div className={cx("mt-1 text-lg font-extrabold text-slate-900", valueClassName)}>
            {value}
          </div>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
          {meta ? <p className="mt-1 text-xs font-semibold text-slate-400">{meta}</p> : null}
        </div>
      </div>
    </article>
  );
}

function BackupTable({
  records,
  onLoadMore,
  canLoadMore,
}: {
  records: BackupRecord[];
  onLoadMore?: () => void;
  canLoadMore?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            <th className="px-4 py-3">Backup Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((backup) => {
            const NameIcon = backup.type === "Full" ? Database : FileText;
            return (
            <tr key={backup.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      backup.type === "Full"
                        ? "bg-emerald-50 text-[var(--color-success)]"
                        : "bg-blue-50 text-[var(--color-active-menu)]",
                    )}
                  >
                    <NameIcon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900">{backup.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {backup.type === "Full" ? "Full Backup" : "Incremental Backup"}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cx(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                    typeBadge(backup.type),
                  )}
                >
                  {backup.type}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <div>{backup.dateLabel}</div>
                <div className="text-xs text-slate-400">by {backup.createdBy}</div>
              </td>
              <td className="px-4 py-3.5 font-semibold text-slate-700">{backup.size}</td>
              <td className="px-4 py-3.5">
                <span
                  className={cx(
                    "inline-flex flex-col",
                    backup.status === "Failed"
                      ? "text-red-600"
                      : backup.status === "Running"
                        ? "text-amber-600"
                        : "text-[var(--color-success)]",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <span
                      className={cx(
                        "h-1.5 w-1.5 rounded-full",
                        backup.status === "Failed"
                          ? "bg-red-500"
                          : backup.status === "Running"
                            ? "bg-amber-500"
                            : "bg-[var(--color-success)]",
                      )}
                    />
                    {backup.status}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label={`Download ${backup.name}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label={`More actions for ${backup.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {onLoadMore && canLoadMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="inline-flex w-full items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[var(--color-active-menu)]"
        >
          Load more
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export default function SettingsBackupTab() {
  const [subTab, setSubTab] = useState<BackupSubTab>("overview");
  const [banner, setBanner] = useState<string | null>("Backup & recovery settings saved successfully.");
  const [backups, setBackups] = useState(initialBackups);
  const [loadedMore, setLoadedMore] = useState(false);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [storage, setStorage] = useState(defaultStorage);
  const [retention, setRetention] = useState(defaultRetention);
  const [exportFormat, setExportFormat] = useState("zip");
  const [isRunningBackup, setIsRunningBackup] = useState(false);

  const includeLabel = useMemo(() => {
    const parts = [
      schedule.includeDatabase ? "Database" : null,
      schedule.includeFiles ? "Files" : null,
      schedule.includeConfig ? "Configurations" : null,
    ].filter(Boolean);
    return parts.join(", ") || "None selected";
  }, [schedule]);

  function runBackupNow() {
    setIsRunningBackup(true);
    window.setTimeout(() => {
      const next = createManualBackup();
      setBackups((current) => [next, ...current]);
      setIsRunningBackup(false);
      setBanner("Manual backup completed successfully.");
    }, 700);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Backup & Recovery</h2>
        <p className="mt-1 text-sm text-slate-500">{tabDescriptions[subTab]}</p>
      </div>

      {banner ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--color-success)]">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {banner}
          </span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1">
          {subTabs.map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={cx(
                  "relative inline-flex items-center px-3.5 py-2.5 text-sm font-semibold transition",
                  active
                    ? "text-[var(--color-active-menu)]"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--color-active-menu)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {subTab === "overview" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              Icon={ShieldCheck}
              iconClassName="bg-emerald-50 text-[var(--color-success)]"
              title="Backup Status"
              value="Healthy"
              valueClassName="text-[var(--color-success)]"
              detail="All systems are backed up successfully."
            />
            <SummaryCard
              Icon={Database}
              iconClassName="bg-violet-50 text-violet-600"
              title="Last Successful Backup"
              value="May 13, 2026 02:00 AM"
              detail="Daily backup completed"
              meta="Size: 2.45 GB"
            />
            <SummaryCard
              Icon={CalendarDays}
              iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
              title="Next Scheduled Backup"
              value="May 14, 2026 02:00 AM"
              detail="Daily backup schedule"
              meta="in 10h 32m"
            />
            <SummaryCard
              Icon={Clock3}
              iconClassName="bg-amber-50 text-amber-600"
              title="Restore Points"
              value="28"
              detail="Available restore points (30 days retention)"
            />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-bold text-slate-900">Recent Backups</h3>
                <button
                  type="button"
                  onClick={() => setSubTab("history")}
                  className="text-sm font-semibold text-[var(--color-active-menu)]"
                >
                  View All Backups
                </button>
              </div>
              <BackupTable
                records={backups.filter((backup) => backup.status === "Success").slice(0, loadedMore ? 7 : 5)}
                canLoadMore={!loadedMore}
                onLoadMore={() => setLoadedMore(true)}
              />
            </section>

            <div className="space-y-4">
              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Backup Schedule</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubTab("schedule")}
                    className="text-sm font-semibold text-[var(--color-active-menu)]"
                  >
                    Edit
                  </button>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {[
                    ["Frequency", frequencyOptions.find((item) => item.value === schedule.frequency)?.label],
                    ["Time", timeOptions.find((item) => item.value === schedule.time)?.label],
                    ["Timezone", timezoneOptions.find((item) => item.value === schedule.timezone)?.label],
                    [
                      "Backup Type",
                      backupTypeOptions.find((item) => item.value === schedule.backupType)?.label,
                    ],
                    ["Include", includeLabel],
                    ["Next Run", "May 14, 2026 02:00 AM"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-semibold text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                      <Cloud className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Storage Location</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubTab("schedule")}
                    className="text-sm font-semibold text-[var(--color-active-menu)]"
                  >
                    Edit
                  </button>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Primary Storage</dt>
                    <dd className="mt-1 flex items-center justify-between gap-3 font-semibold text-slate-800">
                      <span>Supabase Storage</span>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-success)]">
                        Connected
                      </span>
                    </dd>
                    <dd className="mt-0.5 text-xs text-slate-400">Singapore (southeast-1)</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Secondary Storage (Optional)</dt>
                    <dd className="mt-1 flex items-center justify-between gap-3 font-semibold text-slate-800">
                      <span>AWS S3</span>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-success)]">
                        Connected
                      </span>
                    </dd>
                    <dd className="mt-0.5 text-xs text-slate-400">Asia Pacific (ap-southeast-1)</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-[var(--color-active-menu)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Your last 7 backups were successful. Good job! Keep your retention policy up to date.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setSubTab("restore")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-active-menu)] bg-white px-4 text-sm font-semibold text-[var(--color-active-menu)]"
              >
                <RotateCcw className="h-4 w-4" />
                Restore Data
              </button>
              <button
                type="button"
                onClick={runBackupNow}
                disabled={isRunningBackup}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <CloudUpload className="h-4 w-4" />
                {isRunningBackup ? "Running..." : "Run Backup Now"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {subTab === "history" ? (
        <BackupHistoryPanel
          backups={backups}
          onChangeBackups={setBackups}
          onRunBackupNow={runBackupNow}
          isRunningBackup={isRunningBackup}
          onBanner={setBanner}
        />
      ) : null}

      {subTab === "restore" ? <BackupRestorePanel backups={backups} onBanner={setBanner} /> : null}

      {subTab === "schedule" ? <BackupSchedulePanel onBanner={setBanner} /> : null}

      {subTab === "retention" ? (
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <h3 className="text-base font-bold text-slate-900">Retention Policy</h3>
          <p className="mt-1 text-sm text-slate-500">
            How long Hinora keeps restore points before they are removed.
          </p>
          <div className="mt-5 max-w-md">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Keep backups for</label>
            <DropdownSelect
              value={retention.days}
              onChange={(value) => setRetention((current) => ({ ...current, days: value || "30" }))}
              options={retentionOptions}
              aria-label="Keep backups for"
            />
          </div>
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={retention.keepFullWeekly}
                onChange={(event) =>
                  setRetention((current) => ({ ...current, keepFullWeekly: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
              />
              Keep one full backup each week
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={retention.keepMonthly}
                onChange={(event) =>
                  setRetention((current) => ({ ...current, keepMonthly: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
              />
              Keep one full backup each month
            </label>
          </div>
        </section>
      ) : null}

      {subTab === "export" ? (
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <h3 className="text-base font-bold text-slate-900">Export Data</h3>
          <p className="mt-1 text-sm text-slate-500">
            Download a copy of Hinora data. This mockup does not generate a real file.
          </p>
          <div className="mt-5 max-w-md">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Export format</label>
            <DropdownSelect
              value={exportFormat}
              onChange={(value) => setExportFormat(value || "zip")}
              options={exportFormatOptions}
              aria-label="Export format"
            />
          </div>
          <button
            type="button"
            onClick={() => setBanner("Export prepared. Download will be available in a later pass.")}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            Prepare export
          </button>
        </section>
      ) : null}
    </div>
  );
}
