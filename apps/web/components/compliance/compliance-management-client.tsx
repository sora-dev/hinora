"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpenText,
  Calendar,
  ChartColumn,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FileUp,
  Filter,
  Globe,
  Mail,
  Monitor,
  MoreVertical,
  Search,
  Send,
  Shield,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { DashboardTopbar } from "../dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../dashboard/dashboard-nav";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import { ModuleGuide } from "../dashboard/module-guide";
import { API_BASE_URL } from "../../lib/api-base-url";
import ComplianceNotificationsTab from "./compliance-notifications";
import ComplianceCertificatesTab from "./compliance-certificates";
import {
  fetchComplianceAssessment,
  fetchComplianceEmployees,
  fetchComplianceOverview,
  fetchComplianceActivity,
  fetchComplianceSummaries,
  formatComplianceDate,
  sharePct,
  type ComplianceActivityKind,
  type ComplianceActivityEvent,
  type ComplianceAssessment,
  type ComplianceEmployee,
  type ComplianceOverview,
  type ComplianceSummary,
  type EmployeeStatus,
} from "./compliance-data";

type PolicyTrackStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NOT_STARTED";
type PolicyLifecycleStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyDocumentType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type DetailTab =
  | "overview"
  | "employees"
  | "assessment"
  | "notifications"
  | "certificates"
  | "activity";

type ApiPolicyRecord = {
  id: string;
  title: string;
  description: string | null;
  department: string;
  type: PolicyDocumentType;
  status: PolicyLifecycleStatus;
  version?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  category: {
    id: string;
    name: string;
    code: string;
    color?: string;
  } | null;
};

type PolicyCategoryOption = {
  id: string;
  name: string;
  code: string;
};

type PoliciesListResponse = {
  data: ApiPolicyRecord[];
  filters?: {
    categories?: PolicyCategoryOption[];
    statuses?: PolicyLifecycleStatus[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PolicyFetchFilters = {
  search?: string;
  status?: PolicyLifecycleStatus | "";
  categoryId?: string;
};

type PolicyListItem = {
  id: string;
  title: string;
  version: string;
  publishedAt: string;
  dueAt: string;
  status: PolicyTrackStatus;
  policyStatus: PolicyLifecycleStatus;
  isActive: boolean;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionPct: number;
  department: string;
  categoryName: string | null;
  Icon: LucideIcon;
};


type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarClassName: string;
  department: string;
  location: string;
  status: EmployeeStatus;
  completionPct: number;
  assessmentScore: number | null;
  dueAt: string;
  dueHint: string;
  dueHintTone: "muted" | "info" | "danger";
  lastActivity: string;
};

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "employees", label: "Employees" },
  { id: "assessment", label: "Assessment" },
  { id: "notifications", label: "Notifications" },
  { id: "certificates", label: "Certificates" },
  { id: "activity", label: "Activity" },
];

function formatPolicyDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function policyTypeIcon(type: PolicyDocumentType): LucideIcon {
  if (type === "GUIDELINE") return FileText;
  if (type === "PROCEDURE") return ClipboardCheck;
  return Shield;
}

function applyComplianceSummary(
  policy: PolicyListItem,
  summary?: ComplianceSummary,
): PolicyListItem {
  if (!summary) return policy;
  return {
    ...policy,
    dueAt: formatComplianceDate(summary.dueAt),
    status: summary.status,
    assigned: summary.assigned,
    completed: summary.completed,
    pending: summary.pending,
    overdue: summary.overdue,
    completionPct: summary.completionPct,
  };
}

function mapApiPolicyToListItem(policy: ApiPolicyRecord): PolicyListItem {
  return {
    id: policy.id,
    title: policy.title,
    version: String(policy.version ?? 1),
    publishedAt: formatPolicyDate(policy.createdAt),
    dueAt: "Not set",
    status: "NOT_STARTED",
    policyStatus: policy.status,
    isActive: policy.isActive ?? policy.status === "PUBLISHED",
    assigned: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    completionPct: 0,
    department: policy.department,
    categoryName: policy.category?.name ?? null,
    Icon: policyTypeIcon(policy.type),
  };
}

async function fetchPolicies(filters: PolicyFetchFilters = {}): Promise<{
  policies: PolicyListItem[];
  categories: PolicyCategoryOption[];
}> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "100");
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  const [response, summaries] = await Promise.all([
    fetch(`${API_BASE_URL}/policies?${params.toString()}`),
    fetchComplianceSummaries().catch(() => [] as ComplianceSummary[]),
  ]);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load policies.");
  }

  const payload = (await response.json()) as PoliciesListResponse;
  const summaryByPolicy = new Map(summaries.map((summary) => [summary.policyId, summary]));

  return {
    policies: (payload.data ?? []).map((policy) =>
      applyComplianceSummary(mapApiPolicyToListItem(policy), summaryByPolicy.get(policy.id)),
    ),
    categories: payload.filters?.categories ?? [],
  };
}

const EMPLOYEE_AVATAR_TONES = [
  "bg-blue-100 text-[var(--color-active-menu)]",
  "bg-violet-100 text-[var(--color-ai-accent)]",
  "bg-emerald-100 text-[var(--color-success)]",
  "bg-amber-100 text-[var(--color-warning)]",
  "bg-rose-100 text-rose-600",
  "bg-cyan-100 text-cyan-700",
  "bg-slate-100 text-slate-600",
];

function employeeAvatarTone(id: string) {
  let hash = 0;
  for (const character of id) {
    hash = (hash + character.charCodeAt(0)) % EMPLOYEE_AVATAR_TONES.length;
  }
  return EMPLOYEE_AVATAR_TONES[hash] ?? EMPLOYEE_AVATAR_TONES[0];
}

