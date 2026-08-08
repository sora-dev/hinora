import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | My Compliance",
  description: "Track policy acknowledgements, assessments, and compliance status",
};

export default function EmployeeCompliancePage() {
  return (
    <ComingSoon
      variant="employee"
      description="See assigned policies, acknowledgement progress, and assessment results in one place."
    />
  );
}
