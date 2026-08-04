import type { Metadata } from "next";
import AdminRolesPermissionsClient from "./roles-permissions-client";

export const metadata: Metadata = {
  title: "Hinora | Roles & Permissions",
  description: "Administrative roles and permissions design for Hinora AI Policy Library",
};

export default function AdminRolesPermissionsPage() {
  return <AdminRolesPermissionsClient />;
}
