import { redirect } from "next/navigation";

export default function EmployeeAcknowledgementsPage() {
  redirect("/employee/compliance?tab=acknowledgements");
}
