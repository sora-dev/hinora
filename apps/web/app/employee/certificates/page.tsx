import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | My Certificates",
  description: "Certificates earned in the Hinora AI Policy System",
};

export default function EmployeeCertificatesPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Certificates issued each time you pass a policy assessment, ready to download or share."
    />
  );
}
