import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Location",
  description: "View office locations and information",
};

export default function EmployeeLocationsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="See locations, contacts, and policies that apply to your site."
    />
  );
}
