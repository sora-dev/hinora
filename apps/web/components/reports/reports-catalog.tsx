"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Info,
  Printer,
} from "lucide-react";
import { DateRangePopover } from "./reports-date-range";
import { catalogReports, formatDateRange, type ReportId } from "./reports-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ReportsCatalog({
  from,
  to,
  onChangeRange,
  onView,
  onExportCsv,
  onExportPdf,
}: {
  from: Date;
  to: Date;
  onChangeRange: (from: Date, to: Date) => void;
  onView: (id: ReportId) => void;
  onExportCsv: (id: ReportId) => void;
  onExportPdf: (id: ReportId) => void;
}) {
  const [menuId, setMenuId] = useState<ReportId | null>(null);
  const [rangeOpenFor, setRangeOpenFor] = useState<ReportId | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const rangeLabel = formatDateRange(from, to);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuId(null);
      if (rangeRef.current && !rangeRef.current.contains(target)) setRangeOpenFor(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-blue-100 bg-[linear-gradient(90deg,#eff6ff_0%,#f8fbff_55%,#ffffff_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[var(--color-active-menu)]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-extrabold text-slate-900">{catalogReports.length} Reports Available</p>
            <p className="mt-0.5 text-sm text-slate-500">Select a report below to view or export.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <MiniBarChart />
          <MiniDonut />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              <th className="w-14 px-5 py-3">#</th>
              <th className="px-4 py-3">Report Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Date Range</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {catalogReports.map((report, index) => {
              const open = menuId === report.id;
              return (
                <tr key={report.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4 font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onView(report.id)}
                      className="text-left font-bold text-[var(--color-active-menu)] hover:underline"
                    >
                      {report.name}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{report.description}</td>
                  <td className="px-4 py-4">
                    <div className="relative" ref={rangeOpenFor === report.id ? rangeRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setRangeOpenFor((current) => (current === report.id ? null : report.id))}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-700"
                      >
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {rangeLabel}
                      </button>
                      {rangeOpenFor === report.id ? (
                        <DateRangePopover
                          from={from}
                          to={to}
                          onChangeRange={onChangeRange}
                          onClose={() => setRangeOpenFor(null)}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative flex justify-end" ref={open ? menuRef : undefined}>
                      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => onView(report.id)}
                          className="inline-flex h-9 items-center gap-1.5 px-3 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                          View Report
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuId(open ? null : report.id)}
                          className="inline-flex h-9 w-9 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50"
                          aria-expanded={open}
                          aria-label={`More actions for ${report.name}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      {open ? (
                        <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuId(null);
                              onExportCsv(report.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Download className="h-4 w-4 text-slate-400" />
                            Export CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuId(null);
                              onExportPdf(report.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Printer className="h-4 w-4 text-slate-400" />
                            Export PDF
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing 1 to {catalogReports.length} of {catalogReports.length} reports
        </p>
        <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <Info className="h-4 w-4 text-slate-400" />
          All reports are generated based on the selected date range.
        </p>
      </div>
    </section>
  );
}

function MiniBarChart() {
  const bars = [28, 46, 34, 62, 40, 72, 54];
  return (
    <svg viewBox="0 0 84 48" className="h-12 w-[84px] text-[var(--color-active-menu)]" aria-hidden>
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 12 + 2}
          y={48 - height * 0.55}
          width="8"
          height={height * 0.55}
          rx="2"
          className={index === 5 ? "fill-current" : "fill-blue-200"}
        />
      ))}
    </svg>
  );
}

function MiniDonut() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
      <circle cx="24" cy="24" r="16" fill="none" stroke="#dbeafe" strokeWidth="8" />
      <circle
        cx="24"
        cy="24"
        r="16"
        fill="none"
        stroke="var(--color-active-menu)"
        strokeWidth="8"
        strokeDasharray="70 100"
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <circle cx="24" cy="24" r="8" fill="white" />
    </svg>
  );
}
