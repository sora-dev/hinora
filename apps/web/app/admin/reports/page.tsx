import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Reports",
  description: "Compliance reporting for the Hinora AI Policy System",
};

export default function AdminReportsPage() {
  return (
    <ComingSoon
      variant="admin"
      description="Compliance reporting across policies, departments, locations, and assessment results, ready for regulator review."
    />
  );
}
