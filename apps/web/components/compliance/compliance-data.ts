import { API_BASE_URL } from "../../lib/api-base-url";

export type PolicyTrackStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "NOT_STARTED";
export type ComplianceActivityKind =
  | "completed"
  | "assessment"
  | "assignment"
  | "published"
  | "update";

export type ComplianceSummary = {
  policyId: string;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionPct: number;
  dueAt: string | null;
  status: PolicyTrackStatus;
};

export type ComplianceActivityItem = {
  title: string;
  detail: string;
  time: string;
  kind: ComplianceActivityKind;
};

export type EmployeeStatus = "COMPLETED" | "PENDING" | "OVERDUE" | "NOT_STARTED";

export type ComplianceEmployee = {
  id: string;
  name: string;
  email: string;
  initials: string;
  department: string;
  location: string;
  status: EmployeeStatus;
  completionPct: number;
  assessmentScore: number | null;
  dueAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
};

export type ComplianceAssessmentQuestion = {
  id: string;
  number: number;
  prompt: string;
  type: string;
};

export type ComplianceScoreBucket = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

export type ComplianceAssessment = {
  exists: true;
  assigned: number;
  attempted: number;
  notAttempted: number;
  averageScore: number;
  passingScore: number;
  passed: number;
  failed: number;
  passRate: number;
  averageAttempts: number;
  title: string;
  status: string;
  totalQuestions: number;
  questionTypes: string;
  maximumAttempts: number;
  timeLimitMinutes: number;
  randomizeQuestions: boolean;
  showScoreImmediately: boolean;
  updatedBy: string;
  updatedAt: string;
  questions: ComplianceAssessmentQuestion[];
  distribution: ComplianceScoreBucket[];
  activity: ComplianceActivityItem[];
};

export type ComplianceOverview = ComplianceSummary & {
  averageScore: number;
  passingScore: number;
  hasAssessment: boolean;
  certificatesIssued: number;
  lastCertificateAt: string | null;
  autoIssueCertificates: boolean;
  includeScoreInCertificate: boolean;
  notificationsSent: number;
  lastNotificationAt: string | null;
  nextNotificationAt: string | null;
  activity: ComplianceActivityItem[];
};

type SummariesResponse = {
  data: ComplianceSummary[];
};

type OverviewResponse = {
  data: ComplianceOverview;
};

type EmployeesResponse = {
  data: ComplianceEmployee[];
};

type AssessmentResponse = {
  data: ComplianceAssessment | { exists: false; assigned: number };
};

export type NotificationChannel = "email" | "inapp";
export type NotificationAudience =
  | "ALL"
  | "PENDING"
  | "OVERDUE"
  | "PENDING_OVERDUE"
  | "MANAGER"
  | "COMPLIANCE";
export type NotificationTrigger =
  | "DAYS_BEFORE_DUE"
  | "ON_DUE_DATE"
  | "DAYS_AFTER_DUE"
  | "EVERY_DAY_AFTER_DUE"
  | "MANUAL";

export type ComplianceNotificationRule = {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  offsetDays: number;
  when: string;
  channels: NotificationChannel[];
  audience: NotificationAudience;
  recipients: string;
  enabled: boolean;
  lastFiredAt: string | null;
  templateId: string | null;
  templateName: string | null;
};

export type ComplianceNotificationTemplate = {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
  subject: string;
  body: string;
};

export type ComplianceNotificationHistory = {
  id: string;
  createdAt: string;
  name: string;
  channel: string;
  channels: NotificationChannel[];
  audience: string;
  recipients: string;
  status: "DELIVERED" | "FAILED" | "PARTIAL";
  delivered: number;
  failed: number;
  opened: string;
};

export type ComplianceNotificationsPayload = {
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  dueAt: string | null;
  stats: {
    upcoming: number;
    nextAt: string | null;
    sent: number;
    failed: number;
    deliveredPct: number;
    failedPct: number;
    channels: { email: number; inapp: number };
  };
  audienceCounts: {
    all: number;
    pending: number;
    overdue: number;
    pendingOverdue: number;
  };
  rules: ComplianceNotificationRule[];
  templates: ComplianceNotificationTemplate[];
  history: ComplianceNotificationHistory[];
};

type NotificationsResponse = {
  data: ComplianceNotificationsPayload;
};