function formatLastActivity(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function daysFromToday(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(target);
  dueDay.setHours(0, 0, 0, 0);
  return Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
}

function employeeDueHint(
  employee: ComplianceEmployee,
): Pick<EmployeeRow, "dueHint" | "dueHintTone"> {
  if (employee.status === "COMPLETED") {
    if (
      employee.completedAt &&
      employee.dueAt &&
      new Date(employee.completedAt) > new Date(employee.dueAt)
    ) {
      return { dueHint: "Completed late", dueHintTone: "danger" };
    }
    return { dueHint: "Completed on time", dueHintTone: "muted" };
  }
  if (!employee.dueAt) {
    return { dueHint: "No due date", dueHintTone: "muted" };
  }
  const days = daysFromToday(employee.dueAt);
  if (employee.status === "OVERDUE" || days < 0) {
    const overdueBy = Math.abs(days);
    return {
      dueHint: overdueBy === 1 ? "Overdue by 1 day" : `Overdue by ${overdueBy} days`,
      dueHintTone: "danger",
    };
  }
  if (days === 0) {
    return { dueHint: "Due today", dueHintTone: "info" };
  }
  return {
    dueHint: days === 1 ? "Due in 1 day" : `Due in ${days} days`,
    dueHintTone: "info",
  };
}

function mapEmployeeToRow(employee: ComplianceEmployee): EmployeeRow {
  const hint = employeeDueHint(employee);
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    initials: employee.initials,
    avatarClassName: employeeAvatarTone(employee.id),
    department: employee.department,
    location: employee.location,
    status: employee.status,
    completionPct: employee.completionPct,
    assessmentScore: employee.assessmentScore,
    dueAt: formatComplianceDate(employee.dueAt),
    dueHint: hint.dueHint,
    dueHintTone: hint.dueHintTone,
    lastActivity: formatLastActivity(employee.lastActivityAt),
  };
}

function visiblePageNumbers(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((left, right) => left - right);
}

function exportEmployeesCsv(rows: EmployeeRow[], policyTitle: string) {
  const header = [
    "Name",
    "Email",
    "Department",
    "Location",
    "Status",
    "Completion",
    "Assessment Score",
    "Due Date",
    "Due Hint",
    "Last Activity",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.email,
        row.department,
        row.location,
        employeeStatusLabel(row.status),
        `${row.completionPct}%`,
        row.assessmentScore != null ? `${row.assessmentScore}%` : "",
        row.dueAt,
        row.dueHint,
        row.lastActivity,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${policyTitle.replace(/[^\w]+/g, "-").toLowerCase()}-employees-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function policyStatusTone(status: PolicyTrackStatus) {
  if (status === "ON_TRACK") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "AT_RISK") return "bg-amber-50 text-[var(--color-warning)]";
  if (status === "OVERDUE") return "bg-red-50 text-[var(--color-error)]";
  return "bg-slate-100 text-slate-500";
}

function policyStatusLabel(status: PolicyTrackStatus) {
  if (status === "ON_TRACK") return "On Track";
  if (status === "AT_RISK") return "At Risk";
  if (status === "OVERDUE") return "Overdue";
  return "Not Started";
}

function employeeStatusTone(status: EmployeeStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "PENDING") return "bg-amber-50 text-[var(--color-warning)]";
  if (status === "OVERDUE") return "bg-red-50 text-[var(--color-error)]";
  return "bg-slate-100 text-slate-500";
}

function employeeStatusLabel(status: EmployeeStatus) {
  if (status === "COMPLETED") return "Completed";
  if (status === "PENDING") return "Pending";
  if (status === "OVERDUE") return "Overdue";
  return "Not Started";
}

