import { getApiBaseUrl } from "../../lib/api-base-url";
import {
  defaultOrganizationSettings,
  fetchOrganizationSettings,
  type OrganizationSettings,
} from "../../lib/organization-settings";

export type ReportId =
  | "user-activity"
  | "document-activity"
  | "policy-review"
  | "policy-exception"
  | "policy-approval"
  | "department-compliance"
  | "training-completion"
  | "access-permission"
  | "policy-library-summary"
  | "policy-assignment";

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
  {
    id: "policy-assignment",
    name: "Policy Assignment Report",
    description: "Assignments by policy, scope, due date, priority, and completion status.",
  },
];

const LEGACY_HISTORY_STORAGE_KEY = "hinora_reports_history";

export function defaultReportRange(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from, to };
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
  if (id === "policy-assignment") {
    return {
      showCurrencyNote: false,
      extraFilters: [
        { key: "status", label: "Status" },
        { key: "scope", label: "Scope" },
        { key: "priority", label: "Priority" },
      ],
      columns: [
        { key: "policy", label: "Policy" },
        { key: "version", label: "Version" },
        { key: "scope", label: "Scope" },
        { key: "recipients", label: "Recipients", align: "right" },
        { key: "startDate", label: "Start date" },
        { key: "dueDate", label: "Due date" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
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

function normalizeSnapshot(id: ReportId, value: Partial<ReportSnapshot> | null | undefined): ReportSnapshot {
  const definition = catalogReports.find((item) => item.id === id) ?? catalogReports[0];
  const layout = reportLayout(id);
  const rows = Array.isArray(value?.rows)
    ? value.rows.filter((row): row is ReportRow => Boolean(row) && typeof row === "object")
    : [];

  return {
    id,
    name: value?.name ?? definition.name,
    description: value?.description ?? definition.description,
    showCurrencyNote: value?.showCurrencyNote ?? layout.showCurrencyNote,
    extraFilters: value?.extraFilters ?? layout.extraFilters,
    columns: value?.columns ?? layout.columns,
    rows: rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, String(cell ?? "")])),
    ),
  };
}

export async function fetchReportSnapshot(id: ReportId, from: Date, to: Date): Promise<ReportSnapshot> {
  const params = new URLSearchParams({
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  });
  const payload = await requestReportHistory<{ data?: Partial<ReportSnapshot> }>(
    `/reports/${id}?${params.toString()}`,
  );
  return normalizeSnapshot(id, payload.data);
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

function resolvePrintAssetUrl(value: string | null) {
  if (!value) return "";
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function waitForPrintImages(doc: Document) {
  const images = Array.from(doc.images);
  if (images.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(() => resolve(), 1200);
        }),
    ),
  ).then(() => undefined);
}

