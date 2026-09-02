import { redirect } from "next/navigation";

export default function EmployeeAssessmentsPage() {
  redirect("/employee/compliance?tab=assessments");
}
