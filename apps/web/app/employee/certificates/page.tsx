import { redirect } from "next/navigation";

export default function EmployeeCertificatesPage() {
  redirect("/employee/compliance?tab=certificates");
}
