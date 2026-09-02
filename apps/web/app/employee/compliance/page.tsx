import type { Metadata } from "next";
import { Suspense } from "react";
import MyComplianceExperience from "../../../components/my-compliance/my-compliance-experience";
import DashboardShell from "../../../components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Hinora | My Compliance",
  description: "View your compliance status, complete required tasks, and track your progress.",
};

function LoadingFallback() {
  return (
    <DashboardShell variant="employee">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5 h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function EmployeeCompliancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MyComplianceExperience />
    </Suspense>
  );
}
