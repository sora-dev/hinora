"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eye,
  Filter,
  Globe2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api-base-url";
import { getHinoraSession } from "../dashboard/session";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { DropdownSelect } from "../ui/dropdown-select";
import { AssignmentWizard, type AssignmentWizardValue } from "./assignment-wizard";
import {
  assignmentScopeOptions,
  assignmentStatuses,
  formatAssignmentDate,
  type AssignmentScopeKind,
  type AssignmentStatus,
  type PolicyAssignment,
} from "./policy-assignments-data";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("API URL is not configured.");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T | { message?: string | string[] } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(", ")
          : payload.message
        : "Request failed.";
    throw new Error(message || "Request failed.");
  }
  return payload as T;
}

const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formFromAssignment(row: PolicyAssignment): Partial<AssignmentWizardValue> {
  return {
    policyId: row.policyId,
    policyTitle: row.policyTitle,
    policyVersion: row.policyVersion,
    effectiveDate: row.effectiveDate,
    scopeKind: row.scopeKind,
    scopeTarget: row.scopeKind === "organization" ? "" : row.scopeTarget || row.scopeLabel,
    userIds: row.userIds ?? [],
    recipients: row.recipients,
    assignedAt: row.assignedAt,
    dueAt: row.dueAt,
    notes: row.notes ?? "",
    internalNotes: row.internalNotes ?? "",
    priority: row.priority ?? "Medium",
  };
}

function scopeMeta(kind: AssignmentScopeKind): { Icon: LucideIcon; tone: string } {
  if (kind === "organization") return { Icon: Globe2, tone: "bg-blue-50 text-[var(--color-active-menu)]" };
  if (kind === "department") return { Icon: Users, tone: "bg-sky-50 text-sky-600" };
  if (kind === "location") return { Icon: Building2, tone: "bg-amber-50 text-amber-700" };
  if (kind === "role") return { Icon: Shield, tone: "bg-violet-50 text-violet-600" };
  return { Icon: User, tone: "bg-slate-100 text-slate-600" };
}

