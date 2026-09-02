import { getApiBaseUrl } from "./api-base-url";

export type OrganizationSettings = {
  organizationName: string;
  organizationCode: string;
  organizationAddress: string;
  organizationPhone: string;
  logoUrl: string | null;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  landingPage: string;
  policyVisibility: string;
};

const LEGACY_STORAGE_KEY = "hinora_organization_settings";

export const defaultOrganizationSettings: OrganizationSettings = {
  organizationName: "Rural Bank of Hinora",
  organizationCode: "RBH",
  organizationAddress: "Main Corporate Office\nLa Trinidad, Benguet 2601\nPhilippines",
  organizationPhone: "+63 74 422 1000",
  logoUrl: "/branding/hinora-logo-icon.png",
  timeZone: "asia-manila",
  dateFormat: "mm-dd-yyyy",
  timeFormat: "12h",
  language: "en-ph",
  landingPage: "dashboard",
  policyVisibility: "assigned",
};

export function normalizeOrganizationSettings(
  value: Partial<OrganizationSettings> | null | undefined,
): OrganizationSettings {
  return {
    ...defaultOrganizationSettings,
    ...value,
    organizationName:
      typeof value?.organizationName === "string" && value.organizationName.trim()
        ? value.organizationName
        : defaultOrganizationSettings.organizationName,
    organizationCode:
      typeof value?.organizationCode === "string" && value.organizationCode.trim()
        ? value.organizationCode
        : defaultOrganizationSettings.organizationCode,
    organizationAddress:
      typeof value?.organizationAddress === "string"
        ? value.organizationAddress
        : defaultOrganizationSettings.organizationAddress,
    organizationPhone:
      typeof value?.organizationPhone === "string"
        ? value.organizationPhone
        : defaultOrganizationSettings.organizationPhone,
    logoUrl: value?.logoUrl === undefined ? defaultOrganizationSettings.logoUrl : value.logoUrl,
  };
}

function settingsFingerprint(settings: OrganizationSettings) {
  return JSON.stringify(normalizeOrganizationSettings(settings));
}

function readLegacyLocalSettings() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeOrganizationSettings(JSON.parse(raw) as Partial<OrganizationSettings>);
  } catch {
    return null;
  }
}

function clearLegacyLocalSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

async function requestSettings(path: string, init?: RequestInit) {
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

  const payload = (await response.json().catch(() => null)) as
    | { data?: Partial<OrganizationSettings>; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "Unable to load organization settings.");
  }

  return normalizeOrganizationSettings(payload?.data);
}

export async function fetchOrganizationSettings() {
  const remote = await requestSettings("/organization-settings");
  const legacy = readLegacyLocalSettings();

  if (
    legacy &&
    settingsFingerprint(remote) === settingsFingerprint(defaultOrganizationSettings) &&
    settingsFingerprint(legacy) !== settingsFingerprint(defaultOrganizationSettings)
  ) {
    const migrated = await persistOrganizationSettings(legacy);
    clearLegacyLocalSettings();
    return migrated;
  }

  if (legacy) {
    clearLegacyLocalSettings();
  }

  return remote;
}

export async function persistOrganizationSettings(settings: OrganizationSettings) {
  return requestSettings("/organization-settings", {
    method: "PATCH",
    body: JSON.stringify(normalizeOrganizationSettings(settings)),
  });
}
