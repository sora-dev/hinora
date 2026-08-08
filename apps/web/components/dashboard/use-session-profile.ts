"use client";

import { useEffect, useState } from "react";
import {
  getSessionProfileDisplay,
  type SessionProfileDisplay,
} from "./session";

function getFallbackProfile(
  fallback?: Partial<SessionProfileDisplay>,
): SessionProfileDisplay {
  const name = fallback?.name?.trim() || "User";
  const role = fallback?.role?.trim() || "Employee";
  const parts = name.split(/\s+/).filter(Boolean);
  const avatarText =
    fallback?.avatarText?.trim() ||
    (parts.length === 0
      ? "U"
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase());

  return { name, role, avatarText };
}

export function useSessionProfile(
  fallback?: Partial<SessionProfileDisplay>,
): SessionProfileDisplay {
  // Match server HTML on the first paint; apply session values after mount.
  const [profile, setProfile] = useState<SessionProfileDisplay>(() =>
    getFallbackProfile(fallback),
  );

  useEffect(() => {
    setProfile(getSessionProfileDisplay(fallback));
  }, [fallback?.avatarText, fallback?.name, fallback?.role]);

  return profile;
}
