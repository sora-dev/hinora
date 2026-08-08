import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Audit Logs",
  description: "Full audit trail for the Hinora AI Policy System",
};

export default function AdminAuditLogsPage() {
  return (
    <ComingSoon
      variant="admin"
      description="A complete, exportable audit trail of every policy, user, and permission change made in Hinora."
    />
  );
}
