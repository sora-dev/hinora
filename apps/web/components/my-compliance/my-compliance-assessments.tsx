"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Filter,
  Repeat,
  Search,
  Target,
  Timer,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  formatComplianceDate,
  taskStatusLabel,
  type MyComplianceTask,
  type MyTaskPriority,
} from "./my-compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const DEFAULT_INSTRUCTIONS = [
  "Read each question carefully before answering.",
  "You can flag questions to review later.",
  "Your answers are saved automatically.",
  "You can navigate between questions.",
  "Submit when you are ready to finish.",
];

type StatusChip = "all" | "notStarted" | "inProgress" | "completed" | "overdue";

function matchesChip(task: MyComplianceTask, chip: StatusChip) {
  if (chip === "all") return true;
  if (chip === "notStarted") return task.status === "OPEN";
  if (chip === "inProgress") return task.status === "IN_PROGRESS" || task.status === "DUE_SOON";
  if (chip === "completed") return task.status === "COMPLETED";
  return task.status === "OVERDUE";
}

function priorityLabel(priority: MyTaskPriority) {
  if (priority === "HIGH") return "High";
  if (priority === "LOW") return "Low";
  return "Medium";
}

function dueTone(task: MyComplianceTask) {
  if (task.status === "OVERDUE") return "text-[var(--color-error)]";
  if (task.status === "DUE_SOON") return "text-[var(--color-error)]";
  if (task.status === "COMPLETED") return "text-[var(--color-success)]";
  return "text-slate-500";
}

function dueListLabel(task: MyComplianceTask) {
  if (task.status === "COMPLETED") return "Completed";
  return task.dueLabel.replace(/\s*\(.*\)$/, "");
}

function instructionItems(task: MyComplianceTask | null) {
  const raw = task?.instructions?.split(/\n+|•|;/).map((item) => item.trim()).filter(Boolean) ?? [];
  return raw.length > 0 ? raw : DEFAULT_INSTRUCTIONS;
}

function Donut({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const size = 132;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-active-menu)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-extrabold text-slate-900">{clamped}%</div>
        <div className="text-[0.68rem] font-semibold text-slate-500">{label}</div>
      </div>
    </div>
  );
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

