export const PROFILE_AVATAR_CHANGED_EVENT = "hinora-profile-avatar-changed";

const AVATAR_STORAGE_PREFIX = "hinora_avatar_";

export function profileAvatarStorageKey(userId: string) {
  return `${AVATAR_STORAGE_PREFIX}${userId}`;
}

export function loadProfileAvatar(userId?: string | null) {
  if (typeof window === "undefined" || !userId?.trim()) {
    return null;
  }

  return window.localStorage.getItem(profileAvatarStorageKey(userId.trim()));
}

export function saveProfileAvatar(userId: string, dataUrl: string) {
  if (typeof window === "undefined" || !userId.trim()) {
    return;
  }

  window.localStorage.setItem(profileAvatarStorageKey(userId.trim()), dataUrl);
  window.dispatchEvent(
    new CustomEvent(PROFILE_AVATAR_CHANGED_EVENT, {
      detail: { userId: userId.trim(), avatarUrl: dataUrl },
    }),
  );
}
