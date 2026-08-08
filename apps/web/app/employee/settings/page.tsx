import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Settings",
  description: "Employee account and notification settings",
};

export default function EmployeeSettingsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Control notifications, language, and other account preferences."
    />
  );
}
