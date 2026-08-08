import type { Metadata } from "next";
import ComplianceManagementClient from "../../../components/compliance/compliance-management-client";

export const metadata: Metadata = {
  title: "Hinora | Compliance Center",
  description: "Monitor policy compliance, acknowledgements, assessments, and reminders",
};

export default function AdminComplianceManagementPage() {
  return <ComplianceManagementClient />;
}
