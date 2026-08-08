"use client";

import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  badgeClassName?: string;
  disabled?: boolean;
};

type DropdownSelectProps<T extends string> = {
  value: T | "";
  onChange: (value: T | "") => void;
  options: Array<DropdownOption<T>>;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  size?: "sm" | "md";
  leadingIcon?: LucideIcon;
  renderValue?: (option: DropdownOption<T> | null) => ReactNode;
  "aria-label"?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      onOutside();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [enabled, onOutside, ref]);
}

export function DropdownSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  allowClear = false,
  disabled = false,
  className,
  menuClassName,
  size = "md",
  leadingIcon: LeadingIcon,
  renderValue,
  "aria-label": ariaLabel,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? null;

  useOutsideClick(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const triggerHeight = size === "sm" ? "h-9" : "h-11";
  const triggerText = size === "sm" ? "text-sm" : "text-sm";

  return (
    <div ref={containerRef} className={cx("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel ?? placeholder}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={cx(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left font-semibold text-slate-900 outline-none transition",
          triggerHeight,
          triggerText,
          open
            ? "border-[var(--color-active-menu)] ring-4 ring-blue-100"
            : "hover:border-slate-300 focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100",
          disabled && "cursor-not-allowed opacity-60",
          LeadingIcon && "pl-10",
        )}
      >
        {LeadingIcon ? (
          <LeadingIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <span className="min-w-0 flex-1 truncate">
          {renderValue ? (
            renderValue(selected)
          ) : selected ? (
            selected.badgeClassName ? (
              <span
                className={cx(
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                  selected.badgeClassName,
                )}
              >
                {selected.label}
              </span>
            ) : (
              selected.label
            )
          ) : (
            <span className="font-medium text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 text-slate-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={cx(
            "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
            menuClassName,
          )}
        >
          {allowClear ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cx(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                !value
                  ? "bg-[var(--color-active-menu)] font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {!value ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
              <span>{placeholder}</span>
            </button>
          ) : null}

          <div className="max-h-56 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                    option.disabled && "cursor-not-allowed opacity-50",
                    active
                      ? "bg-[var(--color-active-menu)] font-semibold text-white"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {active ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                  {option.badgeClassName ? (
                    <span
                      className={cx(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                        active ? "bg-white/20 text-white" : option.badgeClassName,
                      )}
                    >
                      {option.label}
                    </span>
                  ) : (
                    <span>{option.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