function progressBarTone(status: EmployeeStatus | PolicyTrackStatus) {
  if (status === "COMPLETED" || status === "ON_TRACK") return "bg-[var(--color-success)]";
  if (status === "PENDING" || status === "AT_RISK") return "bg-[var(--color-warning)]";
  if (status === "OVERDUE") return "bg-[var(--color-error)]";
  return "bg-slate-300";
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  detail?: string;
  icon: typeof Users;
  iconClassName: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <strong className="text-2xl font-extrabold text-slate-900">{value}</strong>
            {detail ? <span className="text-xs font-semibold text-slate-400">{detail}</span> : null}
          </div>
        </div>
        <span
          className={cx(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function TabStub({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
        <Shield className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DonutChart({
  value,
  color,
  trackColor = "#E2E8F0",
  size = 112,
  strokeWidth = 12,
  children,
}: {
  value: number;
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
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
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function OverviewPanelCard({
  title,
  actionLabel = "View All",
  onAction,
  children,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function activityPresentation(kind: ComplianceActivityKind) {
  if (kind === "completed") {
    return { Icon: CheckCircle2, tone: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (kind === "assessment") {
    return { Icon: ClipboardCheck, tone: "bg-blue-50 text-[var(--color-active-menu)]" };
  }
  if (kind === "assignment") {
    return { Icon: UserPlus, tone: "bg-amber-50 text-[var(--color-warning)]" };
  }
  if (kind === "published") {
    return { Icon: FileUp, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
  }
  return { Icon: Bell, tone: "bg-slate-100 text-slate-500" };
}

function timelinePresentation(kind: string) {
  if (kind === "published") {
    return { Icon: FileUp, tone: "bg-blue-50 text-[var(--color-active-menu)]" };
  }
  if (kind === "assignment") {
    return { Icon: UserPlus, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
  }
  if (kind === "reading") {
    return { Icon: BookOpenText, tone: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (kind === "notification") {
    return { Icon: Bell, tone: "bg-amber-50 text-[var(--color-warning)]" };
  }
  if (kind === "escalation") {
    return { Icon: Send, tone: "bg-rose-50 text-rose-600" };
  }
  if (kind === "assessment") {
    return { Icon: ClipboardCheck, tone: "bg-cyan-50 text-cyan-700" };
  }
  if (kind === "completed") {
    return { Icon: CheckCircle2, tone: "bg-emerald-50 text-[var(--color-success)]" };
  }
  if (kind === "certificate") {
    return { Icon: Award, tone: "bg-violet-50 text-[var(--color-ai-accent)]" };
  }
  return { Icon: FileText, tone: "bg-slate-100 text-slate-600" };
}

function overviewStatusCopy(overview: ComplianceOverview) {
  if (overview.assigned === 0) {
    return "This policy is not assigned to anyone yet.";
  }
  if (overview.status === "ON_TRACK") {
    return "Most assigned employees are on track to complete this policy.";
  }
  if (overview.status === "AT_RISK") {
    return "Several assigned employees need attention before the due date.";
  }
  if (overview.status === "OVERDUE") {
    return "This policy has overdue assignments that need follow-up.";
  }
  return "Assigned employees have not started this policy yet.";
}

function OverviewTab({
  policy,
  onOpenTab,
}: {
  policy: PolicyListItem;
  onOpenTab: (tab: DetailTab) => void;
}) {
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setOverview(null);

    void fetchComplianceOverview(policy.id)
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load overview.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [policy.id]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") {
        return;
      }
      void fetchComplianceOverview(policy.id)
        .then((data) => setOverview(data))
        .catch(() => undefined);
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [policy.id]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load overview"
        description={error || "Compliance metrics are unavailable for this policy."}
      />
    );
  }

  const assigned = overview.assigned;
  const completed = overview.completed;
  const pending = overview.pending;
  const overdue = overview.overdue;
  const averageScore = overview.averageScore;
  const statusCopy = overviewStatusCopy(overview);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Completion Rate
          </div>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart value={overview.completionPct} color="var(--color-active-menu)">
              <div className="text-2xl font-extrabold text-slate-900">{overview.completionPct}%</div>
              <div className="text-[0.7rem] font-semibold text-slate-500">Completed</div>
            </DonutChart>
          </div>
          <div className="mt-3 text-center text-sm font-semibold text-slate-600">
            {assigned === 0 ? "No employees assigned" : `${completed} of ${assigned}`}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Employees</div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{assigned}</div>
            <div className="text-sm font-semibold text-slate-500">Total Assigned</div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {[
              {
                label: "Completed",
                count: completed,
                pct: sharePct(completed, assigned),
                tone: "bg-[var(--color-success)]",
              },
              {
                label: "Pending",
                count: pending,
                pct: sharePct(pending, assigned),
                tone: "bg-[var(--color-warning)]",
              },
              {
                label: "Overdue",
                count: overdue,
                pct: sharePct(overdue, assigned),
                tone: "bg-[var(--color-error)]",
              },
            ].map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                  <span className={cx("h-2 w-2 rounded-full", item.tone)} />
                  {item.label}
                </span>
                <span className="font-semibold text-slate-800">
                  {item.count}{" "}
                  <span className="text-slate-400">({item.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Assessment</div>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart value={overview.hasAssessment ? averageScore : 0} color="var(--color-success)">
              <div className="text-2xl font-extrabold text-slate-900">
                {overview.hasAssessment ? `${averageScore}%` : "—"}
              </div>
              <div className="text-[0.7rem] font-semibold text-slate-500">Avg Score</div>
            </DonutChart>
          </div>
          <div className="mt-3 text-center text-sm font-semibold text-[var(--color-success)]">
            {overview.hasAssessment
              ? `Passing Score: ${overview.passingScore}%`
              : "No assessment attached"}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status</div>
          <div className="mt-6 flex flex-col items-center text-center">
            <span
              className={cx(
                "inline-flex h-14 w-14 items-center justify-center rounded-full",
                overview.status === "ON_TRACK" && "bg-emerald-50 text-[var(--color-success)]",
                overview.status === "AT_RISK" && "bg-amber-50 text-[var(--color-warning)]",
                overview.status === "OVERDUE" && "bg-red-50 text-[var(--color-error)]",
                overview.status === "NOT_STARTED" && "bg-slate-100 text-slate-500",
              )}
            >
              {overview.status === "OVERDUE" || overview.status === "AT_RISK" ? (
                <AlertTriangle className="h-7 w-7" />
              ) : overview.status === "NOT_STARTED" ? (
                <Circle className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )}
            </span>
            <div className="mt-3 text-xl font-extrabold text-slate-900">
              {policyStatusLabel(overview.status)}
            </div>
            <p className="mt-2 max-w-[16rem] text-sm leading-5 text-slate-500">{statusCopy}</p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <OverviewPanelCard title="Notifications" onAction={() => onOpenTab("notifications")}>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-500">Next Notification</div>
                <span
                  className={cx(
                    "inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                    overview.nextNotificationAt
                      ? "bg-blue-50 text-[var(--color-active-menu)]"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {overview.nextNotificationAt ? "Scheduled" : "None"}
                </span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {formatComplianceDate(overview.nextNotificationAt, "Not scheduled")}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Notifications Sent</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{overview.notificationsSent}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {overview.lastNotificationAt
                      ? `Last sent ${formatComplianceDate(overview.lastNotificationAt)}`
                      : "No notifications sent yet"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTab("notifications")}
                  className="text-xs font-bold text-[var(--color-active-menu)] hover:underline"
                >
                  View History
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Overdue Employees</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{overdue}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTab("notifications")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Notification
                </button>
              </div>
            </div>
          </div>
        </OverviewPanelCard>

        <OverviewPanelCard title="Certificates" onAction={() => onOpenTab("certificates")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold text-slate-900">{overview.certificatesIssued}</div>
              <div className="text-sm font-semibold text-slate-500">Certificates Issued</div>
              <div className="mt-1 text-xs text-slate-400">
                {overview.lastCertificateAt
                  ? `Last issued ${formatComplianceDate(overview.lastCertificateAt)}`
                  : "None issued yet"}
              </div>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--color-success)]">
              <Award className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-[var(--color-active-menu)]"
            >
              <Download className="h-3.5 w-3.5" />
              Download All
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-[var(--color-active-menu)]"
            >
              <Mail className="h-3.5 w-3.5" />
              Email All
            </button>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Auto-issue certificates</span>
              <span
                className={cx(
                  "font-bold",
                  overview.autoIssueCertificates
                    ? "text-[var(--color-success)]"
                    : "text-slate-500",
                )}
              >
                {overview.autoIssueCertificates ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Include score in certificate</span>
              <span
                className={cx(
                  "font-bold",
                  overview.includeScoreInCertificate
                    ? "text-[var(--color-success)]"
                    : "text-slate-500",
                )}
              >
                {overview.includeScoreInCertificate ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </OverviewPanelCard>

        <OverviewPanelCard title="Recent Activity" onAction={() => onOpenTab("activity")}>
          {overview.activity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity for this policy.</p>
          ) : (
            <ol className="space-y-3">
              {overview.activity.map((item, index) => {
                const presentation = activityPresentation(item.kind);
                const ItemIcon = presentation.Icon;
                return (
                  <li key={`${item.title}-${item.time}-${index}`} className="flex items-start gap-3">
                    <span
                      className={cx(
                        "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        presentation.tone,
                      )}
                    >
                      <ItemIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">{item.title}</div>
                        <div className="shrink-0 text-xs text-slate-400">{item.time}</div>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{item.detail}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </OverviewPanelCard>
      </section>
    </div>
  );
}

function ProgressCell({ pct, status }: { pct: number; status: EmployeeStatus }) {
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 text-xs font-bold text-slate-700">{pct}%</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cx("h-full rounded-full", progressBarTone(status))}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

type ActivityKindFilter = "all" | "assignment" | "assessment" | "certificate" | "notification" | "policy";

function matchesActivityFilter(kind: string, filter: ActivityKindFilter) {
  if (filter === "all") return true;
  if (filter === "assignment") return kind === "assignment";
  if (filter === "assessment") return kind === "assessment" || kind === "completed";
  if (filter === "certificate") return kind === "certificate";
  if (filter === "notification") return kind === "notification" || kind === "escalation";
  return kind === "published" || kind === "update";
}

function ActivityTab({ policy }: { policy: PolicyListItem }) {
  const [events, setEvents] = useState<ComplianceActivityEvent[]>([]);
  const [related, setRelated] = useState({
    assignments: 0,
    assessmentAttempts: 0,
    certificatesIssued: 0,
    notificationsSent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>("all");
  const [range, setRange] = useState<"30d" | "all">("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedId("");
    setVisibleCount(8);
    setKindFilter("all");

    void fetchComplianceActivity(policy.id)
      .then((payload) => {
        if (cancelled) return;
        setEvents(payload.events);
        setRelated(payload.related);
        setSelectedId(payload.events[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load activity.");
        setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [policy.id]);

  const filteredEvents = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return events.filter((event) => {
      if (!matchesActivityFilter(event.kind, kindFilter)) return false;
      if (range === "30d" && new Date(event.timestamp).getTime() < cutoff) return false;
      return true;
    });
  }, [events, kindFilter, range]);

  useEffect(() => {
    if (filteredEvents.some((event) => event.id === selectedId)) return;
    setSelectedId(filteredEvents[0]?.id ?? "");
  }, [filteredEvents, selectedId]);

  const selected = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0];
  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const rangeLabel = useMemo(() => {
    if (filteredEvents.length === 0) return "No dates";
    const times = filteredEvents.map((event) => new Date(event.timestamp).getTime());
    const start = new Date(Math.min(...times));
    const end = new Date(Math.max(...times));
    const fmt = (value: Date) =>
      value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500">
        Loading activity...
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={Clock3} title="Unable to load activity" description={error} />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No activity yet"
        description="Assignments, assessments, certificates, and notifications for this policy will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Activity Timeline</h3>
            <p className="mt-1 text-sm text-slate-500">
              Chronological compliance events for this policy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownSelect
              value={kindFilter}
              onChange={(value) => {
                setKindFilter((value as ActivityKindFilter) || "all");
                setVisibleCount(8);
              }}
              options={[
                { value: "all", label: "All events" },
                { value: "policy", label: "Policy" },
                { value: "assignment", label: "Assignments" },
                { value: "assessment", label: "Assessments" },
                { value: "certificate", label: "Certificates" },
                { value: "notification", label: "Notifications" },
              ]}
              size="sm"
              className="w-[10.5rem]"
              aria-label="Filter activity"
            />
            <button
              type="button"
              onClick={() => {
                setRange((current) => (current === "all" ? "30d" : "all"));
                setVisibleCount(8);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Calendar className="h-4 w-4" />
              <span>{range === "30d" ? "Last 30 days" : rangeLabel}</span>
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No activity matches the current filters.
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {visibleEvents.map((event) => {
              const presentation = timelinePresentation(event.kind);
              const EventIcon = presentation.Icon;
              const active = event.id === selected?.id;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={cx(
                      "flex w-full items-start gap-3 px-4 py-4 text-left transition",
                      active ? "bg-blue-50/70" : "hover:bg-slate-50/80",
                    )}
                  >
                    <span
                      className={cx(
                        "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        presentation.tone,
                      )}
                    >
                      <EventIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">{event.title}</div>
                        <div className="text-xs text-slate-400">{event.timestampLabel}</div>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                      <div className="mt-2 text-xs font-semibold text-slate-500">
                        {event.actor}
                        <span className="font-medium text-slate-400"> · {event.actorRole}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {visibleCount < filteredEvents.length ? (
          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setVisibleCount(filteredEvents.length)}
              className="text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              Load more activities
            </button>
          </div>
        ) : null}
      </section>

      <div className="space-y-4">
        {selected ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-3">
              <span
                className={cx(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  timelinePresentation(selected.kind).tone,
                )}
              >
                {(() => {
                  const Icon = timelinePresentation(selected.kind).Icon;
                  return <Icon className="h-5 w-5" />;
                })()}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{selected.title}</h3>
                <div className="mt-1 text-xs text-slate-400">{selected.timestampLabel}</div>
              </div>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Description
                </dt>
                <dd className="mt-1 font-medium text-slate-700">{selected.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Performed By
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span>
                    {selected.actor}
                    <span className="font-medium text-slate-400"> · {selected.actorRole}</span>
                  </span>
                </dd>
              </div>
              {selected.ipAddress ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    IP Address
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {selected.ipAddress}
                  </dd>
                </div>
              ) : null}
              {selected.userAgent ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    User Agent
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Monitor className="h-4 w-4 text-slate-400" />
                    {selected.userAgent}
                  </dd>
                </div>
              ) : null}
              {selected.changes && selected.changes.length > 0 ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Changes
                  </dt>
                  <dd className="mt-2">
                    <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                      {selected.changes.map((change) => (
                        <li
                          key={change}
                          className="flex items-start gap-2 text-sm font-medium text-slate-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-active-menu)]" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-slate-900">Related Records</h3>
          <ul className="mt-4 space-y-2.5">
            {[
              { label: "Assignments", count: related.assignments },
              { label: "Assessment Attempts", count: related.assessmentAttempts },
              { label: "Certificates Issued", count: related.certificatesIssued },
              { label: "Notifications Sent", count: related.notificationsSent },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-600">{item.label}</span>
                <span className="font-bold text-slate-900">{item.count}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/admin/policy-library/${policy.id}`}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            <span>View Policy Version</span>
          </Link>
        </section>
      </div>
    </div>
  );
}

function SegmentedDonut({
  segments,
  size = 140,
  strokeWidth = 16,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  centerValue: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let cursor = 0;

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
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const dashOffset = -cursor;
          cursor += length;

          return (
            <circle
              key={`${segment.color}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-extrabold text-slate-900">{centerValue}</div>
        <div className="text-[0.7rem] font-semibold text-slate-500">{centerLabel}</div>
      </div>
    </div>
  );
}

function AssessmentMetricCard({
  title,
  value,
  subtitle,
  barPct,
  barClassName,
  icon: Icon,
  iconClassName,
  trend,
}: {
  title: string;
  value: string;
  subtitle: ReactNode;
  barPct: number;
  barClassName: string;
  icon: typeof ChartColumn;
  iconClassName: string;
  trend?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</div>
        <span className={cx("inline-flex h-9 w-9 items-center justify-center rounded-xl", iconClassName)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <strong className="text-3xl font-extrabold text-slate-900">{value}</strong>
        {trend ? (
          <span className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-success)]">
            <TrendingUp className="h-3.5 w-3.5" />
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-xs font-medium text-slate-500">{subtitle}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cx("h-full rounded-full", barClassName)}
          style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}
        />
      </div>
    </article>
  );
}

function formatAttempts(value: number) {
  if (value <= 0) return "Unlimited";
  return String(value);
}

function formatTimeLimit(minutes: number) {
  if (minutes <= 0) return "No limit";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}

function AssessmentTab({
  policy,
  onOpenActivity,
}: {
  policy: PolicyListItem;
  onOpenActivity: () => void;
}) {
  const [assessment, setAssessment] = useState<ComplianceAssessment | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const builderHref = `/admin/assessments?policyId=${encodeURIComponent(policy.id)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setAssessment(null);
    setMissing(false);

    void fetchComplianceAssessment(policy.id)
      .then((data) => {
        if (cancelled) return;
        if (!data.exists) {
          setMissing(true);
          return;
        }
        setAssessment(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load assessment.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [policy.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load assessment"
        description={error}
      />
    );
  }

  if (missing || !assessment) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No assessment yet"
        description="Create an assessment for this policy so employees can acknowledge it and you can track scores here."
        actionLabel="Create Assessment"
        onAction={() => {
          window.location.href = builderHref;
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AssessmentMetricCard
          title="Average Score"
          value={assessment.attempted === 0 ? "—" : `${assessment.averageScore}%`}
          subtitle={
            <span className="text-[var(--color-success)]">
              Passing Score: {assessment.passingScore}%
            </span>
          }
          barPct={assessment.attempted === 0 ? 0 : assessment.averageScore}
          barClassName="bg-[var(--color-success)]"
          icon={ChartColumn}
          iconClassName="bg-emerald-50 text-[var(--color-success)]"
        />
        <AssessmentMetricCard
          title="Pass Rate"
          value={`${assessment.passRate}%`}
          subtitle={`${assessment.passed} passed / ${assessment.assigned} assigned`}
          barPct={assessment.passRate}
          barClassName="bg-[var(--color-active-menu)]"
          icon={CheckCircle2}
          iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
        />
        <AssessmentMetricCard
          title="Failed"
          value={String(assessment.failed)}
          subtitle={`${sharePct(assessment.failed, assessment.assigned)}% of assigned`}
          barPct={sharePct(assessment.failed, assessment.assigned)}
          barClassName="bg-[var(--color-error)]"
          icon={XCircle}
          iconClassName="bg-red-50 text-[var(--color-error)]"
        />
        <AssessmentMetricCard
          title="Attempts"
          value={assessment.attempted === 0 ? "—" : assessment.averageAttempts.toFixed(2)}
          subtitle="Average attempts per user"
          barPct={assessment.attempted === 0 ? 0 : Math.min(100, Math.round(assessment.averageAttempts * 33))}
          barClassName="bg-[var(--color-ai-accent)]"
          icon={ArrowUpRight}
          iconClassName="bg-violet-50 text-[var(--color-ai-accent)]"
        />
        <AssessmentMetricCard
          title="Not Attempted"
          value={String(assessment.notAttempted)}
          subtitle={`${sharePct(assessment.notAttempted, assessment.assigned)}% of assigned`}
          barPct={sharePct(assessment.notAttempted, assessment.assigned)}
          barClassName="bg-[var(--color-warning)]"
          icon={Clock3}
          iconClassName="bg-amber-50 text-[var(--color-warning)]"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-4 py-4">
            <h3 className="text-sm font-bold text-slate-900">Questions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Questions in this assessment. Per-question scores appear after employees submit attempts.
            </p>
          </div>

          {assessment.questions.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No questions yet"
              description="Add questions in the Assessment Builder to start collecting results."
              actionLabel="Open Assessment Builder"
              onAction={() => {
                window.location.href = builderHref;
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {assessment.questions.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-500">{row.number}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-[420px] font-semibold text-slate-900">{row.prompt}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {row.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3">
            <Link
              href={builderHref}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ChartColumn className="h-4 w-4" />
              <span>Edit in Assessment Builder</span>
            </Link>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">Assessment Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Total Questions</dt>
                <dd className="font-bold text-slate-900">{assessment.totalQuestions}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Question Types</dt>
                <dd className="max-w-[180px] text-right font-semibold text-slate-800">
                  {assessment.questionTypes}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Passing Score</dt>
                <dd className="font-bold text-slate-900">{assessment.passingScore}%</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Max Attempts</dt>
                <dd className="font-bold text-slate-900">{formatAttempts(assessment.maximumAttempts)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Time Limit</dt>
                <dd className="font-bold text-slate-900">{formatTimeLimit(assessment.timeLimitMinutes)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Randomize Questions</dt>
                <dd
                  className={cx(
                    "font-bold",
                    assessment.randomizeQuestions
                      ? "text-[var(--color-success)]"
                      : "text-slate-500",
                  )}
                >
                  {assessment.randomizeQuestions ? "Enabled" : "Disabled"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Show Results to Users</dt>
                <dd
                  className={cx(
                    "font-bold",
                    assessment.showScoreImmediately
                      ? "text-[var(--color-success)]"
                      : "text-slate-500",
                  )}
                >
                  {assessment.showScoreImmediately ? "Enabled" : "Disabled"}
                </dd>
              </div>
            </dl>

            <Link
              href={builderHref}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              <span>View in Assessment Builder</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">Score Distribution</h3>
            {assessment.attempted === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No submitted attempts yet. Distribution appears after employees take this assessment.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-col items-center">
                  <SegmentedDonut
                    segments={assessment.distribution.map((item) => ({
                      value: item.count,
                      color: item.color,
                    }))}
                    centerValue={String(assessment.attempted)}
                    centerLabel="Attempted"
                  />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {assessment.distribution.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {item.count} <span className="text-slate-400">({item.pct}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Recent Assessment Activity</h3>
          <button
            type="button"
            onClick={onOpenActivity}
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View All Activity</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {assessment.activity.length === 0 ? (
          <p className="text-sm text-slate-500">No assessment activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {assessment.activity.map((item, index) => {
              const presentation = activityPresentation(item.kind);
              const ItemIcon = presentation.Icon;
              return (
                <li
                  key={`${item.title}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
                >
                  <span
                    className={cx(
                      "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      presentation.tone,
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{item.detail}</div>
                      </div>
                      <div className="shrink-0 text-xs text-slate-400">{item.time}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function EmployeesTab({ policy }: { policy: PolicyListItem }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EmployeeStatus>("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setEmployees([]);
    setSelectedRows([]);
    setPage(1);

    void fetchComplianceEmployees(policy.id)
      .then((rows) => {
        if (!cancelled) {
          setEmployees(rows.map(mapEmployeeToRow));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load employees.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [policy.id]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") {
        return;
      }
      void fetchComplianceEmployees(policy.id)
        .then((rows) => setEmployees(rows.map(mapEmployeeToRow)))
        .catch(() => undefined);
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [policy.id]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((row) => row.department))).sort(),
    [employees],
  );
  const locations = useMemo(
    () => Array.from(new Set(employees.map((row) => row.location))).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return employees.filter((row) => {
      if (departmentFilter && row.department !== departmentFilter) return false;
      if (locationFilter && row.location !== locationFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.department.toLowerCase().includes(query)
      );
    });
  }, [departmentFilter, employeeSearch, employees, locationFilter, statusFilter]);

  const counts = useMemo(() => {
    const completed = employees.filter((row) => row.status === "COMPLETED").length;
    const pending = employees.filter((row) => row.status === "PENDING").length;
    const overdue = employees.filter((row) => row.status === "OVERDUE").length;
    const notStarted = employees.filter((row) => row.status === "NOT_STARTED").length;
    return {
      assigned: employees.length,
      completed,
      pending,
      overdue,
      notStarted,
    };
  }, [employees]);

  const pageSizeNumber = Number.parseInt(pageSize, 10) || 10;
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSizeNumber));
  const currentPage = Math.min(page, totalPages);
  const pageStart = totalEmployees === 0 ? 0 : (currentPage - 1) * pageSizeNumber + 1;
  const pageEnd = Math.min(currentPage * pageSizeNumber, totalEmployees);
  const pagedEmployees = filteredEmployees.slice(pageStart - 1, pageEnd);
  const pageNumbers = visiblePageNumbers(currentPage, totalPages);

  const allVisibleSelected =
    pagedEmployees.length > 0 &&
    pagedEmployees.every((row) => selectedRows.includes(row.id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedRows((current) =>
        current.filter((id) => !pagedEmployees.some((row) => row.id === id)),
      );
      return;
    }
    setSelectedRows((current) =>
      Array.from(new Set([...current, ...pagedEmployees.map((row) => row.id)])),
    );
  }

  function toggleRow(id: string) {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load employees"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Assigned"
          value={String(counts.assigned)}
          icon={Users}
          iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
        />
        <StatCard
          title="Completed"
          value={String(counts.completed)}
          detail={`${sharePct(counts.completed, counts.assigned)}%`}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-[var(--color-success)]"
        />
        <StatCard
          title="Pending"
          value={String(counts.pending)}
          detail={`${sharePct(counts.pending, counts.assigned)}%`}
          icon={Clock3}
          iconClassName="bg-amber-50 text-[var(--color-warning)]"
        />
        <StatCard
          title="Overdue"
          value={String(counts.overdue)}
          detail={`${sharePct(counts.overdue, counts.assigned)}%`}
          icon={AlertTriangle}
          iconClassName="bg-red-50 text-[var(--color-error)]"
        />
        <StatCard
          title="Not Started"
          value={String(counts.notStarted)}
          detail={`${sharePct(counts.notStarted, counts.assigned)}%`}
          icon={Circle}
          iconClassName="bg-slate-100 text-slate-500"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 xl:max-w-sm">
            <Search className="h-4 w-4" />
            <input
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search employees..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownSelect
              value={departmentFilter}
              onChange={(value) => {
                setDepartmentFilter(value);
                setPage(1);
              }}
              options={departments.map((department) => ({
                value: department,
                label: department,
              }))}
              placeholder="All Departments"
              allowClear
              size="sm"
              className="min-w-[10.5rem]"
              aria-label="Filter by department"
            />
            <DropdownSelect
              value={locationFilter}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
              options={locations.map((location) => ({ value: location, label: location }))}
              placeholder="All Locations"
              allowClear
              size="sm"
              className="min-w-[10.5rem]"
              aria-label="Filter by location"
            />
            <DropdownSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as "" | EmployeeStatus);
                setPage(1);
              }}
              options={[
                { value: "COMPLETED", label: "Completed" },
                { value: "PENDING", label: "Pending" },
                { value: "OVERDUE", label: "Overdue" },
                { value: "NOT_STARTED", label: "Not Started" },
              ]}
              placeholder="All Statuses"
              allowClear
              size="sm"
              className="min-w-[9.5rem]"
              aria-label="Filter by status"
            />
            <button
              type="button"
              onClick={() => exportEmployeesCsv(filteredEmployees, policy.title)}
              disabled={filteredEmployees.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees assigned"
            description="Assign this policy from Policy Assignments to track acknowledgement progress here."
          />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching employees"
            description="Try a different search or clear the department, location, or status filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)]"
                        aria-label="Select all visible employees"
                      />
                    </th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Completion</th>
                    <th className="px-4 py-3">Assessment Score</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Last Activity</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                  {pagedEmployees.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)]"
                          aria-label={`Select ${row.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cx(
                              "inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                              row.avatarClassName,
                            )}
                          >
                            {row.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{row.name}</div>
                            <div className="truncate text-xs text-slate-400">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.department}</td>
                      <td className="px-4 py-3">{row.location}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cx(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            employeeStatusTone(row.status),
                          )}
                        >
                          {employeeStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressCell pct={row.completionPct} status={row.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {row.assessmentScore != null ? `${row.assessmentScore}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{row.dueAt}</div>
                        <div
                          className={cx(
                            "text-xs",
                            row.dueHintTone === "danger" && "font-semibold text-[var(--color-error)]",
                            row.dueHintTone === "info" && "text-[var(--color-active-menu)]",
                            row.dueHintTone === "muted" && "text-slate-400",
                          )}
                        >
                          {row.dueHint}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{row.lastActivity}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Actions for ${row.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-slate-500">
                {totalEmployees === 0
                  ? "No employees to show"
                  : `Showing ${pageStart} to ${pageEnd} of ${totalEmployees} employees`}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {pageNumbers.map((pageNumber, index) => {
                    const previous = pageNumbers[index - 1];
                    return (
                      <span key={pageNumber} className="inline-flex items-center">
                        {previous && pageNumber - previous > 1 ? (
                          <span className="px-1 text-slate-400">…</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={cx(
                            "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold",
                            currentPage === pageNumber
                              ? "bg-[var(--color-active-menu)] text-white"
                              : "text-slate-600 hover:bg-slate-100",
                          )}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    );
                  })}
                </div>
                <DropdownSelect
                  value={pageSize}
                  onChange={(value) => {
                    if (!value) return;
                    setPageSize(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "10", label: "10 / page" },
                    { value: "25", label: "25 / page" },
                    { value: "50", label: "50 / page" },
                  ]}
                  allowClear={false}
                  size="sm"
                  className="min-w-[7.5rem]"
                  aria-label="Rows per page"
                />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function ComplianceManagementClient() {
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [policyCategories, setPolicyCategories] = useState<PolicyCategoryOption[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState("");
  const [policySearch, setPolicySearch] = useState("");
  const [policyStatusFilter, setPolicyStatusFilter] = useState<"" | PolicyLifecycleStatus>("");
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState("");
  const [policyFilterOpen, setPolicyFilterOpen] = useState(false);
  const policyFilterRef = useRef<HTMLDivElement | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const hasActivePolicyFilters = Boolean(policyStatusFilter || policyCategoryFilter);

  const loadPolicies = useCallback(
    async (options?: { search?: string; status?: "" | PolicyLifecycleStatus; categoryId?: string }) => {
      setPoliciesLoading(true);
      setPoliciesError("");

      try {
        const result = await fetchPolicies({
          search: options?.search ?? "",
          status: options?.status ?? "",
          categoryId: options?.categoryId ?? "",
        });
        setPolicies(result.policies);
        if (result.categories.length > 0) {
          setPolicyCategories(result.categories);
        }
        setSelectedPolicyId((current) => {
          if (current && result.policies.some((policy) => policy.id === current)) {
            return current;
          }
          return result.policies[0]?.id ?? "";
        });
      } catch (error) {
        setPolicies([]);
        setPoliciesError(error instanceof Error ? error.message : "Unable to load policies.");
      } finally {
        setPoliciesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const delay = policySearch.trim() ? 300 : 0;
    const handle = window.setTimeout(() => {
      void loadPolicies({
        search: policySearch,
        status: policyStatusFilter,
        categoryId: policyCategoryFilter,
      });
    }, delay);

    return () => window.clearTimeout(handle);
  }, [loadPolicies, policyCategoryFilter, policySearch, policyStatusFilter]);

  useEffect(() => {
    if (!policyFilterOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!policyFilterRef.current?.contains(event.target as Node)) {
        setPolicyFilterOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPolicyFilterOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [policyFilterOpen]);

  useEffect(() => {
    function refreshSummaries() {
      if (document.visibilityState !== "visible") {
        return;
      }
      void fetchComplianceSummaries()
        .then((summaries) => {
          const summaryByPolicy = new Map(
            summaries.map((summary) => [summary.policyId, summary]),
          );
          setPolicies((current) =>
            current.map((policy) =>
              applyComplianceSummary(policy, summaryByPolicy.get(policy.id)),
            ),
          );
        })
        .catch(() => undefined);
    }

    window.addEventListener("focus", refreshSummaries);
    document.addEventListener("visibilitychange", refreshSummaries);
    return () => {
      window.removeEventListener("focus", refreshSummaries);
      document.removeEventListener("visibilitychange", refreshSummaries);
    };
  }, []);

  const selectedPolicy =
    policies.find((policy) => policy.id === selectedPolicyId) ?? policies[0] ?? null;

  const filteredPolicies = policies;

  let detailBody: ReactNode = null;
  if (activeTab === "employees" && selectedPolicy) {
    detailBody = <EmployeesTab policy={selectedPolicy} />;
  } else if (activeTab === "overview" && selectedPolicy) {
    detailBody = (
      <OverviewTab policy={selectedPolicy} onOpenTab={setActiveTab} />
    );
  } else if (activeTab === "assessment" && selectedPolicy) {
    detailBody = (
      <AssessmentTab
        policy={selectedPolicy}
        onOpenActivity={() => setActiveTab("activity")}
      />
    );
  } else if (activeTab === "notifications" && selectedPolicy) {
    detailBody = <ComplianceNotificationsTab policyId={selectedPolicy.id} />;
  } else if (activeTab === "certificates" && selectedPolicy) {
    detailBody = <ComplianceCertificatesTab policy={selectedPolicy} />;
  } else if (activeTab === "activity" && selectedPolicy) {
    detailBody = <ActivityTab policy={selectedPolicy} />;
  } else {
    detailBody = null;
  }

  const SelectedPolicyIcon = selectedPolicy?.Icon ?? Shield;

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies..."
          notificationCount={3}
          profileName="Admin User"
          profileRole="System Administrator"
          avatarText="AU"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant="admin" />

        <div className="min-w-0 overflow-x-clip px-4 py-5 md:px-5">
          <div className="mb-5">
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">
              Compliance Center
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor policy compliance, acknowledgements, assessments, and notifications.
            </p>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to policies</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
              >
                <span>Policy Actions</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,18.75rem)_minmax(0,1fr)]">
            <aside className="flex min-h-[560px] min-w-0 w-full max-w-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="relative z-20 shrink-0 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900">Policies</div>
                  {hasActivePolicyFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyStatusFilter("");
                        setPolicyCategoryFilter("");
                      }}
                      className="text-xs font-bold text-[var(--color-active-menu)] hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-3 flex items-center gap-2">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={policySearch}
                      onChange={(event) => setPolicySearch(event.target.value)}
                      placeholder="Search policies..."
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                    />
                  </label>
                  <div ref={policyFilterRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setPolicyFilterOpen((current) => !current)}
                      className={cx(
                        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition",
                        policyFilterOpen || hasActivePolicyFilters
                          ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)] ring-4 ring-blue-100"
                          : "border-slate-200 text-slate-500 hover:border-slate-300",
                      )}
                      aria-label="Filter policies"
                      aria-expanded={policyFilterOpen}
                    >
                      <Filter className="h-4 w-4" />
                      {hasActivePolicyFilters ? (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-active-menu)]" />
                      ) : null}
                    </button>

                    {policyFilterOpen ? (
                      <div className="absolute right-0 z-50 mt-2 w-[240px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Filter Policies
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600">Status</label>
                            <DropdownSelect
                              value={policyStatusFilter}
                              onChange={(value) =>
                                setPolicyStatusFilter(value as "" | PolicyLifecycleStatus)
                              }
                              options={[
                                { value: "PUBLISHED", label: "Published" },
                                { value: "UNDER_REVIEW", label: "Under Review" },
                                { value: "DRAFT", label: "Draft" },
                                { value: "ARCHIVED", label: "Archived" },
                              ]}
                              placeholder="All Statuses"
                              allowClear
                              size="sm"
                              className="mt-1.5"
                              menuClassName="z-[60]"
                              aria-label="Filter by policy status"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600">Category</label>
                            <DropdownSelect
                              value={policyCategoryFilter}
                              onChange={(value) => setPolicyCategoryFilter(value)}
                              options={policyCategories.map((category) => ({
                                value: category.id,
                                label: category.name,
                              }))}
                              placeholder="All Categories"
                              allowClear
                              size="sm"
                              className="mt-1.5"
                              menuClassName="z-[60]"
                              aria-label="Filter by category"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setPolicyStatusFilter("");
                              setPolicyCategoryFilter("");
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setPolicyFilterOpen(false)}
                            className="inline-flex h-8 items-center rounded-lg bg-[var(--color-active-menu)] px-3 text-xs font-bold text-white"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-[360px] max-h-[640px] flex-1 space-y-1 overflow-y-auto p-2">
                {policiesLoading ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center px-3 py-8 text-center text-sm text-slate-500">
                    Loading policies...
                  </div>
                ) : policiesError ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center space-y-3 px-3 py-6 text-center">
                    <p className="text-sm font-medium text-[var(--color-error)]">{policiesError}</p>
                    <button
                      type="button"
                      onClick={() =>
                        void loadPolicies({
                          search: policySearch,
                          status: policyStatusFilter,
                          categoryId: policyCategoryFilter,
                        })
                      }
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredPolicies.length === 0 ? (
                  policySearch.trim() || hasActivePolicyFilters ? (
                    <EmptyState
                      icon={Search}
                      title="No matching policies"
                      description="Try another category or status, or clear filters to see all policies."
                      actionLabel="Clear filters"
                      onAction={() => {
                        setPolicySearch("");
                        setPolicyStatusFilter("");
                        setPolicyCategoryFilter("");
                      }}
                      className="min-h-[280px] py-8"
                    />
                  ) : (
                    <EmptyState
                      icon={Shield}
                      title="No policies have been added yet."
                      description="Upload and publish policies first so you can track acknowledgements and compliance here."
                      actionLabel="Go to Policy Management"
                      onAction={() => {
                        window.location.href = "/admin/policy-management";
                      }}
                      className="min-h-[280px] py-8"
                    />
                  )
                ) : (
                  filteredPolicies.map((policy) => {
                    const selected = policy.id === selectedPolicy?.id;
                    const PolicyIcon = policy.Icon;
                    return (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => {
                          setSelectedPolicyId(policy.id);
                        }}
                        className={cx(
                          "w-full rounded-xl px-3 py-3 text-left transition",
                          selected
                            ? "bg-blue-50 ring-1 ring-[var(--color-active-menu)]/20"
                            : "hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cx(
                              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                              selected
                                ? "bg-[var(--color-active-menu)] text-white"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            <PolicyIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {policy.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {policy.categoryName
                                ? `${policy.categoryName} · v${policy.version}`
                                : `Version ${policy.version}`}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {policy.dueAt === "Not set" ? "No due date set" : `Due ${policy.dueAt}`}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span
                                className={cx(
                                  "inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                                  policyStatusTone(policy.status),
                                )}
                              >
                                {policyStatusLabel(policy.status)}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {policy.completionPct}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cx("h-full rounded-full", progressBarTone(policy.status))}
                                style={{ width: `${policy.completionPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 p-3">
                <Link
                  href="/admin/policy-management"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View All Policies
                </Link>
              </div>
            </aside>

            <div className="min-w-0 overflow-x-clip space-y-4">
              {policiesLoading && !selectedPolicy ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  Loading policy details...
                </div>
              ) : null}

              {!policiesLoading && !selectedPolicy ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <h2 className="text-lg font-bold text-slate-900">No policy selected</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {policiesError ||
                      "Select a policy from the list, or upload one in Policy Management."}
                  </p>
                </div>
              ) : null}

              {selectedPolicy ? (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                        <SelectedPolicyIcon className="h-7 w-7" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold text-slate-900">
                            {selectedPolicy.title}
                          </h2>
                          <span
                            className={cx(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                              selectedPolicy.policyStatus === "PUBLISHED"
                                ? "bg-emerald-50 text-[var(--color-success)]"
                                : selectedPolicy.policyStatus === "UNDER_REVIEW"
                                  ? "bg-amber-50 text-[var(--color-warning)]"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {selectedPolicy.policyStatus === "PUBLISHED"
                              ? "Active"
                              : selectedPolicy.policyStatus
                                  .toLowerCase()
                                  .split("_")
                                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                                  .join(" ")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Version {selectedPolicy.version} • Created on {selectedPolicy.publishedAt}
                          {selectedPolicy.dueAt !== "Not set"
                            ? ` • Due on ${selectedPolicy.dueAt}`
                            : " • No due date set"}
                          {selectedPolicy.department ? ` • ${selectedPolicy.department}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
                      {DETAIL_TABS.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cx(
                              "relative shrink-0 px-4 py-3 text-sm font-semibold transition",
                              active
                                ? "text-[var(--color-active-menu)]"
                                : "text-slate-500 hover:text-slate-800",
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
                  </section>

                  {detailBody}
                </>
              ) : null}
            </div>
          </div>
          <ModuleGuide guideKey="Compliance Center" />
        </div>
      </section>
    </main>
  );
}
