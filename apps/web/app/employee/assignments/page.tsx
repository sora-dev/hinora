import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | My Assignments",
  description: "Policies assigned to you in the Hinora AI Policy System",
};

export default function EmployeeAssignmentsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Every policy assigned to you, with its acknowledgement deadline and current progress."
    />
  );
}
