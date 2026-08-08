"use client";

import type { DragEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createId,
  difficultyLabels,
  optionLetter,
  questionTypeLabels,
  type AssessmentQuestion,
  type Difficulty,
  type QuestionType,
} from "./types";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  cx,
  DifficultyBadge,
  fieldInputClassName,
  fieldTextareaClassName,
  IconAction,
  QuestionTypeBadge,
} from "./ui";

type QuestionCardProps = {
  question: AssessmentQuestion;
  position: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  isDropTarget: boolean;
};

export function QuestionCard({
  question,
  position,
  expanded,
  onToggleExpanded,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
}: QuestionCardProps) {
  const correctIndex = question.options.findIndex((option) => option.id === question.correctOptionId);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cx(
        "rounded-2xl border bg-white transition",
        isDropTarget ? "border-[var(--color-active-menu)] shadow-sm" : "border-slate-200",
      )}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className="mt-1 cursor-grab text-slate-300 active:cursor-grabbing" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </span>

        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
          {position}
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-0.5">
          <QuestionTypeBadge type={question.type} />
          {question.aiGenerated ? (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[0.7rem] font-bold text-emerald-600">
              AI generated
            </span>
          ) : null}
          <p className="min-w-0 flex-1 text-[0.95rem] font-bold leading-6 text-slate-800">
            {question.prompt}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label="Edit question" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconAction>
          <IconAction label="Duplicate question" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </IconAction>
          <IconAction label="Delete question" onClick={onDelete} tone="danger">
            <Trash2 className="h-4 w-4" />
          </IconAction>
          <IconAction label={expanded ? "Collapse question" : "Expand question"} onClick={onToggleExpanded}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </IconAction>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 px-3.5 py-4">
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isCorrect = option.id === question.correctOptionId;

              return (
                <div
                  key={option.id}
                  className={cx(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                    isCorrect
                      ? "border-emerald-300 bg-emerald-50/70 font-semibold text-slate-800"
                      : "border-slate-200 bg-white text-slate-600",
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      isCorrect ? "border-emerald-500" : "border-slate-300",
                    )}
                  >
                    {isCorrect ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
                  </span>

                  <span className="w-4 shrink-0 font-bold text-slate-500">{optionLetter(index)}.</span>
                  <span className="min-w-0 flex-1">{option.text}</span>

                  {isCorrect ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-2">
              Correct Answer
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-emerald-100 px-1.5 text-emerald-700">
                {correctIndex >= 0 ? optionLetter(correctIndex) : "—"}
              </span>
            </span>
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="text-slate-400">
              {question.points} {question.points === 1 ? "point" : "points"}
            </span>
          </div>

          {question.explanation ? (
            <div className="mt-3.5">
              <div className="text-xs font-bold text-slate-500">Explanation (Optional)</div>
              <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600">
                {question.explanation}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type QuestionEditorProps = {
  draft: AssessmentQuestion;
  position: number;
  onChange: (draft: AssessmentQuestion) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function QuestionEditor({ draft, position, onChange, onSave, onCancel }: QuestionEditorProps) {
  function changeType(type: QuestionType) {
    if (type === draft.type) {
      return;
    }

    if (type === "TRUE_FALSE") {
      const options = [
        { id: createId("opt"), text: "True" },
        { id: createId("opt"), text: "False" },
      ];

      onChange({ ...draft, type, options, correctOptionId: options[0].id });
      return;
    }

    const options = Array.from({ length: 4 }, (_, index) => ({
      id: createId("opt"),
      text: draft.options[index]?.text ?? "",
    }));

    onChange({ ...draft, type, options, correctOptionId: options[0].id });
  }

  function changeOptionText(optionId: string, text: string) {
    onChange({
      ...draft,
      options: draft.options.map((option) => (option.id === optionId ? { ...option, text } : option)),
    });
  }

  function addOption() {
    onChange({ ...draft, options: [...draft.options, { id: createId("opt"), text: "" }] });
  }

  function removeOption(optionId: string) {
    if (draft.options.length <= 2) {
      return;
    }

    const options = draft.options.filter((option) => option.id !== optionId);
    const correctOptionId = options.some((option) => option.id === draft.correctOptionId)
      ? draft.correctOptionId
      : options[0].id;

    onChange({ ...draft, options, correctOptionId });
  }

  const canSave = draft.prompt.trim().length > 0 && draft.options.every((option) => option.text.trim().length > 0);

  return (
    <div className="rounded-2xl border-2 border-[var(--color-active-menu)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
            {position}
          </span>
          <span className="text-sm font-bold text-slate-800">Editing question</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="inline-flex h-9 items-center rounded-xl bg-[var(--color-active-menu)] px-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save question
          </button>
        </div>
      </div>

      <div className="space-y-4 px-3.5 py-4">
        <label className="block">
          <span className="text-xs font-bold text-slate-500">Question</span>
          <textarea
            value={draft.prompt}
            onChange={(event) => onChange({ ...draft, prompt: event.target.value })}
            rows={2}
            placeholder="Type the question employees will answer."
            className={cx("mt-2", fieldTextareaClassName)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Question Type</span>
            <DropdownSelect
              value={draft.type}
              onChange={(value) => {
                if (value) changeType(value as QuestionType);
              }}
              options={(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => ({
                value: type,
                label: questionTypeLabels[type],
              }))}
              allowClear={false}
              className="mt-2"
              aria-label="Question Type"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Difficulty</span>
            <DropdownSelect
              value={draft.difficulty}
              onChange={(value) => {
                if (value) onChange({ ...draft, difficulty: value as Difficulty });
              }}
              options={(Object.keys(difficultyLabels) as Difficulty[]).map((difficulty) => ({
                value: difficulty,
                label: difficultyLabels[difficulty],
              }))}
              allowClear={false}
              className="mt-2"
              aria-label="Difficulty"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Points</span>
            <input
              type="number"
              min={1}
              max={20}
              value={draft.points}
              onChange={(event) =>
                onChange({ ...draft, points: Math.max(1, Number(event.target.value) || 1) })
              }
              className={cx("mt-2", fieldInputClassName)}
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">
              Answer Choices — select the correct one
            </span>
            {draft.type === "MULTIPLE_CHOICE" && draft.options.length < 6 ? (
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-active-menu)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add choice
              </button>
            ) : null}
          </div>

          <div className="mt-2 space-y-2">
            {draft.options.map((option, index) => {
              const isCorrect = option.id === draft.correctOptionId;

              return (
                <div
                  key={option.id}
                  className={cx(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2",
                    isCorrect ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white",
                  )}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isCorrect}
                    aria-label={`Mark choice ${optionLetter(index)} as correct`}
                    onClick={() => onChange({ ...draft, correctOptionId: option.id })}
                    className={cx(
                      "inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2",
                      isCorrect ? "border-emerald-500" : "border-slate-300",
                    )}
                  >
                    {isCorrect ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
                  </button>

                  <span className="w-4 shrink-0 text-sm font-bold text-slate-500">
                    {optionLetter(index)}.
                  </span>

                  <input
                    value={option.text}
                    onChange={(event) => changeOptionText(option.id, event.target.value)}
                    readOnly={draft.type === "TRUE_FALSE"}
                    placeholder={`Choice ${optionLetter(index)}`}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none"
                  />

                  {draft.type === "MULTIPLE_CHOICE" && draft.options.length > 2 ? (
                    <IconAction label="Remove choice" onClick={() => removeOption(option.id)}>
                      <X className="h-4 w-4" />
                    </IconAction>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-500">Explanation (Optional)</span>
          <textarea
            value={draft.explanation}
            onChange={(event) => onChange({ ...draft, explanation: event.target.value })}
            rows={3}
            placeholder="Shown to the employee after they answer, if explanations are enabled."
            className={cx("mt-2", fieldTextareaClassName)}
          />
        </label>
      </div>
    </div>
  );
}