function buildReportPrintHtml(
  snapshot: ReportSnapshot,
  rangeLabel: string,
  generatedAt: string,
  columns: ReportColumn[],
  rows: ReportRow[],
  organization: OrganizationSettings,
) {
  const logoSrc = resolvePrintAssetUrl(organization.logoUrl);
  const address = organization.organizationAddress.trim();
  const phone = organization.organizationPhone.trim();
  const header = columns
    .map(
      (column) =>
        `<th class="${column.align === "right" ? "num" : ""}">${escapeHtml(column.label)}</th>`,
    )
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (column) =>
              `<td class="${column.align === "right" ? "num" : ""}">${escapeHtml(row[column.key] ?? "")}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const logoHtml = logoSrc
    ? `<img class="org-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(organization.organizationName)}" />`
    : `<div class="org-mark">${escapeHtml(organization.organizationCode || "ORG")}</div>`;
  const addressHtml = address
    ? `<p class="org-address">${escapeHtml(address)}</p>`
    : "";
  const phoneHtml = phone
    ? `<p class="org-phone">Phone/Mobile Number: ${escapeHtml(phone)}</p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(snapshot.name)}</title>
    <style>
      @page {
        size: letter portrait;
        margin: 0.5in 0.6in 0.95in;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: Inter, system-ui, -apple-system, sans-serif;
        color: #0f172a;
        background: #fff;
        padding-bottom: 0.7in;
      }
      .letterhead {
        width: 100%;
        text-align: center;
        padding: 0 0 14px;
        border-bottom: 2px solid #1d4ed8;
        margin-bottom: 18px;
      }
      .letterhead-inner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        max-width: 92%;
        text-align: center;
      }
      .org-logo {
        width: 58px;
        height: 58px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .org-mark {
        width: 58px;
        height: 58px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      .org-copy { min-width: 0; text-align: center; }
      .org-name { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
      .org-address { margin: 6px 0 0; font-size: 11.5px; color: #475569; white-space: pre-line; line-height: 1.45; }
      .org-phone { margin: 4px 0 0; font-size: 11.5px; color: #475569; }
      .report-title { margin: 0 0 4px; font-size: 16px; font-weight: 800; text-align: center; }
      .report-meta { margin: 0 0 16px; font-size: 11px; color: #64748b; text-align: center; }
      .data-table { width: 100%; border-collapse: collapse; }
      .data-table thead { display: table-header-group; }
      .data-table th, .data-table td {
        padding: 7px 8px;
        font-size: 11px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }
      .data-table th {
        text-align: left;
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #cbd5e1;
      }
      .num { text-align: right; }
      .data-table tr { page-break-inside: avoid; }
      .print-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 8px 0 4px;
        border-top: 1px solid #cbd5e1;
        font-size: 9.5px;
        color: #64748b;
        text-align: center;
        line-height: 1.45;
        background: #fff;
      }
      .print-footer strong { color: #0f172a; font-weight: 700; }
    </style>
  </head>
  <body>
    <header class="letterhead">
      <div class="letterhead-inner">
        ${logoHtml}
        <div class="org-copy">
          <p class="org-name">${escapeHtml(organization.organizationName)}</p>
          ${addressHtml}
          ${phoneHtml}
        </div>
      </div>
    </header>
    <h1 class="report-title">${escapeHtml(snapshot.name)}</h1>
    <p class="report-meta">${escapeHtml(rangeLabel)} · Generated ${escapeHtml(generatedAt)} · ${rows.length} records</p>
    <table class="data-table">
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <footer class="print-footer">
      <div><strong>Confidential</strong> — For authorized personnel of ${escapeHtml(organization.organizationName)} only.</div>
      <div>Generated by Hinora Policy System${phone ? ` · Tel ${escapeHtml(phone)}` : ""} · Printed ${escapeHtml(generatedAt)}</div>
    </footer>
  </body>
</html>`;
}

export async function printReport(
  snapshot: ReportSnapshot,
  rangeLabel: string,
  generatedAt: string,
  columns = snapshot.columns,
  rows = snapshot.rows,
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const organization = await fetchOrganizationSettings().catch(
    () => defaultOrganizationSettings,
  );
  const html = buildReportPrintHtml(
    snapshot,
    rangeLabel,
    generatedAt,
    columns,
    rows,
    organization,
  );
  document.getElementById("hinora-print-frame")?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "hinora-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Print report");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:8.5in;height:11in;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return;
  }

  let printed = false;
  const cleanup = () => {
    iframe.remove();
  };

  const startPrint = () => {
    if (printed || !frameWindow.document.querySelector(".letterhead")) {
      return;
    }
    printed = true;
    void waitForPrintImages(frameWindow.document).then(() => {
      frameWindow.focus();
      frameWindow.print();
      frameWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 60_000);
    });
  };

  iframe.addEventListener("load", startPrint);
  iframe.srcdoc = html;
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

function isReportId(value: string): value is ReportId {
  return catalogReports.some((report) => report.id === value);
}

function normalizeHistoryItem(value: Partial<ReportHistoryItem> | null | undefined): ReportHistoryItem | null {
  if (!value?.id || !value.reportId || !isReportId(value.reportId) || !value.name) {
    return null;
  }

  return {
    id: value.id,
    reportId: value.reportId,
    name: value.name,
    generatedAt: value.generatedAt ?? new Date().toISOString(),
    generatedBy: value.generatedBy ?? "Admin User",
    dateFrom: value.dateFrom ?? "",
    dateTo: value.dateTo ?? "",
    format: value.format ?? "View",
    status: value.status ?? "Completed",
    rowCount: typeof value.rowCount === "number" ? value.rowCount : 0,
  };
}

function readLegacyReportHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<ReportHistoryItem>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeHistoryItem(item))
      .filter((item): item is ReportHistoryItem => Boolean(item && !item.id.startsWith("seed-")));
  } catch {
    return [];
  }
}

function clearLegacyReportHistory() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
}

async function requestReportHistory<T>(path: string, init?: RequestInit) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("API is not configured.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload?.message ?? "Unable to update report history.");
  }

  return payload;
}

export async function fetchReportHistory() {
  const payload = await requestReportHistory<{ data?: Partial<ReportHistoryItem>[] }>(
    "/report-history",
  );
  const remote = (payload.data ?? [])
    .map((item) => normalizeHistoryItem(item))
    .filter((item): item is ReportHistoryItem => Boolean(item));

  const legacy = readLegacyReportHistory();
  if (legacy.length === 0) {
    clearLegacyReportHistory();
    return remote;
  }

  if (remote.length === 0) {
    const imported: ReportHistoryItem[] = [];
    for (const item of legacy) {
      imported.push(await createReportHistory(item));
    }
    clearLegacyReportHistory();
    return imported;
  }

  clearLegacyReportHistory();
  return remote;
}

export async function createReportHistory(
  item: Omit<ReportHistoryItem, "id"> & { id?: string },
) {
  const payload = await requestReportHistory<{ data?: Partial<ReportHistoryItem> }>(
    "/report-history",
    {
      method: "POST",
      body: JSON.stringify({
        reportId: item.reportId,
        name: item.name,
        generatedAt: item.generatedAt,
        generatedBy: item.generatedBy,
        dateFrom: item.dateFrom,
        dateTo: item.dateTo,
        format: item.format,
        status: item.status,
        rowCount: item.rowCount,
      }),
    },
  );

  const created = normalizeHistoryItem(payload.data);
  if (!created) {
    throw new Error("Unable to save report history.");
  }

  return created;
}

export async function deleteReportHistory(id: string) {
  await requestReportHistory(`/report-history/${id}`, { method: "DELETE" });
}