function statusTone(status: AssignmentStatus) {
  if (status === "Active") return "bg-emerald-50 text-emerald-700";
  if (status === "Completed") return "bg-blue-50 text-[var(--color-active-menu)]";
  return "bg-slate-100 text-slate-500";
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export default function PolicyAssignmentsExperience() {
  const [rows, setRows] = useState<PolicyAssignment[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; row?: PolicyAssignment } | null>(null);
  const [viewing, setViewing] = useState<PolicyAssignment | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  async function reload() {
    const payload = await requestJson<{ data?: PolicyAssignment[] }>("/policy-assignments");
    setRows(payload.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void reload()
      .then(() => {
        if (!cancelled) setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRows([]);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load assignments.");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuId(null);
      if (filtersRef.current && !filtersRef.current.contains(target)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (scopeFilter && row.scopeKind !== scopeFilter) return false;
      if (dueFrom && row.dueAt < dueFrom) return false;
      if (dueTo && row.dueAt > dueTo) return false;
      if (!query) return true;
      return `${row.policyTitle} ${row.policyVersion} ${row.scopeLabel} ${row.status}`
        .toLowerCase()
        .includes(query);
    });
  }, [dueFrom, dueTo, rows, scopeFilter, search, statusFilter]);

  const size = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * size;
  const pageItems = filtered.slice(pageStart, pageStart + size);
  const pageEnd = pageStart + pageItems.length;

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setScopeFilter("");
    setDueFrom("");
    setDueTo("");
    setPage(1);
  }

  async function upsertAssignment(form: AssignmentWizardValue, existingId?: string) {
    const session = getHinoraSession();
    const body = {
      policyId: form.policyId,
      scopeKind: form.scopeKind,
      scopeTarget: form.scopeTarget,
      userIds: form.userIds ?? [],
      startAt: form.assignedAt,
      dueAt: form.dueAt,
      notes: form.notes ?? "",
      internalNotes: form.internalNotes ?? "",
      priority: form.priority ?? "Medium",
      createdByUserId: session?.userId,
    };
    if (existingId) {
      await requestJson(`/policy-assignments/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await requestJson("/policy-assignments", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    await reload();
  }

  async function updateStatus(row: PolicyAssignment, status: AssignmentStatus) {
    setMenuId(null);
    try {
      await requestJson(`/policy-assignments/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await reload();
      setErrorMessage("");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update assignment.");
    }
  }

  async function duplicateAssignment(row: PolicyAssignment) {
    setMenuId(null);
    try {
      await requestJson(`/policy-assignments/${row.id}/duplicate`, { method: "POST" });
      await reload();
      setErrorMessage("");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to duplicate assignment.");
    }
  }

  async function deleteAssignment(row: PolicyAssignment) {
    setMenuId(null);
    if (viewing?.id === row.id) setViewing(null);
    try {
      await requestJson(`/policy-assignments/${row.id}`, { method: "DELETE" });
      await reload();
      setErrorMessage("");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete assignment.");
    }
  }

  return (
    <DashboardShell variant="admin">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Policy Assignments</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage policy assignments for users, departments, branches, and roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            New Assignment
          </button>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search assignments..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <DropdownSelect
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={assignmentStatuses.map((status) => ({ value: status, label: status }))}
                placeholder="All statuses"
                allowClear
                className="xl:w-40"
                aria-label="Status"
              />
              <DropdownSelect
                value={scopeFilter}
                onChange={(value) => {
                  setScopeFilter(value);
                  setPage(1);
                }}
                options={assignmentScopeOptions.map((scope) => ({ value: scope.value, label: scope.label }))}
                placeholder="All scopes"
                allowClear
                className="xl:w-44"
                aria-label="Scope"
              />
              <div className="relative sm:col-span-2 xl:col-span-1" ref={filtersRef}>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((current) => !current)}
                  className={cx(
                    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold xl:w-auto",
                    filtersOpen || dueFrom || dueTo
                      ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                {filtersOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Due date</p>
                    <div className="grid gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
                        <input
                          type="date"
                          value={dueFrom}
                          onChange={(event) => {
                            setDueFrom(event.target.value);
                            setPage(1);
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
                        <input
                          type="date"
                          value={dueTo}
                          onChange={(event) => {
                            setDueTo(event.target.value);
                            setPage(1);
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-[var(--color-active-menu)] hover:bg-blue-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-5 py-3">Policy</th>
                  <th className="whitespace-nowrap px-4 py-3">Assignment Scope</th>
                  <th className="whitespace-nowrap px-4 py-3">Recipients</th>
                  <th className="whitespace-nowrap px-4 py-3">Start Date</th>
                  <th className="whitespace-nowrap px-4 py-3">Due Date</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const scope = scopeMeta(row.scopeKind);
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-semibold text-slate-900">{row.policyTitle}</div>
                        <div className="mt-0.5 text-xs text-slate-400">Version {row.policyVersion}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex items-center gap-2.5 text-slate-700">
                          <span className={cx("inline-flex h-8 w-8 items-center justify-center rounded-lg", scope.tone)}>
                            <scope.Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{row.scopeLabel}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">{row.recipients}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatAssignmentDate(row.assignedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatAssignmentDate(row.dueAt)}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", statusTone(row.status))}>
                          {row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="relative flex items-center justify-end gap-1" ref={menuId === row.id ? menuRef : undefined}>
                          <IconButton label={`View ${row.policyTitle}`} onClick={() => setViewing(row)}>
                            <Eye className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label={`Edit ${row.policyTitle}`}
                            onClick={() => setEditor({ mode: "edit", row })}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label={`More actions for ${row.policyTitle}`}
                            onClick={() => setMenuId((current) => (current === row.id ? null : row.id))}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </IconButton>
                          {menuId === row.id ? (
                            <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                              {row.status !== "Completed" ? (
                                <MenuItem
                                  icon={CheckCircle2}
                                  label="Mark completed"
                                  onClick={() => updateStatus(row, "Completed")}
                                />
                              ) : null}
                              {row.status !== "Archived" ? (
                                <MenuItem icon={Archive} label="Archive" onClick={() => updateStatus(row, "Archived")} />
                              ) : (
                                <MenuItem icon={CheckCircle2} label="Restore active" onClick={() => updateStatus(row, "Active")} />
                              )}
                              <MenuItem icon={Copy} label="Duplicate" onClick={() => duplicateAssignment(row)} />
                              <MenuItem
                                icon={Trash2}
                                label="Delete"
                                tone="danger"
                                onClick={() => deleteAssignment(row)}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                      {ready
                        ? errorMessage || (rows.length === 0 ? "No policy assignments yet." : "No assignments match the current filters.")
                        : "Loading assignments..."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">
              Showing {pageStart + (pageItems.length ? 1 : 0)} to {pageEnd} of {filtered.length.toLocaleString()} assignments
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                {pageSize} per page
                <DropdownSelect
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value || "10");
                    setPage(1);
                  }}
                  options={pageSizeOptions}
                  size="sm"
                  className="w-[4.5rem]"
                  aria-label="Rows per page"
                />
              </label>
              <div className="flex items-center gap-1.5">
                <PagerButton label="First page" disabled={currentPage <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </PagerButton>
                <PagerButton label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </PagerButton>
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
                          ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
                <PagerButton
                  label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </PagerButton>
                <PagerButton label="Last page" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
                  <ChevronsRight className="h-4 w-4" />
                </PagerButton>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <ModuleGuide guideKey="Policy Assignments" />
        </div>
      </div>

      {viewing ? (
        <AssignmentViewModal
          row={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditor({ mode: "edit", row: viewing });
            setViewing(null);
          }}
        />
      ) : null}

      {editor ? (
        <AssignmentWizard
          mode={editor.mode}
          initial={editor.row ? formFromAssignment(editor.row) : undefined}
          onClose={() => setEditor(null)}
          onSave={async (form) => {
            await upsertAssignment(form, editor.row?.id);
            setEditor(null);
          }}
        />
      ) : null}
    </DashboardShell>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50",
        tone === "danger" ? "text-red-600" : "text-slate-700",
      )}
    >
      <Icon className={cx("h-4 w-4", tone === "danger" ? "text-red-400" : "text-slate-400")} />
      {label}
    </button>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function AssignmentViewModal({
  row,
  onClose,
  onEdit,
}: {
  row: PolicyAssignment;
  onClose: () => void;
  onEdit: () => void;
}) {
  const scope = scopeMeta(row.scopeKind);
  return (
    <ModalFrame title="Assignment details" onClose={onClose}>
      <dl className="grid gap-3 text-sm">
        <DetailRow label="Policy" value={`${row.policyTitle} · Version ${row.policyVersion}`} />
        <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
          <dt className="font-semibold text-slate-400">Scope</dt>
          <dd className="inline-flex items-center gap-2 font-semibold text-slate-800">
            <span className={cx("inline-flex h-7 w-7 items-center justify-center rounded-lg", scope.tone)}>
              <scope.Icon className="h-3.5 w-3.5" />
            </span>
            {row.scopeLabel}
          </dd>
        </div>
        <DetailRow label="Recipients" value={String(row.recipients)} />
        <DetailRow label="Start date" value={formatAssignmentDate(row.assignedAt)} />
        <DetailRow label="Due date" value={formatAssignmentDate(row.dueAt)} />
        <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
          <dt className="font-semibold text-slate-400">Status</dt>
          <dd>
            <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", statusTone(row.status))}>
              {row.status}
            </span>
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          Edit assignment
        </button>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
      <dt className="font-semibold text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
