import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Settings",
  description: "Organisation settings for the Hinora AI Policy System",
};

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      variant="admin"
      description="Organisation profile, branding, retention rules, and AI configuration for your Hinora tenant."
    />
  );
}
