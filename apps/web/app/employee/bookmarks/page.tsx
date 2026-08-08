import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Bookmarks",
  description: "Saved policies and sections for quick access",
};

export default function EmployeeBookmarksPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Save policies and sections you refer to often."
    />
  );
}
