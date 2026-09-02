import type { Metadata } from "next";
import EmployeeLocationsExperience from "../../../components/organization/employee-locations-experience";

export const metadata: Metadata = {
  title: "Hinora | Location",
  description: "View office locations and information",
};

export default function EmployeeLocationsPage() {
  return <EmployeeLocationsExperience />;
}
