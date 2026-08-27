export type ReportId =
  | "user-activity"
  | "document-activity"
  | "policy-review"
  | "policy-exception"
  | "policy-approval"
  | "department-compliance"
  | "training-completion"
  | "access-permission"
  | "policy-library-summary";

export type ReportDefinition = {
  id: ReportId;
  name: string;
  description: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type ReportRow = Record<string, string>;

export type ReportExtraFilter = {
  key: string;
  label: string;
};

export type ReportSnapshot = {
  id: ReportId;
  name: string;
  description: string;
  showCurrencyNote: boolean;
  extraFilters: ReportExtraFilter[];
  columns: ReportColumn[];
  rows: ReportRow[];
};

export type ReportFormat = "CSV" | "PDF" | "XLS" | "View";
export type ReportHistoryStatus = "Completed" | "Failed";

export type ReportHistoryItem = {
  id: string;
  reportId: ReportId;
  name: string;
  generatedAt: string;
  generatedBy: string;
  dateFrom: string;
  dateTo: string;
  format: ReportFormat;
  status: ReportHistoryStatus;
  rowCount: number;
};

export const catalogReports: ReportDefinition[] = [
  {
    id: "user-activity",
    name: "User Activity Report",
    description: "Summary of user logins, page visits, and active sessions.",
  },
  {
    id: "document-activity",
    name: "Document Activity Report",
    description: "Overview of document uploads, updates, and downloads.",
  },
  {
    id: "policy-review",
    name: "Policy Review Status Report",
    description: "Status of policy reviews including overdue and upcoming reviews.",
  },
  {
    id: "policy-exception",
    name: "Policy Exception Report",
    description: "List of policy exceptions raised and their current status.",
  },
  {
    id: "policy-approval",
    name: "Policy Approval Report",
    description: "Summary of policies submitted, approved, and rejected.",
  },
  {
    id: "department-compliance",
    name: "Department Policy Compliance Report",
    description: "Compliance of departments to required policies.",
  },
  {
    id: "training-completion",
    name: "Training Completion Report",
    description: "Training completion status of users by course and department.",
  },
  {
    id: "access-permission",
    name: "Access & Permission Report",
    description: "Summary of user roles, permissions, and access changes.",
  },
  {
    id: "policy-library-summary",
    name: "Policy Library Summary Report",
    description: "Overall summary of policies by status and category.",
  },
];

const HISTORY_STORAGE_KEY = "hinora_reports_history";
const ROW_COUNT = 245;

const LOCATIONS = ["Head Office", "Baguio", "La Trinidad"];

const DEPARTMENTS = ["IT Department", "HR Department", "Compliance Department", "Operations"];

const USERS = ["Admin User", "Maria Santos", "John Dela Cruz", "Anna Reyes", "Michael Cruz", "Guest Auditor"];
const POLICIES = [
  "Information Security Policy",
  "Access Control Policy",
  "HR Code of Conduct",
  "Cybersecurity Incident Response",
  "Business Continuity Plan",
  "Data Classification Standard",
  "Vendor Risk Policy",
  "AI Usage Policy",
  "Endpoint Security Standard",
  "Board Governance Charter",
];
const COURSES = [
  "Information Security Essentials",
  "Code of Conduct",
  "AML & Compliance Basics",
  "Branch Operations Refresh",
  "Access Control Awareness",
];
const CATEGORIES = [
  "Information Security",
  "Access Control",
  "Human Resources",
  "Compliance",
  "Risk Management",
  "Cybersecurity",
  "Board Governance",
  "Endpoint Security",
];

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]) {
  return items[Math.floor(rng() * items.length)]!;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatReportDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatReportDateTime(date: Date) {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatReportDate(date)} ${time}`;
}

export function formatDateRange(from: Date, to: Date) {
  return `${formatReportDate(from)} – ${formatReportDate(to)}`;
}

export function uniqueValues(rows: ReportRow[], key: string) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean)));
}

export function snapshotMatrix(snapshot: ReportSnapshot, columns = snapshot.columns, rows = snapshot.rows) {
  return {
    labels: columns.map((column) => column.label),
    values: rows.map((row) => columns.map((column) => row[column.key] ?? "")),
  };
}

export function buildReportSnapshot(id: ReportId, from: Date, to: Date): ReportSnapshot {
  const definition = catalogReports.find((item) => item.id === id) ?? catalogReports[0];
  const seed = from.getDate() + to.getDate() * 31 + id.length * 17;
  const rng = mulberry32(seed + 2026);
  const rows = Array.from({ length: ROW_COUNT }, (_, index) => buildRow(id, index, rng, from));

  return {
    ...definition,
    ...reportLayout(id),
    rows,
  };
}

function reportLayout(id: ReportId): Omit<ReportSnapshot, "id" | "name" | "description" | "rows"> {
  const locationCol = { key: "location", label: "Location" };
  const departmentCol = { key: "department", label: "Department" };

  if (id === "user-activity") {
    return {
      showCurrencyNote: false,
      extraFilters: [{ key: "activity", label: "Activity type" }],
      columns: [
        locationCol,
        { key: "user", label: "User" },
        departmentCol,
        { key: "activity", label: "Activity" },
        { key: "device", label: "Device" },
        { key: "timestamp", label: "Timestamp" },
        { key: "status", label: "Status" },
      ],
    };
  }
  if (id === "document-activity") {
    return {
      showCurrencyNote: false,
      extraFilters: [{ key: "action", label: "Action" }],
      columns: [
        locationCol,
        { key: "document", label: "Document" },
        { key: "category", label: "Category" },
        { key: "action", label: "Action" },
        { key: "user", label: "User" },
        departmentCol,
        { key: "timestamp", label: "Timestamp" },
      ],
    };
  }
  if (id === "policy-review") {
    return {
      showCurrencyNote: false,
      extraFilters: [{ key: "status", label: "Status" }],
      columns: [
        locationCol,
        { key: "policy", label: "Policy" },
        { key: "owner", label: "Owner" },
        departmentCol,
        { key: "category", label: "Category" },
        { key: "reviewDate", label: "Review date" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
      ],
    };
  }
  if (id === "policy-exception") {
    return {
      showCurrencyNote: false,
      extraFilters: [
        { key: "status", label: "Status" },
        { key: "risk", label: "Risk" },
      ],
      columns: [
        locationCol,
        { key: "exception", label: "Exception" },
        { key: "policy", label: "Policy" },
        departmentCol,
        { key: "status", label: "Status" },
        { key: "expires", label: "Expires" },
        { key: "risk", label: "Risk" },
      ],
    };
  }
  if (id === "policy-approval") {
    return {
      showCurrencyNote: false,
      extraFilters: [{ key: "decision", label: "Decision" }],
      columns: [
        locationCol,
        { key: "policy", label: "Policy" },
        departmentCol,
        { key: "submittedBy", label: "Submitted by" },
        { key: "approver", label: "Approver" },
        { key: "submitted", label: "Submitted" },
        { key: "decision", label: "Decision" },
        { key: "turnaround", label: "Turnaround" },
      ],
    };
  }
  if (id === "department-compliance") {
    return {
      showCurrencyNote: false,
      extraFilters: [],
      columns: [
        locationCol,
        departmentCol,
        { key: "required", label: "Required", align: "right" },
        { key: "completed", label: "Completed", align: "right" },
        { key: "overdue", label: "Overdue", align: "right" },
        { key: "compliance", label: "Compliance", align: "right" },
        { key: "trend", label: "Trend" },
      ],
    };
  }
  if (id === "training-completion") {
    return {
      showCurrencyNote: false,
      extraFilters: [
        { key: "course", label: "Course" },
        { key: "progress", label: "Completion status" },
      ],
      columns: [
        locationCol,
        { key: "course", label: "Course" },
        departmentCol,
        { key: "assigned", label: "Assigned", align: "right" },
        { key: "completed", label: "Completed", align: "right" },
        { key: "overdue", label: "Overdue", align: "right" },
        { key: "rate", label: "Rate", align: "right" },
        { key: "progress", label: "Status" },
      ],
    };
  }
  if (id === "access-permission") {
    return {
      showCurrencyNote: false,
      extraFilters: [{ key: "change", label: "Change type" }],
      columns: [
        locationCol,
        { key: "user", label: "User" },
        departmentCol,
        { key: "change", label: "Change" },
        { key: "fromValue", label: "From" },
        { key: "toValue", label: "To" },
        { key: "changedBy", label: "Changed by" },
        { key: "date", label: "Date" },
      ],
    };
  }
  return {
    showCurrencyNote: false,
    extraFilters: [
      { key: "status", label: "Status" },
      { key: "category", label: "Category" },
    ],
    columns: [
      locationCol,
      { key: "category", label: "Category" },
      { key: "policy", label: "Policy" },
      departmentCol,
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" },
      { key: "updated", label: "Last update" },
      { key: "version", label: "Version" },
    ],
  };
}

function buildRow(id: ReportId, index: number, rng: () => number, from: Date): ReportRow {
  const location = pick(rng, LOCATIONS);
  const department = pick(rng, DEPARTMENTS);
  const day = new Date(from);
  day.setDate(from.getDate() - (index % 12));
  const stamp = formatReportDateTime(day);

  if (id === "user-activity") {
    return {
      location,
      user: pick(rng, USERS),
      department,
      activity: pick(rng, ["Logged In", "Failed login", "Logged Out", "Viewed policy", "Updated profile"]),
      device: pick(rng, ["Mac (macOS)", "Windows Desktop", "iPhone", "Android"]),
      timestamp: stamp,
      status: pick(rng, ["Success", "Success", "Success", "Failed"]),
    };
  }
  if (id === "document-activity") {
    return {
      location,
      document: pick(rng, POLICIES),
      category: pick(rng, CATEGORIES),
      action: pick(rng, ["Uploaded", "Updated", "Downloaded", "Viewed"]),
      user: pick(rng, USERS),
      department,
      timestamp: stamp,
    };
  }
  if (id === "policy-review") {
    return {
      location,
      policy: pick(rng, POLICIES),
      owner: pick(rng, USERS),
      department,
      category: pick(rng, CATEGORIES),
      reviewDate: formatReportDate(day),
      status: pick(rng, ["Overdue", "Upcoming", "Completed", "Upcoming"]),
      priority: pick(rng, ["High", "Medium", "Low"]),
    };
  }
  if (id === "policy-exception") {
    return {
      location,
      exception: pick(rng, [
        "Shared admin workstation",
        "Delayed MFA enrollment",
        "Legacy file share access",
        "External auditor guest login",
        "Temporary local admin",
      ]),
      policy: pick(rng, POLICIES),
      department,
      status: pick(rng, ["Open", "Approved", "Expired"]),
      expires: formatReportDate(day),
      risk: pick(rng, ["High", "Medium", "Low"]),
    };
  }
  if (id === "policy-approval") {
    const decision = pick(rng, ["Approved", "Pending", "Rejected"]);
    return {
      location,
      policy: pick(rng, POLICIES),
      department,
      submittedBy: pick(rng, USERS),
      approver: pick(rng, ["Maria Santos", "Admin User"]),
      submitted: formatReportDate(day),
      decision,
      turnaround: decision === "Pending" ? "—" : `${1 + (index % 5)} days`,
    };
  }
  if (id === "department-compliance") {
    const required = 24;
    const overdue = index % 7;
    const completed = required - overdue;
    return {
      location,
      department,
      required: String(required),
      completed: String(completed),
      overdue: String(overdue),
      compliance: `${Math.round((completed / required) * 100)}%`,
      trend: pick(rng, ["Up", "Down", "Steady"]),
    };
  }
  if (id === "training-completion") {
    const assigned = 8 + (index % 20);
    const overdue = index % 5;
    const completed = Math.max(0, assigned - overdue);
    const progress = overdue === 0 ? "Completed" : completed === 0 ? "Overdue" : "In progress";
    return {
      location,
      course: pick(rng, COURSES),
      department,
      assigned: String(assigned),
      completed: String(completed),
      overdue: String(overdue),
      rate: `${Math.round((completed / assigned) * 100)}%`,
      progress,
    };
  }
  if (id === "access-permission") {
    return {
      location,
      user: pick(rng, USERS),
      department,
      change: pick(rng, ["Role updated", "Permission granted", "Account created", "Access revoked", "MFA enforced"]),
      fromValue: pick(rng, ["Employee", "View only", "Optional", "HR Department"]),
      toValue: pick(rng, ["HR Officer", "Policies: Publish", "Required", "Operations", "None"]),
      changedBy: pick(rng, ["Admin User", "Maria Santos", "Anna Reyes"]),
      date: formatReportDate(day),
    };
  }

  return {
    location,
    category: pick(rng, CATEGORIES),
    policy: pick(rng, POLICIES),
    department,
    status: pick(rng, ["Published", "In review", "Draft"]),
    owner: pick(rng, USERS),
    updated: formatReportDate(day),
    version: `v${1 + (index % 5)}.${index % 9}`,
  };
}

export function downloadCsv(filename: string, columns: string[], rows: string[][]) {
  const header = columns.map(csvCell).join(",");
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadXls(filename: string, columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8" /></head><body><table>${header}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

export function downloadSnapshotCsv(snapshot: ReportSnapshot, columns = snapshot.columns, rows = snapshot.rows) {
  const matrix = snapshotMatrix(snapshot, columns, rows);
  downloadCsv(`hinora-${slug(snapshot.name)}.csv`, matrix.labels, matrix.values);
}

export function downloadSnapshotXls(snapshot: ReportSnapshot, columns = snapshot.columns, rows = snapshot.rows) {
  const matrix = snapshotMatrix(snapshot, columns, rows);
  downloadXls(`hinora-${slug(snapshot.name)}.xls`, matrix.labels, matrix.values);
}

export function printReport(
  snapshot: ReportSnapshot,
  rangeLabel: string,
  generatedAt: string,
  columns = snapshot.columns,
  rows = snapshot.rows,
) {
  const windowRef = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!windowRef) return;
  const header = columns
    .map(
      (column) =>
        `<th style="text-align:${column.align === "right" ? "right" : "left"};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(column.label)}</th>`,
    )
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (column) =>
              `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:${column.align === "right" ? "right" : "left"};">${escapeHtml(row[column.key] ?? "")}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  windowRef.document.write(`<!doctype html><html><head><title>${escapeHtml(snapshot.name)}</title></head>
    <body style="font-family:Inter,system-ui,sans-serif;color:#0f172a;padding:32px;">
      <h1 style="margin:0 0 4px;font-size:22px;">${escapeHtml(snapshot.name)}</h1>
      <p style="margin:0 0 18px;color:#64748b;font-size:13px;">${escapeHtml(rangeLabel)} · Generated ${escapeHtml(generatedAt)} · ${rows.length} records</p>
      <table style="width:100%;border-collapse:collapse;"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`);
  windowRef.document.close();
  windowRef.focus();
  windowRef.print();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createHistoryId() {
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadReportHistory(): ReportHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return createSeedHistory();
    const parsed = JSON.parse(raw) as ReportHistoryItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : createSeedHistory();
  } catch {
    return createSeedHistory();
  }
}

export function saveReportHistory(items: ReportHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function createSeedHistory(): ReportHistoryItem[] {
  const now = new Date();
  const names = [
    { id: "user-activity" as const, format: "XLS" as const, daysAgo: 1, fromOffset: 7 },
    { id: "policy-library-summary" as const, format: "PDF" as const, daysAgo: 2, fromOffset: 30 },
    { id: "department-compliance" as const, format: "View" as const, daysAgo: 3, fromOffset: 30 },
    { id: "training-completion" as const, format: "CSV" as const, daysAgo: 5, fromOffset: 14 },
    { id: "policy-approval" as const, format: "PDF" as const, daysAgo: 8, fromOffset: 30 },
    { id: "access-permission" as const, format: "CSV" as const, daysAgo: 9, fromOffset: 7 },
    { id: "document-activity" as const, format: "View" as const, daysAgo: 12, fromOffset: 7 },
    { id: "policy-review" as const, format: "PDF" as const, daysAgo: 14, fromOffset: 90 },
  ];

  return names.map((item, index) => {
    const generated = new Date(now);
    generated.setDate(now.getDate() - item.daysAgo);
    generated.setHours(10 + (index % 8), 15 + index * 3, 0, 0);
    const to = new Date(generated);
    const from = new Date(generated);
    from.setDate(generated.getDate() - item.fromOffset);
    const definition = catalogReports.find((report) => report.id === item.id)!;
    return {
      id: `seed-${item.id}-${item.daysAgo}`,
      reportId: item.id,
      name: definition.name,
      generatedAt: generated.toISOString(),
      generatedBy: index % 2 === 0 ? "Admin User" : "Maria Santos",
      dateFrom: toDateInputValue(from),
      dateTo: toDateInputValue(to),
      format: item.format,
      status: index === 6 ? "Failed" : "Completed",
      rowCount: ROW_COUNT,
    };
  });
}
