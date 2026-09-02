import type { Metadata } from "next";
import AuditLogsExperience from "../../../components/audit-logs/audit-logs-experience";

export const metadata: Metadata = {
  title: "Hinora | Audit Logs",
  description: "Track and review all system activities and changes in Hinora",
};

export default function AdminAuditLogsPage() {
  return <AuditLogsExperience />;
}
