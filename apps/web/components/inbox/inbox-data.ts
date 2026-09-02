import { getApiBaseUrl } from "../../lib/api-base-url";

export type InboxCategory = "ASSIGNMENT" | "COMPLIANCE" | "SYSTEM" | "UPDATES";
export type InboxPriority = "HIGH" | "MEDIUM" | "LOW";
export type InboxTab = "all" | "unread" | "assignments" | "compliance" | "system" | "updates";

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  category: InboxCategory;
  priority: InboxPriority;
  read: boolean;
  createdAt: string;
  policyId: string | null;
  policyName: string | null;
  assignedBy: string | null;
  assignedDate: string | null;
  dueDate: string | null;
  scope: string | null;
  steps: string[];
  actionLabel: string | null;
};

export type InboxCounts = {
  all: number;
  unread: number;
  assignments: number;
  compliance: number;
  system: number;
  updates: number;
};

export type InboxPayload = {
  unread: number;
  counts: InboxCounts;
  items: InboxItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const INBOX_CHANGED_EVENT = "hinora-inbox-changed";

export function emitInboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INBOX_CHANGED_EVENT));
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("API URL is not configured.");
  }
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }
  const payload = (await response.json().catch(() => null)) as T | { message?: string | string[] } | null;
  if (!response.ok || !payload) {
    const message = payload && typeof payload === "object" && "message" in payload ? payload.message : null;
    throw new Error(
      Array.isArray(message) ? message[0] : message || "Unable to load notifications.",
    );
  }
  return payload as T;
}

export async function fetchInbox(params: {
  tab?: InboxTab;
  search?: string;
  category?: InboxCategory | "";
  priority?: InboxPriority | "";
  page?: number;
  pageSize?: number;
}): Promise<InboxPayload> {
  const query = new URLSearchParams();
  if (params.tab && params.tab !== "all") query.set("tab", params.tab);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.category) query.set("category", params.category);
  if (params.priority) query.set("priority", params.priority);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  const payload = await requestJson<{ data: InboxPayload }>(`/notifications/inbox?${query.toString()}`);
  return payload.data;
}

export async function fetchInboxUnreadCount(): Promise<number> {
  const payload = await requestJson<{ data: { unread: number } }>("/notifications/inbox/unread-count");
  return payload.data.unread;
}

export async function markInboxRead(id: string, read = true) {
  const payload = await requestJson<{ data: InboxItem }>(`/notifications/inbox/${id}/read`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  });
  emitInboxChanged();
  return payload.data;
}

export async function markAllInboxRead() {
  const payload = await requestJson<{ data: { updated: number } }>("/notifications/inbox/read-all", {
    method: "POST",
  });
  emitInboxChanged();
  return payload.data;
}

export async function deleteInboxItem(id: string) {
  await requestJson(`/notifications/inbox/${id}`, { method: "DELETE" });
  emitInboxChanged();
}

export function categoryLabel(category: InboxCategory) {
  if (category === "ASSIGNMENT") return "Assignment";
  if (category === "COMPLIANCE") return "Compliance";
  if (category === "SYSTEM") return "System";
  return "Updates";
}

export function priorityLabel(priority: InboxPriority) {
  if (priority === "HIGH") return "High";
  if (priority === "LOW") return "Low";
  return "Medium";
}

export function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - day.getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  if (days === 1) return `Yesterday, ${time}`;
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatInboxDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: "" };
  return {
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}
