import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Departments",
  description: "View your department and related org information",
};

export default function EmployeeDepartmentsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Browse department details and contacts assigned to your location."
    />
  );
}
