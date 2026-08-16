"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCog,
  FileText,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { backupPageNumbers } from "./settings-backup-history";

type ScheduleBackupType = "full" | "incremental" | "database" | "configuration";
type ScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly";
type RetentionPolicy = "7" | "14" | "30" | "90" | "custom";
type ScheduleDestination = "supabase" | "s3";
type Weekday = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

type BackupSchedule = {
  id: string;
  name: string;
  description: string;
  backupType: ScheduleBackupType;
  frequency: ScheduleFrequency;
  weekday: Weekday;
  time: string;
  retentionPolicy: RetentionPolicy;
  retentionLimit: number;
  destination: ScheduleDestination;
  enabled: boolean;
  nextRun: string;
};

type ScheduleForm = Omit<BackupSchedule, "id" | "nextRun">;

const PAGE_SIZE = 6;

const emptyForm: ScheduleForm = {
  name: "",
  description: "",
  backupType: "full",
  frequency: "daily",
  weekday: "sunday",
  time: "02:00",
  retentionPolicy: "custom",
  retentionLimit: 30,
  destination: "supabase",
  enabled: true,
};

const backupTypeOptions = [
  { value: "full", label: "Full Backup" },
  { value: "incremental", label: "Incremental Backup" },
  { value: "database", label: "Database Only" },
  { value: "configuration", label: "Configuration" },
];

const backupTypeHelp: Record<ScheduleBackupType, string> = {
  full: "Back up the entire system including database, files, and configurations.",
  incremental: "Back up only files and data that changed since the last backup.",
  database: "Back up the database only.",
  configuration: "Back up system configuration files only.",
};

const frequencyOptions = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const weekdayOptions = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

