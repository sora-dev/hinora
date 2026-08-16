"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Database,
  FileCheck2,
  Info,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  BackupNameCell,
  BackupStatusLabel,
  backupPageNumbers,
  dateFilterOptions,
  statusFilterOptions,
  typeBadge,
  typeFilterOptions,
  type BackupRecord,
} from "./settings-backup-history";

type RestoreStep = 1 | 2 | 3;
type RestoreSource = "existing" | "upload";
type RestoreType = "full" | "partial";
type RestoreEnvironment = "production" | "staging";

const PAGE_SIZE = 5;

const restoreSteps = [
  { id: 1, label: "Select Backup", hint: "Choose a backup to restore" },
  { id: 2, label: "Configure Restore", hint: "Choose what to restore" },
  { id: 3, label: "Confirm & Restore", hint: "Review and start restore" },
] as const;

const environmentOptions = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function recordFromUpload(file: File): BackupRecord {
  return {
    id: "uploaded-backup",
    backupId: `bkp_upload_${file.name.replace(/\W+/g, "_").slice(0, 24)}`,
    name: file.name.replace(/\.hbak$/i, "") || "Uploaded Backup",
    type: "Full",
    dateLabel: "August 15, 2026 02:00 AM",
    dateValue: "2026-08-15T02:00:00.000Z",
    createdBy: "Uploaded file",
    size: formatFileSize(file.size),
    status: "Success",
    storageName: "Local upload",
    storageRegion: "This computer",
    checksum: "a1b2c3d4e5f6…9a0b1c2d3e4f",
    duration: "00:00:00",
    includedItems: "Database, Files, Configurations",
    notes: "Uploaded from this computer",
  };
}

