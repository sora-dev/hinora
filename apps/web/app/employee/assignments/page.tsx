import { redirect } from "next/navigation";

export default function EmployeeAssignmentsPage() {
  redirect("/employee/compliance?tab=tasks");
}
