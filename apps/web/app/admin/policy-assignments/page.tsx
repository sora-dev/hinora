import type { Metadata } from "next";
import PolicyAssignmentsExperience from "../../../components/policy-assignments/policy-assignments-experience";

export const metadata: Metadata = {
  title: "Hinora | Policy Assignments",
  description: "Create and manage policy assignments for users, departments, branches, and roles",
};

export default function AdminPolicyAssignmentsPage() {
  return <PolicyAssignmentsExperience />;
}
