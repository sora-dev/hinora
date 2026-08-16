import type { Metadata } from "next";
import SettingsExperience from "../../../components/settings/settings-experience";

export const metadata: Metadata = {
  title: "Hinora | Settings",
  description: "System-wide configuration for your Hinora organization",
};

export default function AdminSettingsPage() {
  return <SettingsExperience />;
}
