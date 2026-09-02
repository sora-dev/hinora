"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Ban,
  Calendar,
  Clock3,
  Download,
  Mail,
  Search,
  Sparkles,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  defaultOrganizationSettings,
  fetchOrganizationSettings,
  type OrganizationSettings,
} from "../../lib/organization-settings";
import { getApiBaseUrl } from "../../lib/api-base-url";
import {
  fetchComplianceCertificates,
  formatComplianceDate,
  generateMissingCertificates,
  issueComplianceCertificate,
  notifyComplianceCertificates,
  sharePct,
  type CertificateStatus,
  type ComplianceCertificateRow,
  type ComplianceCertificatesPayload,
} from "./compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const AVATAR_TONES = [
  "bg-blue-100 text-[var(--color-active-menu)]",
  "bg-violet-100 text-[var(--color-ai-accent)]",
  "bg-emerald-100 text-[var(--color-success)]",
  "bg-amber-100 text-[var(--color-warning)]",
  "bg-rose-100 text-rose-600",
  "bg-cyan-100 text-cyan-700",
  "bg-slate-100 text-slate-600",
];

function avatarTone(id: string) {
  let hash = 0;
  for (const character of id) {
    hash = (hash + character.charCodeAt(0)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
}

function certificateStatusTone(status: CertificateStatus) {
  if (status === "ISSUED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "PENDING") return "bg-amber-50 text-[var(--color-warning)]";
  if (status === "EXPIRED") return "bg-rose-50 text-rose-600";
  return "bg-slate-100 text-slate-500";
}

function certificateStatusLabel(status: CertificateStatus) {
  if (status === "ISSUED") return "Issued";
  if (status === "PENDING") return "Pending";
  if (status === "EXPIRED") return "Expired";
  return "Revoked";
}

function formatCompleted(value: string | null) {
  if (!value) return { date: null as string | null, time: null as string | null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: null };
  return {
    date: formatComplianceDate(value),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

function pageItems(current: number, total: number) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const items = new Set([1, total, current, current - 1, current + 1]);
  return [...items].filter((page) => page >= 1 && page <= total).sort((left, right) => left - right);
}

export default function ComplianceCertificatesTab({
  policy,
}: {
  policy: { id: string; title: string; version: string };
}) {
  const [payload, setPayload] = useState<ComplianceCertificatesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CertificateStatus>("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  async function reload() {
    const next = await fetchComplianceCertificates(policy.id);
    setPayload(next);
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setNote("");
    setSelectedRows([]);
    setPage(1);
    void fetchComplianceCertificates(policy.id)
      .then((next) => {
        if (!cancelled) setPayload(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load certificates.");
          setPayload(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policy.id]);

  const rows = payload?.rows ?? [];
  const stats = payload?.stats ?? { issued: 0, pending: 0, expired: 0, revoked: 0 };
  const assigned = payload?.assigned ?? 0;

  const departments = useMemo(
    () => Array.from(new Set(rows.map((row) => row.department))).sort(),
    [rows],
  );
  const locations = useMemo(
    () => Array.from(new Set(rows.map((row) => row.location))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (departmentFilter && row.department !== departmentFilter) return false;
      if (locationFilter && row.location !== locationFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        (row.certificateNo?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [departmentFilter, locationFilter, rows, search, statusFilter]);

  const pageSizeNumber = Number.parseInt(pageSize, 10) || 10;
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSizeNumber));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSizeNumber, currentPage * pageSizeNumber);
  const pageStart = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSizeNumber + 1;
  const pageEnd = Math.min(currentPage * pageSizeNumber, totalFiltered);
  const pages = pageItems(currentPage, totalPages);

  const allVisibleSelected =
    paged.length > 0 && paged.every((row) => selectedRows.includes(row.id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedRows((current) => current.filter((id) => !paged.some((row) => row.id === id)));
      return;
    }
    setSelectedRows((current) => Array.from(new Set([...current, ...paged.map((row) => row.id)])));
  }

  function toggleRow(id: string) {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function targetIssuedRows() {
    const selected = filtered.filter((row) => selectedRows.includes(row.id) && row.status === "ISSUED");
    if (selected.length > 0) return selected;
    return filtered.filter((row) => row.status === "ISSUED");
  }

  async function handleGenerate() {
    setBusy(true);
    setNote("");
    setError("");
    try {
      const result = await generateMissingCertificates(policy.id);
      await reload();
      setNote(
        result.created > 0
          ? `Issued ${result.created} missing certificate${result.created === 1 ? "" : "s"}.`
          : "No missing certificates to generate.",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to generate certificates.");
    } finally {
      setBusy(false);
    }
  }

  async function handleIssue(userId: string) {
    setBusy(true);
    setNote("");
    setError("");
    try {
      const result = await issueComplianceCertificate(policy.id, userId);
      await reload();
      setNote(
        result.certificateNumber
          ? `Certificate ${result.certificateNumber} issued.`
          : "Certificate issued.",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to issue this certificate.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotify(targets?: ComplianceCertificateRow[]) {
    const issued = (targets ?? targetIssuedRows()).filter((row) => row.status === "ISSUED");
    if (issued.length === 0) {
      setError("Select issued certificates to notify, or issue certificates first.");
      return;
    }
    setBusy(true);
    setNote("");
    setError("");
    try {
      const result = await notifyComplianceCertificates(
        policy.id,
        issued.map((row) => row.userId),
      );
      setNote(
        `Sent ${result.sent} in-app certificate notification${result.sent === 1 ? "" : "s"}. Email delivery is not configured yet.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to notify employees.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(targets?: ComplianceCertificateRow[]) {
    const issued = (targets ?? targetIssuedRows()).filter((row) => row.status === "ISSUED" && row.certificateNo);
    if (issued.length === 0) {
      setError("No issued certificates to download.");
      return;
    }
    setError("");
    const organization = await fetchOrganizationSettings().catch(() => defaultOrganizationSettings);
    downloadCertificateSheets(
      issued.map((row) => ({
        title: `${payload?.policyTitle ?? policy.title} Certificate`,
        policyTitle: payload?.policyTitle ?? policy.title,
        policyVersion: payload?.policyVersion ?? `v${policy.version}`,
        certificateNumber: row.certificateNo ?? "",
        issuedAt: row.issuedAt ?? row.completedAt ?? new Date().toISOString(),
        recipient: row.name,
      })),
      organization,
    );
    setNote(
      issued.length === 1
        ? `Preparing download for ${issued[0].name}.`
        : `Preparing download for ${issued.length} certificates.`,
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  if (!payload && error) {
    return <EmptyState icon={AlertTriangle} title="Unable to load certificates" description={error} />;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Certificates Issued
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{stats.issued}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {sharePct(stats.issued, assigned)}% of {assigned} assigned
              </div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-[var(--color-ai-accent)]">
              <Award className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ISSUED");
              setPage(1);
            }}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View all certificates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Pending Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{stats.pending}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Employees passed but not issued
              </div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[var(--color-warning)]">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("PENDING");
              setPage(1);
            }}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
          >
            <span>View pending</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Expired Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{stats.expired}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">No expiration on current certificates</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Revoked Certificates
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900">{stats.revoked}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Revocation is not enabled yet</div>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Ban className="h-5 w-5" />
            </span>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Certificates</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage and download certificates for employees who completed this policy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || stats.pending === 0}
              onClick={() => void handleGenerate()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Missing Certificates</span>
            </button>
            <button
              type="button"
              disabled={busy || stats.issued === 0}
              onClick={() => void handleDownload()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Download All</span>
            </button>
            <button
              type="button"
              disabled={busy || stats.issued === 0}
              onClick={() => void handleNotify()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              <span>Notify Employees</span>
            </button>
          </div>
        </div>

        {error || note ? (
          <div className="border-b border-slate-100 px-4 py-3">
            {error ? <p className="text-sm font-medium text-[var(--color-error)]">{error}</p> : null}
            {note ? <p className="text-sm font-medium text-[var(--color-success)]">{note}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 xl:max-w-sm">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search employees..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownSelect
              value={departmentFilter}
              onChange={(value) => {
                setDepartmentFilter(value);
                setPage(1);
              }}
              options={departments.map((department) => ({ value: department, label: department }))}
              placeholder="All Departments"
              allowClear
              size="sm"
              className="min-w-[10.5rem]"
              aria-label="Filter by department"
            />
            <DropdownSelect
              value={locationFilter}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
              options={locations.map((location) => ({ value: location, label: location }))}
              placeholder="All Locations"
              allowClear
              size="sm"
              className="min-w-[10.5rem]"
              aria-label="Filter by location"
            />
            <DropdownSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as "" | CertificateStatus);
                setPage(1);
              }}
              options={[
                { value: "ISSUED", label: "Issued" },
                { value: "PENDING", label: "Pending" },
              ]}
              placeholder="All Statuses"
              allowClear
              size="sm"
              className="min-w-[9.5rem]"
              aria-label="Filter by status"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)]"
                    aria-label="Select all visible certificates"
                  />
                </th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Completion Date</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Certificate No.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10">
                    <EmptyState
                      icon={Award}
                      title="No certificates yet"
                      description="Certificates appear after an employee passes this policy assessment. Use Generate Missing Certificates to issue any that were not created automatically."
                    />
                  </td>
                </tr>
              ) : (
                paged.map((row) => {
                  const completed = formatCompleted(row.completedAt);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)]"
                          aria-label={`Select ${row.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cx(
                              "inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                              avatarTone(row.id),
                            )}
                          >
                            {row.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{row.name}</div>
                            <div className="truncate text-xs text-slate-400">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.department}</td>
                      <td className="px-4 py-3">{row.location}</td>
                      <td className="px-4 py-3">
                        {completed.date ? (
                          <>
                            <div className="font-semibold text-slate-800">{completed.date}</div>
                            {completed.time ? <div className="text-xs text-slate-400">{completed.time}</div> : null}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--color-success)]">
                        {row.score != null ? `${row.score}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.certificateNo ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cx(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            certificateStatusTone(row.status),
                          )}
                        >
                          {certificateStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.status === "PENDING" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleIssue(row.userId)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[var(--color-active-menu)] hover:bg-blue-50 disabled:opacity-50"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Issue
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleDownload([row])}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label={`Download certificate for ${row.name}`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleNotify([row])}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                aria-label={`Notify ${row.name}`}
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-500">
            Showing {pageStart} to {pageEnd} of {totalFiltered} certificates
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Previous page"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {pages.map((pageNumber, index) => {
                const previous = pages[index - 1];
                return (
                  <span key={pageNumber} className="inline-flex items-center">
                    {previous && pageNumber - previous > 1 ? <span className="px-1 text-slate-400">…</span> : null}
                    <button
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cx(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold",
                        currentPage === pageNumber
                          ? "bg-[var(--color-active-menu)] text-white"
                          : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {pageNumber}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Next page"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <DropdownSelect
              value={pageSize}
              onChange={(value) => {
                if (!value) return;
                setPageSize(value);
                setPage(1);
              }}
              options={[
                { value: "10", label: "10 / page" },
                { value: "25", label: "25 / page" },
                { value: "50", label: "50 / page" },
              ]}
              allowClear={false}
              size="sm"
              className="min-w-[7.5rem]"
              aria-label="Rows per page"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveAssetUrl(value: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const apiBaseUrl = getApiBaseUrl();
  if (value.startsWith("/") && apiBaseUrl) {
    return `${apiBaseUrl}${value}`;
  }
  return value;
}

function downloadCertificateSheets(
  certificates: Array<{
    title: string;
    policyTitle: string;
    policyVersion: string;
    certificateNumber: string;
    issuedAt: string;
    recipient: string;
  }>,
  organization: OrganizationSettings,
) {
  const logoSrc = resolveAssetUrl(organization.logoUrl);
  const logoHtml = logoSrc
    ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(organization.organizationName)}" />`
    : `<div class="mark">${escapeHtml(organization.organizationCode || "ORG")}</div>`;

  const sheets = certificates
    .map((certificate) => {
      return `<div class="sheet">
        ${logoHtml}
        <div class="org">${escapeHtml(organization.organizationName)}</div>
        <h1>Certificate of Completion</h1>
        <div class="kicker">This certifies that</div>
        <div class="name">${escapeHtml(certificate.recipient)}</div>
        <p class="body">
          has successfully completed <strong>${escapeHtml(certificate.title)}</strong>
          in accordance with <strong>${escapeHtml(certificate.policyTitle)} ${escapeHtml(certificate.policyVersion)}</strong>.
        </p>
        <div class="dates">
          <span>Issued on <strong>${escapeHtml(formatComplianceDate(certificate.issuedAt))}</strong></span>
          <span><strong>No Expiration</strong></span>
        </div>
        <div class="id">Certificate ID: ${escapeHtml(certificate.certificateNumber)}</div>
        <div class="seal">SEAL</div>
      </div>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificates</title>
    <style>
      @page { size: landscape letter; margin: 0.45in; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; background: #fff; }
      .sheet { min-height: 7.2in; border: 14px solid #dbeafe; padding: 36px 48px; text-align: center; page-break-after: always; position: relative; }
      .sheet:last-child { page-break-after: auto; }
      .logo, .mark { width: 72px; height: 72px; object-fit: contain; margin: 0 auto 8px; }
      .mark { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #eff6ff; color: #2563eb; font-family: Inter, system-ui, sans-serif; font-weight: 800; }
      .org { font-family: Inter, system-ui, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; font-size: 11px; color: #64748b; font-weight: 700; }
      h1 { margin: 18px 0 10px; font-size: 36px; font-weight: 600; }
      .kicker { font-family: Inter, system-ui, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; color: #94a3b8; }
      .name { margin: 8px 0 16px; font-size: 42px; font-weight: 600; }
      .body { max-width: 640px; margin: 0 auto; font-size: 16px; line-height: 1.7; color: #475569; }
      .dates { margin-top: 28px; font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #64748b; display: flex; justify-content: center; gap: 28px; }
      .id { margin-top: 18px; font-family: Inter, system-ui, sans-serif; font-size: 12px; color: #94a3b8; }
      .seal { width: 72px; height: 72px; margin: 22px auto 0; border-radius: 999px; border: 4px solid #fcd34d; background: linear-gradient(#fde68a, #f59e0b); display: flex; align-items: center; justify-content: center; color: #92400e; font-family: Inter, system-ui, sans-serif; font-weight: 800; font-size: 11px; }
    </style>
  </head>
  <body>${sheets}</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 400);
}
