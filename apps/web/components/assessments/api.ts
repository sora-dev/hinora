import {
  createDefaultSettings,
  type AssessmentPolicy,
  type AssessmentQuestion,
  type AssessmentSettings,
  type AssessmentStatus,
  type Difficulty,
  type QuestionType,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type ApiPolicy = {
  id: string;
  title: string;
  version: string;
  status: string;
  fileName: string;
  department?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  updatedAt: string;
  assignedCount: number;
};

type ApiPolicySummary = ApiPolicy & {
  hasAssessment: boolean;
  questionCount: number;
};

type ApiOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type ApiQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string | null;
  points: number;
  difficulty: Difficulty;
  source: "MANUAL" | "AI_GENERATED";
  options: ApiOption[];
};

type ApiAssessment = {
  id: string;
  policyId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: AssessmentStatus;
  passingScore: number;
  maximumAttempts: number;
  timeLimitMinutes: number;
  retakeWaitHours: number;
  randomizeQuestions: boolean;
  shuffleAnswerChoices: boolean;
  showExplanationAfterAnswer: boolean;
  allowReviewAfterSubmission: boolean;
  showScoreImmediately: boolean;
  requirePassToAcknowledge: boolean;
  issueCertificateOnPass: boolean;
  notifyOnFailure: boolean;
  updatedBy: string;
  updatedAt: string;
  questions: ApiQuestion[];
};

export type AssessmentSnapshot = {
  policy: AssessmentPolicy;
  settings: AssessmentSettings;
  questions: AssessmentQuestion[];
  /** False when the policy has no saved assessment yet. */
  exists: boolean;
  lastUpdatedLabel: string;
};

/** Best-effort actor label for audit fields, taken from the stored session. */
export function readSessionActor() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("hinora_session");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { name?: string; email?: string };

    return parsed.name ?? parsed.email ?? null;
  } catch {
    return null;
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message = (payload as { message?: string | string[] } | null)?.message;

    throw new Error(
      Array.isArray(message) ? message.join(" ") : (message ?? "Request failed."),
    );
  }

  return payload as T;
}

function toPolicy(policy: ApiPolicy, hasAssessment: boolean, questionCount: number): AssessmentPolicy {
  return {
    id: policy.id,
    title: policy.title,
    version: policy.version,
    status: policy.status,
    fileName: policy.fileName,
    department: policy.department ?? "General",
    category: policy.category ?? null,
    lastUpdatedLabel: formatDate(policy.updatedAt),
    assignedCount: policy.assignedCount,
    hasAssessment,
    questionCount,
  };
}

function toQuestion(question: ApiQuestion): AssessmentQuestion {
  const options = question.options.map((option) => ({ id: option.id, text: option.text }));
  const correct = question.options.find((option) => option.isCorrect);

  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options,
    correctOptionId: correct?.id ?? options[0]?.id ?? "",
    explanation: question.explanation ?? "",
    points: question.points,
    difficulty: question.difficulty,
    aiGenerated: question.source === "AI_GENERATED",
  };
}

function toApiQuestion(question: AssessmentQuestion) {
  return {
    // Locally created questions carry a client-side id the API does not know;
    // it treats those as new rows and assigns a real one.
    id: question.id,
    type: question.type,
    prompt: question.prompt.trim(),
    explanation: question.explanation.trim() || null,
    points: question.points,
    difficulty: question.difficulty,
    source: question.aiGenerated ? "AI_GENERATED" : "MANUAL",
    options: question.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.id === question.correctOptionId,
    })),
  };
}

function toSnapshot(
  policy: ApiPolicy,
  assessment: ApiAssessment | null,
): AssessmentSnapshot {
  if (!assessment) {
    return {
      policy: toPolicy(policy, false, 0),
      settings: createDefaultSettings(policy.title),
      questions: [],
      exists: false,
      lastUpdatedLabel: "Not saved yet",
    };
  }

  const defaults = createDefaultSettings(policy.title);

  return {
    policy: toPolicy(policy, true, assessment.questions.length),
    settings: {
      title: assessment.title,
      description: assessment.description ?? "",
      instructions: assessment.instructions ?? defaults.instructions,
      status: assessment.status,
      passingScore: assessment.passingScore,
      maximumAttempts: assessment.maximumAttempts,
      timeLimitMinutes: assessment.timeLimitMinutes,
      retakeWaitHours: assessment.retakeWaitHours,
      randomizeQuestions: assessment.randomizeQuestions,
      shuffleAnswerChoices: assessment.shuffleAnswerChoices,
      showExplanationAfterAnswer: assessment.showExplanationAfterAnswer,
      allowReviewAfterSubmission: assessment.allowReviewAfterSubmission,
      showScoreImmediately: assessment.showScoreImmediately,
      requirePassToAcknowledge: assessment.requirePassToAcknowledge,
      issueCertificateOnPass: assessment.issueCertificateOnPass,
      notifyOnFailure: assessment.notifyOnFailure,
    },
    questions: assessment.questions.map(toQuestion),
    exists: true,
    lastUpdatedLabel: `${formatDate(assessment.updatedAt)} by ${assessment.updatedBy}`,
  };
}

export async function fetchPolicyOptions(): Promise<AssessmentPolicy[]> {
  const payload = await request<{ data: ApiPolicySummary[] }>("/assessments");

  return payload.data.map((policy) =>
    toPolicy(policy, policy.hasAssessment, policy.questionCount),
  );
}

export async function fetchAssessment(policyId: string): Promise<AssessmentSnapshot> {
  const payload = await request<{
    data: { policy: ApiPolicy; assessment: ApiAssessment | null };
  }>(`/assessments/policy/${policyId}`);

  return toSnapshot(payload.data.policy, payload.data.assessment);
}

export async function saveAssessment(
  policyId: string,
  settings: AssessmentSettings,
  questions: AssessmentQuestion[],
  updatedBy: string,
): Promise<AssessmentSnapshot> {
  const payload = await request<{
    data: { policy: ApiPolicy; assessment: ApiAssessment | null };
  }>(`/assessments/policy/${policyId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...settings,
      updatedBy,
      questions: questions.map(toApiQuestion),
    }),
  });

  return toSnapshot(payload.data.policy, payload.data.assessment);
}
