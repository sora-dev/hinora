"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)] ring-1 ring-inset ring-blue-100">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
        >
          {actionLabel}
        </button>
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={onSecondaryAction}
          className="mt-3 text-sm font-semibold text-[var(--color-active-menu)] hover:underline"
        >
          {secondaryActionLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}
