import type { Metadata } from "next";
import AdminDepartmentsClient from "./departments-client";

export const metadata: Metadata = {
  title: "Hinora | Departments",
  description: "Manage and organize departments within the organization",
};

export default function AdminDepartmentsPage() {
  return <AdminDepartmentsClient />;
}
