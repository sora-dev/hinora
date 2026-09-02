import { getApiBaseUrl } from "./api-base-url";

export function recordClientAuditEvent(input: {
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "FAILED LOGIN";
  module: string;
  resourceType: string;
  resource: string;
  details: string;
  status?: "Success" | "Failed";
}) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl || typeof window === "undefined") {
    return;
  }

  void fetch(`${apiBaseUrl}/audit-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: input.action === "FAILED LOGIN" ? "FAILED_LOGIN" : input.action,
      module: input.module,
      resourceType: input.resourceType,
      resource: input.resource,
      details: input.details,
      status: input.status ?? "Success",
    }),
  }).catch(() => {
    // Client-side audit capture is best-effort.
  });
}
