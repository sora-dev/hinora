import type { Metadata } from "next";
import AdminUsersClient from "./users-client";

export const metadata: Metadata = {
  title: "Hinora | Users",
  description: "Administrative user management for Hinora AI Policy Library",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
