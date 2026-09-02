import type { Metadata } from "next";
import InboxExperience from "../../../components/inbox/inbox-experience";

export const metadata: Metadata = {
  title: "Hinora | Notifications",
  description: "View and manage your Hinora notifications",
};

export default function EmployeeNotificationsPage() {
  return <InboxExperience variant="employee" />;
}
