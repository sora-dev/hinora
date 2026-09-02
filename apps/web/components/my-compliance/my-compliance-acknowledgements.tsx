"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FilePenLine,
  Filter,
  Loader2,
  Search,
  Shield,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  acknowledgePolicy,
  formatComplianceDate,
  type MyComplianceTask,
} from "./my-compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type StatusChip = "all" | "pending" | "acknowledged" | "overdue";
type DocumentTypeFilter = "" | "POLICY" | "GUIDELINE" | "PROCEDURE";

const ACK_STEPS = [
  "Read the policy document.",
  "Confirm your understanding.",
  "Provide your electronic acknowledgement.",
];

function matchesChip(task: MyComplianceTask, chip: StatusChip) {
  if (chip === "all") return true;
  if (chip === "acknowledged") return task.status === "COMPLETED";
  if (chip === "overdue") return task.status === "OVERDUE";
  return task.status !== "COMPLETED" && task.status !== "OVERDUE";
}

function documentTypeLabel(value?: string) {
  if (value === "GUIDELINE") return "Guideline";
  if (value === "PROCEDURE") return "Procedure";
  if (value === "AGREEMENT") return "Agreement";
  return "Policy";
}

function dueTone(task: MyComplianceTask) {
  if (task.status === "OVERDUE") return "text-[var(--color-error)]";
  if (task.status === "COMPLETED") return "text-[var(--color-success)]";
  if (task.status === "DUE_SOON") return "text-[var(--color-warning)]";
  return "text-slate-500";
}

function listStatusLabel(task: MyComplianceTask) {
  if (task.status === "COMPLETED") return "Acknowledged";
  if (task.status === "OVERDUE") return "Overdue";
  return task.dueLabel.replace(/\s*\(.*\)$/, "");
}

function detailStatusLabel(task: MyComplianceTask) {
  if (task.status === "COMPLETED") return "Acknowledged";
  if (task.status === "OVERDUE") return "Overdue";
  return "Pending";
}

