"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Database,
  Download,
  Eye,
  Filter,
  Info,
  Printer,
  Search,
  UserRound,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { DateRangeField } from "./reports-date-range";
import {
  uniqueValues,
  type ReportColumn,
  type ReportRow,
  type ReportSnapshot,
} from "./reports-data";
import { formatDateRange, formatReportDateTime } from "./reports-data";

const pageSizeOptions = [
  { value: "10", label: "10 per page" },
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function ReportsViewer({
  snapshot,
  from,
  to,
  generatedAt,
  generatedBy,
  onBack,
  onRangeChange,
  onRun,
  onDownloadXls,
  onPrint,
}: {
  snapshot: ReportSnapshot;
  from: Date;
  to: Date;
  generatedAt: Date;
  generatedBy: string;
  onBack: () => void;
  onRangeChange: (from: Date, to: Date) => void;
  onRun: () => void;
  onDownloadXls: (columns: ReportColumn[], rows: ReportRow[]) => void;
  onPrint: (columns: ReportColumn[], rows: ReportRow[]) => void;
}) {
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [extraDraft, setExtraDraft] = useState<Record<string, string>>({});
  const [appliedLocation, setAppliedLocation] = useState("");
  const [appliedDepartment, setAppliedDepartment] = useState("");
  const [appliedExtra, setAppliedExtra] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const locationOptions = useMemo(
    () => uniqueValues(snapshot.rows, "location").map((value) => ({ value, label: value })),
    [snapshot.rows],
  );
  const departmentOptions = useMemo(
    () => uniqueValues(snapshot.rows, "department").map((value) => ({ value, label: value })),
    [snapshot.rows],
  );

  const visibleColumns = snapshot.columns.filter((column) => !hiddenColumns.includes(column.key));
  const extraActiveCount = snapshot.extraFilters.filter((item) => Boolean(appliedExtra[item.key])).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.rows.filter((row) => {
      if (appliedLocation && row.location !== appliedLocation) return false;
      if (appliedDepartment && row.department !== appliedDepartment) return false;
      for (const item of snapshot.extraFilters) {
        const selected = appliedExtra[item.key];
        if (selected && row[item.key] !== selected) return false;
      }
      if (!query) return true;
      return snapshot.columns.some((column) => (row[column.key] ?? "").toLowerCase().includes(query));
    });
  }, [appliedDepartment, appliedExtra, appliedLocation, search, snapshot]);

  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);
  const pageEnd = pageStart + pageItems.length;

  useEffect(() => {
    setPage(1);
  }, [appliedLocation, appliedDepartment, appliedExtra, search, pageSize, snapshot.id]);

  useEffect(() => {
    setLocation("");
    setDepartment("");
    setExtraDraft({});
    setAppliedLocation("");
    setAppliedDepartment("");
    setAppliedExtra({});
    setHiddenColumns([]);
    setSearch("");
  }, [snapshot.id]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (columnsRef.current && !columnsRef.current.contains(target)) setColumnsOpen(false);
      if (filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const columnsLabel =
    hiddenColumns.length === 0 ? "All columns" : `${visibleColumns.length} of ${snapshot.columns.length} columns`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <button type="button" onClick={onBack} className="font-medium hover:text-slate-800">
              Reports
            </button>
            <span className="text-slate-300">&gt;</span>
            <span className="font-semibold text-slate-700">{snapshot.name}</span>
          </nav>
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-slate-900 sm:text-[2rem]">
            {snapshot.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{snapshot.description}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Reports
        </button>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="min-w-[11rem] flex-1 text-xs font-bold text-slate-500">
            Location
            <div className="mt-1.5">
              <DropdownSelect
                value={location}
                onChange={(value) => setLocation(value)}
                options={locationOptions}
                placeholder="All locations"
                allowClear
                aria-label="Location"
              />
            </div>
          </label>
          <label className="min-w-[12rem] flex-1 text-xs font-bold text-slate-500">
            Department
            <div className="mt-1.5">
              <DropdownSelect
                value={department}
                onChange={(value) => setDepartment(value)}
                options={departmentOptions}
                placeholder="All departments"
                allowClear
                aria-label="Department"
              />
            </div>
          </label>
          <label className="min-w-[14rem] flex-1 text-xs font-bold text-slate-500">
            Date Range
            <div className="mt-1.5">
              <DateRangeField from={from} to={to} onChange={onRangeChange} />
            </div>
          </label>
          <div className="min-w-[11rem] flex-1 text-xs font-bold text-slate-500">
            Columns
            <div className="relative mt-1.5" ref={columnsRef}>
              <button
                type="button"
                onClick={() => setColumnsOpen((current) => !current)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800"
              >
                <span className="truncate">{columnsLabel}</span>
                <ChevronDown className={cx("h-4 w-4 text-slate-400", columnsOpen && "rotate-180")} />
              </button>
              {columnsOpen ? (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                  {snapshot.columns.map((column) => {
                    const checked = !hiddenColumns.includes(column.key);
                    return (
                      <label
                        key={column.key}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setHiddenColumns((current) => {
                              if (checked) {
                                if (current.length >= snapshot.columns.length - 1) return current;
                                return [...current, column.key];
                              }
                              return current.filter((key) => key !== column.key);
                            });
                          }}
                          className="h-3.5 w-3.5 accent-[var(--color-active-menu)]"
                        />
                        {column.label}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:pb-0.5">
            <button
              type="button"
              onClick={() => {
                setAppliedLocation(location);
                setAppliedDepartment(department);
                setAppliedExtra(extraDraft);
                onRun();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white hover:brightness-110"
            >
              <Eye className="h-4 w-4" />
              View Report
            </button>
            <button
              type="button"
              onClick={() => onDownloadXls(visibleColumns, filtered)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Download className="h-4 w-4" />
              Download XLS
            </button>
            <button
              type="button"
              onClick={() => onPrint(visibleColumns, filtered)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>
              <span className="text-slate-400">Report Generated</span>
              <span className="ml-2 font-semibold text-slate-800">{formatReportDateTime(generatedAt)}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-400" />
            <span>
              <span className="text-slate-400">Generated By</span>
              <span className="ml-2 font-semibold text-slate-800">{generatedBy}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-400" />
            <span>
              <span className="text-slate-400">Total Records</span>
              <span className="ml-2 font-semibold text-slate-800">{filtered.length.toLocaleString("en-US")}</span>
            </span>
          </span>
        </div>
        {snapshot.showCurrencyNote ? (
          <p className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-[var(--color-active-menu)]">
            <Info className="h-4 w-4" />
            All amounts are in PHP.
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-[var(--color-active-menu)]">
            <Info className="h-4 w-4" />
            Results use the selected date range {formatDateRange(from, to)}.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 sm:w-80">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search in results..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>
          {snapshot.extraFilters.length > 0 ? (
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((current) => !current)}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold hover:bg-slate-50",
                  extraActiveCount > 0
                    ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                    : "border-slate-200 text-slate-700",
                )}
              >
                <Filter className="h-4 w-4" />
                Filter
                {extraActiveCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1 text-[11px] font-bold text-white">
                    {extraActiveCount}
                  </span>
                ) : null}
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                  {snapshot.extraFilters.map((item) => (
                    <label key={item.key} className="block text-xs font-bold text-slate-500">
                      {item.label}
                      <div className="mt-1.5">
                        <DropdownSelect
                          value={extraDraft[item.key] ?? ""}
                          onChange={(value) =>
                            setExtraDraft((current) => ({ ...current, [item.key]: value }))
                          }
                          options={uniqueValues(snapshot.rows, item.key).map((value) => ({
                            value,
                            label: value,
                          }))}
                          placeholder={`All ${item.label.toLowerCase()}`}
                          allowClear
                          size="sm"
                          aria-label={item.label}
                        />
                      </div>
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExtraDraft({});
                        setAppliedExtra({});
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedExtra(extraDraft);
                        setFilterOpen(false);
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--color-active-menu)] text-sm font-semibold text-white"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-3">No.</th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cx("px-4 py-3", column.align === "right" && "text-right")}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row, index) => (
                <tr key={`${snapshot.id}-${pageStart + index}`} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{pageStart + index + 1}</td>
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-4 py-3",
                        column.align === "right" ? "text-right tabular-nums text-slate-700" : "text-slate-700",
                        column.key === snapshot.columns[0]?.key && "font-semibold text-slate-800",
                      )}
                    >
                      {row[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                    No records match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-500">
            Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {filtered.length.toLocaleString("en-US")}{" "}
            records
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownSelect
              value={pageSize}
              onChange={(value) => setPageSize(value || "10")}
              options={pageSizeOptions}
              size="sm"
              className="w-[8.5rem]"
              aria-label="Rows per page"
            />
            <div className="flex flex-wrap items-center gap-1">
              <PagerButton label="First" disabled={currentPage <= 1} onClick={() => setPage(1)} />
              <PagerButton
                label="Previous"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              />
              {pageNumbers(currentPage, totalPages).map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-sm font-semibold text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cx(
                      "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold",
                      item === currentPage
                        ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] shadow-[0_0_0_1px_var(--color-active-menu)]"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
              <PagerButton
                label="Next"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
              <PagerButton
                label="Last"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40"
    >
      {label}
    </button>
  );
}
