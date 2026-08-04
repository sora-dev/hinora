import type { Metadata } from "next";
import AdminCategoriesClient from "./categories-client";

export const metadata: Metadata = {
  title: "Hinora | Categories",
  description: "Administrative category management for Hinora AI Policy Library",
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesClient />;
}

