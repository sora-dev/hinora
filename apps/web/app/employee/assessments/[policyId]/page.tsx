import type { Metadata } from "next";
import TakeAssessmentExperience from "../../../../components/my-compliance/take-assessment-experience";

export const metadata: Metadata = {
  title: "Hinora | Take Assessment",
  description: "Complete your assigned policy assessment",
};

export default function TakeAssessmentPage() {
  return <TakeAssessmentExperience />;
}
