"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck,
  Filter,
  ListTodo,
  Search,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import MyComplianceAcknowledgements from "./my-compliance-acknowledgements";
import MyComplianceAssessments from "./my-compliance-assessments";
import MyComplianceCertificates from "./my-compliance-certificates";
import {
  exportMyComplianceCsv,
  fetchMyCompliance,
  MY_COMPLIANCE_TABS,
  parseMyComplianceTab,
  sharePct,
  taskStatusLabel,
  type MyCompliancePayload,
  type MyComplianceTab,
  type MyComplianceTask,
  type MyTaskPriority,
  type MyTaskStatus,
  type MyTaskType,
} from "./my-compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusBadge(task: MyComplianceTask) {
  if (task.status === "COMPLETED") {
    return { label: taskStatusLabel(task), className: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (task.status === "OVERDUE") {
    return { label: "Overdue", className: "bg-red-50 text-[var(--color-error)]" };
  }
  if (task.status === "IN_PROGRESS" || task.status === "DUE_SOON") {
    return { label: "In Progress", className: "bg-amber-50 text-[var(--color-warning)]" };
  }
  return { label: "Not Started", className: "bg-slate-100 text-slate-600" };
}

function taskIcon(task: MyComplianceTask): { Icon: LucideIcon; tone: string } {
  if (task.status === "COMPLETED") {
    return { Icon: CheckCircle2, tone: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (task.status === "OVERDUE" || task.priority === "HIGH") {
    return {
      Icon: task.type === "assessment" ? ClipboardCheck : FileCheck,
      tone: "bg-red-50 text-[var(--color-error)]",
    };
  }
  if (task.type === "assessment") {
    return { Icon: ClipboardCheck, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
  }
  return { Icon: FileCheck, tone: "bg-amber-50 text-[var(--color-warning)]" };
}

function dueTone(status: MyTaskStatus) {
  if (status === "OVERDUE") return "text-[var(--color-error)]";
  if (status === "DUE_SOON") return "text-[var(--color-warning)]";
  if (status === "COMPLETED") return "text-slate-500";
  return "text-slate-600";
}

function DonutChart({
  value,
  size = 148,
  strokeWidth = 16,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
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
        <div className="text-3xl font-extrabold text-slate-900">{clamped}%</div>
        <div className="text-[0.7rem] font-semibold text-slate-500">Compliant</div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: MyComplianceTask }) {
  const badge = statusBadge(task);
  const icon = taskIcon(task);
  const Icon = icon.Icon;
  const meta = [
    task.type === "assessment" ? "Assessment" : "Acknowledgement",
    task.questionCount ? `${task.questionCount} Questions` : null,
    task.passingScore != null ? `Passing Score: ${task.passingScore}%` : null,
    task.status === "COMPLETED" && task.score != null ? `Score: ${task.score}%` : null,
  ].filter(Boolean);
  const primary = task.actionLabel === "Start Assessment" || task.actionLabel === "Acknowledge";

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", icon.tone)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold break-words text-slate-900">{task.title}</h3>
              <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold", badge.className)}>
                {badge.label}
                {task.status !== "COMPLETED" &&
                (task.status === "IN_PROGRESS" || task.status === "DUE_SOON") &&
                task.progressPct > 0
                  ? ` (${task.progressPct}%)`
                  : null}
              </span>
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">{meta.join(" • ")}</div>
            <div className={cx("mt-2 text-xs font-semibold", dueTone(task.status))}>{task.dueLabel}</div>
            {task.status !== "COMPLETED" && task.progressPct > 0 ? (
              <div className="mt-3 max-w-xs">
                <div className="mb-1 text-[0.7rem] font-bold text-slate-600">{task.progressPct}% complete</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--color-active-menu)]"
                    style={{ width: `${task.progressPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <Link
          href={task.href}
          className={cx(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-bold",
            primary
              ? "bg-[var(--color-active-menu)] text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
              : "border border-slate-200 bg-white text-[var(--color-active-menu)] hover:bg-slate-50",
          )}
        >
          {task.actionLabel}
        </Link>
      </div>
    </article>
  );
}

function OverviewDashboard({ data }: { data: MyCompliancePayload }) {
  const { summary } = data;

  return (
    <div className="min-w-0 space-y-4">
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          {
            label: "Total Assignments",
            value: summary.policyCount,
            hint: "Policies assigned to you",
            Icon: ListTodo,
            tone: "bg-blue-50 text-[var(--color-active-menu)]",
          },
          {
            label: "Completed",
            value: summary.completed,
            hint: "On track",
            Icon: CheckCircle2,
            tone: "bg-emerald-50 text-[var(--color-success)]",
          },
          {
            label: "In Progress",
            value: summary.inProgress,
            hint: "Due soon",
            Icon: Clock3,
            tone: "bg-amber-50 text-[var(--color-warning)]",
          },
          {
            label: "Overdue",
            value: summary.overdue,
            hint: "Requires attention",
            Icon: AlertTriangle,
            tone: "bg-red-50 text-[var(--color-error)]",
          },
        ].map((card) => (
          <article
            key={card.label}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">{card.label}</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</div>
                <div className="mt-1 text-[0.7rem] font-medium text-slate-400">{card.hint}</div>
              </div>
              <span className={cx("inline-flex h-10 w-10 items-center justify-center rounded-xl", card.tone)}>
                <card.Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900">Overall Compliance Score</h3>
          <div className="mt-4 flex justify-center">
            <DonutChart value={summary.compliantPct} />
          </div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900">Upcoming Deadlines</h3>
          {data.upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No upcoming deadlines.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {data.upcoming.map((item) => (
                <li key={item.id} className="min-w-0 space-y-1 text-sm">
                  <span className="block font-semibold break-words text-slate-800">{item.title}</span>
                  <span className={cx("block text-xs font-semibold break-words", dueTone(item.status))}>
                    {item.dueLabel}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900">Compliance Summary</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              {
                label: "On Track",
                count: summary.completed,
                pct: sharePct(summary.completed, summary.total),
                tone: "bg-[var(--color-success)]",
              },
              {
                label: "In Progress",
                count: summary.inProgress,
                pct: sharePct(summary.inProgress, summary.total),
                tone: "bg-[var(--color-warning)]",
              },
              {
                label: "Overdue",
                count: summary.overdue,
                pct: sharePct(summary.overdue, summary.total),
                tone: "bg-[var(--color-error)]",
              },
              {
                label: "Completed This Month",
                count: summary.completedThisMonth,
                pct: sharePct(summary.completedThisMonth, summary.total),
                tone: "bg-[var(--color-active-menu)]",
              },
            ].map((item) => (
              <li key={item.label} className="flex min-w-0 items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-600">
                  <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", item.tone)} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-800">
                  {item.count} <span className="text-slate-400">({item.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function TaskFilters({
  tab,
  counts,
  search,
  typeFilter,
  priorityFilter,
  sortBy,
  hideTypeFilter,
  onTab,
  onSearch,
  onType,
  onPriority,
  onSort,
}: {
  tab: "all" | "dueSoon" | "overdue" | "completed";
  counts: { all: number; dueSoon: number; overdue: number; completed: number };
  search: string;
  typeFilter: "" | MyTaskType;
  priorityFilter: "" | MyTaskPriority;
  sortBy: string;
  hideTypeFilter?: boolean;
  onTab: (tab: "all" | "dueSoon" | "overdue" | "completed") => void;
  onSearch: (value: string) => void;
  onType: (value: "" | MyTaskType) => void;
  onPriority: (value: "" | MyTaskPriority) => void;
  onSort: (value: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: `All Tasks (${counts.all})` },
            { id: "dueSoon", label: `Due Soon (${counts.dueSoon})` },
            { id: "overdue", label: `Overdue (${counts.overdue})` },
            { id: "completed", label: "Completed" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cx(
              "inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold",
              tab === item.id
                ? "bg-[var(--color-active-menu)] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search tasks..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {hideTypeFilter ? null : (
            <DropdownSelect
              value={typeFilter}
              onChange={(value) => onType(value as "" | MyTaskType)}
              options={[
                { value: "assessment", label: "Assessment" },
                { value: "acknowledgement", label: "Acknowledgement" },
              ]}
              placeholder="All Types"
              allowClear
              size="sm"
              className="w-full min-w-0 sm:w-40"
            />
          )}
          <DropdownSelect
            value={priorityFilter}
            onChange={(value) => onPriority(value as "" | MyTaskPriority)}
            options={[
              { value: "HIGH", label: "High" },
              { value: "MEDIUM", label: "Medium" },
              { value: "LOW", label: "Low" },
            ]}
            placeholder="All Priorities"
            allowClear
            size="sm"
            className="w-full min-w-0 sm:w-40"
          />
          <DropdownSelect
            value={sortBy}
            onChange={(value) => onSort(value || "due")}
            options={[
              { value: "due", label: "Sort by: Due Date" },
              { value: "priority", label: "Sort by: Priority" },
              { value: "title", label: "Sort by: Title" },
            ]}
            allowClear={false}
            size="sm"
            className="w-full min-w-0 sm:w-44"
          />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
            <Filter className="h-4 w-4" />
          </span>
        </div>
      </div>
    </>
  );
}

function MyComplianceBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseMyComplianceTab(searchParams.get("tab"));
  const [data, setData] = useState<MyCompliancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chip, setChip] = useState<"all" | "dueSoon" | "overdue" | "completed">("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | MyTaskType>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | MyTaskPriority>("");
  const [sortBy, setSortBy] = useState("due");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchMyCompliance()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load compliance.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setChip("all");
    setSearch("");
    setTypeFilter("");
    setPriorityFilter("");
    setSortBy("due");
  }, [view]);

  function setView(next: MyComplianceTab) {
    const href = next === "overview" ? "/employee/compliance" : `/employee/compliance?tab=${next}`;
    router.replace(href, { scroll: false });
  }

  const selectedPolicyId = searchParams.get("policyId");
  const selectedCertificateId = searchParams.get("certificateId");

  function setSelectedPolicy(tab: "assessments" | "acknowledgements", policyId: string | null) {
    if (!policyId) {
      router.replace(`/employee/compliance?tab=${tab}`, { scroll: false });
      return;
    }
    router.replace(`/employee/compliance?tab=${tab}&policyId=${policyId}`, { scroll: false });
  }

  function setSelectedCertificate(certificateId: string | null) {
    if (!certificateId) {
      router.replace("/employee/compliance?tab=certificates", { scroll: false });
      return;
    }
    router.replace(`/employee/compliance?tab=certificates&certificateId=${certificateId}`, { scroll: false });
  }

  const scopedTasks = useMemo(() => {
    if (!data) return [];
    if (view === "assessments") return data.tasks.filter((task) => task.type === "assessment");
    if (view === "acknowledgements") return data.tasks.filter((task) => task.type === "acknowledgement");
    return data.tasks;
  }, [data, view]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = scopedTasks.filter((task) => {
      if (chip === "dueSoon" && task.status !== "DUE_SOON") return false;
      if (chip === "overdue" && task.status !== "OVERDUE") return false;
      if (chip === "completed" && task.status !== "COMPLETED") return false;
      if (typeFilter && task.type !== typeFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (query && !task.title.toLowerCase().includes(query)) return false;
      return true;
    });
    return rows.sort((left, right) => {
      if (sortBy === "priority") {
        const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return rank[left.priority] - rank[right.priority];
      }
      if (sortBy === "title") return left.title.localeCompare(right.title);
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });
  }, [chip, priorityFilter, scopedTasks, search, sortBy, typeFilter]);

  const counts = useMemo(
    () => ({
      all: scopedTasks.length,
      dueSoon: scopedTasks.filter((task) => task.status === "DUE_SOON").length,
      overdue: scopedTasks.filter((task) => task.status === "OVERDUE").length,
      completed: scopedTasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [scopedTasks],
  );

  return (
    <DashboardShell
      variant="employee"
      searchPlaceholder="Search policies, documents, users, or ask Hinora..."
    >
      <div className="min-w-0 overflow-x-clip px-4 py-5 md:px-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">My Compliance</h1>
            <p className="mt-1 text-sm text-slate-500">
              View your compliance status, complete required tasks, and track your progress.
            </p>
          </div>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && exportMyComplianceCsv(data)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-x-1 border-b border-slate-200">
          {MY_COMPLIANCE_TABS.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={cx(
                  "relative px-3 py-2.5 text-sm font-semibold transition sm:px-4 sm:py-3",
                  active ? "text-[var(--color-active-menu)]" : "text-slate-500 hover:text-slate-800",
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

        {loading ? (
          <div className="min-w-0 space-y-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
              ))}
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
              ))}
            </div>
          </div>
        ) : error || !data ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load My Compliance"
            description={error || "Sign in again and try opening this page."}
          />
        ) : view === "overview" ? (
          <OverviewDashboard data={data} />
        ) : view === "assessments" ? (
          <MyComplianceAssessments
            tasks={data.tasks.filter((task) => task.type === "assessment")}
            selectedPolicyId={selectedPolicyId}
            onSelectPolicy={(policyId) => setSelectedPolicy("assessments", policyId)}
          />
        ) : view === "acknowledgements" ? (
          <MyComplianceAcknowledgements
            tasks={data.tasks.filter((task) => task.type === "acknowledgement")}
            selectedPolicyId={selectedPolicyId}
            onSelectPolicy={(policyId) => setSelectedPolicy("acknowledgements", policyId)}
            onAcknowledged={async () => {
              const payload = await fetchMyCompliance();
              setData(payload);
            }}
          />
        ) : view === "certificates" ? (
          <MyComplianceCertificates
            certificates={data.certificates}
            selectedCertificateId={selectedCertificateId}
            onSelectCertificate={setSelectedCertificate}
          />
        ) : (
          <section className="min-w-0 space-y-4">
            <TaskFilters
              tab={chip}
              counts={counts}
              search={search}
              typeFilter={typeFilter}
              priorityFilter={priorityFilter}
              sortBy={sortBy}
              hideTypeFilter={view !== "tasks"}
              onTab={setChip}
              onSearch={setSearch}
              onType={setTypeFilter}
              onPriority={setPriorityFilter}
              onSort={setSortBy}
            />

            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No tasks here"
                description="Assigned acknowledgements and assessments will show up in this list."
              />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            <div className="text-sm text-slate-500">
              Showing {filteredTasks.length === 0 ? 0 : 1} to {filteredTasks.length} of {filteredTasks.length} tasks
            </div>
          </section>
        )}

        <ModuleGuide guideKey="My Compliance" />
      </div>
    </DashboardShell>
  );
}

export default function MyComplianceExperience() {
  return <MyComplianceBody />;
}
