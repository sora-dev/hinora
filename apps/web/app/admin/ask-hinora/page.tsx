import type { Metadata } from "next";
import ComingSoon from "../../../components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Hinora | Ask Hinora AI",
  description: "Ask questions across your entire policy library",
};

export default function AdminAskHinoraPage() {
  return (
    <ComingSoon
      variant="admin"
      description="Ask questions across your entire policy library and get answers with citations back to the source document."
    />
  );
}
