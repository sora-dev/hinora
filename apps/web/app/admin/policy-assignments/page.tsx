import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Policy Assignments",
  description: "Assign policies to departments, locations, roles, and employees",
};

export default function AdminPolicyAssignmentsPage() {
  return (
    <ComingSoon
      variant="admin"
      description="Assign policies to departments, locations, roles, or individual employees, each with its own due date."
    />
  );
}
