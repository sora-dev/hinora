"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { recordClientAuditEvent } from "../../lib/record-audit-event";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { getSessionProfileDisplay } from "../dashboard/session";
import { ReportsCatalog } from "./reports-catalog";
import { ReportsHistory } from "./reports-history";
import { ReportsViewer } from "./reports-viewer";
import {
  createReportHistory,
  defaultReportRange,
  deleteReportHistory,
  downloadSnapshotCsv,
  downloadSnapshotXls,
  fetchReportHistory,
  fetchReportSnapshot,
  formatDateRange,
  formatReportDateTime,
  parseDateInput,
  printReport,
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
  const [from, setFrom] = useState(() => defaultReportRange().from);
  const [to, setTo] = useState(() => defaultReportRange().to);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [reportError, setReportError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewer, setViewer] = useState<{
    snapshot: ReportSnapshot;
    from: Date;
    to: Date;
    generatedAt: Date;
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const items = await fetchReportHistory();
        if (!cancelled) {
          setHistory(items);
          setHistoryError("");
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error ? error.message : "Unable to load report history.",
          );
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const actor = useMemo(() => getSessionProfileDisplay({ name: "Admin User" }).name, []);

  function changeRange(nextFrom: Date, nextTo: Date) {
    setFrom(nextFrom);
    setTo(nextTo);
    setLastUpdated(new Date());
    if (viewer) {
      void loadSnapshot(viewer.snapshot.id, nextFrom, nextTo, { record: null, openViewer: true });
    }
  }

  async function loadSnapshot(
    reportId: ReportId,
    rangeFrom: Date,
    rangeTo: Date,
    options: { record: ReportFormat | null; openViewer: boolean },
  ) {
    setIsGenerating(true);
    setReportError("");
    try {
      const snapshot = await fetchReportSnapshot(reportId, rangeFrom, rangeTo);
      const generatedAt = new Date();
      setFrom(rangeFrom);
      setTo(rangeTo);
      setLastUpdated(generatedAt);
      if (options.openViewer) {
        setViewer({ snapshot, from: rangeFrom, to: rangeTo, generatedAt });
        setActiveTab("all");
      }
      if (options.record) {
        void recordHistory(reportId, options.record, snapshot, rangeFrom, rangeTo);
      }
      return snapshot;
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Unable to generate report.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }

  async function recordHistory(
    reportId: ReportId,
    format: ReportFormat,
    snapshot: ReportSnapshot,
    rangeFrom = from,
    rangeTo = to,
    rowCount = snapshot.rows.length,
  ) {
    try {
      const item = await createReportHistory({
        reportId,
        name: snapshot.name,
        generatedAt: new Date().toISOString(),
        generatedBy: actor,
        dateFrom: toDateInputValue(rangeFrom),
        dateTo: toDateInputValue(rangeTo),
        format,
        status: "Completed",
        rowCount,
      });
      setHistory((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
      setHistoryError("");
      setLastUpdated(new Date());
      if (format !== "View") {
        recordClientAuditEvent({
          action: "EXPORT",
          module: "Reports",
          resourceType: "Report",
          resource: snapshot.name,
          details:
            format === "PDF"
              ? "Report printed"
              : `Report exported as ${format}`,
        });
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Unable to save report history.",
      );
    }
  }

  function openSnapshot(reportId: ReportId, rangeFrom = from, rangeTo = to, record: ReportFormat | null = "View") {
    void loadSnapshot(reportId, rangeFrom, rangeTo, { record, openViewer: true });
  }

  async function exportCsv(reportId: ReportId, rangeFrom = from, rangeTo = to) {
    const snapshot = await loadSnapshot(reportId, rangeFrom, rangeTo, {
      record: "CSV",
      openViewer: false,
    });
    if (snapshot) {
      downloadSnapshotCsv(snapshot);
    }
  }

  async function exportPdf(reportId: ReportId, rangeFrom = from, rangeTo = to) {
    const snapshot = await loadSnapshot(reportId, rangeFrom, rangeTo, {
      record: "PDF",
      openViewer: false,
    });
    if (snapshot) {
      void printReport(snapshot, formatDateRange(rangeFrom, rangeTo), formatReportDateTime(new Date()));
    }
  }

  function runViewer() {
    if (!viewer) return;
    void loadSnapshot(viewer.snapshot.id, from, to, { record: "View", openViewer: true });
  }

  function downloadViewerXls(columns: ReportColumn[], rows: ReportRow[]) {
    if (!viewer) return;
    downloadSnapshotXls(viewer.snapshot, columns, rows);
    void recordHistory(viewer.snapshot.id, "XLS", viewer.snapshot, viewer.from, viewer.to, rows.length);
  }

  function printViewer(columns: ReportColumn[], rows: ReportRow[]) {
    if (!viewer) return;
    void printReport(viewer.snapshot, formatDateRange(viewer.from, viewer.to), formatReportDateTime(viewer.generatedAt), columns, rows);
    void recordHistory(viewer.snapshot.id, "PDF", viewer.snapshot, viewer.from, viewer.to, rows.length);
  }

  return (
    <DashboardShell variant="admin">
      <div className="px-4 py-5 md:px-5">
        {viewer ? (
          <>
            {reportError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
                {reportError}
              </div>
            ) : null}
            {isGenerating ? (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[var(--color-active-menu)]">
                Refreshing report from live policy data…
              </div>
            ) : null}
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
          </>
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

            {historyError || reportError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
                {reportError || historyError}
              </div>
            ) : null}

            {isGenerating ? (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[var(--color-active-menu)]">
                Generating report from live policy data…
              </div>
            ) : null}

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
                onDelete={(item) => {
                  void (async () => {
                    try {
                      await deleteReportHistory(item.id);
                      setHistory((current) => current.filter((entry) => entry.id !== item.id));
                      setHistoryError("");
                    } catch (error) {
                      setHistoryError(
                        error instanceof Error ? error.message : "Unable to delete report history.",
                      );
                    }
                  })();
                }}
              />
            )}

            <ModuleGuide guideKey="Reports" />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
