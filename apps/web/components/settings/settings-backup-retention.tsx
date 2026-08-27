"use client";

import { useState } from "react";
import {
  Archive,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { backupPageNumbers } from "./settings-backup-history";

type AppliesTo = "all" | "full" | "incremental" | "archive";
type Cadence = "daily" | "weekly" | "monthly";

type RetentionPolicy = {
  id: string;
  name: string;
  description: string;
  appliesTo: AppliesTo;
  keepLast: number;
  cadence: Cadence;
  protectLocked: boolean;
  protectRestorePoints: boolean;
  protectInUse: boolean;
  active: boolean;
  totalBackups: number;
  oldestBackup: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
};

type PolicyForm = Pick<
  RetentionPolicy,
  | "name"
  | "description"
  | "appliesTo"
  | "keepLast"
  | "cadence"
  | "protectLocked"
  | "protectRestorePoints"
  | "protectInUse"
  | "active"
>;

const PAGE_SIZE = 6;

const emptyForm: PolicyForm = {
  name: "",
  description: "",
  appliesTo: "all",
  keepLast: 30,
  cadence: "daily",
  protectLocked: true,
  protectRestorePoints: true,
  protectInUse: true,
  active: true,
};

const appliesToOptions = [
  { value: "all", label: "All Backups" },
  { value: "full", label: "Full Backups Only" },
  { value: "incremental", label: "Incremental Backups" },
  { value: "archive", label: "Archive Backups" },
];

const cadenceOptions = [
  { value: "daily", label: "daily" },
  { value: "weekly", label: "weekly" },
  { value: "monthly", label: "monthly" },
];

const initialPolicies: RetentionPolicy[] = [
  {
    id: "ret-001",
    name: "Standard Retention Policy",
    description: "Default retention for all backups",
    appliesTo: "all",
    keepLast: 30,
    cadence: "daily",
    protectLocked: true,
    protectRestorePoints: true,
    protectInUse: true,
    active: true,
    totalBackups: 28,
    oldestBackup: "Jan 15, 2026",
    createdBy: "System Administrator",
    createdAt: "Jan 10, 2026 09:00 AM",
    lastModified: "May 12, 2026 02:14 PM",
  },
  {
    id: "ret-002",
    name: "Full Backup Retention",
    description: "Longer retention for complete snapshots",
    appliesTo: "full",
    keepLast: 12,
    cadence: "weekly",
    protectLocked: true,
    protectRestorePoints: true,
    protectInUse: true,
    active: true,
    totalBackups: 8,
    oldestBackup: "Feb 1, 2026",
    createdBy: "System Administrator",
    createdAt: "Jan 18, 2026 11:20 AM",
    lastModified: "Apr 28, 2026 08:41 AM",
  },
  {
    id: "ret-003",
    name: "Incremental Retention",
    description: "Short-term retention for changed files",
    appliesTo: "incremental",
    keepLast: 7,
    cadence: "daily",
    protectLocked: true,
    protectRestorePoints: false,
    protectInUse: true,
    active: true,
    totalBackups: 20,
    oldestBackup: "Apr 20, 2026",
    createdBy: "Jethro Simbulan",
    createdAt: "Mar 2, 2026 03:12 PM",
    lastModified: "May 10, 2026 04:05 PM",
  },
  {
    id: "ret-004",
    name: "Archive Retention Policy",
    description: "Long-term monthly archives",
    appliesTo: "archive",
    keepLast: 4,
    cadence: "monthly",
    protectLocked: true,
    protectRestorePoints: true,
    protectInUse: true,
    active: false,
    totalBackups: 4,
    oldestBackup: "Jan 1, 2026",
    createdBy: "System Administrator",
    createdAt: "Dec 20, 2025 10:00 AM",
    lastModified: "Jan 5, 2026 01:22 PM",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function appliesToLabel(value: AppliesTo) {
  return appliesToOptions.find((item) => item.value === value)?.label ?? "All Backups";
}

function retentionRule(policy: Pick<RetentionPolicy, "keepLast" | "cadence">) {
  return `Keep last ${policy.keepLast} ${policy.cadence} backups`;
}

function policyMeta(appliesTo: AppliesTo) {
  if (appliesTo === "full") {
    return {
      Icon: Database,
      iconWrap: "bg-violet-50 text-violet-600",
    };
  }
  if (appliesTo === "incremental") {
    return {
      Icon: FileText,
      iconWrap: "bg-blue-50 text-[var(--color-active-menu)]",
    };
  }
  if (appliesTo === "archive") {
    return {
      Icon: Archive,
      iconWrap: "bg-amber-50 text-amber-600",
    };
  }
  return {
    Icon: CalendarDays,
    iconWrap: "bg-blue-50 text-[var(--color-active-menu)]",
  };
}

function nowLabel() {
  return "May 13, 2026 10:42 PM";
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

export default function BackupRetentionPanel({ onBanner }: { onBanner: (message: string) => void }) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(policies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = policies.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageItems = policies.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = pageStart + pageItems.length;
  const editingPolicy = editingId ? policies.find((item) => item.id === editingId) : null;

  const formTitle = editingId ? "Edit Retention Policy" : "Create Retention Policy";
  const formSubtitle = editingId
    ? "Update how long matching backups are kept."
    : "Configure how long backups are kept before they are automatically deleted.";

  function updateForm<K extends keyof PolicyForm>(key: K, value: PolicyForm[K]) {
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
    setMenuId(null);
    setFormOpen(true);
  }

  function startEdit(policy: RetentionPolicy) {
    setEditingId(policy.id);
    setMenuId(null);
    setError(null);
    setFormOpen(true);
    setForm({
      name: policy.name,
      description: policy.description,
      appliesTo: policy.appliesTo,
      keepLast: policy.keepLast,
      cadence: policy.cadence,
      protectLocked: policy.protectLocked,
      protectRestorePoints: policy.protectRestorePoints,
      protectInUse: policy.protectInUse,
      active: policy.active,
    });
  }

  function savePolicy() {
    if (!form.name.trim()) {
      setError("Policy name is required.");
      return;
    }
    if (!form.keepLast || form.keepLast < 1) {
      setError("Keep last must be at least 1 backup.");
      return;
    }

    if (editingId) {
      setPolicies((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...form,
                name: form.name.trim(),
                lastModified: nowLabel(),
              }
            : item,
        ),
      );
      onBanner("Retention policy updated.");
    } else {
      const next: RetentionPolicy = {
        id: `ret-${Date.now()}`,
        ...form,
        name: form.name.trim(),
        totalBackups: 0,
        oldestBackup: "—",
        createdBy: "Jethro Simbulan",
        createdAt: nowLabel(),
        lastModified: nowLabel(),
      };
      setPolicies((current) => [next, ...current]);
      setPage(1);
      onBanner("Retention policy created.");
    }
    resetForm();
  }

  function toggleActive(policy: RetentionPolicy) {
    setPolicies((current) =>
      current.map((item) => (item.id === policy.id ? { ...item, active: !item.active } : item)),
    );
    setMenuId(null);
    onBanner(`${policy.name} ${policy.active ? "deactivated" : "activated"}.`);
  }

  function deletePolicy(policy: RetentionPolicy) {
    setPolicies((current) => current.filter((item) => item.id !== policy.id));
    if (editingId === policy.id) resetForm();
    setMenuId(null);
    onBanner(`${policy.name} deleted. This is a mockup and no backups were removed.`);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Retention Policies</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Configure how long backups are kept before they are automatically deleted.
            </p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-3">Policy Name</th>
                <th className="px-4 py-3">Applies To</th>
                <th className="px-4 py-3">Retention Rules</th>
                <th className="px-4 py-3">Total Backups</th>
                <th className="px-4 py-3">Oldest Backup</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((policy) => {
                const meta = policyMeta(policy.appliesTo);
                const Icon = meta.Icon;
                return (
                  <tr key={policy.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
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
                          <span className="block font-semibold text-slate-900">{policy.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{policy.description}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{appliesToLabel(policy.appliesTo)}</td>
                    <td className="px-4 py-3.5 text-slate-700">{retentionRule(policy)}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{policy.totalBackups} backups</td>
                    <td className="px-4 py-3.5 text-slate-700">{policy.oldestBackup}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 text-sm font-semibold",
                          policy.active ? "text-[var(--color-success)]" : "text-slate-400",
                        )}
                      >
                        <span
                          className={cx(
                            "h-1.5 w-1.5 rounded-full",
                            policy.active ? "bg-[var(--color-success)]" : "bg-slate-400",
                          )}
                        />
                        {policy.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(policy)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                          aria-label={`Edit ${policy.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuId((current) => (current === policy.id ? null : policy.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                          aria-label={`More actions for ${policy.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === policy.id ? (
                          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                            <button
                              type="button"
                              onClick={() => toggleActive(policy)}
                              className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {policy.active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(policy)}
                              className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit policy
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePolicy(policy)}
                              className="flex w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete policy
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
            Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {policies.length} policies
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
            aria-labelledby="retention-form-title"
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                  {editingId ? <Pencil className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </span>
                <div>
                  <h3 id="retention-form-title" className="text-lg font-bold text-slate-900">
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
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Standard Retention Policy"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={3}
                  placeholder="Default retention for all backups"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Applies To <span className="text-red-500">*</span>
                </label>
                <DropdownSelect
                  value={form.appliesTo}
                  onChange={(value) => updateForm("appliesTo", (value || "all") as AppliesTo)}
                  options={appliesToOptions}
                  aria-label="Applies To"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Retention Rule <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Keep last</span>
                  <input
                    type="number"
                    min={1}
                    value={form.keepLast}
                    onChange={(event) => updateForm("keepLast", Number(event.target.value) || 1)}
                    className="h-11 w-20 rounded-xl border border-slate-200 px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                  />
                  <div className="min-w-[140px] flex-1">
                    <DropdownSelect
                      value={form.cadence}
                      onChange={(value) => updateForm("cadence", (value || "daily") as Cadence)}
                      options={cadenceOptions}
                      aria-label="Retention cadence"
                    />
                  </div>
                  <span>backups.</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Old backups beyond this limit will be automatically deleted.
                </p>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-slate-700">Exceptions</div>
                <div className="space-y-2 rounded-xl border border-slate-200 px-3 py-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.protectLocked}
                      onChange={(event) => updateForm("protectLocked", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                    />
                    Manually locked backups
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.protectRestorePoints}
                      onChange={(event) => updateForm("protectRestorePoints", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                    />
                    Backups marked as restore points
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.protectInUse}
                      onChange={(event) => updateForm("protectInUse", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                    />
                    Backups currently in use
                  </label>
                </div>
              </div>

              <Toggle
                checked={form.active}
                onChange={(checked) => updateForm("active", checked)}
                label="Active policy"
                description="Inactive policies are kept but not applied during cleanup."
              />

              {editingPolicy ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    Policy Information
                  </div>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Created By</dt>
                      <dd className="font-semibold text-slate-800">{editingPolicy.createdBy}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Created At</dt>
                      <dd className="font-semibold text-slate-800">{editingPolicy.createdAt}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Last Modified</dt>
                      <dd className="font-semibold text-slate-800">{editingPolicy.lastModified}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            </div>

            <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => editingPolicy && deletePolicy(editingPolicy)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePolicy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-active-menu)] text-sm font-semibold text-white"
              >
                {editingId ? "Save Changes" : "Create Policy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
        <h3 className="text-base font-bold text-slate-900">Retention Policy How It Works</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              {
                title: "Automated Cleanup",
                body: "Backups that exceed the retention period are automatically deleted.",
                Icon: Trash2,
                iconWrap: "bg-violet-50 text-violet-600",
              },
              {
                title: "Protection Rules",
                body: "The system always keeps at least one backup for each defined period.",
                Icon: ShieldCheck,
                iconWrap: "bg-emerald-50 text-[var(--color-success)]",
              },
              {
                title: "Retention Hierarchy",
                body: "Daily → Weekly → Monthly → Yearly. Higher-level backups are preserved.",
                Icon: CalendarClock,
                iconWrap: "bg-amber-50 text-amber-600",
              },
              {
                title: "Policy Priority",
                body: "More specific policies override general retention policies.",
                Icon: Info,
                iconWrap: "bg-blue-50 text-[var(--color-active-menu)]",
              },
            ] satisfies Array<{ title: string; body: string; Icon: LucideIcon; iconWrap: string }>
          ).map((item) => (
            <article key={item.title} className="flex gap-3">
              <span
                className={cx(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  item.iconWrap,
                )}
              >
                <item.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
          <p>Retention policies are applied automatically based on the backup type and schedule configuration.</p>
        </div>
      </section>
    </div>
  );
}
