import type { Metadata } from "next";
import ReportsExperience from "../../../components/reports/reports-experience";

export const metadata: Metadata = {
  title: "Hinora | Reports",
  description: "Generate insights and analytics from your Hinora policy library",
};

export default function AdminReportsPage() {
  return <ReportsExperience />;
}
