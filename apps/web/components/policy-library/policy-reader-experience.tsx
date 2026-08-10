"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpenText,
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Headphones,
  History,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardTopbar } from "../dashboard/primitives";
import { DashboardMobileNav, DashboardSidebar } from "../dashboard/dashboard-nav";
import { getSessionUserIdentity } from "../dashboard/session";
import { getApiBaseUrl } from "../../lib/api-base-url";

type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type PolicyAnalysisStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
type PolicyAnalysisProvider = "OPENAI" | "LOCAL_FALLBACK";

type PolicyReaderExperienceProps = {
  mode: "admin" | "employee";
  policyId: string;
  profileName: string;
  profileRole: string;
  avatarText: string;
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

type WorkspaceTab = "summary" | "highlights" | "related" | "history";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "highlights", label: "Key Highlights" },
  { id: "related", label: "Related Policies" },
  { id: "history", label: "Version History" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseCandidates() {
  return [normalizeApiBaseUrl(getApiBaseUrl())];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPolicyWordCount(policy: PolicyRecord) {
  return (policy.content ?? policy.summaryLong ?? policy.description ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getEstimatedReadingMinutes(policy: PolicyRecord) {
  return Math.max(5, Math.min(45, Math.ceil(getPolicyWordCount(policy) / 200) || 12));
}

function getEstimatedPageCount(policy: PolicyRecord) {
  return Math.max(3, Math.min(40, Math.ceil(getPolicyWordCount(policy) / 280) || 8));
}

type ReadingSignals = {
  timeSpentSeconds: number;
  scrollDepthPercent: number;
  pagesViewed: number;
  estimatedPages: number;
  requiredActiveSeconds: number;
};

function computeReadingProgress(signals: ReadingSignals) {
  const timeScore = Math.min(1, signals.timeSpentSeconds / signals.requiredActiveSeconds);
  const scrollScore = Math.min(1, signals.scrollDepthPercent / 100);
  const pagesScore = Math.min(1, signals.pagesViewed / signals.estimatedPages);

  // Weighted blend: pages + scroll + engaged time.
  const combined = timeScore * 0.35 + scrollScore * 0.3 + pagesScore * 0.35;
  return Math.min(100, Math.round(combined * 100));
}

type PersistedReadingProgress = {
  timeSpentSeconds: number;
  scrollDepthPercent: number;
  pagesViewed: number;
  updatedAt: string;
};

function getReadingProgressStorageKey(policyId: string) {
  return `hinora_reading_progress:${policyId}`;
}

function loadPersistedReadingProgress(policyId: string): PersistedReadingProgress | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getReadingProgressStorageKey(policyId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedReadingProgress>;

    return {
      timeSpentSeconds: Math.max(0, Number(parsed.timeSpentSeconds) || 0),
      scrollDepthPercent: Math.min(100, Math.max(0, Number(parsed.scrollDepthPercent) || 0)),
      pagesViewed: Math.max(0, Number(parsed.pagesViewed) || 0),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function savePersistedReadingProgress(policyId: string, progress: Omit<PersistedReadingProgress, "updatedAt">) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedReadingProgress = {
      ...progress,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getReadingProgressStorageKey(policyId), JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

type RemoteReadingProgress = {
  progressPercent: number;
  pagesViewed: number;
  scrollDepthPercent: number;
  timeSpentSeconds: number;
};

async function fetchRemoteReadingProgress(policyId: string): Promise<RemoteReadingProgress | null> {
  const identity = getSessionUserIdentity();

  if (!identity) {
    return null;
  }

  const params = new URLSearchParams();
  if (identity.userId) {
    params.set("userId", identity.userId);
  }
  if (identity.email) {
    params.set("email", identity.email);
  }

  for (const apiBaseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${apiBaseUrl}/reading-progress/${policyId}?${params.toString()}`);
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as { data?: RemoteReadingProgress | null };
      return payload.data ?? null;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function persistRemoteReadingProgress(
  policyId: string,
  progress: RemoteReadingProgress & { progressPercent: number },
) {
  const identity = getSessionUserIdentity();

  if (!identity) {
    return;
  }

  const body = {
    ...identity,
    policyId,
    progressPercent: progress.progressPercent,
    pagesViewed: progress.pagesViewed,
    scrollDepthPercent: progress.scrollDepthPercent,
    timeSpentSeconds: progress.timeSpentSeconds,
  };

  for (const apiBaseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${apiBaseUrl}/reading-progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Try next candidate.
    }
  }
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
  profileName,
  profileRole,
  avatarText,
}: PolicyReaderExperienceProps) {
  const [policyResponse, setPolicyResponse] = useState<PolicyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedApiBaseUrl, setResolvedApiBaseUrl] = useState(
    getApiBaseCandidates()[0],
  );
  const [questionInput, setQuestionInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [pagesViewed, setPagesViewed] = useState(0);
  const [scrollDepthPercent, setScrollDepthPercent] = useState(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("summary");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const documentViewerRef = useRef<HTMLDivElement | null>(null);
  const readingSignalsRef = useRef({
    timeSpentSeconds: 0,
    scrollDepthPercent: 0,
    pagesViewed: 0,
    isDocumentInView: false,
    isPointerOverDocument: false,
  });

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
  const estimatedReadingMinutes = policy ? getEstimatedReadingMinutes(policy) : 12;
  const estimatedPages = policy ? getEstimatedPageCount(policy) : 8;
  const requiredActiveSeconds = Math.max(90, Math.round(estimatedReadingMinutes * 60 * 0.55));
  const isReadingComplete = readingProgress >= 100;
  const remainingMinutes = isReadingComplete
    ? 0
    : Math.max(1, Math.ceil(estimatedReadingMinutes * ((100 - readingProgress) / 100)));

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

  useEffect(() => {
    let cancelled = false;

    setIsBookmarked(false);
    setActiveWorkspaceTab("summary");
    setSummaryExpanded(false);

    const localSaved = loadPersistedReadingProgress(policyId);
    const localTime = localSaved?.timeSpentSeconds ?? 0;
    const localScroll = localSaved?.scrollDepthPercent ?? 0;
    const localPages = localSaved?.pagesViewed ?? 0;

    setTimeSpentSeconds(localTime);
    setScrollDepthPercent(localScroll);
    setPagesViewed(localPages);
    setReadingProgress(0);
    readingSignalsRef.current = {
      timeSpentSeconds: localTime,
      scrollDepthPercent: localScroll,
      pagesViewed: localPages,
      isDocumentInView: false,
      isPointerOverDocument: false,
    };

    void (async () => {
      const remote = await fetchRemoteReadingProgress(policyId);

      if (cancelled || !remote) {
        return;
      }

      const mergedTime = Math.max(localTime, remote.timeSpentSeconds);
      const mergedScroll = Math.max(localScroll, remote.scrollDepthPercent);
      const mergedPages = Math.max(localPages, remote.pagesViewed);

      readingSignalsRef.current.timeSpentSeconds = mergedTime;
      readingSignalsRef.current.scrollDepthPercent = mergedScroll;
      readingSignalsRef.current.pagesViewed = mergedPages;

      setTimeSpentSeconds(mergedTime);
      setScrollDepthPercent(mergedScroll);
      setPagesViewed(mergedPages);
      savePersistedReadingProgress(policyId, {
        timeSpentSeconds: mergedTime,
        scrollDepthPercent: mergedScroll,
        pagesViewed: mergedPages,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [policyId]);

  useEffect(() => {
    if (!policy) {
      return;
    }

    const activePolicyId = policy.id;
    const signals = readingSignalsRef.current;
    const viewer = documentViewerRef.current;
    let saveTimer: number | null = null;
    let lastSavedSnapshot = "";
    signals.pagesViewed = Math.min(estimatedPages, signals.pagesViewed);
    signals.scrollDepthPercent = Math.min(100, signals.scrollDepthPercent);

    function flushRemoteProgress(progressPercent: number) {
      const snapshot = JSON.stringify({
        progressPercent,
        pagesViewed: signals.pagesViewed,
        scrollDepthPercent: signals.scrollDepthPercent,
        timeSpentSeconds: signals.timeSpentSeconds,
      });

      if (snapshot === lastSavedSnapshot) {
        return;
      }

      lastSavedSnapshot = snapshot;
      void persistRemoteReadingProgress(activePolicyId, {
        progressPercent,
        pagesViewed: signals.pagesViewed,
        scrollDepthPercent: signals.scrollDepthPercent,
        timeSpentSeconds: signals.timeSpentSeconds,
      });
    }

    function scheduleRemoteSave(progressPercent: number) {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
      }

      // Debounce DB writes while still keeping a local cache for instant restore.
      saveTimer = window.setTimeout(() => {
        flushRemoteProgress(progressPercent);
      }, 2500);

      if (progressPercent >= 100) {
        if (saveTimer !== null) {
          window.clearTimeout(saveTimer);
          saveTimer = null;
        }
        flushRemoteProgress(progressPercent);
      }
    }

    function publishProgress() {
      const nextProgress = computeReadingProgress({
        timeSpentSeconds: signals.timeSpentSeconds,
        scrollDepthPercent: signals.scrollDepthPercent,
        pagesViewed: signals.pagesViewed,
        estimatedPages,
        requiredActiveSeconds,
      });

      setReadingProgress((current) => (current === nextProgress ? current : nextProgress));
      setPagesViewed((current) => (current === signals.pagesViewed ? current : signals.pagesViewed));
      setScrollDepthPercent((current) =>
        current === signals.scrollDepthPercent ? current : signals.scrollDepthPercent,
      );
      setTimeSpentSeconds((current) =>
        current === signals.timeSpentSeconds ? current : signals.timeSpentSeconds,
      );

      savePersistedReadingProgress(activePolicyId, {
        timeSpentSeconds: signals.timeSpentSeconds,
        scrollDepthPercent: signals.scrollDepthPercent,
        pagesViewed: signals.pagesViewed,
      });
      scheduleRemoteSave(nextProgress);
    }

    function updateScrollDepth() {
      if (!viewer) {
        return;
      }

      const rect = viewer.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const visible = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibilityRatio = Math.max(0, Math.min(1, visible / Math.max(rect.height, 1)));

      // How far the reader has been scrolled through relative to the page.
      const traversed = Math.min(
        1,
        Math.max(0, (viewportHeight - rect.top) / Math.max(rect.height + viewportHeight * 0.35, 1)),
      );

      const nextScrollDepth = Math.max(
        signals.scrollDepthPercent,
        Math.round(Math.max(visibilityRatio * 35, traversed * 100)),
      );

      if (nextScrollDepth > signals.scrollDepthPercent) {
        signals.scrollDepthPercent = nextScrollDepth;
        const scrollPages = Math.max(
          1,
          Math.ceil((signals.scrollDepthPercent / 100) * estimatedPages),
        );
        signals.pagesViewed = Math.min(
          estimatedPages,
          Math.max(signals.pagesViewed, scrollPages),
        );
        publishProgress();
      }
    }

    let wheelAccumulated = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        signals.isDocumentInView = Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.2);
        if (signals.isDocumentInView) {
          updateScrollDepth();
        }
      },
      { threshold: [0.2, 0.4, 0.6, 0.8] },
    );

    if (viewer) {
      observer.observe(viewer);
    }

    function handleScroll() {
      updateScrollDepth();
    }

    function handleWheel(event: WheelEvent) {
      if (!signals.isDocumentInView && !signals.isPointerOverDocument) {
        return;
      }

      if (event.deltaY <= 0) {
        return;
      }

      // Accumulate wheel distance so page turns map to real reading movement.
      wheelAccumulated += event.deltaY;
      const pageThreshold = 420;
      const pagesAdvanced = Math.floor(wheelAccumulated / pageThreshold);

      if (pagesAdvanced > 0) {
        wheelAccumulated -= pagesAdvanced * pageThreshold;
        signals.pagesViewed = Math.min(estimatedPages, signals.pagesViewed + pagesAdvanced);
        signals.scrollDepthPercent = Math.max(
          signals.scrollDepthPercent,
          Math.round((signals.pagesViewed / estimatedPages) * 100),
        );
        publishProgress();
      }
    }

    function handleMouseMove(event: MouseEvent) {
      if (!viewer) {
        return;
      }

      const rect = viewer.getBoundingClientRect();
      signals.isPointerOverDocument =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    }

    const engagementTimer = window.setInterval(() => {
      const isTabVisible = document.visibilityState === "visible";
      const isEngaged =
        isTabVisible && (signals.isDocumentInView || signals.isPointerOverDocument);

      if (!isEngaged) {
        return;
      }

      signals.timeSpentSeconds += 1;

      // While engaged with the document, gradually credit pages and scroll depth.
      // This covers PDF iframe reading where wheel events do not bubble to the page.
      if (signals.isPointerOverDocument || signals.isDocumentInView) {
        const expectedPagesFromTime = Math.min(
          estimatedPages,
          Math.floor((signals.timeSpentSeconds / requiredActiveSeconds) * estimatedPages) + 1,
        );
        signals.pagesViewed = Math.min(
          estimatedPages,
          Math.max(signals.pagesViewed, expectedPagesFromTime),
        );
        signals.scrollDepthPercent = Math.max(
          signals.scrollDepthPercent,
          Math.round((signals.pagesViewed / estimatedPages) * 100),
        );
      }

      publishProgress();
    }, 1000);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    updateScrollDepth();
    publishProgress();

    return () => {
      observer.disconnect();
      window.clearInterval(engagementTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);

      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
      }

      const finalProgress = computeReadingProgress({
        timeSpentSeconds: signals.timeSpentSeconds,
        scrollDepthPercent: signals.scrollDepthPercent,
        pagesViewed: signals.pagesViewed,
        estimatedPages,
        requiredActiveSeconds,
      });
      flushRemoteProgress(finalProgress);
    };
  }, [policy, estimatedPages, requiredActiveSeconds]);

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
      <DashboardSidebar variant={mode} />

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
        <DashboardMobileNav variant={mode} />

        <div className="px-4 py-5 md:px-5 xl:px-6">
          <div className="mb-2">
            <Link
              href={getLibraryHref(mode)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-active-menu)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Policy Library</span>
            </Link>
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
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight text-slate-900 md:text-[2.1rem]">
                    {policy.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
                    <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", getStatusTone(policy.status))}>
                      {formatStatusLabel(policy.status)}
                    </span>
                    <span>Version {policy.version}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                    <span>Updated: {formatDate(policy.updatedAt)}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Assigned to: {policy.department}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {mode === "admin" ? (
                    <Link
                      href="/admin/policy-management"
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold !text-white"
                    >
                      <FileText className="h-4.5 w-4.5" />
                      <span>Manage Policy</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={!isReadingComplete}
                      title={
                        isReadingComplete
                          ? "Start compliance for this policy"
                          : "Finish reading the policy to unlock Start Compliance"
                      }
                      className={cx(
                        "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                        isReadingComplete
                          ? "bg-[var(--color-active-menu)] text-white"
                          : "cursor-not-allowed bg-slate-200 text-slate-500",
                      )}
                    >
                      {isReadingComplete ? (
                        <ShieldCheck className="h-4.5 w-4.5" />
                      ) : (
                        <Lock className="h-4.5 w-4.5" />
                      )}
                      <span>Start Compliance</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsBookmarked((current) => !current)}
                    aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    className={cx(
                      "inline-flex h-11 w-11 items-center justify-center rounded-xl border transition",
                      isBookmarked
                        ? "border-amber-200 bg-amber-50 text-[var(--color-warning)]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Bookmark className={cx("h-4.5 w-4.5", isBookmarked && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    <MoreHorizontal className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-4">
                  <div
                    ref={documentViewerRef}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {canPreviewPdf ? (
                      <iframe
                        title={`${policy.title} document preview`}
                        src={`${documentUrl}#toolbar=1&navpanes=0`}
                        className="h-[min(70vh,820px)] min-h-[560px] w-full bg-slate-900"
                      />
                    ) : (
                      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                          <BookOpenText className="h-7 w-7" />
                        </div>
                        <div className="max-w-xl">
                          <h2 className="text-xl font-bold text-slate-900">Preview unavailable in-app</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Use Download PDF in the tools sidebar to open the original file.
                          </p>
                        </div>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold !text-white"
                        >
                          <Download className="h-4.5 w-4.5" />
                          <span>Open Document</span>
                        </a>
                      </div>
                    )}
                    <div className="border-t border-slate-200 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{readingProgress}% read</span>
                        <span>
                          {isReadingComplete
                            ? "Reading complete"
                            : `Page ${Math.max(1, pagesViewed)} / ${estimatedPages} · ~${remainingMinutes} min left`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cx(
                            "h-full rounded-full transition-all duration-500",
                            isReadingComplete ? "bg-emerald-500" : "bg-sky-400",
                          )}
                          style={{ width: `${readingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-4">
                      <div className="flex gap-1 overflow-x-auto">
                        {workspaceTabs.map((tab) => {
                          const active = activeWorkspaceTab === tab.id;

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveWorkspaceTab(tab.id)}
                              className={cx(
                                "relative shrink-0 px-3.5 py-3.5 text-sm font-semibold transition",
                                active
                                  ? "text-[var(--color-active-menu)]"
                                  : "text-slate-500 hover:text-slate-700",
                              )}
                            >
                              {tab.label}
                              {active ? (
                                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--color-active-menu)]" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="px-5 py-5">
                      {activeWorkspaceTab === "summary" ? (
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.9fr)]">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">Executive Summary</h3>
                            <p
                              className={cx(
                                "mt-3 text-sm leading-7 text-slate-600",
                                !summaryExpanded && "line-clamp-5",
                              )}
                            >
                              {policy.summaryLong ||
                                policy.summaryShort ||
                                policy.description ||
                                summaryHighlights.join(" ") ||
                                "No executive summary is available for this policy yet."}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSummaryExpanded((current) => !current)}
                              className="mt-3 text-sm font-semibold text-[var(--color-active-menu)]"
                            >
                              {summaryExpanded ? "Show less" : "Show more"}
                            </button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <Clock3 className="h-3.5 w-3.5" />
                                Reading Time
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-900">
                                {estimatedReadingMinutes} min
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Effective Date
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-900">
                                {formatDate(policy.updatedAt)}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <Building2 className="h-3.5 w-3.5" />
                                Departments
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-900">
                                {policy.department}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <Users className="h-3.5 w-3.5" />
                                Policy Owner
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-900">
                                {policy.createdBy}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <History className="h-3.5 w-3.5" />
                                Review Cycle
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-900">Annually</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Risk Level
                              </div>
                              <div className="mt-2 text-sm font-semibold text-[var(--color-error)]">
                                {policy.category?.name?.toLowerCase().includes("security") ||
                                policy.category?.name?.toLowerCase().includes("risk")
                                  ? "High"
                                  : "Medium"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {activeWorkspaceTab === "highlights" ? (
                        summaryHighlights.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {summaryHighlights.map((highlight) => (
                              <div
                                key={highlight}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                              >
                                {highlight}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            No key highlights are available for this policy yet.
                          </div>
                        )
                      ) : null}

                      {activeWorkspaceTab === "related" ? (
                        relatedPolicies.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {relatedPolicies.map((relatedPolicy) => (
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
                                <ArrowRight className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            No related policies found yet for this category.
                          </div>
                        )
                      ) : null}

                      {activeWorkspaceTab === "history" ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <History className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0 flex-1 text-sm leading-6 text-slate-600">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-semibold text-slate-900">Version {policy.version} (current)</div>
                                <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", getStatusTone(policy.status))}>
                                  {formatStatusLabel(policy.status)}
                                </span>
                              </div>
                              <div className="mt-1">
                                Updated {formatDateTime(policy.updatedAt)} by {policy.createdBy}
                              </div>
                              <div className="mt-1 text-slate-500">File: {policy.fileName}</div>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            Older versions will appear here as new revisions are published.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <aside className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[var(--color-active-menu)]">
                        <Bot className="h-4 w-4" />
                      </span>
                      <div className="text-sm font-bold text-slate-900">Ask Hinora</div>
                    </div>

                    <div className="max-h-[180px] space-y-2.5 overflow-y-auto rounded-xl bg-slate-50 px-3 py-3">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cx(
                            "rounded-xl px-3 py-2.5 text-sm leading-6",
                            message.role === "assistant"
                              ? "bg-white text-slate-600"
                              : "ml-auto max-w-[92%] bg-[var(--color-active-menu)] text-white",
                          )}
                        >
                          {message.content}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3">
                      <div className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Suggested questions
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.slice(0, 3).map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => handleAskHinora(question)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-slate-600"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAskSubmit} className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={questionInput}
                        onChange={(event) => setQuestionInput(event.target.value)}
                        placeholder="Ask a question..."
                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]"
                      />
                      <button
                        type="submit"
                        aria-label="Ask Hinora"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-active-menu)] text-white"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </form>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-[var(--color-ai-accent)]">
                        <Headphones className="h-4 w-4" />
                      </span>
                      <div className="text-sm font-bold text-slate-900">Listen Mode</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleListenMode}
                      className={cx(
                        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white",
                        isSpeaking ? "bg-slate-900" : "bg-[var(--color-ai-accent)]",
                      )}
                    >
                      {isSpeaking ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      <span>{isSpeaking ? "Stop Audio" : "Start Listen Mode"}</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-bold text-slate-900">Reading Progress</div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{readingProgress}% completed</span>
                      <span className="text-slate-500">
                        {isReadingComplete ? "Ready" : `~${remainingMinutes} min left`}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cx(
                          "h-full rounded-full transition-all duration-500",
                          isReadingComplete ? "bg-emerald-500" : "bg-[var(--color-active-menu)]",
                        )}
                        style={{ width: `${readingProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.7rem] font-semibold text-slate-500">
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="text-slate-900">{Math.max(1, pagesViewed)}/{estimatedPages}</div>
                        <div className="mt-0.5">Pages</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="text-slate-900">{scrollDepthPercent}%</div>
                        <div className="mt-0.5">Scroll</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <div className="text-slate-900">
                          {Math.min(100, Math.round((timeSpentSeconds / requiredActiveSeconds) * 100))}%
                        </div>
                        <div className="mt-0.5">Time</div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {isReadingComplete
                        ? "Reading complete. Start Compliance is unlocked."
                        : "Progress updates from pages viewed, scroll depth, and time spent on the document."}
                    </p>
                    {mode === "employee" ? (
                      <button
                        type="button"
                        disabled={!isReadingComplete}
                        className={cx(
                          "mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                          isReadingComplete
                            ? "bg-[var(--color-active-menu)] text-white"
                            : "cursor-not-allowed bg-slate-200 text-slate-500",
                        )}
                      >
                        {isReadingComplete ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span>Start Compliance</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsBookmarked((current) => !current)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Bookmark className={cx("h-4.5 w-4.5", isBookmarked && "fill-current text-[var(--color-warning)]")} />
                      <span>{isBookmarked ? "Bookmarked" : "Add Bookmark"}</span>
                    </button>
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={policy.fileName}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-4.5 w-4.5" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </aside>
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