export default function MyComplianceAssessments({
  tasks,
  selectedPolicyId,
  onSelectPolicy,
}: {
  tasks: MyComplianceTask[];
  selectedPolicyId: string | null;
  onSelectPolicy: (policyId: string | null) => void;
}) {
  const isXl = useIsXl();
  const [chip, setChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | MyTaskPriority>("");
  const [sortBy, setSortBy] = useState("due");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const didAutoSelect = useRef(false);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      notStarted: tasks.filter((task) => task.status === "OPEN").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS" || task.status === "DUE_SOON").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
      overdue: tasks.filter((task) => task.status === "OVERDUE").length,
    }),
    [tasks],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (!matchesChip(task, chip)) return false;
        if (priorityFilter && task.priority !== priorityFilter) return false;
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
        if (sortBy === "priority") {
          const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          return rank[left.priority] - rank[right.priority];
        }
        if (sortBy === "title") return left.title.localeCompare(right.title);
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
      });
  }, [chip, priorityFilter, search, sortBy, tasks]);

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
        <section className="min-w-0 flex-1 basis-[min(100%,16rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] xl:p-5">
          <h2 className="text-lg font-extrabold text-slate-900">Assessments</h2>
          <p className="mt-1 text-sm text-slate-500">Take and manage your policy assessments.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: `All (${counts.all})` },
                { id: "notStarted", label: `Not Started (${counts.notStarted})` },
                { id: "inProgress", label: `In Progress (${counts.inProgress})` },
                { id: "completed", label: `Completed (${counts.completed})` },
                { id: "overdue", label: `Overdue (${counts.overdue})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChip(item.id)}
                className={cx(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold",
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
                placeholder="Search assessments..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownSelect
                value={priorityFilter}
                onChange={(value) => setPriorityFilter(value as "" | MyTaskPriority)}
                options={[
                  { value: "HIGH", label: "High" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "LOW", label: "Low" },
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
                  { value: "priority", label: "Sort by: Priority" },
                  { value: "title", label: "Sort by: Title" },
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
                icon={ClipboardCheck}
                title="No assessments here"
                description="Published assessments for your assigned policies will appear in this list."
                className="py-10"
              />
            ) : (
              filtered.map((task) => {
                const active = task.policyId === selected?.policyId;
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
                    <span className="relative mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                      <CalendarClock className="h-5 w-5" />
                      <span
                        className={cx(
                          "absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold",
                          task.priority === "HIGH"
                            ? "bg-red-50 text-[var(--color-error)]"
                            : task.priority === "LOW"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-[var(--color-warning)]",
                        )}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{task.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {task.policyTitle ?? "Assigned policy"}
                        {task.policyVersion ? ` ${task.policyVersion}` : ""}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[0.68rem] font-semibold text-slate-500">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[var(--color-active-menu)]">
                          Assessment
                        </span>
                        {task.questionCount != null ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">{task.questionCount} Questions</span>
                        ) : null}
                        {task.passingScore != null ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            Passing Score: {task.passingScore}%
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cx("text-xs font-bold", dueTone(task))}>{dueListLabel(task)}</span>
                      <span className="text-[0.68rem] text-slate-400">{formatComplianceDate(task.dueAt)}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} assessments
          </div>
        </section>
      ) : null}

      {showDetail && selected ? (
        <section className="min-w-0 flex-[1.2] basis-[min(100%,20rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">{selected.title}</h2>
                <span
                  className={cx(
                    "inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                    selected.priority === "HIGH"
                      ? "bg-red-50 text-[var(--color-error)]"
                      : selected.priority === "LOW"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-50 text-[var(--color-warning)]",
                  )}
                >
                  {priorityLabel(selected.priority)} Priority
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>
                  {selected.policyTitle ?? "Assigned policy"}
                  {selected.policyVersion ? ` ${selected.policyVersion}` : ""}
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                  Assessment
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectPolicy(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Close assessment details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            {[
              {
                label: "Total Questions",
                value: selected.questionCount ?? 0,
                Icon: CircleHelp,
              },
              {
                label: "Passing Score",
                value: `${selected.passingScore ?? 80}%`,
                Icon: Target,
              },
              {
                label: "Attempts Allowed",
                value:
                  selected.maximumAttempts === 0 || selected.maximumAttempts == null
                    ? "Unlimited"
                    : selected.maximumAttempts,
                Icon: Repeat,
              },
              {
                label: "Time Limit",
                value:
                  selected.timeLimitMinutes === 0 || selected.timeLimitMinutes == null
                    ? "No time limit"
                    : `${selected.timeLimitMinutes} minutes`,
                Icon: Timer,
              },
              {
                label: "Due Date",
                value: (
                  <span className={dueTone(selected)}>
                    {formatComplianceDate(selected.dueAt)}
                    <span className="ml-2 font-semibold">({dueListLabel(selected)})</span>
                  </span>
                ),
                Icon: CalendarClock,
              },
              {
                label: "Status",
                value: (
                  <span
                    className={cx(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                      selected.status === "COMPLETED"
                        ? "bg-emerald-50 text-[var(--color-success)]"
                        : selected.status === "OVERDUE"
                          ? "bg-red-50 text-[var(--color-error)]"
                          : selected.status === "OPEN"
                            ? "bg-amber-50 text-[var(--color-warning)]"
                            : "bg-blue-50 text-[var(--color-active-menu)]",
                    )}
                  >
                    {taskStatusLabel(selected)}
                  </span>
                ),
                Icon: AlertTriangle,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 font-medium text-slate-500">
                  <row.Icon className="h-4 w-4 text-slate-400" />
                  {row.label}
                </dt>
                <dd className="font-semibold text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">Description</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {selected.description?.trim() ||
                `This assessment confirms your understanding of ${selected.policyTitle ?? "the assigned policy"}. You must reach the passing score before this policy counts as complete.`}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <Link
              href={`/employee/assessments/${selected.policyId}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
            >
              {selected.actionLabel}
              {selected.actionLabel !== "View Results" ? <ArrowRight className="h-4 w-4" /> : null}
            </Link>
            <Link
              href={`/employee/policy-library/${selected.policyId}`}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-[var(--color-active-menu)] hover:bg-slate-50"
            >
              View Policy
            </Link>
          </div>
        </section>
      ) : isXl ? (
        <section className="flex min-w-0 flex-[1.2] basis-[min(100%,20rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6">
          <EmptyState
            icon={ClipboardCheck}
            title="Select an assessment"
            description="Choose an assessment from the list to review details, instructions, and your attempt history."
          />
        </section>
      ) : null}

      <aside className="min-w-0 w-full basis-full space-y-4 xl:w-[280px] xl:flex-none xl:basis-[280px] 2xl:w-[320px] 2xl:basis-[320px]">
        <div className="xl:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[var(--color-active-menu)]"
          >
            {sidebarOpen ? "Hide Assessment Summary" : "View Assessment Summary"}
            <ChevronDown className={cx("h-4 w-4 transition", sidebarOpen && "rotate-180")} />
          </button>
        </div>

        <div className={cx("space-y-4", sidebarOpen ? "block" : "hidden xl:block")}>
          <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <h3 className="text-sm font-bold text-slate-900">Instructions</h3>
            <ul className="mt-3 space-y-2.5">
              {instructionItems(selected).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900">Your Progress</h3>
            <div className="mt-4 flex justify-center">
              <Donut
                value={selected?.progressPct ?? 0}
                label={selected ? taskStatusLabel(selected) : "Not Started"}
              />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Questions Answered</dt>
                <dd className="font-semibold text-slate-900">
                  {selected?.status === "COMPLETED" ? selected.questionCount ?? 0 : 0} / {selected?.questionCount ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Time Spent</dt>
                <dd className="font-semibold text-slate-900">0 min</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Average Score</dt>
                <dd className="font-semibold text-slate-900">
                  {selected?.attempts && selected.attempts.length > 0
                    ? `${Math.round(selected.attempts.reduce((sum, attempt) => sum + attempt.score, 0) / selected.attempts.length)}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Assessment History</h3>
              <span className="text-xs font-semibold text-[var(--color-active-menu)]">View all</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2 font-semibold">Attempt</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Score</th>
                    <th className="pb-2 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected?.attempts ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No attempts yet.
                      </td>
                    </tr>
                  ) : (
                    (selected?.attempts ?? []).map((attempt) => (
                      <tr key={attempt.id} className="border-t border-slate-100">
                        <td className="py-2 font-semibold text-slate-800">{attempt.attempt}</td>
                        <td className="py-2 text-slate-600">{formatComplianceDate(attempt.submittedAt)}</td>
                        <td className="py-2 font-semibold text-slate-800">{attempt.score}%</td>
                        <td className={cx("py-2 font-bold", attempt.passed ? "text-[var(--color-success)]" : "text-[var(--color-error)]")}>
                          {attempt.passed ? "Passed" : "Failed"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </aside>
    </div>
  );
}
