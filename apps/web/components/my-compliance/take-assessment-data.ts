import { API_BASE_URL } from "../../lib/api-base-url";
import { getHinoraSession } from "../dashboard/session";

export type TakeQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
};

export type TakeDraft = {
  answers: Record<string, string>;
  bookmarks: string[];
  index: number;
  startedAt: string;
};

export type TakeAssessment = {
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passingScore: number;
  maximumAttempts: number;
  timeLimitMinutes: number;
  attemptCount: number;
  remainingAttempts: number | null;
  canTake: boolean;
  dueAt: string | null;
  lastResult: {
    percent: number;
    correct: number;
    totalQuestions: number;
    passed: boolean;
    submittedAt: string;
  } | null;
  draft: TakeDraft | null;
  questions: TakeQuestion[];
};

export type TakeSubmitResult = {
  passed: boolean;
  percent: number;
  correct: number;
  totalQuestions: number;
  passingScore: number;
  showScoreImmediately: boolean;
  certificateNumber: string | null;
  submittedAt: string;
};

const LEGACY_DRAFT_PREFIX = "hinora_assessment_draft:";

function legacyDraftKey(policyId: string) {
  const userId = getHinoraSession()?.userId?.trim() || "anon";
  return `${LEGACY_DRAFT_PREFIX}${userId}:${policyId}`;
}

function consumeLegacyTakeDraft(policyId: string): TakeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(legacyDraftKey(policyId));
    if (raw) {
      window.localStorage.removeItem(legacyDraftKey(policyId));
    }
    return raw ? (JSON.parse(raw) as TakeDraft) : null;
  } catch {
    return null;
  }
}

export async function fetchTakeAssessment(policyId: string): Promise<TakeAssessment> {
  const response = await fetch(`${API_BASE_URL}/assessments/policy/${policyId}/take`);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to open this assessment.");
  }
  const payload = (await response.json()) as { data: TakeAssessment };
  const data = payload.data;
  if (data.draft || !data.canTake) {
    consumeLegacyTakeDraft(policyId);
    return data;
  }
  const legacy = consumeLegacyTakeDraft(policyId);
  if (!legacy) {
    return { ...data, draft: null };
  }
  await saveTakeDraft(policyId, legacy).catch(() => undefined);
  return { ...data, draft: legacy };
}

export async function saveTakeDraft(policyId: string, draft: TakeDraft) {
  const response = await fetch(`${API_BASE_URL}/assessments/policy/${policyId}/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to save assessment progress.");
  }
}

export async function submitTakeAssessment(
  policyId: string,
  answers: Record<string, string>,
): Promise<TakeSubmitResult> {
  const response = await fetch(`${API_BASE_URL}/assessments/policy/${policyId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to submit this assessment.");
  }
  const payload = (await response.json()) as { data: TakeSubmitResult };
  return payload.data;
}

export function formatAssessmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export const DEFAULT_TAKE_INSTRUCTIONS = [
  "Read each question carefully before answering.",
  "You can bookmark questions and return to them later.",
  "Your answers are saved automatically.",
  "Use the question grid to jump to any item.",
  "Submit the assessment when you are finished.",
];
