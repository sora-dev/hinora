const sessionStorageKey = "hinora_session";

export type HinoraSession = {
  accessToken?: string;
  userId?: string;
  email?: string;
  role?: string;
  roleTitle?: string;
  name?: string;
  redirectTo?: string;
  rememberMe?: boolean;
};

export function getHinoraSession(): HinoraSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(sessionStorageKey) ?? "null") as HinoraSession | null;
  } catch {
    return null;
  }
}

export function getSessionUserIdentity() {
  const session = getHinoraSession();

  if (!session) {
    return null;
  }

  if (session.userId?.trim()) {
    return { userId: session.userId.trim(), email: session.email?.trim().toLowerCase() };
  }

  if (session.email?.trim()) {
    return { email: session.email.trim().toLowerCase() };
  }

  return null;
}

export type SessionProfileDisplay = {
  name: string;
  role: string;
  avatarText: string;
};

function getInitialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getSessionProfileDisplay(
  fallback?: Partial<SessionProfileDisplay>,
): SessionProfileDisplay {
  const session = getHinoraSession();
  const sessionName = session?.name?.trim();
  const sessionRoleTitle = session?.roleTitle?.trim();
  const name =
    sessionName ||
    fallback?.name?.trim() ||
    session?.email?.trim() ||
    "User";

  const roleFromSessionRole =
    session?.role === "ADMIN"
      ? "System Administrator"
      : session?.role === "MANAGER"
        ? "Manager"
        : session?.role === "EMPLOYEE"
          ? "Employee"
          : "";

  const role =
    sessionRoleTitle ||
    roleFromSessionRole ||
    fallback?.role?.trim() ||
    "Employee";

  return {
    name,
    role,
    avatarText: sessionName
      ? getInitialsFromName(name)
      : fallback?.avatarText?.trim() || getInitialsFromName(name),
  };
}
