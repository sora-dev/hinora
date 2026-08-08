import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | My Assessments",
  description: "Assessments you need to complete in Hinora",
};

export default function EmployeeAssessmentsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Assessments you need to pass before your assigned policies count as acknowledged."
    />
  );
}
