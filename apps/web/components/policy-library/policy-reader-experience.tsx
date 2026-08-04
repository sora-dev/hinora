"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Bot,
  Download,
  FileAudio,
  FileText,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  DashboardMobileNav,
  DashboardPanel,
  DashboardSidebar,
  DashboardTopbar,
  type DashboardNavSection,
} from "../dashboard/primitives";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";

type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type PolicyAnalysisStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
type PolicyAnalysisProvider = "OPENAI" | "LOCAL_FALLBACK";

type PolicyReaderExperienceProps = {
  mode: "admin" | "employee";
  policyId: string;
  sections: readonly DashboardNavSection[];
  profileName: string;
  profileRole: string;
  avatarText: string;
  footer: ReactNode;
};

type PolicyRecord = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  fileType: string;
  department: string;
  type: PolicyType;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  content: string | null;
  analysisStatus: PolicyAnalysisStatus;
  analysisProvider: PolicyAnalysisProvider | null;
  analysisCompletedAt: string | null;
  analysisError: string | null;
  summaryShort: string | null;
  summaryLong: string | null;
  keyPoints: string[];
  suggestedQuestions: string[];
  version: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    code: string;
    color: string;
  } | null;
};

type PolicySummaryRecord = Omit<PolicyRecord, "content" | "version" | "isActive">;

type PolicyDetailResponse = {
  data: PolicyRecord;
  relatedPolicies: PolicySummaryRecord[];
};

type PolicyRecordLike = Partial<PolicyRecord> &
  Pick<PolicyRecord, "id" | "title" | "fileName" | "filePath" | "fileType" | "createdAt" | "updatedAt" | "createdBy">;

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseCandidates() {
  const candidates = [
    RAW_API_BASE_URL ? normalizeApiBaseUrl(RAW_API_BASE_URL) : "",
    DEFAULT_API_BASE_URL,
  ].filter(Boolean);

  return [...new Set(candidates)];
}

