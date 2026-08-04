import type { Metadata } from "next";
import EmployeePolicyReaderClient from "../employee-policy-reader-client";

export const metadata: Metadata = {
  title: "Hinora | Policy Reader",
  description: "Read and explore policy documents in the Hinora Policy Library.",
};

export default function EmployeePolicyReaderPage() {
  return <EmployeePolicyReaderClient />;
}
