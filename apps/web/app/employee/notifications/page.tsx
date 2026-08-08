import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Notifications",
  description: "Policy reminders and announcements in Hinora",
};

export default function EmployeeNotificationsPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Reminders, deadline alerts, and announcements about the policies that apply to you."
    />
  );
}
