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
    <div className="space-y-4">
      <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--color-active-menu)]">
              <FileText className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {catalogReports.length} Reports Available
              </p>
              <p className="mt-0.5 text-sm text-slate-500">Select a report below to view or export.</p>
            </div>
          </div>
          <div className="flex items-end justify-end gap-4 self-end sm:self-auto">
            <MiniBarChart />
            <MiniDonut />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="px-5 pb-1 pt-5 sm:px-6">
          <h2 className="text-base font-bold text-slate-900">Available Reports</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                <th className="w-14 px-5 py-3 sm:px-6" aria-label="Row number" />
                <th className="px-4 py-3 font-semibold">Report Name</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Date Range</th>
                <th className="px-5 py-3 text-right font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {catalogReports.map((report, index) => {
                const open = menuId === report.id;
                return (
                  <tr key={report.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4 sm:px-6">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-[var(--color-active-menu)]">
                        {index + 1}
                      </span>
                    </td>
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
                    <td className="px-5 py-4 sm:px-6">
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

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">
            Showing 1 to {catalogReports.length} of {catalogReports.length} reports
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <Info className="h-4 w-4 text-slate-400" />
            All reports are generated based on the selected date range.
          </p>
        </div>
      </section>
    </div>
  );
}

function MiniBarChart() {
  const bars = [22, 38, 28, 52, 34, 62, 44];
  return (
    <svg viewBox="0 0 92 52" className="h-[52px] w-[92px]" aria-hidden>
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 13 + 2}
          y={52 - height}
          width="9"
          height={height}
          rx="2"
          className={index === 5 ? "fill-[var(--color-active-menu)]" : "fill-sky-200"}
        />
      ))}
    </svg>
  );
}

function MiniDonut() {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { color: "#7c3aed", length: circumference * 0.28 },
    { color: "var(--color-active-menu)", length: circumference * 0.3 },
    { color: "#22d3ee", length: circumference * 0.22 },
    { color: "#93c5fd", length: circumference * 0.2 },
  ];

  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
      {segments.map((segment, index) => {
        const offset = segments.slice(0, index).reduce((sum, item) => sum + item.length, 0);
        return (
          <circle
            key={segment.color}
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="8"
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 24 24)"
          />
        );
      })}
      <circle cx="24" cy="24" r="8" fill="white" />
    </svg>
  );
}
