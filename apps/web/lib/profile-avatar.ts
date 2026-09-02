import { getApiBaseUrl } from "./api-base-url";

export const PROFILE_AVATAR_CHANGED_EVENT = "hinora-profile-avatar-changed";

const AVATAR_STORAGE_PREFIX = "hinora_avatar_";

export function profileAvatarStorageKey(userId: string) {
  return `${AVATAR_STORAGE_PREFIX}${userId}`;
}

export function resolveAvatarSrc(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return null;
  }

  if (
    avatarUrl.startsWith("data:") ||
    avatarUrl.startsWith("blob:") ||
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://")
  ) {
    return avatarUrl;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return avatarUrl;
  }

  return `${apiBaseUrl}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

export function loadProfileAvatar(userId?: string | null) {
  if (typeof window === "undefined" || !userId?.trim()) {
    return null;
  }

  return window.localStorage.getItem(profileAvatarStorageKey(userId.trim()));
}

export function saveProfileAvatar(userId: string, avatarUrl: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }

  window.localStorage.setItem(profileAvatarStorageKey(userId.trim()), avatarUrl);
  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_CHANGED_EVENT, {
      detail: { userId: userId.trim(), avatarUrl },
    }),
  );
}

export function clearProfileAvatar(userId: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }

  window.localStorage.removeItem(profileAvatarStorageKey(userId.trim()));
  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_CHANGED_EVENT, {
      detail: { userId: userId.trim(), avatarUrl: null },
    }),
  );
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("Unable to reach the server.");
  }

  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${apiBaseUrl}/users/${userId}/avatar`, {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as
    | { avatarUrl?: string | null; updatedAt?: string; message?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update profile photo.");
  }

  const avatarUrl = payload?.avatarUrl
    ? `${payload.avatarUrl}${payload.updatedAt ? `?v=${encodeURIComponent(payload.updatedAt)}` : ""}`
    : null;
  if (avatarUrl) {
    saveProfileAvatar(userId, avatarUrl);
  }
  return avatarUrl;
}