const timeOptions = [
  { value: "00:00", label: "12:00 AM" },
  { value: "01:00", label: "01:00 AM" },
  { value: "02:00", label: "02:00 AM" },
  { value: "03:00", label: "03:00 AM" },
  { value: "04:00", label: "04:00 AM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
];

const retentionOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

const destinationOptions = [
  { value: "supabase", label: "Supabase Storage (Primary)" },
  { value: "s3", label: "AWS S3 (Secondary)" },
];

const initialSchedules: BackupSchedule[] = [
  {
    id: "sch-001",
    name: "Daily Full Backup",
    description: "Full system backup",
    backupType: "full",
    frequency: "daily",
    weekday: "sunday",
    time: "02:00",
    retentionPolicy: "30",
    retentionLimit: 30,
    destination: "supabase",
    enabled: true,
    nextRun: "May 14, 2026 02:00 AM",
  },
  {
    id: "sch-002",
    name: "Hourly Incremental",
    description: "Changed files since last backup",
    backupType: "incremental",
    frequency: "hourly",
    weekday: "sunday",
    time: "02:00",
    retentionPolicy: "7",
    retentionLimit: 24,
    destination: "supabase",
    enabled: true,
    nextRun: "May 13, 2026 03:00 AM",
  },
  {
    id: "sch-003",
    name: "Weekly Full Backup",
    description: "Weekly complete snapshot",
    backupType: "full",
    frequency: "weekly",
    weekday: "sunday",
    time: "01:00",
    retentionPolicy: "90",
    retentionLimit: 12,
    destination: "s3",
    enabled: true,
    nextRun: "May 17, 2026 01:00 AM",
  },
  {
    id: "sch-004",
    name: "Database Nightly",
    description: "Database only backup",
    backupType: "database",
    frequency: "daily",
    weekday: "sunday",
    time: "03:00",
    retentionPolicy: "14",
    retentionLimit: 14,
    destination: "supabase",
    enabled: true,
    nextRun: "May 14, 2026 03:00 AM",
  },
  {
    id: "sch-005",
    name: "Configuration Snapshot",
    description: "System configuration files",
    backupType: "configuration",
    frequency: "weekly",
    weekday: "friday",
    time: "23:00",
    retentionPolicy: "30",
    retentionLimit: 8,
    destination: "supabase",
    enabled: true,
    nextRun: "May 15, 2026 11:00 PM",
  },
  {
    id: "sch-006",
    name: "Monthly Archive",
    description: "Long-term full archive",
    backupType: "full",
    frequency: "monthly",
    weekday: "sunday",
    time: "02:00",
    retentionPolicy: "90",
    retentionLimit: 12,
    destination: "s3",
    enabled: false,
    nextRun: "June 1, 2026 02:00 AM",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function typeMeta(type: ScheduleBackupType) {
  if (type === "incremental") {
    return {
      label: "Incremental",
      badge: "bg-blue-50 text-[var(--color-active-menu)]",
      iconWrap: "bg-blue-50 text-[var(--color-active-menu)]",
      Icon: FileText,
    };
  }
  if (type === "database") {
    return {
      label: "Database Only",
      badge: "bg-sky-100 text-sky-800",
      iconWrap: "bg-sky-50 text-sky-700",
      Icon: Database,
    };
  }
  if (type === "configuration") {
    return {
      label: "Configuration",
      badge: "bg-rose-50 text-rose-600",
      iconWrap: "bg-rose-50 text-rose-600",
      Icon: FileCog,
    };
  }
  return {
    label: "Full",
    badge: "bg-violet-50 text-violet-600",
    iconWrap: "bg-violet-50 text-violet-600",
    Icon: Database,
  };
}

function frequencyLabel(schedule: Pick<BackupSchedule, "frequency" | "weekday">) {
  if (schedule.frequency === "hourly") return "Hourly (Every hour)";
  if (schedule.frequency === "daily") return "Daily (Every day)";
  if (schedule.frequency === "monthly") return "Monthly (1st of month)";
  const weekday = weekdayOptions.find((item) => item.value === schedule.weekday)?.label ?? "Sunday";
  return `Weekly (Every ${weekday})`;
}

function timeLabel(time: string) {
  return `${timeOptions.find((item) => item.value === time)?.label ?? time} (UTC+08:00)`;
}

function retentionLabel(schedule: Pick<BackupSchedule, "retentionPolicy" | "retentionLimit">) {
  const days =
    schedule.retentionPolicy === "custom" ? `${schedule.retentionLimit} days` : `${schedule.retentionPolicy} days`;
  return `${days}, Keep last ${schedule.retentionLimit}`;
}

function nextRunFromForm(form: ScheduleForm) {
  if (form.frequency === "hourly") return "May 13, 2026 03:00 AM";
  if (form.frequency === "weekly") return "May 17, 2026 01:00 AM";
  if (form.frequency === "monthly") return "June 1, 2026 02:00 AM";
  return `May 14, 2026 ${timeOptions.find((item) => item.value === form.time)?.label ?? "02:00 AM"}`;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[var(--color-active-menu)]" : "bg-slate-300",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export default function BackupSchedulePanel({ onBanner }: { onBanner: (message: string) => void }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = schedules.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageItems = schedules.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = pageStart + pageItems.length;

  const selectedTypeHelp = backupTypeHelp[form.backupType];

  const formTitle = editingId ? "Edit Schedule" : "Create New Schedule";
  const formSubtitle = editingId ? "Update this backup schedule." : "Configure a new backup schedule.";

  function updateForm<K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setFormOpen(false);
  }

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setFormOpen(true);
  }

  function startEdit(schedule: BackupSchedule) {
    setEditingId(schedule.id);
    setMenuId(null);
    setError(null);
    setFormOpen(true);
    setForm({
      name: schedule.name,
      description: schedule.description,
      backupType: schedule.backupType,
      frequency: schedule.frequency,
      weekday: schedule.weekday,
      time: schedule.time,
      retentionPolicy: schedule.retentionPolicy,
      retentionLimit: schedule.retentionLimit,
      destination: schedule.destination,
      enabled: schedule.enabled,
    });
  }

  function saveSchedule() {
    if (!form.name.trim()) {
      setError("Schedule name is required.");
      return;
    }
    if (!form.retentionLimit || form.retentionLimit < 1) {
      setError("Retention limit must be at least 1.");
      return;
    }

    if (editingId) {
      setSchedules((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...item, ...form, name: form.name.trim(), nextRun: nextRunFromForm(form) }
            : item,
        ),
      );
      onBanner("Backup schedule updated.");
    } else {
      const next: BackupSchedule = {
        id: `sch-${Date.now()}`,
        ...form,
        name: form.name.trim(),
        nextRun: nextRunFromForm(form),
      };
      setSchedules((current) => [next, ...current]);
      onBanner("Backup schedule saved.");
    }
    resetForm();
  }

  function toggleEnabled(schedule: BackupSchedule) {
    setSchedules((current) =>
      current.map((item) => (item.id === schedule.id ? { ...item, enabled: !item.enabled } : item)),
    );
    setMenuId(null);
    onBanner(`${schedule.name} ${schedule.enabled ? "disabled" : "enabled"}.`);
  }

  function deleteSchedule(schedule: BackupSchedule) {
    setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    if (editingId === schedule.id) resetForm();
    setMenuId(null);
    onBanner(`${schedule.name} deleted. This is a mockup and no jobs were removed.`);
  }

  const retentionLimitVisible = true;
  const weekdayVisible = form.frequency === "weekly";

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Scheduled Backups</h3>
              <p className="mt-0.5 text-sm text-slate-500">Automatic backup jobs currently configured.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onBanner("Schedules refreshed.")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Create Schedule
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-4 py-3">Schedule Name</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Backup Type</th>
                  <th className="px-4 py-3">Retention</th>
                  <th className="px-4 py-3">Next Run</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((schedule) => {
                  const meta = typeMeta(schedule.backupType);
                  const Icon = meta.Icon;
                  return (
                    <tr
                      key={schedule.id}
                      className={cx(
                        "border-b border-slate-100 last:border-0",
                        editingId === schedule.id ? "bg-blue-50/70" : "hover:bg-slate-50",
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cx(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                              meta.iconWrap,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">{schedule.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">{schedule.description}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{frequencyLabel(schedule)}</td>
                      <td className="px-4 py-3.5 text-slate-700">{timeLabel(schedule.time)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", meta.badge)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{retentionLabel(schedule)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{schedule.nextRun}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cx(
                            "inline-flex items-center gap-1.5 text-sm font-semibold",
                            schedule.enabled ? "text-[var(--color-success)]" : "text-slate-400",
                          )}
                        >
                          <span
                            className={cx(
                              "h-1.5 w-1.5 rounded-full",
                              schedule.enabled ? "bg-[var(--color-success)]" : "bg-slate-400",
                            )}
                          />
                          {schedule.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="relative flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(schedule)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                            aria-label={`Edit ${schedule.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenuId((current) => (current === schedule.id ? null : schedule.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                            aria-label={`More actions for ${schedule.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuId === schedule.id ? (
                            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                              <button
                                type="button"
                                onClick={() => toggleEnabled(schedule)}
                                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {schedule.enabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(schedule)}
                                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit schedule
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSchedule(schedule)}
                                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete schedule
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

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {schedules.length} schedules
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
              {backupPageNumbers(currentPage, totalPages).map((item, index) =>
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
        </section>

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-4"
          onClick={resetForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-form-title"
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                  {editingId ? <Settings2 className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
                </span>
                <div>
                  <h3 id="schedule-form-title" className="text-lg font-bold text-slate-900">
                    {formTitle}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">{formSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Schedule Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Daily Full Backup"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={3}
                  placeholder="Full system backup"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Backup Type <span className="text-red-500">*</span>
                </label>
                <DropdownSelect
                  value={form.backupType}
                  onChange={(value) => updateForm("backupType", (value || "full") as ScheduleBackupType)}
                  options={backupTypeOptions}
                  aria-label="Backup Type"
                />
                <p className="mt-1.5 text-xs text-slate-400">{selectedTypeHelp}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <DropdownSelect
                    value={form.frequency}
                    onChange={(value) => updateForm("frequency", (value || "daily") as ScheduleFrequency)}
                    options={frequencyOptions}
                    aria-label="Frequency"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <DropdownSelect
                    value={form.time}
                    onChange={(value) => updateForm("time", value || "02:00")}
                    options={timeOptions}
                    aria-label="Time"
                  />
                </div>
              </div>
              {weekdayVisible ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Weekday</label>
                  <DropdownSelect
                    value={form.weekday}
                    onChange={(value) => updateForm("weekday", (value || "sunday") as Weekday)}
                    options={weekdayOptions}
                    aria-label="Weekday"
                  />
                </div>
              ) : null}
              <p className="text-xs text-slate-400">(UTC+08:00) Asia/Manila</p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Retention Policy <span className="text-red-500">*</span>
                </label>
                <DropdownSelect
                  value={form.retentionPolicy}
                  onChange={(value) => {
                    const next = (value || "custom") as RetentionPolicy;
                    updateForm("retentionPolicy", next);
                    if (next !== "custom") updateForm("retentionLimit", Number(next));
                  }}
                  options={retentionOptions}
                  aria-label="Retention Policy"
                />
                {retentionLimitVisible ? (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      Keep last
                      <input
                        type="number"
                        min={1}
                        value={form.retentionLimit}
                        onChange={(event) => updateForm("retentionLimit", Number(event.target.value) || 1)}
                        className="h-9 w-16 rounded-lg border border-slate-200 px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                      />
                      backups.
                    </label>
                    <p className="mt-1 text-xs text-slate-400">
                      Old backups beyond this limit will be automatically deleted.
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Backup Destination <span className="text-red-500">*</span>
                </label>
                <DropdownSelect
                  value={form.destination}
                  onChange={(value) => updateForm("destination", (value || "supabase") as ScheduleDestination)}
                  options={destinationOptions}
                  aria-label="Backup Destination"
                />
              </div>

              <Toggle
                checked={form.enabled}
                onChange={(checked) => updateForm("enabled", checked)}
                label="Enable schedule"
                description="Schedule will be active immediately."
              />

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            </div>

            <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSchedule}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-active-menu)] text-sm font-semibold text-white"
              >
                {editingId ? "Save Changes" : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-[var(--color-active-menu)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          All times are in (UTC+08:00) Asia/Manila. Backups will run automatically based on the schedule. Ensure your
          storage location is available and has sufficient space.
        </p>
      </div>
    </div>
  );
}
