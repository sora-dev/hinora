"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  EllipsisVertical,
  Eye,
  FileText,
  Loader2,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SelectPolicyModal, {
  rememberRecentPolicy,
} from "../../../components/assessments/select-policy-modal";
import { DashboardTopbar } from "../../../components/dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../../../components/dashboard/dashboard-nav";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";
import AiAssistantTab from "../../../components/assessments/ai-assistant-tab";
import QuestionsTab from "../../../components/assessments/questions-tab";
import SettingsTab from "../../../components/assessments/settings-tab";
import { generateAssessmentQuestions } from "../../../components/assessments/ai-generator";
import {
  fetchAssessment,
  fetchPolicyOptions,
  readSessionActor,
  saveAssessment,
  type AssessmentSnapshot,
} from "../../../components/assessments/api";
import {
  AiChatPanel,
  AiTipsPanel,
  AssessmentFlowPanel,
  AssessmentSettingsPanel,
  AssessmentSummaryPanel,
  type ChatSuggestion,
} from "../../../components/assessments/rail-panels";
import {
  createDefaultSettings,
  createId,
  type AiGeneratorConfig,
  type AssessmentPolicy,
  type AssessmentQuestion,
  type AssessmentSettings,
  type ChatMessage,
} from "../../../components/assessments/types";
import { cx } from "../../../components/assessments/ui";

export type BuilderTab = "questions" | "ai" | "settings";

const tabs: Array<{ id: BuilderTab; label: string }> = [
  { id: "questions", label: "Questions" },
  { id: "ai", label: "AI Assistant" },
  { id: "settings", label: "Settings" },
];

const defaultGeneratorConfig: AiGeneratorConfig = {
  questionCount: 10,
  difficulty: "MEDIUM",
  bloomLevel: "MIXED_UNDERSTAND_APPLY",
  questionTypes: ["MULTIPLE_CHOICE", "TRUE_FALSE"],
  focusAreas: "",
};

const chatSuggestions: ChatSuggestion[] = [
  { id: "generate-medium", label: "Generate 10 medium questions" },
  { id: "focus-passwords", label: "Focus on password security" },
  { id: "scenario", label: "Create scenario-based questions" },
  { id: "bloom", label: "Explain Bloom's Taxonomy levels" },
];

