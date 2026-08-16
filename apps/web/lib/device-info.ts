const DEVICE_FINGERPRINT_KEY = "hinora_device_fingerprint";

type NavigatorWithHints = Navigator & {
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
    brands?: Array<{ brand: string; version: string }>;
  };
};

export function getOrCreateDeviceFingerprint() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(DEVICE_FINGERPRINT_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const fingerprint =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}

export function collectDeviceClientInfo() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      fingerprint: "",
      userAgent: "",
    };
  }

  const nav = navigator as NavigatorWithHints;
  const uaData = nav.userAgentData;
  const brand = uaData?.brands?.find(
    (item) => item.brand !== "Not;A=Brand" && item.brand !== "Chromium" && !item.brand.startsWith("Not"),
  );

  return {
    fingerprint: getOrCreateDeviceFingerprint(),
    userAgent: navigator.userAgent,
    platform: uaData?.platform || navigator.platform,
    browser: brand ? `${brand.brand} ${brand.version}` : undefined,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen:
      typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : undefined,
  };
}