async function requestJson<T>(path: string) {
  let lastError: Error | null = null;

  for (const apiBaseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`);

      if (!response.ok) {
        const responseText = await response.text();

        try {
          const errorBody = JSON.parse(responseText) as { message?: string };
          throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
        } catch {
          throw new Error(responseText || `Request failed with status ${response.status}`);
        }
      }

      return {
        data: (await response.json()) as T,
        apiBaseUrl,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown request error.");
    }
  }

  throw lastError ?? new Error("Unable to reach the API.");
}

function normalizePolicyRecord(policy: PolicyRecordLike): PolicyRecord {
  return {
    id: policy.id,
    title: policy.title,
    description: policy.description ?? null,
    fileName: policy.fileName,
    filePath: policy.filePath,
    fileType: policy.fileType,
    department: policy.department ?? "General",
    type: policy.type ?? "POLICY",
    status: policy.status ?? "DRAFT",
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    createdBy: policy.createdBy,
    content: policy.content ?? null,
    analysisStatus: policy.analysisStatus ?? "NOT_STARTED",
    analysisProvider: policy.analysisProvider ?? null,
    analysisCompletedAt: policy.analysisCompletedAt ?? null,
    analysisError: policy.analysisError ?? null,
    summaryShort: policy.summaryShort ?? null,
    summaryLong: policy.summaryLong ?? null,
    keyPoints: Array.isArray(policy.keyPoints)
      ? policy.keyPoints.filter((item): item is string => typeof item === "string")
      : [],
    suggestedQuestions: Array.isArray(policy.suggestedQuestions)
      ? policy.suggestedQuestions.filter((item): item is string => typeof item === "string")
      : [],
    version: typeof policy.version === "number" ? policy.version : 1,
    isActive: typeof policy.isActive === "boolean" ? policy.isActive : true,
    category: policy.category ?? null,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatusLabel(status: PolicyStatus) {
  if (status === "UNDER_REVIEW") {
    return "Under Review";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatTypeLabel(type: PolicyType) {
  if (type === "GUIDELINE") {
    return "Guideline";
  }

  if (type === "PROCEDURE") {
    return "Procedure";
  }

  return "Policy";
}

function getStatusTone(status: PolicyStatus) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-[var(--color-success)]";
  }

  if (status === "UNDER_REVIEW") {
    return "bg-amber-50 text-[var(--color-warning)]";
  }

  if (status === "ARCHIVED") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-violet-50 text-[var(--color-ai-accent)]";
}

function getAbsoluteFileUrl(filePath: string, apiBaseUrl: string) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  return `${apiBaseUrl}${filePath}`;
}

function getReaderHref(mode: "admin" | "employee", policyId: string) {
  return `/${mode}/policy-library/${policyId}`;
}

function getLibraryHref(mode: "admin" | "employee") {
  return `/${mode}/policy-library`;
}

function getSummaryHighlights(policy: PolicyRecord) {
  if (policy.keyPoints.length > 0) {
    return policy.keyPoints.slice(0, 4);
  }

  const extractedHighlights = getContentSummaryLines(policy.content);

  if (extractedHighlights.length > 0) {
    return [
      ...extractedHighlights,
      `${policy.title} is currently marked as ${formatStatusLabel(policy.status).toLowerCase()} for the ${policy.department} department.`,
      `This ${formatTypeLabel(policy.type).toLowerCase()} belongs to ${policy.category?.name ?? "the uncategorized policy set"} and is maintained by ${policy.createdBy}.`,
    ].slice(0, 4);
  }

  const highlights = [
    `${policy.title} is currently marked as ${formatStatusLabel(policy.status).toLowerCase()} for the ${policy.department} department.`,
    `This ${formatTypeLabel(policy.type).toLowerCase()} belongs to ${policy.category?.name ?? "the uncategorized policy set"} and is maintained by ${policy.createdBy}.`,
    policy.description?.trim() ||
      "No detailed description is stored yet, so employees should rely on the full document for complete guidance.",
    policy.content?.trim()
      ? `Extracted content is available for AI assistance and listen mode.`
      : "The document does not yet have extracted text, so AI answers use the stored metadata and description.",
  ];

  return highlights;
}

function getSuggestedQuestions(policy: PolicyRecord) {
  if (policy.suggestedQuestions.length > 0) {
    return policy.suggestedQuestions;
  }

  return [
    `What is the purpose of ${policy.title}?`,
    `What department should follow this policy?`,
    `Give me a short summary of ${policy.title}.`,
    `What category is this document under?`,
  ];
}

function getContentSummaryLines(content: string | null, limit = 3) {
  if (!content?.trim()) {
    return [];
  }

  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const sentences = normalizedContent
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);

  if (sentences.length > 0) {
    return sentences;
  }

  return normalizedContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildAskHinoraAnswer(policy: PolicyRecord, question: string) {
  const normalizedQuestion = question.trim().toLowerCase();
  const summaryHighlights = getSummaryHighlights(policy);
  const extractedHighlights = getContentSummaryLines(policy.content);
  const storedSummary = policy.summaryLong?.trim() || policy.summaryShort?.trim() || "";

  if (!normalizedQuestion) {
    return "Ask about the policy purpose, department, category, status, or request a short summary.";
  }

  if (normalizedQuestion.includes("summary") || normalizedQuestion.includes("summar")) {
    if (storedSummary) {
      return storedSummary;
    }

    return extractedHighlights.length > 0
      ? extractedHighlights.join(" ")
      : summaryHighlights.join(" ");
  }

  if (normalizedQuestion.includes("purpose") || normalizedQuestion.includes("about")) {
    if (storedSummary) {
      return storedSummary;
    }

    if (extractedHighlights.length > 0) {
      return extractedHighlights.join(" ");
    }

    return (
      policy.description?.trim() ||
      `${policy.title} is a ${formatTypeLabel(policy.type).toLowerCase()} for the ${policy.department} department under ${policy.category?.name ?? "the general library"} category.`
    );
  }

  if (normalizedQuestion.includes("department") || normalizedQuestion.includes("who")) {
    return `${policy.title} is tagged to the ${policy.department} department and was uploaded by ${policy.createdBy}.`;
  }

  if (normalizedQuestion.includes("category")) {
    return `${policy.title} belongs to ${policy.category?.name ?? "the uncategorized policy collection"}.`;
  }

  if (normalizedQuestion.includes("status") || normalizedQuestion.includes("publish")) {
    return `${policy.title} is currently ${formatStatusLabel(policy.status).toLowerCase()} and version ${policy.version}.`;
  }

  if (normalizedQuestion.includes("listen") || normalizedQuestion.includes("audio")) {
    return "Use Listen Mode to read the whole extracted policy aloud. If extracted text is not available, Hinora falls back to the stored summary and metadata.";
  }

  if (policy.content?.trim()) {
    return `Here is the best answer from the available extracted text: ${policy.content.trim().slice(0, 360)}${policy.content.trim().length > 360 ? "..." : ""}`;
  }

  return `${policy.title} does not yet have extracted text stored, so I can answer from metadata only: ${summaryHighlights[0]} ${summaryHighlights[1]}`;
}

function getListenModeText(policy: PolicyRecord, summaryHighlights: string[]) {
  if (policy.content?.trim()) {
    return [policy.title, policy.content.trim()].join(". ");
  }

  return [
    policy.title,
    policy.description?.trim() ?? "",
    ...summaryHighlights,
  ]
    .filter(Boolean)
    .join(". ");
}

export default function PolicyReaderExperience({
  mode,
  policyId,
  sections,
  profileName,
  profileRole,
  avatarText,
  footer,
}: PolicyReaderExperienceProps) {
  const [policyResponse, setPolicyResponse] = useState<PolicyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedApiBaseUrl, setResolvedApiBaseUrl] = useState(
    getApiBaseCandidates()[0] ?? DEFAULT_API_BASE_URL,
  );
  const [questionInput, setQuestionInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadPolicy = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, apiBaseUrl } = await requestJson<PolicyDetailResponse>(`/policies/${policyId}`);
      setPolicyResponse({
        data: normalizePolicyRecord(data.data),
        relatedPolicies: (data.relatedPolicies ?? []).map((relatedPolicy) =>
          normalizePolicyRecord(relatedPolicy),
        ),
      });
      setResolvedApiBaseUrl(apiBaseUrl);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load this policy.");
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const policy = policyResponse?.data ?? null;
  const relatedPolicies = policyResponse?.relatedPolicies ?? [];
  const documentUrl = policy ? getAbsoluteFileUrl(policy.filePath, resolvedApiBaseUrl) : "";
  const canPreviewPdf = Boolean(
    policy &&
      policy.fileType.toLowerCase().includes("pdf") &&
      (policy.filePath.startsWith("/uploads/") ||
        policy.filePath.startsWith("http://") ||
        policy.filePath.startsWith("https://")),
  );

  const summaryHighlights = useMemo(() => (policy ? getSummaryHighlights(policy) : []), [policy]);
  const suggestedQuestions = useMemo(() => (policy ? getSuggestedQuestions(policy) : []), [policy]);

  useEffect(() => {
    if (!policy) {
      return;
    }

    setChatMessages([
      {
        id: `${policy.id}-welcome`,
        role: "assistant",
        content: `You are reading ${policy.title}. Ask for a summary, department coverage, category, status, or the main purpose of this document.`,
      },
    ]);
  }, [policy]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handleAskHinora(question: string) {
    if (!policy) {
      return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    const answer = buildAskHinoraAnswer(policy, trimmedQuestion);
    const timestamp = Date.now();

    setChatMessages((current) => [
      ...current,
      { id: `user-${timestamp}`, role: "user", content: trimmedQuestion },
      { id: `assistant-${timestamp}`, role: "assistant", content: answer },
    ]);
    setQuestionInput("");
  }

  function handleAskSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    handleAskHinora(questionInput);
  }

  function handleToggleListenMode() {
    if (!policy || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = getListenModeText(policy, summaryHighlights);

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar
        className="bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_20%),linear-gradient(180deg,var(--color-sidebar)_0%,var(--color-sidebar-end)_100%)]"
        sections={sections}
        navClassName="flex-1"
        footer={footer}
      />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, summaries, and AI help..."
          searchMaxWidthClassName="max-w-[660px]"
          notificationCount={3}
          secondaryActionIcon={Sparkles}
          secondaryActionLabel="Reader tools"
          profileName={profileName}
          profileRole={profileRole}
          avatarText={avatarText}
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav sections={sections} />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Link href={getLibraryHref(mode)} className="inline-flex items-center gap-1 font-semibold text-[var(--color-active-menu)]">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Policy Library</span>
                </Link>
                <span>›</span>
                <span>{policy?.title ?? "Reader"}</span>
              </div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">
                {policy?.title ?? "Policy Reader"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Read the selected document, ask Hinora questions, generate a quick summary, and listen to the policy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {policy ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Open Original</span>
                </a>
              ) : null}
              {mode === "admin" ? (
                <Link
                  href="/admin/policy-management"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>Manage Policies</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Acknowledge Policy</span>
                </button>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              Loading policy reader...
            </div>
          ) : null}

          {!isLoading && policy ? (
            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <DashboardPanel title="Document Reader" className="p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", getStatusTone(policy.status))}>
                        {formatStatusLabel(policy.status)}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {formatTypeLabel(policy.type)}
                      </span>
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={policy.category?.color ? { backgroundColor: `${policy.category.color}18`, color: policy.category.color } : undefined}
                      >
                        {policy.category?.name ?? "Uncategorized"}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Last updated {formatDateTime(policy.updatedAt)}
                    </div>
                  </div>

                  {canPreviewPdf ? (
                    <div className="bg-slate-100 p-4">
                      <iframe
                        title={`${policy.title} document preview`}
                        src={`${documentUrl}#toolbar=0&navpanes=0`}
                        className="h-[72vh] min-h-[620px] w-full rounded-2xl border border-slate-200 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                        <BookOpenText className="h-7 w-7" />
                      </div>
                      <div className="max-w-xl">
                        <h2 className="text-xl font-bold text-slate-900">Preview unavailable in-app</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          This document can still be opened in a new tab. The reader workspace below remains available for summaries, metadata, Ask Hinora, and listen mode.
                        </p>
                      </div>
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                      >
                        <ArrowRight className="h-4.5 w-4.5" />
                        <span>Open Document</span>
                      </a>
                    </div>
                  )}
                </DashboardPanel>

                <DashboardPanel title="Key Highlights" className="space-y-3">
                  {summaryHighlights.map((highlight) => (
                    <div key={highlight} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {highlight}
                    </div>
                  ))}
                </DashboardPanel>
              </div>

              <div className="space-y-4">
                <DashboardPanel title="Generated Summary" className="space-y-4">
                  <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-ai-accent)]">
                      <Sparkles className="h-4.5 w-4.5" />
                    </span>
                    <div className="text-sm leading-6 text-slate-600">
                      <div className="font-semibold text-slate-900">Summary Ready</div>
                      <div className="mt-1">
                        {policy.analysisProvider === "OPENAI"
                          ? "This summary was generated during ingestion using OpenAI and saved to the policy record for low-cost reuse."
                          : policy.analysisProvider === "LOCAL_FALLBACK"
                            ? "This summary was generated from extracted policy content without a live OpenAI call."
                            : "Hinora will display the saved summary once policy analysis is available."}
                      </div>
                    </div>
                  </div>
                  {policy.summaryLong ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      {policy.summaryLong}
                    </div>
                  ) : null}
                  <div className="space-y-2 text-sm leading-6 text-slate-600">
                    {summaryHighlights.map((highlight) => (
                      <p key={highlight}>{highlight}</p>
                    ))}
                  </div>
                </DashboardPanel>

                <DashboardPanel title="Ask Hinora" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleAskHinora(question)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        {question}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[280px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cx(
                          "rounded-2xl px-3 py-3 text-sm leading-6",
                          message.role === "assistant"
                            ? "bg-white text-slate-600"
                            : "ml-auto max-w-[90%] bg-[var(--color-active-menu)] text-white",
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAskSubmit} className="space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Your Question
                      </span>
                      <textarea
                        value={questionInput}
                        onChange={(event) => setQuestionInput(event.target.value)}
                        rows={3}
                        placeholder="Ask about the purpose, coverage, category, summary, or current status..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]"
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] text-sm font-semibold text-white"
                    >
                      <Bot className="h-4.5 w-4.5" />
                      <span>Ask Hinora</span>
                    </button>
                  </form>
                </DashboardPanel>

                <DashboardPanel title="Listen Mode" className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Listen mode is intended to read the whole policy aloud. When extracted policy text is available, playback uses the full document content instead of only the generated summary.
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleListenMode}
                    className={cx(
                      "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white",
                      isSpeaking ? "bg-slate-900" : "bg-[var(--color-ai-accent)]",
                    )}
                  >
                    {isSpeaking ? <PauseCircle className="h-4.5 w-4.5" /> : <PlayCircle className="h-4.5 w-4.5" />}
                    <span>{isSpeaking ? "Stop Audio" : "Start Listen Mode"}</span>
                  </button>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <FileAudio className="h-4.5 w-4.5 text-[var(--color-ai-accent)]" />
                        <span>Full Policy Audio</span>
                      </div>
                      <div className="mt-1 text-slate-500">Reads the entire extracted policy text when available.</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Volume2 className="h-4.5 w-4.5 text-[var(--color-active-menu)]" />
                        <span>Browser Voice</span>
                      </div>
                      <div className="mt-1 text-slate-500">Uses your browser speech engine.</div>
                    </div>
                  </div>
                </DashboardPanel>

                <DashboardPanel title="Policy Details" className="space-y-3">
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Department</div>
                      <div className="mt-1 font-semibold text-slate-900">{policy.department}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Version</div>
                      <div className="mt-1 font-semibold text-slate-900">v{policy.version}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Owner</div>
                      <div className="mt-1 font-semibold text-slate-900">{policy.createdBy}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Document</div>
                      <div className="mt-1 font-semibold text-slate-900">{policy.fileName}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">AI Analysis</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {policy.analysisStatus === "IN_PROGRESS"
                          ? "Analyzing"
                          : policy.analysisStatus === "NOT_STARTED"
                            ? "Not Started"
                            : policy.analysisStatus.charAt(0) + policy.analysisStatus.slice(1).toLowerCase()}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {policy.analysisProvider === "OPENAI"
                          ? "OpenAI"
                          : policy.analysisProvider === "LOCAL_FALLBACK"
                            ? "Local fallback"
                            : "Not available yet"}
                      </div>
                    </div>
                  </div>
                  {policy.analysisError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
                      {policy.analysisError}
                    </div>
                  ) : null}
                </DashboardPanel>

                <DashboardPanel title="Related Policies" className="space-y-3">
                  {relatedPolicies.length > 0 ? (
                    relatedPolicies.map((relatedPolicy) => (
                      <Link
                        key={relatedPolicy.id}
                        href={getReaderHref(mode, relatedPolicy.id)}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[var(--color-active-menu)]/30 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{relatedPolicy.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatTypeLabel(relatedPolicy.type)} • {formatStatusLabel(relatedPolicy.status)}
                          </div>
                        </div>
                        <ArrowRight className="h-4.5 w-4.5 text-slate-400" />
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No related policies found yet for this category.
                    </div>
                  )}
                </DashboardPanel>
              </div>
            </div>
          ) : null}

          {!isLoading && !policy && !errorMessage ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <LoaderCircle className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold text-slate-900">Policy not available</div>
              <p className="mt-1 text-sm text-slate-500">The selected document could not be loaded right now.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
