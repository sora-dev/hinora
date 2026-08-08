import type { Metadata } from "next";
import ProfileExperience from "../../../components/profile/profile-experience";

export const metadata: Metadata = {
  title: "Hinora | Profile",
  description: "Manage your personal information, security, and preferences",
};

export default function EmployeeProfilePage() {
  return <ProfileExperience variant="employee" />;
}
