"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDateRange, parseDateInput, toDateInputValue } from "./reports-data";

export function DateRangeField({
  from,
  to,
  onChange,
  className,
}: {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300"
      >
        <span className="inline-flex min-w-0 items-center gap-2 truncate">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{formatDateRange(from, to)}</span>
        </span>
      </button>
      {open ? (
        <DateRangePopover
          from={from}
          to={to}
          onChangeRange={(nextFrom, nextTo) => {
            onChange(nextFrom, nextTo);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function DateRangePopover({
  from,
  to,
  onChangeRange,
  onClose,
}: {
  from: Date;
  to: Date;
  onChangeRange: (from: Date, to: Date) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(toDateInputValue(from));
  const [end, setEnd] = useState(toDateInputValue(to));

  function applyPreset(days: number) {
    const nextTo = new Date();
    const nextFrom = new Date();
    nextFrom.setDate(nextTo.getDate() - (days - 1));
    onChangeRange(nextFrom, nextTo);
    onClose();
  }

  return (
    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[18rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Date range</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold text-slate-500">
          From
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-500">
          To
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[
          { days: 1, label: "Today" },
          { days: 7, label: "7 days" },
          { days: 30, label: "30 days" },
          { days: 90, label: "90 days" },
        ].map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const nextFrom = parseDateInput(start);
          const nextTo = parseDateInput(end);
          if (Number.isNaN(nextFrom.getTime()) || Number.isNaN(nextTo.getTime())) return;
          onChangeRange(nextFrom <= nextTo ? nextFrom : nextTo, nextFrom <= nextTo ? nextTo : nextFrom);
          onClose();
        }}
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--color-active-menu)] text-sm font-semibold text-white"
      >
        Apply range
      </button>
    </div>
  );
}
