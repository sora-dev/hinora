"use client";

import { useState } from "react";
import {
  ChevronDown,
  CircleCheck,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { DashboardPanel } from "../dashboard/primitives";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  bloomLevelLabels,
  difficultyLabels,
  optionLetter,
  questionTypeLabels,
  type AiGeneratorConfig,
  type AssessmentPolicy,
  type AssessmentQuestion,
  type BloomLevel,
  type Difficulty,
  type QuestionType,
} from "./types";
import { cx, fieldTextareaClassName, QuestionTypeBadge } from "./ui";

const focusAreasLimit = 300;

type AiAssistantTabProps = {
  policy: AssessmentPolicy;
  config: AiGeneratorConfig;
  onConfigChange: (config: AiGeneratorConfig) => void;
  generated: AssessmentQuestion[];
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onGenerate: () => void;
  onClear: () => void;
  onAddSelected: () => void;
  isGenerating: boolean;
  errorMessage: string;
};

export default function AiAssistantTab({
  policy,
  config,
  onConfigChange,
  generated,
  selectedIds,
  onToggleSelected,
  onSelectAll,
  onGenerate,
  onClear,
  onAddSelected,
  isGenerating,
  errorMessage,
}: AiAssistantTabProps) {
  const [resultsTab, setResultsTab] = useState<"generated" | "selected">("generated");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [visibleCount, setVisibleCount] = useState(3);

  const selectedQuestions = generated.filter((question) => selectedIds.has(question.id));
  const listedQuestions = resultsTab === "generated" ? generated : selectedQuestions;
  const visibleQuestions = listedQuestions.slice(0, visibleCount);
  const allSelected = generated.length > 0 && selectedIds.size === generated.length;

  function toggleQuestionType(type: QuestionType) {
    const next = config.questionTypes.includes(type)
      ? config.questionTypes.filter((item) => item !== type)
      : [...config.questionTypes, type];

    onConfigChange({ ...config, questionTypes: next });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div className="space-y-4">
      <DashboardPanel title="AI Question Generator">
        <p className="-mt-2 mb-4 text-sm text-slate-500">
          Use AI to generate relevant assessment questions based on the policy content.
        </p>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Number of Questions</span>
            <DropdownSelect
              value={String(config.questionCount)}
              onChange={(value) => {
                if (!value) return;
                onConfigChange({ ...config, questionCount: Number(value) });
              }}
              options={[5, 10, 15, 20, 25].map((count) => ({
                value: String(count),
                label: String(count),
              }))}
              allowClear={false}
              className="mt-2"
              aria-label="Number of Questions"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Difficulty Level</span>
            <DropdownSelect
              value={config.difficulty}
              onChange={(value) => {
                if (!value) return;
                onConfigChange({ ...config, difficulty: value as Difficulty });
              }}
              options={(Object.keys(difficultyLabels) as Difficulty[]).map((difficulty) => ({
                value: difficulty,
                label: difficultyLabels[difficulty],
              }))}
              allowClear={false}
              className="mt-2"
              aria-label="Difficulty Level"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Bloom&apos;s Taxonomy Level</span>
            <DropdownSelect
              value={config.bloomLevel}
              onChange={(value) => {
                if (!value) return;
                onConfigChange({ ...config, bloomLevel: value as BloomLevel });
              }}
              options={(Object.keys(bloomLevelLabels) as BloomLevel[]).map((level) => ({
                value: level,
                label: bloomLevelLabels[level],
              }))}
              allowClear={false}
              className="mt-2"
              aria-label="Bloom's Taxonomy Level"
            />
          </label>

          <div>
            <span className="text-xs font-bold text-slate-500">Question Types</span>
            <details className="group relative mt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {config.questionTypes.length === 0 ? (
                    <span className="text-sm font-semibold text-slate-400">Select types</span>
                  ) : (
                    config.questionTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 text-[0.72rem] font-bold text-slate-700"
                      >
                        {questionTypeLabels[type]}
                        <X
                          className="h-3 w-3 text-slate-400"
                          onClick={(event) => {
                            event.preventDefault();
                            toggleQuestionType(type);
                          }}
                        />
                      </span>
                    ))
                  )}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>

              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleQuestionType(type)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span
                      className={cx(
                        "inline-flex h-4 w-4 items-center justify-center rounded border",
                        config.questionTypes.includes(type)
                          ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)] text-white"
                          : "border-slate-300 bg-white",
                      )}
                    >
                      {config.questionTypes.includes(type) ? <CheckMark /> : null}
                    </span>
                    {questionTypeLabels[type]}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-3.5 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
              <div>
                <div className="text-sm font-bold text-slate-800">Policy Content Source</div>
                <p className="mt-1 text-[0.82rem] leading-5 text-slate-600">
                  The AI will analyze the policy document to generate questions. You can also add focus
                  areas or specific topics (optional).
                </p>
              </div>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.78rem] font-semibold text-slate-500">
              Document: {policy.fileName}
              <CircleCheck className="h-4 w-4 text-emerald-500" />
            </span>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-500">Focus Areas (Optional)</span>
          <div className="relative mt-2">
            <textarea
              value={config.focusAreas}
              maxLength={focusAreasLimit}
              onChange={(event) => onConfigChange({ ...config, focusAreas: event.target.value })}
              rows={3}
              placeholder="Example: Password security, Data protection, Access control..."
              className={cx(fieldTextareaClassName, "pb-7")}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-slate-400">
              {config.focusAreas.length}/{focusAreasLimit}
            </span>
          </div>
        </label>

        {errorMessage ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-[var(--color-error)]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || config.questionTypes.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[var(--color-nav-active)] bg-indigo-50 px-4 text-sm font-bold text-[var(--color-nav-active)] transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate Questions"}
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={isGenerating || generated.length === 0}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </DashboardPanel>

      {generated.length > 0 ? (
        <article className="rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setResultsTab("generated")}
                className={cx(
                  "border-b-2 pb-2.5 pt-1 text-sm font-bold transition",
                  resultsTab === "generated"
                    ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                AI Generated Questions{" "}
                <span className="ml-1 text-slate-400">{generated.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setResultsTab("selected")}
                className={cx(
                  "border-b-2 pb-2.5 pt-1 text-sm font-bold transition",
                  resultsTab === "selected"
                    ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                Selected ({selectedIds.size})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                />
                Select All
              </label>

              <button
                type="button"
                onClick={onAddSelected}
                disabled={selectedIds.size === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-nav-active)] px-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Selected ({selectedIds.size}) to Assessment
              </button>
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-4">
            {visibleQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No questions selected yet. Tick the ones you want to keep.
              </div>
            ) : (
              visibleQuestions.map((question, index) => {
                const isExpanded = expandedIds.has(question.id);

                return (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-start gap-3 px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(question.id)}
                        onChange={() => onToggleSelected(question.id)}
                        aria-label={`Select question ${index + 1}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--color-active-menu)]"
                      />

                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>

                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-0.5">
                        <QuestionTypeBadge type={question.type} />
                        <p className="min-w-0 flex-1 text-[0.92rem] font-bold leading-6 text-slate-800">
                          {question.prompt}
                        </p>
                      </div>

                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[0.7rem] font-bold text-emerald-600">
                        <Sparkles className="h-3 w-3" />
                        Generated
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(question.id)}
                        aria-label={isExpanded ? "Collapse question" : "Expand question"}
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
                      >
                        <ChevronDown
                          className={cx("h-4 w-4 transition", isExpanded && "rotate-180")}
                        />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 px-3.5 py-3.5">
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isCorrect = option.id === question.correctOptionId;

                            return (
                              <div
                                key={option.id}
                                className={cx(
                                  "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                                  isCorrect
                                    ? "border-emerald-300 bg-emerald-50/70 font-semibold text-slate-800"
                                    : "border-slate-200 text-slate-600",
                                )}
                              >
                                <span className="w-4 shrink-0 font-bold text-slate-500">
                                  {optionLetter(optionIndex)}.
                                </span>
                                <span className="min-w-0 flex-1">{option.text}</span>
                                {isCorrect ? (
                                  <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[0.82rem] leading-5 text-slate-600">
                          {question.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {listedQuestions.length > visibleCount ? (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + 5)}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Show More
                </button>
              </div>
            ) : null}
          </div>
        </article>
      ) : null}
    </div>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