function RestoreStepper({ currentStep }: { currentStep: RestoreStep }) {
  return (
    <ol className="grid gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:grid-cols-3 sm:gap-0">
      {restoreSteps.map((step, index) => {
        const active = currentStep === step.id;
        const complete = currentStep > step.id;

        return (
          <li
            key={step.id}
            className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:px-2 sm:text-center"
          >
            {index < restoreSteps.length - 1 ? (
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

function SourceCard({
  selected,
  title,
  description,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition",
        selected
          ? "border-[var(--color-active-menu)] bg-blue-50/50 ring-4 ring-blue-100"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <span
        className={cx(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)]"
            : "border-slate-300 bg-white",
        )}
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

export default function BackupRestorePanel({
  backups,
  onBanner,
}: {
  backups: BackupRecord[];
  onBanner: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstSuccessId = backups.find((backup) => backup.status === "Success")?.id ?? "";

  const [step, setStep] = useState<RestoreStep>(1);
  const [source, setSource] = useState<RestoreSource>("existing");
  const [selectedId, setSelectedId] = useState(firstSuccessId);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [restoreType, setRestoreType] = useState<RestoreType>("full");
  const [environment, setEnvironment] = useState<RestoreEnvironment>("production");
  const [includeDatabase, setIncludeDatabase] = useState(true);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeConfig, setIncludeConfig] = useState(true);
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreComplete, setRestoreComplete] = useState(false);

  const uploadedRecord = uploadedFile ? recordFromUpload(uploadedFile) : null;
  const selectedExisting = backups.find((backup) => backup.id === selectedId) ?? null;
  const selected = source === "upload" ? uploadedRecord : selectedExisting;
  const uploadVerified = Boolean(uploadedFile) && verifyProgress >= 100;
  const canContinueFromStep1 =
    source === "existing"
      ? Boolean(selectedExisting && selectedExisting.status === "Success")
      : uploadVerified;

  const includeLabel = [includeDatabase ? "Database" : null, includeFiles ? "Files" : null, includeConfig ? "Configurations" : null]
    .filter(Boolean)
    .join(", ") || "None selected";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const newest = backups[0] ? new Date(backups[0].dateValue) : new Date("2026-05-13T02:00:00.000Z");

    return backups.filter((backup) => {
      if (query) {
        const haystack = `${backup.name} ${backup.backupId} ${backup.type} ${backup.createdBy}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (typeFilter && backup.type !== typeFilter) return false;
      if (statusFilter && backup.status !== statusFilter) return false;
      if (dateFilter) {
        const cutoff = new Date(newest);
        cutoff.setUTCDate(cutoff.getUTCDate() - Number(dateFilter));
        if (new Date(backup.dateValue) < cutoff) return false;
      }
      return true;
    });
  }, [backups, dateFilter, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = pageStart + pageItems.length;
  const infoBackup = backups.find((backup) => backup.id === infoId) ?? null;

  useEffect(() => {
    setPage(1);
  }, [dateFilter, search, statusFilter, typeFilter]);

  useEffect(() => {
    if (!uploadedFile) {
      setVerifyProgress(0);
      return;
    }

    setVerifyProgress(8);
    const timer = window.setInterval(() => {
      setVerifyProgress((current) => {
        if (current >= 100) {
          window.clearInterval(timer);
          return 100;
        }
        return Math.min(100, current + 12);
      });
    }, 140);

    return () => window.clearInterval(timer);
  }, [uploadedFile]);

  useEffect(() => {
    if (!isRestoring) return;

    const timer = window.setInterval(() => {
      setRestoreProgress((current) => {
        if (current >= 100) {
          window.clearInterval(timer);
          setIsRestoring(false);
          setRestoreComplete(true);
          onBanner("Restore completed. This is a mockup and no live data was changed.");
          return 100;
        }
        return Math.min(100, current + 8);
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [isRestoring, onBanner]);

  function assignFile(file: File | null) {
    if (!file) {
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setSource("upload");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    assignFile(event.dataTransfer.files?.[0] ?? null);
  }

  function startRestore() {
    if (!acknowledged || !selected) return;
    setRestoreComplete(false);
    setRestoreProgress(6);
    setIsRestoring(true);
  }

  function resetWizard() {
    setStep(1);
    setAcknowledged(false);
    setIsRestoring(false);
    setRestoreProgress(0);
    setRestoreComplete(false);
  }

  return (
    <div className="space-y-4">
      <RestoreStepper currentStep={step} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <h3 className="text-base font-bold text-slate-900">Backup Selection Method</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SourceCard
                    selected={source === "existing"}
                    title="Select Existing Backup"
                    description="Choose from available system backups."
                    icon={<Database className="h-5 w-5" />}
                    onSelect={() => setSource("existing")}
                  />
                  <SourceCard
                    selected={source === "upload"}
                    title="Upload Backup"
                    description="Upload a backup file from your computer."
                    icon={<CloudUpload className="h-5 w-5" />}
                    onSelect={() => setSource("upload")}
                  />
                </div>
              </section>

              {source === "existing" ? (
                <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center">
                    <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 sm:max-w-sm">
                      <Search className="h-4 w-4 shrink-0" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search backups..."
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:flex">
                      <DropdownSelect
                        value={dateFilter}
                        onChange={(value) => setDateFilter(value)}
                        options={dateFilterOptions}
                        placeholder="All Dates"
                        allowClear
                        size="sm"
                        className="min-w-[8.5rem]"
                        aria-label="Filter by date"
                      />
                      <DropdownSelect
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(value)}
                        options={typeFilterOptions}
                        placeholder="All Types"
                        allowClear
                        size="sm"
                        className="min-w-[8.5rem]"
                        aria-label="Filter by type"
                      />
                      <DropdownSelect
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        options={statusFilterOptions}
                        placeholder="All Status"
                        allowClear
                        size="sm"
                        className="min-w-[8.5rem]"
                        aria-label="Filter by status"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          <th className="w-12 px-4 py-3" />
                          <th className="px-4 py-3">Backup Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Date & Time</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Storage Location</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((backup) => {
                          const disabled = backup.status !== "Success";
                          return (
                            <tr
                              key={backup.id}
                              onClick={() => {
                                if (!disabled) setSelectedId(backup.id);
                              }}
                              className={cx(
                                "border-b border-slate-100 last:border-0",
                                disabled ? "opacity-60" : "cursor-pointer hover:bg-slate-50",
                                selectedId === backup.id && source === "existing" ? "bg-blue-50/70" : "",
                              )}
                            >
                              <td className="px-4 py-3.5">
                                <span
                                  className={cx(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    selectedId === backup.id && !disabled
                                      ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)]"
                                      : "border-slate-300 bg-white",
                                  )}
                                >
                                  {selectedId === backup.id && !disabled ? (
                                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                  ) : null}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <BackupNameCell backup={backup} />
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
                                <BackupStatusLabel backup={backup} />
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-slate-800">{backup.storageName}</div>
                                <div className="text-xs text-slate-400">{backup.storageRegion}</div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="relative flex justify-end">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setInfoId((current) => (current === backup.id ? null : backup.id));
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                                    aria-label={`Backup details for ${backup.name}`}
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                  {infoBackup?.id === backup.id ? (
                                    <div className="absolute right-0 top-9 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                        Backup details
                                      </div>
                                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                                        <div>
                                          <span className="text-slate-400">ID:</span> {backup.backupId}
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Checksum:</span> {backup.checksum}
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Duration:</span> {backup.duration}
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Includes:</span> {backup.includedItems}
                                        </div>
                                      </div>
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

                  {filtered.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">
                      No backups match the current search or filters.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-500">
                        Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {filtered.length} backups
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
                                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition",
                                item === currentPage
                                  ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] shadow-[0_0_0_1px_var(--color-active-menu)]"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Upload Backup</h3>
                  <label
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                    className={cx(
                      "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      isDragging
                        ? "border-[var(--color-active-menu)] bg-blue-50/70"
                        : "border-blue-200 bg-slate-50/60 hover:border-[var(--color-active-menu)] hover:bg-blue-50/40",
                    )}
                  >
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                      <CloudUpload className="h-7 w-7" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      Drag & drop your backup file here or{" "}
                      <span className="text-[var(--color-active-menu)]">Browse Files</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Supported format: HINORA-BACKUP (.hbak). Maximum file size: 10 GB.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".hbak"
                      className="hidden"
                      onChange={(event) => {
                        assignFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </label>

                  {uploadedFile ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-success)]">
                          <FileCheck2 className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-slate-900">{uploadedFile.name}</div>
                          <div className="text-xs text-slate-400">{formatFileSize(uploadedFile.size)}</div>
                        </div>
                        {uploadVerified ? (
                          <Check className="h-5 w-5 text-[var(--color-success)]" strokeWidth={2.5} />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => assignFile(null)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Remove uploaded backup"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[var(--color-active-menu)]">
                          <span>
                            {uploadVerified ? "Backup integrity verified." : "Verifying backup integrity..."}
                          </span>
                          <span>{verifyProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-[var(--color-active-menu)] transition-all"
                            style={{ width: `${verifyProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-[var(--color-active-menu)]">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>The backup will be verified before you can proceed to restore.</p>
                  </div>
                </section>
              )}
            </>
          ) : null}

          {step === 2 ? (
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Configure Restore</h3>
              <p className="mt-1 text-sm text-slate-500">Choose what to restore and where it should be applied.</p>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-slate-700">Restore Type</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SourceCard
                    selected={restoreType === "full"}
                    title="Full Restore"
                    description="Replace the selected environment with this backup."
                    icon={<RotateCcw className="h-5 w-5" />}
                    onSelect={() => {
                      setRestoreType("full");
                      setIncludeDatabase(true);
                      setIncludeFiles(true);
                      setIncludeConfig(true);
                    }}
                  />
                  <SourceCard
                    selected={restoreType === "partial"}
                    title="Partial Restore"
                    description="Restore only the items you select below."
                    icon={<Database className="h-5 w-5" />}
                    onSelect={() => setRestoreType("partial")}
                  />
                </div>
              </div>

              <div className="mt-5 max-w-md">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Restore to Environment
                </label>
                <DropdownSelect
                  value={environment}
                  onChange={(value) => setEnvironment((value || "production") as RestoreEnvironment)}
                  options={environmentOptions}
                  aria-label="Restore to Environment"
                />
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-sm font-semibold text-slate-700">Include</div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeDatabase}
                    disabled={restoreType === "full"}
                    onChange={(event) => setIncludeDatabase(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  Database
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeFiles}
                    disabled={restoreType === "full"}
                    onChange={(event) => setIncludeFiles(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  Files
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeConfig}
                    disabled={restoreType === "full"}
                    onChange={(event) => setIncludeConfig(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                  />
                  Configurations
                </label>
              </div>

              <label className="mt-5 flex items-start gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={createSafetyBackup}
                  onChange={(event) => setCreateSafetyBackup(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                />
                Create a new backup automatically before restoration
              </label>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
              <h3 className="text-base font-bold text-slate-900">Confirm & Restore</h3>
              <p className="mt-1 text-sm text-slate-500">
                Review the restore plan. This mockup does not change live data.
              </p>

              {restoreComplete ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-success)]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-base font-bold text-slate-900">Restore completed</div>
                      <p className="mt-1 text-sm text-slate-600">
                        {selected?.name} was restored to{" "}
                        {environment === "production" ? "Production" : "Staging"}. No live data was changed.
                      </p>
                      <button
                        type="button"
                        onClick={resetWizard}
                        className="mt-4 inline-flex h-10 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                      >
                        Restore another backup
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
                    <SummaryRow label="Backup">{selected?.name ?? "None selected"}</SummaryRow>
                    <SummaryRow label="Restore Type">
                      {restoreType === "full" ? "Full Restore" : "Partial Restore"}
                    </SummaryRow>
                    <SummaryRow label="Environment">
                      {environment === "production" ? "Production" : "Staging"}
                    </SummaryRow>
                    <SummaryRow label="Include">{includeLabel}</SummaryRow>
                    <SummaryRow label="Safety backup">
                      {createSafetyBackup ? "Create before restore" : "Skipped"}
                    </SummaryRow>
                  </dl>

                  {isRestoring ? (
                    <div className="mt-5">
                      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-[var(--color-active-menu)]">
                        <span>Restoring data...</span>
                        <span>{restoreProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                        <div
                          className="h-full rounded-full bg-[var(--color-active-menu)] transition-all"
                          style={{ width: `${restoreProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <label className="mt-5 flex items-start gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                      />
                      I understand this will replace current data in the selected environment.
                    </label>
                  )}
                </>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h3 className="text-base font-bold text-slate-900">Restore Summary</h3>

            {selected ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-success)]">
                    <Database className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{selected.name}</div>
                    <div className="text-xs text-slate-500">
                      {selected.type === "Full" ? "Full Backup" : "Incremental Backup"}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[var(--color-success)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                    Success
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="text-slate-600">
                    {selected.dateLabel}{" "}
                    <span className="text-slate-400">(UTC+08:00) by {selected.createdBy}</span>
                  </div>
                  <div className="font-semibold text-slate-800">{selected.size}</div>
                  <div className="text-slate-500">
                    {selected.storageName}, {selected.storageRegion}
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select a backup to continue.</p>
            )}

            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Restore Options</div>
              <dl className="mt-2 divide-y divide-slate-100">
                <SummaryRow label="Restore Type">
                  {restoreType === "full" ? "Full Restore" : "Partial Restore"}
                </SummaryRow>
                <SummaryRow label="Restore to Environment">
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-600">
                    {environment === "production" ? "Production" : "Staging"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Include">{includeLabel}</SummaryRow>
              </dl>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                This action will replace all current data in the selected environment.
                {createSafetyBackup
                  ? " A new backup will be created automatically before restoration."
                  : " A safety backup will not be created."}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {step > 1 && !restoreComplete ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
              ) : null}
              {step === 1 ? (
                <button
                  type="button"
                  disabled={!canContinueFromStep1}
                  onClick={() => setStep(2)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Configure Restore
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              {step === 2 ? (
                <button
                  type="button"
                  disabled={!includeDatabase && !includeFiles && !includeConfig}
                  onClick={() => setStep(3)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue to Confirm
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
              {step === 3 && !restoreComplete ? (
                <button
                  type="button"
                  disabled={!acknowledged || isRestoring}
                  onClick={startRestore}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRestoring ? "Restoring..." : "Start Restore"}
                </button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
