"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { getSessionProfileDisplay } from "../dashboard/session";
import { ReportsCatalog } from "./reports-catalog";
import { ReportsHistory } from "./reports-history";
import { ReportsViewer } from "./reports-viewer";
import {
  buildReportSnapshot,
  createHistoryId,
  downloadSnapshotCsv,
  downloadSnapshotXls,
  formatDateRange,
  formatReportDateTime,
  loadReportHistory,
  parseDateInput,
  printReport,
  saveReportHistory,
  toDateInputValue,
  type ReportColumn,
  type ReportFormat,
  type ReportHistoryItem,
  type ReportId,
  type ReportRow,
  type ReportSnapshot,
} from "./reports-data";

type ReportsTab = "all" | "history";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ReportsExperience() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("all");
  const [from, setFrom] = useState(() => new Date());
  const [to, setTo] = useState(() => new Date());
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [viewer, setViewer] = useState<{
    snapshot: ReportSnapshot;
    from: Date;
    to: Date;
    generatedAt: Date;
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    setHistory(loadReportHistory());
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    saveReportHistory(history);
  }, [history, historyReady]);

  const actor = useMemo(() => getSessionProfileDisplay({ name: "Admin User" }).name, []);

  function changeRange(nextFrom: Date, nextTo: Date) {
    setFrom(nextFrom);
    setTo(nextTo);
    setLastUpdated(new Date());
    setViewer((current) =>
      current
        ? {
            ...current,
            from: nextFrom,
            to: nextTo,
            snapshot: buildReportSnapshot(current.snapshot.id, nextFrom, nextTo),
          }
        : current,
    );
  }

  function recordHistory(
    reportId: ReportId,
    format: ReportFormat,
    snapshot: ReportSnapshot,
    rangeFrom = from,
    rangeTo = to,
    rowCount = snapshot.rows.length,
  ) {
    const item: ReportHistoryItem = {
      id: createHistoryId(),
      reportId,
      name: snapshot.name,
      generatedAt: new Date().toISOString(),
      generatedBy: actor,
      dateFrom: toDateInputValue(rangeFrom),
      dateTo: toDateInputValue(rangeTo),
      format,
      status: "Completed",
      rowCount,
    };
    setHistory((current) => [item, ...current]);
    setLastUpdated(new Date());
  }

  function openSnapshot(reportId: ReportId, rangeFrom = from, rangeTo = to, record: ReportFormat | null = "View") {
    const snapshot = buildReportSnapshot(reportId, rangeFrom, rangeTo);
    const generatedAt = new Date();
    setViewer({ snapshot, from: rangeFrom, to: rangeTo, generatedAt });
    setFrom(rangeFrom);
    setTo(rangeTo);
    setActiveTab("all");
    if (record) {
      recordHistory(reportId, record, snapshot, rangeFrom, rangeTo);
    }
  }

  function exportCsv(reportId: ReportId, rangeFrom = from, rangeTo = to) {
    const snapshot = buildReportSnapshot(reportId, rangeFrom, rangeTo);
    downloadSnapshotCsv(snapshot);
    recordHistory(reportId, "CSV", snapshot, rangeFrom, rangeTo);
  }

  function exportPdf(reportId: ReportId, rangeFrom = from, rangeTo = to) {
    const snapshot = buildReportSnapshot(reportId, rangeFrom, rangeTo);
    printReport(snapshot, formatDateRange(rangeFrom, rangeTo), formatReportDateTime(new Date()));
    recordHistory(reportId, "PDF", snapshot, rangeFrom, rangeTo);
  }

  function runViewer() {
    if (!viewer) return;
    const snapshot = buildReportSnapshot(viewer.snapshot.id, from, to);
    const generatedAt = new Date();
    setViewer({ snapshot, from, to, generatedAt });
    recordHistory(snapshot.id, "View", snapshot, from, to);
  }

  function downloadViewerXls(columns: ReportColumn[], rows: ReportRow[]) {
    if (!viewer) return;
    downloadSnapshotXls(viewer.snapshot, columns, rows);
    recordHistory(viewer.snapshot.id, "XLS", viewer.snapshot, viewer.from, viewer.to, rows.length);
  }

  function printViewer(columns: ReportColumn[], rows: ReportRow[]) {
    if (!viewer) return;
    printReport(viewer.snapshot, formatDateRange(viewer.from, viewer.to), formatReportDateTime(viewer.generatedAt), columns, rows);
    recordHistory(viewer.snapshot.id, "PDF", viewer.snapshot, viewer.from, viewer.to, rows.length);
  }

  return (
    <DashboardShell variant="admin">
      <div className="px-4 py-5 md:px-5">
        {viewer ? (
          <ReportsViewer
            snapshot={viewer.snapshot}
            from={viewer.from}
            to={viewer.to}
            generatedAt={viewer.generatedAt}
            generatedBy={actor}
            onBack={() => setViewer(null)}
            onRangeChange={changeRange}
            onRun={runViewer}
            onDownloadXls={downloadViewerXls}
            onPrint={printViewer}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Reports</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Generate insights and analytics based on your policy library data.
                </p>
              </div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                <Clock3 className="h-4 w-4" />
                Last Updated {formatReportDateTime(lastUpdated)}
              </p>
            </div>

            <div className="mb-5 overflow-x-auto border-b border-slate-200">
              <div className="flex min-w-max gap-1">
                {(
                  [
                    { id: "all", label: "All Reports" },
                    { id: "history", label: "Reports History" },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cx(
                        "relative px-3.5 py-3 text-sm font-semibold transition",
                        active ? "text-[var(--color-active-menu)]" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {tab.label}
                      {active ? (
                        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--color-active-menu)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === "all" ? (
              <ReportsCatalog
                from={from}
                to={to}
                onChangeRange={changeRange}
                onView={(id) => openSnapshot(id)}
                onExportCsv={(id) => exportCsv(id)}
                onExportPdf={(id) => exportPdf(id)}
              />
            ) : (
              <ReportsHistory
                items={history}
                onView={(item) =>
                  openSnapshot(item.reportId, parseDateInput(item.dateFrom), parseDateInput(item.dateTo), null)
                }
                onExportCsv={(item) =>
                  exportCsv(item.reportId, parseDateInput(item.dateFrom), parseDateInput(item.dateTo))
                }
                onExportPdf={(item) =>
                  exportPdf(item.reportId, parseDateInput(item.dateFrom), parseDateInput(item.dateTo))
                }
                onDelete={(item) => setHistory((current) => current.filter((entry) => entry.id !== item.id))}
              />
            )}

            <ModuleGuide guideKey="Reports" />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
