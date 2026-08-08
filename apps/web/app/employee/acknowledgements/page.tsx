import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | My Acknowledgements",
  description: "Your policy acknowledgement history in Hinora",
};

export default function EmployeeAcknowledgementsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="The policies you have already acknowledged, and the ones still waiting for you."
    />
  );
}
