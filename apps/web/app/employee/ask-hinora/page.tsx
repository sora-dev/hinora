import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Ask Hinora AI",
  description: "Ask questions about company policies",
};

export default function EmployeeAskHinoraPage() {
  return (
    <ComingSoon
      variant="employee"
      description="Ask anything about company policy and get a plain-language answer with a link to the source document."
    />
  );
}
