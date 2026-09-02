"use client";

import { useEffect, useState } from "react";
import {
  loadProfileAvatar,
  PROFILE_AVATAR_CHANGED_EVENT,
} from "../../lib/profile-avatar";
import { getHinoraSession } from "./session";

export function useProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setAvatarUrl(loadProfileAvatar(getHinoraSession()?.userId));
    }

    refresh();

    function handleStorage(event: StorageEvent) {
      if (event.key?.startsWith("hinora_avatar_")) {
        refresh();
      }
    }

    window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, refresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return avatarUrl;
}
