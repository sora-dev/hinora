"use client";

import type { ReactNode } from "react";
import { questionTypeLabels, type Difficulty, type QuestionType } from "./types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const fieldInputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]";

export const fieldTextareaClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cx("block", className)}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

const questionTypeBadgeStyles: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "bg-blue-50 text-blue-600",
  TRUE_FALSE: "bg-violet-50 text-violet-600",
};

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[0.7rem] font-bold",
        questionTypeBadgeStyles[type],
      )}
    >
      {questionTypeLabels[type]}
    </span>
  );
}

const difficultyBadgeStyles: Record<Difficulty, string> = {
  EASY: "bg-emerald-50 text-emerald-600",
  MEDIUM: "bg-amber-50 text-amber-600",
  HARD: "bg-rose-50 text-rose-600",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[0.7rem] font-bold capitalize",
        difficultyBadgeStyles[difficulty],
      )}
    >
      {difficulty.toLowerCase()}
    </span>
  );
}

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>

      <span
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[var(--color-active-menu)]" : "bg-slate-300",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

type IconActionProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "neutral" | "danger";
};

export function IconAction({ label, onClick, children, tone = "neutral" }: IconActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition",
        tone === "danger"
          ? "text-rose-500 hover:bg-rose-50"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
      )}
    >
      {children}
    </button>
  );
}
