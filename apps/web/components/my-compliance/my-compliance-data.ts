import { API_BASE_URL } from "../../lib/api-base-url";

export type MyTaskType = "assessment" | "acknowledgement";
export type MyTaskPriority = "HIGH" | "MEDIUM" | "LOW";
export type MyTaskStatus = "OVERDUE" | "DUE_SOON" | "IN_PROGRESS" | "OPEN" | "COMPLETED";
export type MyComplianceTab =
  | "overview"
  | "tasks"
  | "assessments"
  | "acknowledgements"
  | "certificates";

export type MyAssessmentAttempt = {
  id: string;
  attempt: number;
  submittedAt: string;
  score: number;
  correct: number;
  totalQuestions: number;
  passed: boolean;
};

export type MyComplianceTask = {
  id: string;
  policyId: string;
  title: string;
  type: MyTaskType;
  priority: MyTaskPriority;
  status: MyTaskStatus;
  dueAt: string;
  dueLabel: string;
  questionCount: number | null;
  passingScore: number | null;
  score: number | null;
  progressPct: number;
  completedAt: string | null;
  href: string;
  actionLabel: string;
  policyTitle?: string;
  policyVersion?: string;
  description?: string | null;
  instructions?: string | null;
  maximumAttempts?: number;
  timeLimitMinutes?: number;
  assignedAt?: string;
  department?: string;
  documentType?: string;
  requirePassToAcknowledge?: boolean;
  hasAssessment?: boolean;
  assessmentPassed?: boolean;
  readingComplete?: boolean;
  attempts?: MyAssessmentAttempt[];
};

export type MyComplianceSummary = {
  total: number;
  policyCount: number;
  completed: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
  completedThisMonth: number;
  compliantPct: number;
};

export type MyCertificateStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type MyCertificateType = "Assessment" | "Training" | "Acknowledgement";

export type MyComplianceCertificate = {
  id: string;
  policyId: string;
  title: string;
  policyTitle?: string;
  policyVersion?: string;
  type?: MyCertificateType;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string | null;
  status?: MyCertificateStatus;
  score: number | null;
  recipientName?: string;
  description?: string | null;
};

export type MyCompliancePayload = {
  tasks: MyComplianceTask[];
  summary: MyComplianceSummary;
  upcoming: Array<{
    id: string;
    title: string;
    dueAt: string;
    dueLabel: string;
    status: MyTaskStatus;
  }>;
  certificates: MyComplianceCertificate[];
};

export const MY_COMPLIANCE_TABS: Array<{ id: MyComplianceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "My Tasks" },
  { id: "assessments", label: "Assessments" },
  { id: "acknowledgements", label: "Acknowledgements" },
  { id: "certificates", label: "Certificates" },
];

export function parseMyComplianceTab(value: string | null | undefined): MyComplianceTab {
  if (
    value === "tasks" ||
    value === "assessments" ||
    value === "acknowledgements" ||
    value === "certificates"
  ) {
    return value;
  }
  return "overview";
}

export async function acknowledgePolicy(policyId: string) {
  const response = await fetch(`${API_BASE_URL}/compliance/me/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyId }),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to acknowledge this policy.");
  }
}

export async function fetchMyCompliance(): Promise<MyCompliancePayload> {
  const response = await fetch(`${API_BASE_URL}/compliance/me`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load your compliance tasks.");
  }
  const payload = (await response.json()) as { data: MyCompliancePayload };
  const data = payload.data;
  const policyIds = new Set(data.tasks.map((task) => task.policyId));
  return {
    ...data,
    summary: {
      ...data.summary,
      policyCount: data.summary.policyCount ?? policyIds.size,
      completedThisMonth: data.summary.completedThisMonth ?? 0,
    },
    upcoming: data.upcoming.map((item) => ({
      ...item,
      dueLabel: item.dueLabel ?? formatComplianceDate(item.dueAt),
    })),
  };
}

export function formatComplianceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function sharePct(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function taskStatusLabel(task: MyComplianceTask) {
  if (task.status === "COMPLETED") {
    return task.type === "assessment" && task.score != null ? "Passed" : "Completed";
  }
  if (task.status === "OVERDUE") return "Overdue";
  if (task.status === "IN_PROGRESS" || task.status === "DUE_SOON") return "In Progress";
  return "Not Started";
}

export function exportMyComplianceCsv(data: MyCompliancePayload) {
  const header = [
    "Title",
    "Type",
    "Status",
    "Priority",
    "Due",
    "Progress",
    "Score",
  ];
  const rows = data.tasks.map((task) => [
    task.title,
    task.type === "assessment" ? "Assessment" : "Acknowledgement",
    taskStatusLabel(task),
    task.priority,
    formatComplianceDate(task.dueAt),
    `${task.progressPct}%`,
    task.score == null ? "" : `${task.score}%`,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-compliance.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
