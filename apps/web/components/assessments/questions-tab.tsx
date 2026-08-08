"use client";

import { useMemo, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Sparkles } from "lucide-react";
import { DashboardPanel } from "../dashboard/primitives";
import { DropdownSelect } from "../ui/dropdown-select";
import { QuestionCard, QuestionEditor } from "./question-card";
import {
  createEmptyQuestion,
  duplicateQuestion,
  questionTypeLabels,
  type AssessmentQuestion,
  type QuestionType,
} from "./types";
import { cx } from "./ui";

type QuestionsTabProps = {
  questions: AssessmentQuestion[];
  onQuestionsChange: (questions: AssessmentQuestion[]) => void;
  onGenerateWithAi: () => void;
};

export default function QuestionsTab({
  questions,
  onQuestionsChange,
  onGenerateWithAi,
}: QuestionsTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | QuestionType>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["q-1"]));
  const [draft, setDraft] = useState<AssessmentQuestion | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesType = !typeFilter || question.type === typeFilter;
      const matchesTerm =
        !term ||
        question.prompt.toLowerCase().includes(term) ||
        question.options.some((option) => option.text.toLowerCase().includes(term));

      return matchesType && matchesTerm;
    });
  }, [questions, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleQuestions = filteredQuestions.slice(startIndex, startIndex + pageSize);

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

  function handleAddQuestion() {
    const question = createEmptyQuestion("MULTIPLE_CHOICE");
    onQuestionsChange([...questions, question]);
    setDraft(question);
    setSearch("");
    setTypeFilter("");
    setPage(Math.max(1, Math.ceil((questions.length + 1) / pageSize)));
  }

  function handleDuplicate(question: AssessmentQuestion) {
    const index = questions.findIndex((item) => item.id === question.id);
    const next = [...questions];
    next.splice(index + 1, 0, duplicateQuestion(question));
    onQuestionsChange(next);
  }

  function handleDelete(id: string) {
    onQuestionsChange(questions.filter((question) => question.id !== id));

    if (draft?.id === id) {
      setDraft(null);
    }
  }

  function handleSaveDraft() {
    if (!draft) {
      return;
    }

    onQuestionsChange(questions.map((question) => (question.id === draft.id ? draft : question)));
    setExpandedIds((current) => new Set(current).add(draft.id));
    setDraft(null);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    setDropIndex(null);

    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }

    const next = [...questions];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onQuestionsChange(next);
    setDragIndex(null);
  }

  return (
    <DashboardPanel title="Assessment Questions" className="p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 lg:max-w-[280px]">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search questions..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>

          <DropdownSelect
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value as "" | QuestionType);
              setPage(1);
            }}
            options={(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => ({
              value: type,
              label: questionTypeLabels[type],
            }))}
            placeholder="All Question Types"
            allowClear
            className="min-w-[12rem]"
            aria-label="Filter by question type"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>

          <button
            type="button"
            onClick={onGenerateWithAi}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-nav-active)] px-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </button>
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-4">
        {visibleQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {questions.length === 0
                ? "This assessment has no questions yet."
                : "No questions match your search."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {questions.length === 0
                ? "Add one manually, or let Hinora draft them from the policy document."
                : "Try a different search term or question type."}
            </p>
          </div>
        ) : (
          visibleQuestions.map((question, visibleIndex) => {
            const absoluteIndex = questions.findIndex((item) => item.id === question.id);

            if (draft?.id === question.id) {
              return (
                <QuestionEditor
                  key={question.id}
                  draft={draft}
                  position={startIndex + visibleIndex + 1}
                  onChange={setDraft}
                  onSave={handleSaveDraft}
                  onCancel={() => setDraft(null)}
                />
              );
            }

            return (
              <QuestionCard
                key={question.id}
                question={question}
                position={startIndex + visibleIndex + 1}
                expanded={expandedIds.has(question.id)}
                onToggleExpanded={() => toggleExpanded(question.id)}
                onEdit={() => setDraft({ ...question, options: question.options.map((o) => ({ ...o })) })}
                onDuplicate={() => handleDuplicate(question)}
                onDelete={() => handleDelete(question.id)}
                onDragStart={(event) => handleDragStart(event, absoluteIndex)}
                onDragOver={(event) => handleDragOver(event, absoluteIndex)}
                onDrop={(event) => handleDrop(event, absoluteIndex)}
                isDropTarget={dropIndex === absoluteIndex && dragIndex !== absoluteIndex}
              />
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-500">
          Showing {filteredQuestions.length === 0 ? 0 : startIndex + 1} to{" "}
          {Math.min(startIndex + pageSize, filteredQuestions.length)} of {filteredQuestions.length}{" "}
          questions
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={cx(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold transition",
                  pageNumber === currentPage
                    ? "bg-[var(--color-active-menu)] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <DropdownSelect
            value={String(pageSize)}
            onChange={(value) => {
              if (!value) return;
              setPageSize(Number(value));
              setPage(1);
            }}
            options={[5, 10, 20].map((size) => ({
              value: String(size),
              label: `${size} / page`,
            }))}
            allowClear={false}
            size="sm"
            className="w-[7.5rem]"
            aria-label="Rows per page"
          />
        </div>
      </div>
    </DashboardPanel>
  );
}
