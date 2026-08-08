export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type BloomLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "MIXED_UNDERSTAND_APPLY"
  | "MIXED_ALL";

export type AnswerOption = {
  id: string;
  text: string;
};

export type AssessmentQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: AnswerOption[];
  correctOptionId: string;
  explanation: string;
  points: number;
  difficulty: Difficulty;
  /** Persisted as source = AI_GENERATED so the origin survives a reload. */
  aiGenerated?: boolean;
};

export type AssessmentSettings = {
  title: string;
  description: string;
  instructions: string;
  status: AssessmentStatus;
  passingScore: number;
  /** 0 means unlimited attempts. */
  maximumAttempts: number;
  /** 0 means no time limit. */
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
};

export type AssessmentPolicy = {
  id: string;
  title: string;
  version: string;
  status: string;
  fileName: string;
  department: string;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  lastUpdatedLabel: string;
  assignedCount: number;
  hasAssessment: boolean;
  questionCount: number;
};

export type AiGeneratorConfig = {
  questionCount: number;
  difficulty: Difficulty;
  bloomLevel: BloomLevel;
  questionTypes: QuestionType[];
  focusAreas: string;
};

export type ChatMessage = {
  id: string;
  author: "HINORA" | "USER";
  text: string;
};

export const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
};

export const difficultyLabels: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const bloomLevelLabels: Record<BloomLevel, string> = {
  REMEMBER: "Remember",
  UNDERSTAND: "Understand",
  APPLY: "Apply",
  ANALYZE: "Analyze",
  MIXED_UNDERSTAND_APPLY: "Mixed (Understand & Apply)",
  MIXED_ALL: "Mixed (All levels)",
};

export const optionLetters = ["A", "B", "C", "D", "E", "F"] as const;

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function optionLetter(index: number) {
  return optionLetters[index] ?? String(index + 1);
}

export function createEmptyQuestion(type: QuestionType): AssessmentQuestion {
  if (type === "TRUE_FALSE") {
    const trueOption = { id: createId("opt"), text: "True" };
    const falseOption = { id: createId("opt"), text: "False" };

    return {
      id: createId("q"),
      type,
      prompt: "",
      options: [trueOption, falseOption],
      correctOptionId: trueOption.id,
      explanation: "",
      points: 1,
      difficulty: "MEDIUM",
    };
  }

  const options = Array.from({ length: 4 }, () => ({ id: createId("opt"), text: "" }));

  return {
    id: createId("q"),
    type,
    prompt: "",
    options,
    correctOptionId: options[0].id,
    explanation: "",
    points: 1,
    difficulty: "MEDIUM",
  };
}

export function duplicateQuestion(question: AssessmentQuestion): AssessmentQuestion {
  const options = question.options.map((option) => ({ ...option, id: createId("opt") }));
  const correctIndex = question.options.findIndex((option) => option.id === question.correctOptionId);

  return {
    ...question,
    id: createId("q"),
    options,
    correctOptionId: options[Math.max(correctIndex, 0)]?.id ?? options[0].id,
  };
}

export function estimatedMinutes(questionCount: number) {
  const low = Math.max(1, Math.round(questionCount * 1.5));
  const high = Math.max(low + 1, Math.round(questionCount * 2));

  return `${low}-${high} mins`;
}

export function createDefaultSettings(policyTitle: string): AssessmentSettings {
  return {
    title: `${policyTitle} Assessment`,
    description: `Confirms that employees understand the key controls in the ${policyTitle} before acknowledging it.`,
    instructions:
      "Read the policy in full before starting. You may retake the assessment until you reach the passing score.",
    status: "DRAFT",
    passingScore: 80,
    maximumAttempts: 0,
    timeLimitMinutes: 20,
    retakeWaitHours: 0,
    randomizeQuestions: true,
    shuffleAnswerChoices: true,
    showExplanationAfterAnswer: true,
    allowReviewAfterSubmission: true,
    showScoreImmediately: true,
    requirePassToAcknowledge: true,
    issueCertificateOnPass: true,
    notifyOnFailure: false,
  };
}
