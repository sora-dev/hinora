import { getApiBaseUrl } from "../../lib/api-base-url";

export type BookmarkType = "POLICY" | "GUIDELINE" | "PROCEDURE";
export type BookmarkSort = "recent" | "title" | "type";
export type BookmarkTab = "all" | "collections";

export type BookmarkCollection = {
  id: string;
  name: string;
  description?: string;
  count: number;
  createdAt: string;
};

export type BookmarkItem = {
  id: string;
  policyId: string;
  title: string;
  type: BookmarkType;
  typeLabel: string;
  department: string;
  categoryName: string;
  version: number;
  collectionId: string | null;
  collectionName: string | null;
  bookmarkedAt: string;
};

export type BookmarksPayload = {
  items: BookmarkItem[];
  collections: BookmarkCollection[];
  uncategorized: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const BOOKMARKS_CHANGED_EVENT = "hinora-bookmarks-changed";

export function emitBookmarksChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BOOKMARKS_CHANGED_EVENT));
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
    throw new Error(Array.isArray(message) ? message[0] : message || "Unable to load bookmarks.");
  }
  return payload as T;
}

export async function fetchBookmarks(params: {
  search?: string;
  type?: BookmarkType | "";
  collectionId?: string;
  sort?: BookmarkSort;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.type) query.set("type", params.type);
  if (params.collectionId) query.set("collectionId", params.collectionId);
  if (params.sort) query.set("sort", params.sort);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 12));
  return requestJson<BookmarksPayload>(`/bookmarks?${query.toString()}`);
}

export async function fetchBookmarkIds() {
  return requestJson<{ policyIds: string[] }>("/bookmarks/ids");
}

export async function fetchBookmarkStatus(policyId: string) {
  const query = new URLSearchParams({ policyId });
  return requestJson<{ bookmarked: boolean; id: string | null }>(`/bookmarks/status?${query.toString()}`);
}

export async function addBookmark(policyId: string, collectionId?: string | null) {
  const payload = await requestJson<{ data: BookmarkItem }>("/bookmarks", {
    method: "POST",
    body: JSON.stringify({
      policyId,
      ...(collectionId !== undefined ? { collectionId } : {}),
    }),
  });
  emitBookmarksChanged();
  return payload.data;
}

export async function moveBookmark(id: string, collectionId: string | null) {
  const payload = await requestJson<{ data: BookmarkItem }>(`/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ collectionId }),
  });
  emitBookmarksChanged();
  return payload.data;
}

export async function removeBookmark(id: string) {
  await requestJson<{ data: { id: string; policyId: string } }>(`/bookmarks/${id}`, {
    method: "DELETE",
  });
  emitBookmarksChanged();
}

export async function removeBookmarkByPolicy(policyId: string) {
  await requestJson<{ data: { id: string | null; policyId: string } }>(
    `/bookmarks/policy/${policyId}`,
    { method: "DELETE" },
  );
  emitBookmarksChanged();
}

export async function togglePolicyBookmark(policyId: string, currentlyBookmarked: boolean) {
  if (currentlyBookmarked) {
    await removeBookmarkByPolicy(policyId);
    return false;
  }
  await addBookmark(policyId);
  return true;
}

export async function fetchCollections() {
  return requestJson<{ collections: BookmarkCollection[]; uncategorized: number }>("/bookmarks/collections");
}

export async function createCollection(name: string) {
  const payload = await requestJson<{ data: BookmarkCollection }>("/bookmarks/collections", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  emitBookmarksChanged();
  return payload.data;
}

export async function renameCollection(id: string, name: string) {
  const payload = await requestJson<{ data: BookmarkCollection }>(`/bookmarks/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  emitBookmarksChanged();
  return payload.data;
}

export async function deleteCollection(id: string) {
  await requestJson<{ data: { id: string } }>(`/bookmarks/collections/${id}`, {
    method: "DELETE",
  });
  emitBookmarksChanged();
}

export function formatBookmarkDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
