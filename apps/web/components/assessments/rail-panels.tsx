"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  Eye,
  Info,
  Layers,
  Lightbulb,
  ListChecks,
  PenLine,
  Scale,
  SendHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import { DashboardPanel } from "../dashboard/primitives";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  estimatedMinutes,
  type AssessmentQuestion,
  type AssessmentSettings,
  type ChatMessage,
} from "./types";
import { cx, fieldInputClassName, Toggle } from "./ui";

type AssessmentSettingsPanelProps = {
  settings: AssessmentSettings;
  onSettingsChange: (settings: AssessmentSettings) => void;
};

export function AssessmentSettingsPanel({
  settings,
  onSettingsChange,
}: AssessmentSettingsPanelProps) {
  return (
    <DashboardPanel title="Assessment Settings">
      <div className="space-y-3.5">
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Passing Score (%)</span>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              max={100}
              value={settings.passingScore}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  passingScore: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                })
              }
              className={cx(fieldInputClassName, "pr-9")}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              %
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-500">Maximum Attempts</span>
          <DropdownSelect
            value={String(settings.maximumAttempts)}
            onChange={(value) => {
              if (!value) return;
              onSettingsChange({ ...settings, maximumAttempts: Number(value) });
            }}
            options={[
              { value: "0", label: "Unlimited" },
              ...[1, 2, 3, 5].map((attempts) => ({
                value: String(attempts),
                label: `${attempts} ${attempts === 1 ? "attempt" : "attempts"}`,
              })),
            ]}
            allowClear={false}
            className="mt-2"
            aria-label="Maximum Attempts"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-500">Time Limit</span>
          <DropdownSelect
            value={String(settings.timeLimitMinutes)}
            onChange={(value) => {
              if (!value) return;
              onSettingsChange({ ...settings, timeLimitMinutes: Number(value) });
            }}
            options={[
              { value: "0", label: "No time limit" },
              ...[10, 15, 20, 30, 45, 60].map((minutes) => ({
                value: String(minutes),
                label: `${minutes} Minutes`,
              })),
            ]}
            allowClear={false}
            className="mt-2"
            aria-label="Time Limit"
          />
        </label>

        <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
          <Toggle
            label="Randomize Questions"
            checked={settings.randomizeQuestions}
            onChange={(checked) => onSettingsChange({ ...settings, randomizeQuestions: checked })}
          />
          <Toggle
            label="Shuffle Answer Choices"
            checked={settings.shuffleAnswerChoices}
            onChange={(checked) => onSettingsChange({ ...settings, shuffleAnswerChoices: checked })}
          />
          <Toggle
            label="Show Explanation After Answer"
            checked={settings.showExplanationAfterAnswer}
            onChange={(checked) =>
              onSettingsChange({ ...settings, showExplanationAfterAnswer: checked })
            }
          />
          <Toggle
            label="Allow Review After Submission"
            checked={settings.allowReviewAfterSubmission}
            onChange={(checked) =>
              onSettingsChange({ ...settings, allowReviewAfterSubmission: checked })
            }
          />
        </div>
      </div>
    </DashboardPanel>
  );
}

type SummaryRowProps = {
  icon: typeof ListChecks;
  label: string;
  value: string;
};

