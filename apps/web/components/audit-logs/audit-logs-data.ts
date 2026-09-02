export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "FAILED LOGIN";
export type AuditStatus = "Success" | "Failed";

export type AuditUser = {
  name: string;
  initials: string;
  tone: string;
};

export type AuditLogRecord = {
  id: string;
  at: string;
  user: AuditUser;
  action: AuditAction;
  module: string;
  resourceType: string;
  resource: string;
  details: string;
  ipAddress: string;
  status: AuditStatus;
};

export type AuditColumnKey =
  | "at"
  | "user"
  | "action"
  | "module"
  | "resourceType"
  | "resource"
  | "details"
  | "ipAddress"
  | "status";

export const auditColumns: Array<{ key: AuditColumnKey; label: string }> = [
  { key: "at", label: "Date & Time" },
  { key: "user", label: "User" },
  { key: "action", label: "Action" },
  { key: "module", label: "Module" },
  { key: "resourceType", label: "Resource Type" },
  { key: "resource", label: "Resource" },
  { key: "details", label: "Details" },
  { key: "ipAddress", label: "IP Address" },
  { key: "status", label: "Status" },
];

export const auditActions: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "FAILED LOGIN"];
export const auditStatuses: AuditStatus[] = ["Success", "Failed"];
export const defaultAuditModules = [
  "Policies",
  "Documents",
  "Authentication",
  "Reports",
  "Users",
  "Departments",
  "Categories",
  "Locations",
  "Assessments",
  "Settings",
];
export const defaultAuditResourceTypes = [
  "Policy",
  "Document",
  "User",
  "Report",
  "Department",
  "Category",
  "Location",
  "Role",
  "Session",
  "Assessment",
];

export function formatAuditTimestamp(value: string) {
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} ${timeLabel}`;
}

export function actionTone(action: AuditAction) {
  if (action === "CREATE") return "bg-emerald-50 text-emerald-700";
  if (action === "UPDATE") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (action === "DELETE") return "bg-red-50 text-red-600";
  if (action === "EXPORT") return "bg-amber-50 text-amber-700";
  if (action === "FAILED LOGIN") return "border border-red-200 bg-white text-red-600";
  return "bg-violet-50 text-violet-700";
}

export function downloadAuditCsv(filename: string, rows: AuditLogRecord[]) {
  const header = ["Date & Time", "User", "Action", "Module", "Resource Type", "Resource", "Details", "IP Address", "Status"];
  const body = rows.map((row) => [
    formatAuditTimestamp(row.at),
    row.user.name,
    row.action,
    row.module,
    row.resourceType,
    row.resource,
    row.details,
    row.ipAddress,
    row.status,
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function mergeFilterOptions(live: string[] | undefined, fallback: string[]) {
  return Array.from(new Set([...(live ?? []), ...fallback])).filter(Boolean).sort((left, right) => left.localeCompare(right));
}
