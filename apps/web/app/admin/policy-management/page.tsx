import type { Metadata } from "next";
import AdminPolicyLibraryClient from "../policy-library/policy-library-client";

export const metadata: Metadata = {
  title: "Hinora | Policy Management",
  description: "Administrative policy management for Hinora AI Policy Library",
};

export default function AdminPolicyManagementPage() {
  return <AdminPolicyLibraryClient />;
}