function SummaryRow({ icon: Icon, label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="inline-flex items-center gap-2.5 text-sm text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
      </span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

type AssessmentSummaryPanelProps = {
  questions: AssessmentQuestion[];
  lastUpdatedLabel: string;
};

export function AssessmentSummaryPanel({
  questions,
  lastUpdatedLabel,
}: AssessmentSummaryPanelProps) {
  const totalPoints = questions.reduce((total, question) => total + question.points, 0);
  const questionTypes = new Set(questions.map((question) => question.type)).size;

  return (
    <DashboardPanel title="Assessment Summary">
      <div className="divide-y divide-slate-100">
        <SummaryRow icon={ListChecks} label="Total Questions" value={String(questions.length)} />
        <SummaryRow icon={Target} label="Total Points" value={String(totalPoints)} />
        <SummaryRow icon={Layers} label="Question Types" value={String(questionTypes)} />
        <SummaryRow icon={Clock} label="Estimated Time" value={estimatedMinutes(questions.length)} />
        <SummaryRow icon={CalendarDays} label="Last Updated" value={lastUpdatedLabel} />
      </div>
    </DashboardPanel>
  );
}

const flowSteps = [
  { icon: Eye, label: "Read Policy" },
  { icon: ClipboardList, label: "Take Assessment" },
  { icon: PenLine, label: "Acknowledge Policy" },
];

export function AssessmentFlowPanel() {
  return (
    <DashboardPanel title="Assessment Flow for Employees">
      <div className="flex items-start justify-between gap-1">
        {flowSteps.map((step, index) => (
          <div key={step.label} className="flex flex-1 items-start gap-1">
            <div className="flex flex-1 flex-col items-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-[var(--color-nav-active)]">
                <step.icon className="h-4.5 w-4.5" />
              </span>
              <span className="mt-2 text-[0.72rem] font-bold leading-4 text-slate-600">
                {step.label}
              </span>
            </div>

            {index < flowSteps.length - 1 ? (
              <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-slate-300" />
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[0.78rem] leading-5 text-slate-500">
        Employees must pass the assessment to acknowledge the policy.
      </p>
    </DashboardPanel>
  );
}

export type ChatSuggestion = {
  id: string;
  label: string;
};

type AiChatPanelProps = {
  messages: ChatMessage[];
  suggestions: ChatSuggestion[];
  onSuggestion: (id: string) => void;
  onSend: (text: string) => void;
  onNewChat: () => void;
};

export function AiChatPanel({
  messages,
  suggestions,
  onSuggestion,
  onSend,
  onNewChat,
}: AiChatPanelProps) {
  const [input, setInput] = useState("");

  function submit() {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    onSend(trimmed);
    setInput("");
  }

  return (
    <DashboardPanel title="AI Assistant" action="New Chat" onAction={onNewChat}>
      <div className="space-y-3">
        {messages.map((message) =>
          message.author === "HINORA" ? (
            <div key={message.id} className="flex gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#5b4ae0] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <p className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2.5 text-[0.82rem] leading-5 text-slate-700">
                {message.text}
              </p>
            </div>
          ) : (
            <p
              key={message.id}
              className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--color-active-menu)] px-3 py-2.5 text-[0.82rem] leading-5 text-white"
            >
              {message.text}
            </p>
          ),
        )}
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-3.5">
          <div className="text-[0.78rem] font-semibold text-slate-500">Try asking me:</div>
          <div className="mt-2 space-y-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onSuggestion(suggestion.id)}
                className="block w-full rounded-xl bg-blue-50 px-3 py-2 text-left text-[0.8rem] font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-100"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask anything about this policy..."
          className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-slate-800 outline-none"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Send message"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-active-menu)] transition hover:bg-blue-50"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </DashboardPanel>
  );
}

const tips = [
  {
    icon: Lightbulb,
    tone: "bg-amber-50 text-amber-500",
    title: "Be Clear",
    body: "Avoid ambiguous wording and double negatives.",
  },
  {
    icon: BookOpenCheck,
    tone: "bg-blue-50 text-blue-500",
    title: "Test Understanding",
    body: "Use scenario-based questions to test real-world application.",
  },
  {
    icon: Scale,
    tone: "bg-violet-50 text-violet-500",
    title: "Mix Difficulty",
    body: "Combine easy, medium, and hard questions for better assessment.",
  },
  {
    icon: PenLine,
    tone: "bg-emerald-50 text-emerald-500",
    title: "Review & Edit",
    body: "Always review AI-generated questions before publishing.",
  },
];

export function AiTipsPanel() {
  return (
    <DashboardPanel title="Tips for Better Questions">
      <div className="space-y-3.5">
        {tips.map((tip) => (
          <div key={tip.title} className="flex gap-2.5">
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                tip.tone,
              )}
            >
              <tip.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[0.82rem] font-bold text-slate-800">{tip.title}</div>
              <p className="mt-0.5 text-[0.78rem] leading-5 text-slate-500">{tip.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[0.76rem] leading-5 text-slate-500">
          AI generated questions are suggestions. Please review and edit as needed before adding them
          to your assessment.
        </p>
      </div>
    </DashboardPanel>
  );
}
