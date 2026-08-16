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
  Ban,
  Bell,
  BookOpenText,
  Calendar,
  CalendarClock,
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
  MessageSquare,
  Monitor,
  MoreVertical,
  PencilLine,
  Plus,
  Search,
  Send,
  Shield,
  Smartphone,
  Sparkles,
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

type PolicyTrackStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NOT_STARTED";
type PolicyLifecycleStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyDocumentType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type EmployeeStatus = "COMPLETED" | "PENDING" | "OVERDUE" | "NOT_STARTED";
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

/** Temporary track status until assignment/compliance metrics are wired. */
function toTrackStatus(status: PolicyLifecycleStatus): PolicyTrackStatus {
  if (status === "PUBLISHED") return "ON_TRACK";
  if (status === "UNDER_REVIEW") return "AT_RISK";
  if (status === "ARCHIVED") return "OVERDUE";
  return "NOT_STARTED";
}

function mapApiPolicyToListItem(policy: ApiPolicyRecord): PolicyListItem {
  return {
    id: policy.id,
    title: policy.title,
    version: String(policy.version ?? 1),
    publishedAt: formatPolicyDate(policy.createdAt),
    dueAt: "Not set",
    status: toTrackStatus(policy.status),
    policyStatus: policy.status,
    isActive: policy.isActive ?? policy.status === "PUBLISHED",
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

  const response = await fetch(`${API_BASE_URL}/policies?${params.toString()}`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load policies.");
  }

  const payload = (await response.json()) as PoliciesListResponse;
  return {
    policies: (payload.data ?? []).map(mapApiPolicyToListItem),
    categories: payload.filters?.categories ?? [],
  };
}

const MOCK_EMPLOYEES: EmployeeRow[] = [
  {
    id: "e1",
    name: "Maria Santos",
    email: "maria.santos@rbitogon.com",
    initials: "MS",
    avatarClassName: "bg-blue-100 text-[var(--color-active-menu)]",
    department: "Operations",
    location: "Head Office",
    status: "COMPLETED",
    completionPct: 100,
    assessmentScore: 92,
    dueAt: "Aug 30, 2026",
    dueHint: "Completed on time",
    dueHintTone: "muted",
    lastActivity: "Aug 01, 2026 2:14 PM",
  },
  {
    id: "e2",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@rbitogon.com",
    initials: "JD",
    avatarClassName: "bg-violet-100 text-[var(--color-ai-accent)]",
    department: "IT Department",
    location: "Head Office",
    status: "COMPLETED",
    completionPct: 100,
    assessmentScore: 88,
    dueAt: "Aug 30, 2026",
    dueHint: "Completed on time",
    dueHintTone: "muted",
    lastActivity: "Jul 29, 2026 10:05 AM",
  },
  {
    id: "e3",
    name: "Ana Reyes",
    email: "ana.reyes@rbitogon.com",
    initials: "AR",
    avatarClassName: "bg-emerald-100 text-[var(--color-success)]",
    department: "Finance",
    location: "Baguio",
    status: "PENDING",
    completionPct: 60,
    assessmentScore: null,
    dueAt: "Aug 30, 2026",
    dueHint: "Due in 14 days",
    dueHintTone: "info",
    lastActivity: "Aug 03, 2026 4:42 PM",
  },
  {
    id: "e4",
    name: "Carlo Mendoza",
    email: "carlo.mendoza@rbitogon.com",
    initials: "CM",
    avatarClassName: "bg-amber-100 text-[var(--color-warning)]",
    department: "Human Resources",
    location: "La Trinidad",
    status: "OVERDUE",
    completionPct: 25,
    assessmentScore: null,
    dueAt: "Jul 20, 2026",
    dueHint: "Overdue by 5 days",
    dueHintTone: "danger",
    lastActivity: "Jul 12, 2026 9:18 AM",
  },
  {
    id: "e5",
    name: "Liza Garcia",
    email: "liza.garcia@rbitogon.com",
    initials: "LG",
    avatarClassName: "bg-rose-100 text-rose-600",
    department: "Compliance",
    location: "Head Office",
    status: "PENDING",
    completionPct: 40,
    assessmentScore: null,
    dueAt: "Aug 30, 2026",
    dueHint: "Due in 14 days",
    dueHintTone: "info",
    lastActivity: "Aug 04, 2026 11:30 AM",
  },
  {
    id: "e6",
    name: "Mark Villanueva",
    email: "mark.villanueva@rbitogon.com",
    initials: "MV",
    avatarClassName: "bg-cyan-100 text-cyan-700",
    department: "Operations",
    location: "Baguio",
    status: "COMPLETED",
    completionPct: 100,
    assessmentScore: 95,
    dueAt: "Aug 30, 2026",
    dueHint: "Completed on time",
    dueHintTone: "muted",
    lastActivity: "Jul 30, 2026 3:55 PM",
  },
  {
    id: "e7",
    name: "Sofia Ramos",
    email: "sofia.ramos@rbitogon.com",
    initials: "SR",
    avatarClassName: "bg-slate-100 text-slate-600",
    department: "Legal",
    location: "Head Office",
    status: "NOT_STARTED",
    completionPct: 0,
    assessmentScore: null,
    dueAt: "Aug 30, 2026",
    dueHint: "Due in 14 days",
    dueHintTone: "info",
    lastActivity: "—",
  },
];

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

function OverviewTab({
  policy,
  onOpenTab,
}: {
  policy: PolicyListItem;
  onOpenTab: (tab: DetailTab) => void;
}) {
  const completed = Math.round((policy.completionPct / 100) * 200);
  const pending = policy.status === "NOT_STARTED" ? 0 : Math.max(0, Math.round(200 * 0.09));
  const overdue = policy.status === "OVERDUE" ? Math.max(8, 200 - completed - pending) : Math.round(200 * 0.04);
  const averageScore = policy.status === "NOT_STARTED" ? 0 : 92;
  const statusCopy =
    policy.status === "ON_TRACK"
      ? "Most employees are on track to complete this policy."
      : policy.status === "AT_RISK"
        ? "Several employees need attention before the due date."
        : policy.status === "OVERDUE"
          ? "This policy has overdue assignments that need follow-up."
          : "No employees have started this policy yet.";

  const activity = [
    {
      title: "Acknowledgement Completed",
      detail: "Maria Santos",
      time: "2h ago",
      Icon: CheckCircle2,
      tone: "bg-emerald-50 text-[var(--color-success)]",
    },
    {
      title: "Reminder Sent",
      detail: "18 pending employees",
      time: "1d ago",
      Icon: Bell,
      tone: "bg-amber-50 text-[var(--color-warning)]",
    },
    {
      title: "Due Date Extended",
      detail: "Aug 25 → Aug 30 by Admin User",
      time: "3d ago",
      Icon: CalendarClock,
      tone: "bg-blue-50 text-[var(--color-active-menu)]",
    },
    {
      title: "Policy Published",
      detail: `Version ${policy.version}`,
      time: policy.publishedAt,
      Icon: FileUp,
      tone: "bg-violet-50 text-[var(--color-ai-accent)]",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Completion Rate
          </div>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart value={policy.completionPct} color="var(--color-active-menu)">
              <div className="text-2xl font-extrabold text-slate-900">{policy.completionPct}%</div>
              <div className="text-[0.7rem] font-semibold text-slate-500">Completed</div>
            </DonutChart>
          </div>
          <div className="mt-3 text-center text-sm font-semibold text-slate-600">
            {completed} of 200
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
            <div className="text-3xl font-extrabold text-slate-900">200</div>
            <div className="text-sm font-semibold text-slate-500">Total Assigned</div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {[
              {
                label: "Completed",
                count: completed,
                pct: policy.completionPct,
                tone: "bg-[var(--color-success)]",
              },
              {
                label: "Pending",
                count: pending,
                pct: 9,
                tone: "bg-[var(--color-warning)]",
              },
              {
                label: "Overdue",
                count: overdue,
                pct: 4,
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
            <DonutChart value={averageScore} color="var(--color-success)">
              <div className="text-2xl font-extrabold text-slate-900">{averageScore}%</div>
              <div className="text-[0.7rem] font-semibold text-slate-500">Avg Score</div>
            </DonutChart>
          </div>
          <div className="mt-3 text-center text-sm font-semibold text-[var(--color-success)]">
            Passing Score: 80%
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Status</div>
          <div className="mt-6 flex flex-col items-center text-center">
            <span
              className={cx(
                "inline-flex h-14 w-14 items-center justify-center rounded-full",
                policy.status === "ON_TRACK" && "bg-emerald-50 text-[var(--color-success)]",
                policy.status === "AT_RISK" && "bg-amber-50 text-[var(--color-warning)]",
                policy.status === "OVERDUE" && "bg-red-50 text-[var(--color-error)]",
                policy.status === "NOT_STARTED" && "bg-slate-100 text-slate-500",
              )}
            >
              {policy.status === "OVERDUE" || policy.status === "AT_RISK" ? (
                <AlertTriangle className="h-7 w-7" />
              ) : policy.status === "NOT_STARTED" ? (
                <Circle className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )}
            </span>
            <div className="mt-3 text-xl font-extrabold text-slate-900">
              {policyStatusLabel(policy.status)}
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
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                  Scheduled
                </span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">Aug 23, 2026</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Notifications Sent</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">145</div>
                  <div className="mt-0.5 text-xs text-slate-400">Last sent Aug 01, 2026</div>
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
              <div className="text-3xl font-extrabold text-slate-900">{completed}</div>
              <div className="text-sm font-semibold text-slate-500">Certificates Issued</div>
              <div className="mt-1 text-xs text-slate-400">Last issued Aug 01, 2026</div>
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
              <span className="font-bold text-[var(--color-success)]">Enabled</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Include score in certificate</span>
              <span className="font-bold text-[var(--color-success)]">Yes</span>
            </div>
          </div>
        </OverviewPanelCard>

        <OverviewPanelCard title="Recent Activity" onAction={() => onOpenTab("activity")}>
          <ol className="space-y-3">
            {activity.map((item, index) => {
              const ItemIcon = item.Icon;
              return (
                <li key={`${item.title}-${index}`} className="flex items-start gap-3">
                  <span
                    className={cx(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      item.tone,
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

type NotificationChannel = "email" | "sms" | "inapp";

function ChannelIcons({ channels }: { channels: NotificationChannel[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {channels.includes("email") ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]" title="Email">
          <Mail className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {channels.includes("sms") ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[var(--color-success)]" title="SMS">
          <Smartphone className="h-3.5 w-3.5" />
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

function NotificationsTab() {
  const [ruleEnabled, setRuleEnabled] = useState<Record<string, boolean>>({
    r1: true,
    r2: true,
    r3: true,
    r4: true,
    r5: true,
    r6: true,
  });
  const [audience, setAudience] = useState("pending_overdue");
  const [template, setTemplate] = useState("overdue");

  const rules = [
    {
      id: "r1",
      name: "Upcoming Due Date",
      when: "7 days before due date",
      channels: ["email", "inapp"] as NotificationChannel[],
      recipients: "All Assigned",
    },
    {
      id: "r2",
      name: "Second Reminder",
      when: "3 days before due date",
      channels: ["email", "sms"] as NotificationChannel[],
      recipients: "Pending employees",
    },
    {
      id: "r3",
      name: "Due Date Reminder",
      when: "On due date",
      channels: ["email", "sms", "inapp"] as NotificationChannel[],
      recipients: "Pending & Overdue",
    },
    {
      id: "r4",
      name: "Overdue Reminder",
      when: "Every day after due date",
      channels: ["email", "inapp"] as NotificationChannel[],
      recipients: "Overdue employees",
    },
    {
      id: "r5",
      name: "Escalation to Manager",
      when: "5 days after due date",
      channels: ["email"] as NotificationChannel[],
      recipients: "Employee's Manager",
    },
    {
      id: "r6",
      name: "Escalation to Compliance",
      when: "10 days after due date",
      channels: ["email", "inapp"] as NotificationChannel[],
      recipients: "Compliance Officers",
    },
  ];

  const templates = [
    { id: "t1", name: "Upcoming Due Date", badge: "Default" },
    { id: "t2", name: "Due Date Reminder", badge: "Default" },
    { id: "t3", name: "Overdue Reminder", badge: "Default" },
    { id: "t4", name: "Escalation Notice", badge: "Custom" },
  ];

  const history = [
    {
      id: "h1",
      date: "Aug 05, 2026",
      time: "9:00 AM",
      rule: "Upcoming Due Date",
      channel: "Email",
      recipients: "All Assigned",
      status: "Delivered" as const,
      delivered: 200,
      opened: "148 (74%)",
    },
    {
      id: "h2",
      date: "Aug 04, 2026",
      time: "8:30 AM",
      rule: "Overdue Reminder",
      channel: "Email + In-App",
      recipients: "Overdue (8)",
      status: "Delivered" as const,
      delivered: 8,
      opened: "6 (75%)",
    },
    {
      id: "h3",
      date: "Aug 03, 2026",
      time: "10:15 AM",
      rule: "Second Reminder",
      channel: "SMS",
      recipients: "Pending (18)",
      status: "Failed" as const,
      delivered: 0,
      opened: "—",
    },
    {
      id: "h4",
      date: "Aug 01, 2026",
      time: "9:00 AM",
      rule: "Due Date Reminder",
      channel: "Email",
      recipients: "Pending & Overdue",
      status: "Delivered" as const,
      delivered: 26,
      opened: "21 (81%)",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Upcoming Notifications
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">24</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Next in 2 days</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
              <CalendarClock className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Sent (Last 30 Days)
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">145</div>
              <div className="mt-1 text-xs font-semibold text-[var(--color-success)]">100% Delivered</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-success)]">
              <Send className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Failed</div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">1</div>
              <div className="mt-1 text-xs font-semibold text-[var(--color-error)]">0.7% Failed</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[var(--color-error)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Channels Used</div>
          <ul className="mt-3 space-y-2.5">
            {[
              { label: "Email", pct: 82, Icon: Mail, tone: "text-[var(--color-active-menu)]" },
              { label: "SMS", pct: 12, Icon: Smartphone, tone: "text-[var(--color-success)]" },
              { label: "In-App", pct: 6, Icon: MessageSquare, tone: "text-[var(--color-ai-accent)]" },
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
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
                {rules.map((rule, index) => {
                  const enabled = ruleEnabled[rule.id] ?? true;
                  return (
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
                          aria-checked={enabled}
                          onClick={() =>
                            setRuleEnabled((current) => ({
                              ...current,
                              [rule.id]: !enabled,
                            }))
                          }
                          className={cx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition",
                            enabled ? "bg-[var(--color-success)]" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cx(
                              "inline-block h-5 w-5 rounded-full bg-white shadow transition",
                              enabled ? "translate-x-5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Actions for ${rule.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              className="text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              View Inactive Rules
            </button>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Notification Templates</h3>
              <button
                type="button"
                className="text-xs font-bold text-[var(--color-active-menu)] hover:underline"
              >
                View All
              </button>
            </div>
            <ul className="space-y-2.5">
              {templates.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                    <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                      {item.badge}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                    aria-label={`Template actions for ${item.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
                    if (value) setAudience(value);
                  }}
                  options={[
                    { value: "pending_overdue", label: "Pending & Overdue (26 employees)" },
                    { value: "overdue", label: "Overdue only (8 employees)" },
                    { value: "pending", label: "Pending only (18 employees)" },
                    { value: "all", label: "All Assigned (200 employees)" },
                  ]}
                  allowClear={false}
                  className="mt-2"
                  aria-label="Audience"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Template</label>
                <DropdownSelect
                  value={template}
                  onChange={(value) => {
                    if (value) setTemplate(value);
                  }}
                  options={[
                    { value: "overdue", label: "Overdue Reminder" },
                    { value: "due", label: "Due Date Reminder" },
                    { value: "upcoming", label: "Upcoming Due Date" },
                    { value: "escalation", label: "Escalation Notice" },
                  ]}
                  allowClear={false}
                  className="mt-2"
                  aria-label="Template"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
              >
                <Send className="h-4 w-4" />
                <span>Send Now</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <h3 className="text-sm font-bold text-slate-900">Notification History</h3>
          <button
            type="button"
            className="text-sm font-bold text-[var(--color-active-menu)] hover:underline"
          >
            View All History
          </button>
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {history.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{row.date}</div>
                    <div className="text-xs text-slate-400">{row.time}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.rule}</td>
                  <td className="px-4 py-3">{row.channel}</td>
                  <td className="px-4 py-3">{row.recipients}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        row.status === "Delivered"
                          ? "bg-emerald-50 text-[var(--color-success)]"
                          : "bg-red-50 text-[var(--color-error)]",
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.delivered}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.opened}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Actions for ${row.rule}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type CertificateStatus = "ISSUED" | "PENDING" | "EXPIRED" | "REVOKED";

type CertificateRow = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarClassName: string;
  department: string;
  location: string;
  completedAt: string | null;
  completedTime: string | null;
  score: number | null;
  certificateNo: string | null;
  status: CertificateStatus;
};

const MOCK_CERTIFICATES: CertificateRow[] = [
  {
    id: "c1",
    name: "Maria Santos",
    email: "maria.santos@rbitogon.com",
    initials: "MS",
    avatarClassName: "bg-blue-100 text-[var(--color-active-menu)]",
    department: "Operations",
    location: "Head Office",
    completedAt: "Aug 01, 2026",
    completedTime: "2:14 PM",
    score: 94,
    certificateNo: "HIN-ISP-2026-000174",
    status: "ISSUED",
  },
  {
    id: "c2",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@rbitogon.com",
    initials: "JD",
    avatarClassName: "bg-violet-100 text-[var(--color-ai-accent)]",
    department: "IT Department",
    location: "Head Office",
    completedAt: "Jul 29, 2026",
    completedTime: "10:05 AM",
    score: 88,
    certificateNo: "HIN-ISP-2026-000163",
    status: "ISSUED",
  },
  {
    id: "c3",
    name: "Mark Villanueva",
    email: "mark.villanueva@rbitogon.com",
    initials: "MV",
    avatarClassName: "bg-cyan-100 text-cyan-700",
    department: "Operations",
    location: "Baguio",
    completedAt: "Jul 30, 2026",
    completedTime: "3:55 PM",
    score: 95,
    certificateNo: "HIN-ISP-2026-000168",
    status: "ISSUED",
  },
  {
    id: "c4",
    name: "Liza Garcia",
    email: "liza.garcia@rbitogon.com",
    initials: "LG",
    avatarClassName: "bg-rose-100 text-rose-600",
    department: "Compliance",
    location: "Head Office",
    completedAt: "Aug 04, 2026",
    completedTime: "11:30 AM",
    score: 91,
    certificateNo: "HIN-ISP-2026-000171",
    status: "ISSUED",
  },
  {
    id: "c5",
    name: "Ana Reyes",
    email: "ana.reyes@rbitogon.com",
    initials: "AR",
    avatarClassName: "bg-emerald-100 text-[var(--color-success)]",
    department: "Finance",
    location: "Baguio",
    completedAt: "Aug 03, 2026",
    completedTime: "4:42 PM",
    score: 86,
    certificateNo: null,
    status: "PENDING",
  },
  {
    id: "c6",
    name: "Katrina Lee",
    email: "katrina.lee@rbitogon.com",
    initials: "KL",
    avatarClassName: "bg-amber-100 text-[var(--color-warning)]",
    department: "Human Resources",
    location: "La Trinidad",
    completedAt: null,
    completedTime: null,
    score: 85,
    certificateNo: null,
    status: "PENDING",
  },
  {
    id: "c7",
    name: "Sofia Ramos",
    email: "sofia.ramos@rbitogon.com",
    initials: "SR",
    avatarClassName: "bg-slate-100 text-slate-600",
    department: "Legal",
    location: "Head Office",
    completedAt: "Jun 12, 2026",
    completedTime: "9:18 AM",
    score: 90,
    certificateNo: "HIN-ISP-2026-000042",
    status: "REVOKED",
  },
];

function certificateStatusTone(status: CertificateStatus) {
  if (status === "ISSUED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "PENDING") return "bg-amber-50 text-[var(--color-warning)]";
  if (status === "EXPIRED") return "bg-rose-50 text-rose-600";
  return "bg-slate-100 text-slate-500";
}

function certificateStatusLabel(status: CertificateStatus) {
  if (status === "ISSUED") return "Issued";
  if (status === "PENDING") return "Pending";
  if (status === "EXPIRED") return "Expired";
  return "Revoked";
}

function CertificatesTab() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CertificateStatus>("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const departments = useMemo(
    () => Array.from(new Set(MOCK_CERTIFICATES.map((row) => row.department))).sort(),
    [],
  );
  const locations = useMemo(
    () => Array.from(new Set(MOCK_CERTIFICATES.map((row) => row.location))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_CERTIFICATES.filter((row) => {
      if (departmentFilter && row.department !== departmentFilter) return false;
      if (locationFilter && row.location !== locationFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        (row.certificateNo?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [locationFilter, departmentFilter, search, statusFilter]);

  const totalCertificates = 174;
  const pageSizeNumber = Number.parseInt(pageSize, 10) || 10;
  const totalPages = Math.max(1, Math.ceil(totalCertificates / pageSizeNumber));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSizeNumber + 1;
  const pageEnd = Math.min(currentPage * pageSizeNumber, totalCertificates);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((row) => selectedRows.includes(row.id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedRows((current) =>
        current.filter((id) => !filtered.some((row) => row.id === id)),
      );
      return;
    }
    setSelectedRows((current) =>
      Array.from(new Set([...current, ...filtered.map((row) => row.id)])),
    );
  }

  function toggleRow(id: string) {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function applyStatusQuickFilter(status: "" | CertificateStatus) {
    setStatusFilter(status);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Certificates Issued
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">174</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">87% of 200 assigned</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-[var(--color-ai-accent)]">
              <Award className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyStatusQuickFilter("ISSUED")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View all certificates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Pending Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">18</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Employees passed but not issued
              </div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[var(--color-warning)]">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyStatusQuickFilter("PENDING")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View pending</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Expired Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">0</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">No expired certificates</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyStatusQuickFilter("EXPIRED")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View expired</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Revoked Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">2</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Certificates revoked</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Ban className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyStatusQuickFilter("REVOKED")}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View revoked</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Certificates</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage and download certificates for employees who completed this policy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Missing Certificates</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Download className="h-4 w-4" />
              <span>Download All</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Mail className="h-4 w-4" />
              <span>Email Certificates</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              aria-label="More certificate actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 xl:max-w-sm">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
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
                setStatusFilter(value as "" | CertificateStatus);
                setPage(1);
              }}
              options={[
                { value: "ISSUED", label: "Issued" },
                { value: "PENDING", label: "Pending" },
                { value: "EXPIRED", label: "Expired" },
                { value: "REVOKED", label: "Revoked" },
              ]}
              placeholder="All Statuses"
              allowClear
              size="sm"
              className="min-w-[9.5rem]"
              aria-label="Filter by status"
            />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
              aria-label="More filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

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
                    aria-label="Select all visible certificates"
                  />
                </th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Completion Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Certificate No.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {filtered.map((row) => (
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
                    {row.completedAt ? (
                      <>
                        <div className="font-semibold text-slate-800">{row.completedAt}</div>
                        <div className="text-xs text-slate-400">{row.completedTime}</div>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--color-success)]">
                    {row.score != null ? `${row.score}%` : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {row.certificateNo ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        certificateStatusTone(row.status),
                      )}
                    >
                      {certificateStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={row.status === "PENDING"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Download certificate for ${row.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={row.status === "PENDING"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Email certificate for ${row.name}`}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`More actions for ${row.name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-500">
            Showing {pageStart} to {pageEnd} of {totalCertificates} certificates
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Previous page"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {[1, 2, 3, 4].map((pageNumber) => (
                <button
                  key={pageNumber}
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
              ))}
              <span className="px-1 text-slate-400">…</span>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {totalPages}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Next page"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
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
      </section>
    </div>
  );
}

type ActivityEvent = {
  id: string;
  title: string;
  description: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  Icon: LucideIcon;
  tone: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: string[];
};

const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: "a1",
    title: "Policy Published",
    description: "Version 2.1 was published and is now active.",
    actor: "Admin User",
    actorRole: "Administrator",
    timestamp: "Jul 15, 2026 · 9:12 AM",
    Icon: FileUp,
    tone: "bg-blue-50 text-[var(--color-active-menu)]",
    ipAddress: "112.210.45.18",
    userAgent: "Chrome 126.0.0.0 · macOS",
    changes: [
      "Policy version: 2.0 → 2.1",
      "Sections updated: 3",
      "Attachments added: 1",
    ],
  },
  {
    id: "a2",
    title: "Policy Assigned",
    description: "Assigned to 200 employees across 5 departments.",
    actor: "Admin User",
    actorRole: "Administrator",
    timestamp: "Jul 15, 2026 · 9:40 AM",
    Icon: UserPlus,
    tone: "bg-violet-50 text-[var(--color-ai-accent)]",
    ipAddress: "112.210.45.18",
    userAgent: "Chrome 126.0.0.0 · macOS",
    changes: ["Assignments created: 200", "Departments covered: 5"],
  },
  {
    id: "a3",
    title: "Reading Completed",
    description: "28 employees completed reading the policy.",
    actor: "System",
    actorRole: "Auto Update",
    timestamp: "Jul 20, 2026 · 6:00 PM",
    Icon: BookOpenText,
    tone: "bg-emerald-50 text-[var(--color-success)]",
  },
  {
    id: "a4",
    title: "Notification Sent",
    description: "First reminder sent to 156 pending employees.",
    actor: "System",
    actorRole: "Auto Notification",
    timestamp: "Jul 23, 2026 · 8:00 AM",
    Icon: Bell,
    tone: "bg-amber-50 text-[var(--color-warning)]",
  },
  {
    id: "a5",
    title: "Assessment Attempted",
    description: "32 employees attempted the assessment.",
    actor: "System",
    actorRole: "Auto Update",
    timestamp: "Jul 25, 2026 · 11:20 AM",
    Icon: ClipboardCheck,
    tone: "bg-cyan-50 text-cyan-700",
  },
  {
    id: "a6",
    title: "Employees Passed",
    description: "45 employees passed the assessment.",
    actor: "System",
    actorRole: "Auto Update",
    timestamp: "Jul 25, 2026 · 5:45 PM",
    Icon: CheckCircle2,
    tone: "bg-emerald-50 text-[var(--color-success)]",
  },
  {
    id: "a7",
    title: "Due Date Extended",
    description: "Due date extended from Aug 25 to Aug 30.",
    actor: "Maria Santos",
    actorRole: "Compliance Officer",
    timestamp: "Jul 28, 2026 · 2:15 PM",
    Icon: CalendarClock,
    tone: "bg-blue-50 text-[var(--color-active-menu)]",
    ipAddress: "112.198.22.11",
    userAgent: "Chrome 126.0.0.0 · Windows",
    changes: ["Due date: Aug 25, 2026 → Aug 30, 2026"],
  },
  {
    id: "a8",
    title: "Escalation Sent",
    description: "Escalation email sent to 12 overdue employees' managers.",
    actor: "System",
    actorRole: "Auto Notification",
    timestamp: "Aug 02, 2026 · 9:00 AM",
    Icon: Send,
    tone: "bg-rose-50 text-rose-600",
  },
  {
    id: "a9",
    title: "Certificates Issued",
    description: "Certificates generated for 78 employees.",
    actor: "System",
    actorRole: "Auto Update",
    timestamp: "Aug 10, 2026 · 4:30 PM",
    Icon: Award,
    tone: "bg-violet-50 text-[var(--color-ai-accent)]",
  },
  {
    id: "a10",
    title: "Policy Updated",
    description: "Version 2.1.1 uploaded. Minor content updates.",
    actor: "Admin User",
    actorRole: "Administrator",
    timestamp: "Aug 15, 2026 · 10:05 AM",
    Icon: FileText,
    tone: "bg-slate-100 text-slate-600",
    ipAddress: "112.210.45.18",
    userAgent: "Chrome 126.0.0.0 · macOS",
    changes: ["Policy version: 2.1 → 2.1.1", "Minor content updates applied"],
  },
];

function ActivityTab() {
  const [selectedId, setSelectedId] = useState(MOCK_ACTIVITY[0]?.id ?? "");
  const [visibleCount, setVisibleCount] = useState(8);

  const selected =
    MOCK_ACTIVITY.find((event) => event.id === selectedId) ?? MOCK_ACTIVITY[0];
  const visibleEvents = MOCK_ACTIVITY.slice(0, visibleCount);

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
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
            >
              <Calendar className="h-4 w-4" />
              <span>Jul 15, 2026 – Aug 16, 2026</span>
            </button>
          </div>
        </div>

        <ol className="divide-y divide-slate-100">
          {visibleEvents.map((event) => {
            const EventIcon = event.Icon;
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
                      event.tone,
                    )}
                  >
                    <EventIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-sm font-bold text-slate-900">{event.title}</div>
                      <div className="text-xs text-slate-400">{event.timestamp}</div>
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

        {visibleCount < MOCK_ACTIVITY.length ? (
          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setVisibleCount(MOCK_ACTIVITY.length)}
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
                  selected.tone,
                )}
              >
                <selected.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{selected.title}</h3>
                <div className="mt-1 text-xs text-slate-400">{selected.timestamp}</div>
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
              { label: "Assignments", count: 5 },
              { label: "Assessment Attempts", count: 32 },
              { label: "Certificates Issued", count: 78 },
              { label: "Notifications Sent", count: 3 },
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
          <button
            type="button"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            <span>View Policy Version</span>
          </button>
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

function correctRateTone(rate: number) {
  if (rate >= 90) return "bg-[var(--color-success)]";
  if (rate >= 75) return "bg-[var(--color-warning)]";
  return "bg-[var(--color-error)]";
}

function AssessmentTab({ onOpenActivity }: { onOpenActivity: () => void }) {
  const questions = [
    {
      id: 1,
      question: "What is the primary purpose of the Information Security Policy?",
      type: "MCQ",
      correctRate: 98,
      averageTime: "15s",
    },
    {
      id: 2,
      question: "Which of the following is considered a strong password practice?",
      type: "MCQ",
      correctRate: 91,
      averageTime: "22s",
    },
    {
      id: 3,
      question: "Match each data classification level to its handling requirement.",
      type: "Matching",
      correctRate: 84,
      averageTime: "48s",
    },
    {
      id: 4,
      question: "Employees may share credentials with their manager when requested.",
      type: "True/False",
      correctRate: 76,
      averageTime: "12s",
    },
    {
      id: 5,
      question: "What should you do first if you suspect a phishing email?",
      type: "MCQ",
      correctRate: 68,
      averageTime: "28s",
    },
    {
      id: 6,
      question: "Describe when MFA is required for remote access.",
      type: "Short Answer",
      correctRate: 54,
      averageTime: "1m 12s",
    },
  ];

  const distribution = [
    { label: "90% and above", count: 92, pct: 46, color: "#10B981" },
    { label: "80%–89%", count: 74, pct: 37, color: "#3B82F6" },
    { label: "70%–79%", count: 18, pct: 9, color: "#F59E0B" },
    { label: "Below 70%", count: 16, pct: 8, color: "#EF4444" },
  ];

  const recentActivity = [
    {
      title: "Maria Santos completed the assessment",
      detail: "Score: 94% — Passed",
      time: "2h ago",
      Icon: CheckCircle2,
      tone: "bg-emerald-50 text-[var(--color-success)]",
    },
    {
      title: "8 employees failed the assessment",
      detail: "Below passing score 80%",
      time: "1d ago",
      Icon: XCircle,
      tone: "bg-red-50 text-[var(--color-error)]",
    },
    {
      title: "Assessment updated",
      detail: "Questions updated by Admin User",
      time: "3d ago",
      Icon: PencilLine,
      tone: "bg-violet-50 text-[var(--color-ai-accent)]",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AssessmentMetricCard
          title="Average Score"
          value="92%"
          trend="+4% vs last period"
          subtitle={<span className="text-[var(--color-success)]">Passing Score: 80%</span>}
          barPct={92}
          barClassName="bg-[var(--color-success)]"
          icon={ChartColumn}
          iconClassName="bg-emerald-50 text-[var(--color-success)]"
        />
        <AssessmentMetricCard
          title="Pass Rate"
          value="96%"
          subtitle="192 passed / 200 assigned"
          barPct={96}
          barClassName="bg-[var(--color-active-menu)]"
          icon={CheckCircle2}
          iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
        />
        <AssessmentMetricCard
          title="Failed"
          value="8"
          subtitle="4% of total"
          barPct={4}
          barClassName="bg-[var(--color-error)]"
          icon={XCircle}
          iconClassName="bg-red-50 text-[var(--color-error)]"
        />
        <AssessmentMetricCard
          title="Attempts"
          value="1.35"
          subtitle="Average attempts per user"
          barPct={45}
          barClassName="bg-[var(--color-ai-accent)]"
          icon={ArrowUpRight}
          iconClassName="bg-violet-50 text-[var(--color-ai-accent)]"
        />
        <AssessmentMetricCard
          title="Time to Complete"
          value="18m 24s"
          subtitle="Average completion time"
          barPct={61}
          barClassName="bg-[var(--color-warning)]"
          icon={Clock3}
          iconClassName="bg-amber-50 text-[var(--color-warning)]"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-4 py-4">
            <h3 className="text-sm font-bold text-slate-900">Question Performance</h3>
            <p className="mt-1 text-sm text-slate-500">
              Performance summary for each question in this assessment.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Correct Rate</th>
                  <th className="px-4 py-3">Average Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {questions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-500">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[320px] font-semibold text-slate-900">{row.question}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-[120px]">
                        <div className="mb-1 text-xs font-bold text-slate-700">{row.correctRate}%</div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cx("h-full rounded-full", correctRateTone(row.correctRate))}
                            style={{ width: `${row.correctRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.averageTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ChartColumn className="h-4 w-4" />
              <span>View Full Question Analytics</span>
            </button>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">Assessment Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Total Questions</dt>
                <dd className="font-bold text-slate-900">25</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Question Types</dt>
                <dd className="max-w-[180px] text-right font-semibold text-slate-800">
                  MCQ (18), True/False (4), Matching (2), Short Answer (1)
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Passing Score</dt>
                <dd className="font-bold text-slate-900">80%</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Max Attempts</dt>
                <dd className="font-bold text-slate-900">3</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Time Limit</dt>
                <dd className="font-bold text-slate-900">30 minutes</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Randomize Questions</dt>
                <dd className="font-bold text-[var(--color-success)]">Enabled</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Show Results to Users</dt>
                <dd className="font-bold text-[var(--color-success)]">Enabled</dd>
              </div>
            </dl>

            <Link
              href="/admin/assessments"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              <span>View in Assessment Builder</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-bold text-slate-900">Score Distribution</h3>
            <div className="mt-4 flex flex-col items-center">
              <SegmentedDonut
                segments={distribution.map((item) => ({
                  value: item.count,
                  color: item.color,
                }))}
                centerValue="200"
                centerLabel="Total"
              />
            </div>
            <ul className="mt-4 space-y-2.5">
              {distribution.map((item) => (
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
            <button
              type="button"
              className="mt-4 text-sm font-bold text-[var(--color-active-menu)] hover:underline"
            >
              View Detailed Distribution
            </button>
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
        <ol className="space-y-3">
          {recentActivity.map((item, index) => {
            const ItemIcon = item.Icon;
            return (
              <li
                key={`${item.title}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
              >
                <span
                  className={cx(
                    "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    item.tone,
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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EmployeeStatus>("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

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

  const selectedPolicy =
    policies.find((policy) => policy.id === selectedPolicyId) ?? policies[0] ?? null;

  const filteredPolicies = policies;

  const departments = useMemo(
    () => Array.from(new Set(MOCK_EMPLOYEES.map((row) => row.department))).sort(),
    [],
  );
  const locations = useMemo(
    () => Array.from(new Set(MOCK_EMPLOYEES.map((row) => row.location))).sort(),
    [],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return MOCK_EMPLOYEES.filter((row) => {
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
  }, [locationFilter, departmentFilter, employeeSearch, statusFilter]);

  const pageSizeNumber = Number.parseInt(pageSize, 10) || 10;
  const totalEmployees = 200;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSizeNumber));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSizeNumber + 1;
  const pageEnd = Math.min(currentPage * pageSizeNumber, totalEmployees);

  const allVisibleSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((row) => selectedRows.includes(row.id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedRows((current) =>
        current.filter((id) => !filteredEmployees.some((row) => row.id === id)),
      );
      return;
    }
    setSelectedRows((current) =>
      Array.from(new Set([...current, ...filteredEmployees.map((row) => row.id)])),
    );
  }

  function toggleRow(id: string) {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  let detailBody: ReactNode = null;
  if (activeTab === "employees") {
    detailBody = (
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Assigned"
            value="200"
            icon={Users}
            iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
          />
          <StatCard
            title="Completed"
            value="174"
            detail="87%"
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-[var(--color-success)]"
          />
          <StatCard
            title="Pending"
            value="18"
            detail="9%"
            icon={Clock3}
            iconClassName="bg-amber-50 text-[var(--color-warning)]"
          />
          <StatCard
            title="Overdue"
            value="8"
            detail="4%"
            icon={AlertTriangle}
            iconClassName="bg-red-50 text-[var(--color-error)]"
          />
          <StatCard
            title="Not Started"
            value="0"
            detail="0%"
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
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

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
                {filteredEmployees.map((row) => (
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
              Showing {pageStart} to {pageEnd} of {totalEmployees} employees
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((pageNumber) => (
                  <button
                    key={pageNumber}
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
                ))}
                <span className="px-1 text-slate-400">…</span>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {totalPages}
                </button>
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
        </section>
      </div>
    );
  } else if (activeTab === "overview" && selectedPolicy) {
    detailBody = (
      <OverviewTab policy={selectedPolicy} onOpenTab={setActiveTab} />
    );
  } else if (activeTab === "assessment") {
    detailBody = <AssessmentTab onOpenActivity={() => setActiveTab("activity")} />;
  } else if (activeTab === "notifications") {
    detailBody = <NotificationsTab />;
  } else if (activeTab === "certificates") {
    detailBody = <CertificatesTab />;
  } else if (activeTab === "activity") {
    detailBody = <ActivityTab />;
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

        <div className="px-4 py-5 md:px-5">
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

          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="relative z-10 flex min-h-[560px] flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="relative z-30 shrink-0 border-b border-slate-200 px-4 py-3">
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

            <div className="min-w-0 space-y-4">
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
