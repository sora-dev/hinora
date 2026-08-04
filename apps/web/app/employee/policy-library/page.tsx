import type { Metadata } from "next";
import EmployeePolicyLibraryClient from "./policy-library-client";

export const metadata: Metadata = {
  title: "Hinora | Policy Library",
  description: "Employee policy library for Hinora AI Policy Library",
};

export default function EmployeePolicyLibraryPage() {
  return <EmployeePolicyLibraryClient />;
}
