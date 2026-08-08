import type { Metadata } from "next";
import AssessmentBuilderClient, { type BuilderTab } from "./assessment-builder-client";

export const metadata: Metadata = {
  title: "Hinora | Assessment Builder",
  description: "Build the assessments employees take to acknowledge a policy",
};

function resolveTab(value: string | string[] | undefined): BuilderTab {
  const tab = Array.isArray(value) ? value[0] : value;

  return tab === "ai" || tab === "settings" ? tab : "questions";
}

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;

  return <AssessmentBuilderClient initialTab={resolveTab(params.tab)} />;
}