export async function fetchComplianceSummaries(): Promise<ComplianceSummary[]> {
  const response = await fetch(`${API_BASE_URL}/compliance/summaries`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load compliance summaries.");
  }
  const payload = (await response.json()) as SummariesResponse;
  return payload.data ?? [];
}

export async function fetchComplianceEmployees(policyId: string): Promise<ComplianceEmployee[]> {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/employees`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load assigned employees.");
  }
  const payload = (await response.json()) as EmployeesResponse;
  return payload.data ?? [];
}

export async function fetchComplianceAssessment(
  policyId: string,
): Promise<ComplianceAssessment | { exists: false; assigned: number }> {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/assessment`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load assessment.");
  }
  const payload = (await response.json()) as AssessmentResponse;
  return payload.data;
}

export async function fetchComplianceOverview(policyId: string): Promise<ComplianceOverview> {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/overview`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load compliance overview.");
  }
  const payload = (await response.json()) as OverviewResponse;
  return payload.data;
}

export async function fetchComplianceNotifications(
  policyId: string,
): Promise<ComplianceNotificationsPayload> {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/notifications`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load notifications.");
  }
  const payload = (await response.json()) as NotificationsResponse;
  return payload.data;
}

export async function sendComplianceNotification(
  policyId: string,
  body: {
    audience: NotificationAudience;
    templateId?: string;
    kind?: string;
    channels?: NotificationChannel[];
    ruleId?: string;
  },
) {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to send notification.");
  }
}

export async function createComplianceNotificationRule(
  policyId: string,
  body: {
    name: string;
    trigger: NotificationTrigger;
    offsetDays: number;
    channels: NotificationChannel[];
    audience: NotificationAudience;
    templateId?: string;
    enabled?: boolean;
  },
) {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/notifications/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to create notification rule.");
  }
}

export async function updateComplianceNotificationRule(
  policyId: string,
  ruleId: string,
  body: Partial<{
    name: string;
    trigger: NotificationTrigger;
    offsetDays: number;
    channels: NotificationChannel[];
    audience: NotificationAudience;
    templateId: string;
    enabled: boolean;
  }>,
) {
  const response = await fetch(
    `${API_BASE_URL}/compliance/policies/${policyId}/notifications/rules/${ruleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to update notification rule.");
  }
}

export async function deleteComplianceNotificationRule(policyId: string, ruleId: string) {
  const response = await fetch(
    `${API_BASE_URL}/compliance/policies/${policyId}/notifications/rules/${ruleId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to delete notification rule.");
  }
}

export type CertificateStatus = "ISSUED" | "PENDING" | "EXPIRED" | "REVOKED";

export type ComplianceCertificateRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  initials: string;
  department: string;
  location: string;
  completedAt: string | null;
  score: number | null;
  certificateId: string | null;
  certificateNo: string | null;
  issuedAt: string | null;
  status: CertificateStatus;
};

export type ComplianceCertificatesPayload = {
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  assigned: number;
  stats: {
    issued: number;
    pending: number;
    expired: number;
    revoked: number;
  };
  rows: ComplianceCertificateRow[];
};

type CertificatesResponse = {
  data: ComplianceCertificatesPayload;
};

export async function fetchComplianceCertificates(
  policyId: string,
): Promise<ComplianceCertificatesPayload> {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/certificates`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to load certificates.");
  }
  const payload = (await response.json()) as CertificatesResponse;
  return payload.data;
}

export async function generateMissingCertificates(policyId: string) {
  const response = await fetch(
    `${API_BASE_URL}/compliance/policies/${policyId}/certificates/generate-missing`,
    { method: "POST" },
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to generate certificates.");
  }
  const payload = (await response.json()) as { data: { created: number } };
  return payload.data;
}

export async function issueComplianceCertificate(policyId: string, userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/compliance/policies/${policyId}/certificates/${userId}/issue`,
    { method: "POST" },
  );
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to issue this certificate.");
  }
  const payload = (await response.json()) as { data: { created: number; certificateNumber?: string } };
  return payload.data;
}

export async function notifyComplianceCertificates(policyId: string, userIds?: string[]) {
  const response = await fetch(`${API_BASE_URL}/compliance/policies/${policyId}/certificates/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to notify employees.");
  }
  const payload = (await response.json()) as { data: { sent: number } };
  return payload.data;
}

export function formatComplianceDate(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
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
