import type { Metadata } from "next";
import AdminLocationsClient from "./locations-client";

export const metadata: Metadata = {
  title: "Hinora | Location",
  description: "Manage organizational offices and locations",
};

export default function AdminLocationsPage() {
  return <AdminLocationsClient />;
}
