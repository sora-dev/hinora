import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Help & Support",
  description: "Get help using the Hinora AI Policy System",
};

export default function EmployeeSupportPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Guides for using Hinora, plus a direct line to your compliance team."
    />
  );
}