function greetingMessage(): ChatMessage {
  return {
    id: "chat-welcome",
    author: "HINORA",
    text: "Hi! I can help you generate assessment questions from your policy document.",
  };
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Serialised form of the saved state, used to detect unsaved edits. */
function fingerprint(settings: AssessmentSettings, questions: AssessmentQuestion[]) {
  return JSON.stringify([settings, questions]);
}

export default function AssessmentBuilderClient({
  initialTab = "questions",
  initialPolicyId,
}: {
  initialTab?: BuilderTab;
  initialPolicyId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BuilderTab>(initialTab);

  const [policy, setPolicy] = useState<AssessmentPolicy | null>(null);
  const [policyOptions, setPolicyOptions] = useState<AssessmentPolicy[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [settings, setSettings] = useState<AssessmentSettings>(() =>
    createDefaultSettings("Policy"),
  );
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Not saved yet");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [generatorConfig, setGeneratorConfig] = useState<AiGeneratorConfig>(defaultGeneratorConfig);
  const [generated, setGenerated] = useState<AssessmentQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage()]);

  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const applySnapshot = useCallback((snapshot: AssessmentSnapshot) => {
    setPolicy(snapshot.policy);
    setSettings(snapshot.settings);
    setQuestions(snapshot.questions);
    setLastUpdatedLabel(snapshot.lastUpdatedLabel);
    setSavedFingerprint(fingerprint(snapshot.settings, snapshot.questions));
    rememberRecentPolicy(snapshot.policy.id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const options = await fetchPolicyOptions();

        if (cancelled) {
          return;
        }

        setPolicyOptions(options);

        if (options.length === 0) {
          setIsLoading(false);
          return;
        }

        const preferred =
          options.find((option) => option.id === initialPolicyId) ??
          options.find((option) => option.hasAssessment) ??
          options[0];
        const snapshot = await fetchAssessment(preferred.id);

        if (!cancelled) {
          applySnapshot(snapshot);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(errorText(error, "Unable to load assessments right now."));
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applySnapshot, initialPolicyId]);

  async function handlePolicyChange(policyId: string) {
    if (policyId === policy?.id) {
      setIsPolicyModalOpen(false);
      return;
    }

    setIsPolicyModalOpen(false);
    setIsLoading(true);
    setLoadError("");
    setSaveError("");
    setStatusMessage("");
    setGenerated([]);
    setSelectedIds(new Set());

    try {
      applySnapshot(await fetchAssessment(policyId));
    } catch (error) {
      setLoadError(errorText(error, "Unable to load that policy's assessment."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!policy) {
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setStatusMessage("");

    try {
      const snapshot = await saveAssessment(
        policy.id,
        settings,
        questions,
        readSessionActor() ?? "Administrator",
      );

      applySnapshot(snapshot);
      setPolicyOptions((current) =>
        current.map((option) => (option.id === snapshot.policy.id ? snapshot.policy : option)),
      );
      setStatusMessage(
        snapshot.questions.length === 0
          ? `Saved a draft for ${snapshot.policy.title}. Add questions to send this assessment to assigned staff.`
          : snapshot.policy.assignedCount > 0
            ? `Saved and published ${snapshot.questions.length} ${
                snapshot.questions.length === 1 ? "question" : "questions"
              } to ${snapshot.policy.assignedCount} assigned ${
                snapshot.policy.assignedCount === 1 ? "employee" : "employees"
              } on ${snapshot.policy.title}.`
            : `Saved and published ${snapshot.questions.length} ${
                snapshot.questions.length === 1 ? "question" : "questions"
              } for ${snapshot.policy.title}. Assign this policy under Policy Assignments so staff receive it.`,
      );
    } catch (error) {
      setSaveError(errorText(error, "Unable to save the assessment."));
    } finally {
      setIsSaving(false);
    }
  }

  const runGenerator = useCallback(
    async (config: AiGeneratorConfig) => {
      if (!policy) {
        return [];
      }

      setIsGenerating(true);
      setGeneratorError("");

      try {
        const results = await generateAssessmentQuestions(config, policy);

        if (results.length === 0) {
          setGeneratorError("No questions could be generated. Try widening the question types.");
        }

        setGenerated(results);
        setSelectedIds(new Set(results.map((question) => question.id)));

        return results;
      } catch (error) {
        setGeneratorError(errorText(error, "Hinora could not generate questions right now."));
        return [];
      } finally {
        setIsGenerating(false);
      }
    },
    [policy],
  );

  function handleToggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function handleSelectAll(selected: boolean) {
    setSelectedIds(selected ? new Set(generated.map((question) => question.id)) : new Set());
  }

  function handleAddSelected() {
    const additions = generated.filter((question) => selectedIds.has(question.id));

    if (additions.length === 0) {
      return;
    }

    setQuestions((current) => [...current, ...additions]);
    setGenerated((current) => current.filter((question) => !selectedIds.has(question.id)));
    setSelectedIds(new Set());
    setActiveTab("questions");
    setStatusMessage(
      `${additions.length} AI ${
        additions.length === 1 ? "question" : "questions"
      } added. Choose Save Assessment to store them.`,
    );
  }

  function handleClearGenerated() {
    setGenerated([]);
    setSelectedIds(new Set());
    setGeneratorError("");
  }

  async function handleChatSuggestion(id: string) {
    const suggestion = chatSuggestions.find((item) => item.id === id);

    if (!suggestion || !policy) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: createId("msg"), author: "USER", text: suggestion.label },
    ]);

    if (id === "bloom") {
      setMessages((current) => [
        ...current,
        {
          id: createId("msg"),
          author: "HINORA",
          text: "Bloom's Taxonomy ranks thinking from recall to creation. For policy assessments, Understand checks that someone grasps a rule, and Apply checks that they can act on it in a real situation. A mix of the two is usually the right balance for compliance.",
        },
      ]);
      return;
    }

    const nextConfig: AiGeneratorConfig =
      id === "focus-passwords"
        ? { ...generatorConfig, focusAreas: "Password security, credentials, authentication" }
        : id === "scenario"
          ? { ...generatorConfig, bloomLevel: "APPLY", difficulty: "HARD" }
          : { ...generatorConfig, questionCount: 10, difficulty: "MEDIUM" };

    setGeneratorConfig(nextConfig);

    const results = await runGenerator(nextConfig);

    setMessages((current) => [
      ...current,
      {
        id: createId("msg"),
        author: "HINORA",
        text:
          results.length > 0
            ? `I drafted ${results.length} questions from ${policy.fileName}. Review them below and add the ones you want to keep.`
            : "I could not draft questions with those settings. Try enabling more question types.",
      },
    ]);
  }

  function handleChatSend(text: string) {
    setMessages((current) => [
      ...current,
      { id: createId("msg"), author: "USER", text },
      {
        id: createId("msg"),
        author: "HINORA",
        text: `I have noted "${text}". Set the options above and choose Generate Questions, and I will draft them from ${
          policy?.fileName ?? "the policy document"
        }.`,
      },
    ]);
  }

  const hasUnsavedChanges =
    policy !== null && !isLoading && fingerprint(settings, questions) !== savedFingerprint;

  const railForTab =
    activeTab === "ai" ? (
      <>
        <AiChatPanel
          messages={messages}
          suggestions={chatSuggestions}
          onSuggestion={(id) => void handleChatSuggestion(id)}
          onSend={handleChatSend}
          onNewChat={() => setMessages([greetingMessage()])}
        />
        <AiTipsPanel />
      </>
    ) : (
      <>
        {/* The Settings tab already owns these controls in full. */}
        {activeTab === "questions" ? (
          <AssessmentSettingsPanel settings={settings} onSettingsChange={setSettings} />
        ) : null}
        <AssessmentSummaryPanel questions={questions} lastUpdatedLabel={lastUpdatedLabel} />
        <AssessmentFlowPanel />
      </>
    );

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, employees, departments..."
          notificationCount={3}
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant="admin" />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">
                Assessment Builder
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and manage assessment questions for policies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasUnsavedChanges ? (
                <span className="inline-flex h-10 items-center rounded-xl bg-amber-50 px-3 text-sm font-semibold text-[var(--color-warning)]">
                  Unsaved changes
                </span>
              ) : null}

              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                Preview Assessment
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading || !policy}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving
                  ? "Saving..."
                  : questions.length > 0
                    ? "Save & Publish"
                    : "Save Assessment"}
              </button>

              <button
                type="button"
                aria-label="More actions"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Link
            href="/admin/policy-library"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Policies
          </Link>

          {loadError || saveError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
              {loadError || saveError}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--color-success)]">
              {statusMessage}
            </div>
          ) : null}

          {!isLoading && policyOptions.length === 0 ? (
            <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
              <EmptyState
                icon={FileText}
                title="No policies have been added yet."
                description="Upload a policy first so you can build assessments and quiz questions against it."
                actionLabel="Go to Policy Management"
                onAction={() => router.push("/admin/policy-management")}
              />
            </div>
          ) : (
            <>
              <article className="mt-4 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                      <FileText className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[1.05rem] font-bold text-slate-900">
                          {policy?.title ?? "Loading policy..."}
                        </h2>
                        {policy ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-bold text-[var(--color-success)]">
                            {policy.status === "PUBLISHED" ? "Published" : policy.status}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.82rem] text-slate-500">
                        <span>Version: {policy?.version ?? "—"}</span>
                        <span>Last updated: {policy?.lastUpdatedLabel ?? "—"}</span>
                        <span>Assigned to: {policy?.assignedCount ?? 0} employees</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500">
                      Change Policy
                    </span>
                    <button
                      type="button"
                      disabled={isLoading || isSaving || policyOptions.length === 0}
                      onClick={() => setIsPolicyModalOpen(true)}
                      className="inline-flex h-10 min-w-[240px] max-w-[320px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 outline-none transition hover:border-[var(--color-active-menu)]/40 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <span className="truncate">
                        {policy
                          ? `${policy.title}${policy.hasAssessment ? ` (${policy.questionCount})` : ""}`
                          : "Select a policy"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </div>
                </div>
              </article>

              <SelectPolicyModal
                open={isPolicyModalOpen}
                policies={policyOptions}
                currentPolicyId={policy?.id}
                disabled={isLoading || isSaving}
                onClose={() => setIsPolicyModalOpen(false)}
                onSelect={(policyId) => void handlePolicyChange(policyId)}
              />

              <div className="mt-5 mb-4 flex items-center gap-6 border-b border-slate-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setStatusMessage("");
                    }}
                    className={cx(
                      "border-b-2 px-1 pb-3 text-sm font-bold transition",
                      activeTab === tab.id
                        ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                        : "border-transparent text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {tab.label}
                    {tab.id === "questions" ? (
                      <span className="ml-1 text-slate-400">({questions.length})</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-16 text-sm font-semibold text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading assessment...
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    {activeTab === "questions" ? (
                      <QuestionsTab
                        questions={questions}
                        onQuestionsChange={setQuestions}
                        onGenerateWithAi={() => setActiveTab("ai")}
                      />
                    ) : null}

                    {activeTab === "ai" && policy ? (
                      <AiAssistantTab
                        policy={policy}
                        config={generatorConfig}
                        onConfigChange={setGeneratorConfig}
                        generated={generated}
                        selectedIds={selectedIds}
                        onToggleSelected={handleToggleSelected}
                        onSelectAll={handleSelectAll}
                        onGenerate={() => void runGenerator(generatorConfig)}
                        onClear={handleClearGenerated}
                        onAddSelected={handleAddSelected}
                        isGenerating={isGenerating}
                        errorMessage={generatorError}
                      />
                    ) : null}

                    {activeTab === "settings" ? (
                      <SettingsTab
                        settings={settings}
                        onSettingsChange={setSettings}
                        policyTitle={policy?.title ?? "Policy"}
                      />
                    ) : null}
                  </div>

                  <aside className="space-y-4">{railForTab}</aside>
                </div>
              )}
            </>
          )}
          <ModuleGuide guideKey="Assessment Builder" />
        </div>
      </section>
    </main>
  );
}
