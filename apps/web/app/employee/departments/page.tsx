import type { Metadata } from "next";
import EmployeeDepartmentsExperience from "../../../components/organization/employee-departments-experience";

export const metadata: Metadata = {
  title: "Hinora | Departments",
  description: "View your department and related org information",
};

export default function EmployeeDepartmentsPage() {
  return <EmployeeDepartmentsExperience />;
}
