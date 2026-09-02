import { getApiBaseUrl } from "../../lib/api-base-url";
import { getHinoraSession } from "../dashboard/session";
import { emitInboxChanged, fetchInboxUnreadCount, INBOX_CHANGED_EVENT } from "./inbox-data";

const POLL_MS = 12_000;
const RECONNECT_MS = 2_000;

let started = false;
let source: EventSource | null = null;
let pollTimer: number | null = null;
let reconnectTimer: number | null = null;
let unread = 0;
let fetching = false;
let queued = false;
let queuedForceList = false;

type CountListener = (count: number) => void;
const countListeners = new Set<CountListener>();

function sessionUserId() {
  return getHinoraSession()?.userId?.trim() || "";
}

function publishCount(count: number) {
  unread = count;
  countListeners.forEach((listener) => listener(count));
}

async function refreshUnread(forceList = false) {
  if (fetching) {
    queued = true;
    queuedForceList = queuedForceList || forceList;
    return;
  }

  fetching = true;
  try {
    const next = await fetchInboxUnreadCount();
    const changed = next !== unread;
    publishCount(next);
    if (forceList || changed) {
      emitInboxChanged();
    }
  } catch {
    // Keep the last known count; the next poll or SSE event will retry.
  } finally {
    fetching = false;
    if (queued) {
      const again = queuedForceList;
      queued = false;
      queuedForceList = false;
      void refreshUnread(again);
    }
  }
}

function parseStreamPayload(raw: string): { type?: string } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      return JSON.parse(parsed) as { type?: string };
    }
    if (parsed && typeof parsed === "object") {
      return parsed as { type?: string };
    }
    return null;
  } catch {
    return null;
  }
}

function handleStreamPayload(raw: string) {
  const payload = parseStreamPayload(raw);
  if (payload?.type === "inbox-updated") {
    void refreshUnread(true);
  }
}

function scheduleReconnect() {
  if (reconnectTimer != null || !started) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    if (started) startStream();
  }, RECONNECT_MS);
}

function stopStream() {
  source?.close();
  source = null;
}

function startStream() {
  const apiBaseUrl = getApiBaseUrl();
  const userId = sessionUserId();
  if (!apiBaseUrl || !userId || typeof EventSource === "undefined") {
    scheduleReconnect();
    return;
  }

  stopStream();
  const url = `${apiBaseUrl}/notifications/inbox/stream?userId=${encodeURIComponent(userId)}`;
  source = new EventSource(url);
  source.onmessage = (event) => handleStreamPayload(event.data);
  source.addEventListener("inbox-updated", (event) => {
    handleStreamPayload((event as MessageEvent<string>).data);
  });
  source.onerror = () => {
    if (!source || source.readyState === EventSource.CLOSED) {
      stopStream();
      scheduleReconnect();
    }
  };
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refreshUnread();
  startStream();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void refreshUnread(source?.readyState !== EventSource.OPEN);
  }, POLL_MS);
  window.addEventListener("focus", () => {
    void refreshUnread();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!source || source.readyState === EventSource.CLOSED) startStream();
      void refreshUnread();
    }
  });
}

export function subscribeInboxLive() {
  ensureStarted();
  return INBOX_CHANGED_EVENT;
}

export function subscribeInboxUnreadCount(listener: CountListener) {
  ensureStarted();
  listener(unread);
  countListeners.add(listener);
  return () => {
    countListeners.delete(listener);
  };
}
