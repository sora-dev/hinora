export type AssignmentStatus = "Active" | "Completed" | "Archived";
export type AssignmentScopeKind = "organization" | "department" | "location" | "role" | "user";
export type AssignmentPriority = "Low" | "Medium" | "High";

export type PolicyAssignment = {
  id: string;
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  effectiveDate?: string;
  scopeKind: AssignmentScopeKind;
  scopeTarget?: string;
  scopeLabel: string;
  userIds?: string[];
  recipients: number;
  assignedAt: string;
  dueAt: string;
  status: AssignmentStatus;
  priority?: AssignmentPriority;
  notes?: string;
  internalNotes?: string;
};

export const assignmentStatuses: AssignmentStatus[] = ["Active", "Completed", "Archived"];

export const assignmentScopeOptions: Array<{ value: AssignmentScopeKind; label: string }> = [
  { value: "organization", label: "Organization-wide" },
  { value: "department", label: "Department" },
  { value: "location", label: "Branch" },
  { value: "role", label: "Role" },
  { value: "user", label: "Specific Users" },
];

export function formatAssignmentDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function scopeLabelFor(kind: AssignmentScopeKind, target = "") {
  if (kind === "organization") return "Organization-wide";
  return target.trim() || assignmentScopeOptions.find((option) => option.value === kind)?.label || "Assignment";
}

export function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
