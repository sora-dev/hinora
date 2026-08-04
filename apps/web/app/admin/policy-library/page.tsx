import type { Metadata } from "next";
import AdminPolicyLibraryClient from "./admin-policy-library-client";

export const metadata: Metadata = {
  title: "Hinora | Policy Library",
  description: "Shared policy library for administrators in Hinora AI Policy Library",
};

export default function AdminPolicyLibraryPage() {
  return <AdminPolicyLibraryClient />;
}
