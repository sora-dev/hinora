import type { Metadata } from "next";
import AdminPolicyReaderClient from "../admin-policy-reader-client";

export const metadata: Metadata = {
  title: "Hinora | Policy Reader",
  description: "Read and explore policy documents in the Hinora Policy Library.",
};

export default function AdminPolicyReaderPage() {
  return <AdminPolicyReaderClient />;
}
