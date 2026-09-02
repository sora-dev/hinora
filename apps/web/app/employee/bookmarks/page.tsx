import type { Metadata } from "next";
import BookmarksExperience from "../../../components/bookmarks/bookmarks-experience";

export const metadata: Metadata = {
  title: "Hinora | Bookmarks",
  description: "Save important policies and documents for quick access.",
};

export default function EmployeeBookmarksPage() {
  return <BookmarksExperience variant="employee" />;
}