function statusBadgeClass(task: MyComplianceTask) {
  if (task.status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (task.status === "OVERDUE") return "bg-red-50 text-[var(--color-error)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

function taskIcon(task: MyComplianceTask) {
  if (task.status === "COMPLETED") {
    return { Icon: CheckCircle2, tone: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (task.status === "OVERDUE") {
    return { Icon: FileCheck, tone: "bg-red-50 text-[var(--color-error)]" };
  }
  if (task.status === "DUE_SOON") {
    return { Icon: FilePenLine, tone: "bg-orange-50 text-[var(--color-warning)]" };
  }
  return { Icon: Shield, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
}

function useIsXl() {
  const [isXl, setIsXl] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsXl(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return isXl;
}

export default function MyComplianceAcknowledgements({
  tasks,
  selectedPolicyId,
  onSelectPolicy,
  onAcknowledged,
}: {
  tasks: MyComplianceTask[];
  selectedPolicyId: string | null;
  onSelectPolicy: (policyId: string | null) => void;
  onAcknowledged: () => Promise<void> | void;
}) {
  const isXl = useIsXl();
  const [chip, setChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("");
  const [sortBy, setSortBy] = useState("due");
  const didAutoSelect = useRef(false);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((task) => task.status !== "COMPLETED" && task.status !== "OVERDUE").length,
      acknowledged: tasks.filter((task) => task.status === "COMPLETED").length,
      overdue: tasks.filter((task) => task.status === "OVERDUE").length,
    }),
    [tasks],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (!matchesChip(task, chip)) return false;
        if (typeFilter && (task.documentType ?? "POLICY") !== typeFilter) return false;
        if (
          query &&
          !task.title.toLowerCase().includes(query) &&
          !(task.policyTitle ?? "").toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.title.localeCompare(right.title);
        if (sortBy === "status") return left.status.localeCompare(right.status);
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
      });
  }, [chip, search, sortBy, tasks, typeFilter]);

  const selected = useMemo(
    () => tasks.find((task) => task.policyId === selectedPolicyId) ?? null,
    [selectedPolicyId, tasks],
  );

  useEffect(() => {
    if (!isXl || didAutoSelect.current) return;
    if (selectedPolicyId && tasks.some((task) => task.policyId === selectedPolicyId)) {
      didAutoSelect.current = true;
      return;
    }
    if (filtered[0]) {
      didAutoSelect.current = true;
      onSelectPolicy(filtered[0].policyId);
    }
  }, [filtered, isXl, onSelectPolicy, selectedPolicyId, tasks]);

  const showList = isXl || !selected;
  const showDetail = Boolean(selected) && (isXl || Boolean(selectedPolicyId));

  return (
    <div className="flex min-w-0 flex-wrap gap-4">
      {showList ? (
        <section className="min-w-0 flex-[1.15] basis-[min(100%,28rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] xl:p-5">
          <h2 className="text-lg font-extrabold text-slate-900">Acknowledgements</h2>
          <p className="mt-1 text-sm text-slate-500">Review and acknowledge the policies assigned to you.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: `All (${counts.all})` },
                { id: "pending", label: `Pending (${counts.pending})` },
                { id: "acknowledged", label: `Acknowledged (${counts.acknowledged})` },
                { id: "overdue", label: `Overdue (${counts.overdue})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChip(item.id)}
                className={cx(
                  "inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold",
                  chip === item.id
                    ? "bg-[var(--color-active-menu)] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search acknowledgements..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownSelect
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as DocumentTypeFilter)}
                options={[
                  { value: "POLICY", label: "Policy" },
                  { value: "GUIDELINE", label: "Guideline" },
                  { value: "PROCEDURE", label: "Procedure" },
                ]}
                placeholder="All Types"
                allowClear
                size="sm"
                className="min-w-0 flex-1"
              />
              <DropdownSelect
                value={sortBy}
                onChange={(value) => setSortBy(value || "due")}
                options={[
                  { value: "due", label: "Sort by: Due Date" },
                  { value: "title", label: "Sort by: Title" },
                  { value: "status", label: "Sort by: Status" },
                ]}
                allowClear={false}
                size="sm"
                className="min-w-0 flex-1"
              />
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                <Filter className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No acknowledgements here"
                description="Policies assigned to you will appear here for review and acknowledgement."
                className="py-10"
              />
            ) : (
              filtered.map((task) => {
                const active = task.policyId === selected?.policyId;
                const icon = taskIcon(task);
                const Icon = icon.Icon;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectPolicy(task.policyId)}
                    className={cx(
                      "flex w-full min-w-0 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-[var(--color-active-menu)] bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <span
                      className={cx(
                        "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        icon.tone,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{task.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {task.policyTitle ?? "Assigned policy"}
                        {task.policyVersion ? ` ${task.policyVersion}` : ""}
                      </span>
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                        {documentTypeLabel(task.documentType)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cx("text-xs font-bold", dueTone(task))}>{listStatusLabel(task)}</span>
                      <span className="text-[0.68rem] text-slate-400">
                        {task.status === "COMPLETED" && task.completedAt
                          ? formatComplianceDate(task.completedAt)
                          : formatComplianceDate(task.dueAt)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} acknowledgements
          </div>
        </section>
      ) : null}

      {showDetail && selected ? (
        <AcknowledgementDetail
          task={selected}
          onClose={() => onSelectPolicy(null)}
          onAcknowledged={onAcknowledged}
        />
      ) : isXl ? (
        <section className="flex min-w-0 flex-1 basis-[min(100%,22rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6">
          <EmptyState
            icon={FileCheck}
            title="Select an acknowledgement"
            description="Choose a policy from the list to review details and acknowledge it."
          />
        </section>
      ) : null}
    </div>
  );
}

function acknowledgeBlockReason(task: MyComplianceTask) {
  if (task.requirePassToAcknowledge && !task.assessmentPassed) {
    return "Pass the assessment for this policy before you can acknowledge it.";
  }
  if (!task.readingComplete) {
    return "Read the policy in full before you can acknowledge it.";
  }
  return null;
}

function AcknowledgementDetail({
  task,
  onClose,
  onAcknowledged,
}: {
  task: MyComplianceTask;
  onClose: () => void;
  onAcknowledged: () => Promise<void> | void;
}) {
  const icon = taskIcon(task);
  const Icon = icon.Icon;
  const acknowledged = task.status === "COMPLETED";
  const blockReason = acknowledged ? null : acknowledgeBlockReason(task);
  const [modalOpen, setModalOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setModalOpen(false);
    setAgreed(false);
    setError("");
  }, [task.id]);

  async function confirmAcknowledge() {
    if (!agreed) return;
    setSubmitting(true);
    setError("");
    try {
      await acknowledgePolicy(task.policyId);
      setModalOpen(false);
      await onAcknowledged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to acknowledge this policy.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 flex-1 basis-[min(100%,22rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full", icon.tone)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">{task.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>
                {task.policyTitle ?? "Assigned policy"}
                {task.policyVersion ? ` ${task.policyVersion}` : ""}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                {documentTypeLabel(task.documentType)}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          aria-label="Close acknowledgement details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        {[
          {
            label: "Due Date",
            value: (
              <span className={dueTone(task)}>
                {formatComplianceDate(task.dueAt)}
                <span className="ml-1 font-semibold">({listStatusLabel(task)})</span>
              </span>
            ),
            Icon: CalendarClock,
          },
          {
            label: "Policy Owner",
            value: task.department?.trim() || "Compliance Department",
            Icon: Building2,
          },
          {
            label: "Assigned On",
            value: task.assignedAt ? formatComplianceDate(task.assignedAt) : "—",
            Icon: CalendarClock,
          },
          {
            label: "Policy Version",
            value: task.policyVersion ?? "—",
            Icon: FileCheck,
          },
          {
            label: "Status",
            value: (
              <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", statusBadgeClass(task))}>
                {detailStatusLabel(task)}
              </span>
            ),
            Icon: Shield,
          },
          {
            label: "Acknowledgement Type",
            value: "Electronic",
            Icon: FilePenLine,
          },
          {
            label: "Required",
            value: "Yes",
            Icon: CheckCircle2,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-2 font-medium text-slate-500">
              <row.Icon className="h-4 w-4 text-slate-400" />
              {row.label}
            </dt>
            <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">About this Policy</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {task.description?.trim() ||
            `Review ${task.policyTitle ?? "this policy"} and confirm that you understand and will follow it.`}
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">What you need to do</h3>
        <ol className="mt-3 space-y-2">
          {(
            task.requirePassToAcknowledge
              ? [
                  "Read the policy document.",
                  "Pass the required assessment.",
                  "Provide your electronic acknowledgement.",
                ]
              : ACK_STEPS
          ).map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm text-slate-600">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[var(--color-active-menu)]">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 space-y-2">
        <Link
          href={task.href}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
        >
          Review Policy
          <ArrowRight className="h-4 w-4" />
        </Link>
        {acknowledged ? (
          <div className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-[var(--color-success)]">
            <CheckCircle2 className="h-4 w-4" />
            Acknowledged
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={Boolean(blockReason)}
              title={blockReason ?? "Acknowledge this policy"}
              onClick={() => setModalOpen(true)}
              className={cx(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold",
                blockReason
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] hover:bg-blue-50",
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Acknowledge
            </button>
            {blockReason ? <p className="text-xs font-medium text-slate-500">{blockReason}</p> : null}
          </>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-3 sm:items-center sm:justify-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="acknowledge-policy-title"
            className="w-full max-w-lg rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="acknowledge-policy-title" className="text-lg font-extrabold text-slate-900">
                  Acknowledge this policy
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {task.policyTitle ?? "Assigned policy"}
                  {task.policyVersion ? ` ${task.policyVersion}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close acknowledgement dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              By acknowledging, I confirm that I have read{" "}
              <span className="font-semibold text-slate-800">{task.policyTitle ?? "this policy"}</span>
              {task.policyVersion ? ` ${task.policyVersion}` : ""}. I understand my responsibilities under this
              policy and agree to follow it in my work. I understand that this electronic acknowledgement is
              recorded for compliance purposes.
            </p>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
              />
              <span>I understand this policy and agree to comply with it.</span>
            </label>

            {error ? <p className="mt-3 text-sm font-medium text-[var(--color-error)]">{error}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreed || submitting}
                onClick={() => void confirmAcknowledge()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                I Acknowledge
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
