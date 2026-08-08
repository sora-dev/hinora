"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Search,
  X,
} from "lucide-react";
import type { AssessmentPolicy } from "./types";
import { DropdownSelect } from "../ui/dropdown-select";
import { cx } from "./ui";

const PAGE_SIZE = 7;
const RECENT_STORAGE_KEY = "hinora_assessment_recent_policies";

type SelectPolicyModalProps = {
  open: boolean;
  policies: AssessmentPolicy[];
  currentPolicyId?: string;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (policyId: string) => void;
};

function formatStatusLabel(status: string) {
  if (status === "UNDER_REVIEW") {
    return "Under Review";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusTone(status: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-[var(--color-success)]";
  }

  if (status === "UNDER_REVIEW" || status === "DRAFT") {
    return "bg-amber-50 text-[var(--color-warning)]";
  }

  return "bg-slate-100 text-slate-500";
}

function readRecentPolicyIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function rememberRecentPolicy(policyId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const next = [policyId, ...readRecentPolicyIds().filter((id) => id !== policyId)].slice(0, 8);

  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export default function SelectPolicyModal({
  open,
  policies,
  currentPolicyId,
  disabled = false,
  onClose,
  onSelect,
}: SelectPolicyModalProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [draftPolicyId, setDraftPolicyId] = useState(currentPolicyId ?? "");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setShowFilters(false);
    setCategoryFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setPage(1);
    setDraftPolicyId(currentPolicyId ?? "");
    setRecentIds(readRecentPolicyIds());
  }, [open, currentPolicyId]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const policy of policies) {
      if (policy.category?.name) {
        values.add(policy.category.name);
      }
    }
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [policies]);

  const departments = useMemo(() => {
    const values = new Set(policies.map((policy) => policy.department).filter(Boolean));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [policies]);

  const statuses = useMemo(() => {
    const values = new Set(policies.map((policy) => policy.status));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return policies.filter((policy) => {
      if (categoryFilter !== "all" && (policy.category?.name ?? "Uncategorized") !== categoryFilter) {
        return false;
      }

      if (departmentFilter !== "all" && policy.department !== departmentFilter) {
        return false;
      }

      if (statusFilter !== "all" && policy.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        policy.title,
        policy.department,
        policy.category?.name ?? "Uncategorized",
        policy.status,
        policy.fileName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [policies, query, categoryFilter, departmentFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPolicies.slice(pageStart, pageStart + PAGE_SIZE);

  const recentPolicies = useMemo(() => {
    const byId = new Map(policies.map((policy) => [policy.id, policy]));
    const fromStorage = recentIds
      .map((id) => byId.get(id))
      .filter((policy): policy is AssessmentPolicy => Boolean(policy));

    if (fromStorage.length > 0) {
      return fromStorage.slice(0, 4);
    }

    return policies.slice(0, 4);
  }, [policies, recentIds]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    return [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-policy-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="select-policy-title" className="text-lg font-bold text-slate-900">
              Select Policy
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a policy to build or edit its assessment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by policy title, category, or department..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={cx(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                showFilters
                  ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Category
                </span>
                <DropdownSelect
                  value={categoryFilter === "all" ? "" : categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value || "all");
                    setPage(1);
                  }}
                  options={categories.map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  placeholder="All categories"
                  allowClear
                  size="sm"
                  aria-label="Filter by category"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Department
                </span>
                <DropdownSelect
                  value={departmentFilter === "all" ? "" : departmentFilter}
                  onChange={(value) => {
                    setDepartmentFilter(value || "all");
                    setPage(1);
                  }}
                  options={departments.map((department) => ({
                    value: department,
                    label: department,
                  }))}
                  placeholder="All departments"
                  allowClear
                  size="sm"
                  aria-label="Filter by department"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Status
                </span>
                <DropdownSelect
                  value={statusFilter === "all" ? "" : statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value || "all");
                    setPage(1);
                  }}
                  options={statuses.map((status) => ({
                    value: status,
                    label: formatStatusLabel(status),
                  }))}
                  placeholder="All statuses"
                  allowClear
                  size="sm"
                  aria-label="Filter by status"
                />
              </label>
            </div>
          ) : null}

          {recentPolicies.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Recent Policies
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {recentPolicies.map((policy) => {
                  const selected = draftPolicyId === policy.id;

                  return (
                    <button
                      key={policy.id}
                      type="button"
                      onClick={() => setDraftPolicyId(policy.id)}
                      className={cx(
                        "rounded-2xl border px-3.5 py-3 text-left transition",
                        selected
                          ? "border-[var(--color-active-menu)] bg-blue-50 shadow-[0_8px_20px_rgba(37,99,235,0.12)]"
                          : "border-slate-200 bg-white hover:border-[var(--color-active-menu)]/40 hover:bg-slate-50",
                      )}
                    >
                      <div className="truncate text-sm font-bold text-slate-900">{policy.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {policy.questionCount} {policy.questionCount === 1 ? "question" : "questions"}
                      </div>
                      <span
                        className={cx(
                          "mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                          getStatusTone(policy.status),
                        )}
                      >
                        {formatStatusLabel(policy.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className="px-4 py-3">Policy Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Questions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        No policies match your search or filters.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((policy) => {
                      const selected = draftPolicyId === policy.id;

                      return (
                        <tr
                          key={policy.id}
                          onClick={() => setDraftPolicyId(policy.id)}
                          className={cx(
                            "cursor-pointer transition",
                            selected ? "bg-blue-50/70" : "hover:bg-slate-50",
                          )}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="radio"
                              name="assessment-policy"
                              checked={selected}
                              onChange={() => setDraftPolicyId(policy.id)}
                              className="h-4 w-4 accent-[var(--color-active-menu)]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
                                <FileText className="h-4 w-4" />
                              </span>
                              <span className="truncate font-semibold text-slate-900">{policy.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {policy.category?.name ?? "Uncategorized"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{policy.department}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cx(
                                "inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-bold",
                                getStatusTone(policy.status),
                              )}
                            >
                              {formatStatusLabel(policy.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {policy.questionCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredPolicies.length === 0 ? 0 : pageStart + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(pageStart + PAGE_SIZE, filteredPolicies.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{filteredPolicies.length}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((pageNumber, index) => {
              const previous = pageNumbers[index - 1];
              const showEllipsis = previous !== undefined && pageNumber - previous > 1;

              return (
                <span key={pageNumber} className="contents">
                  {showEllipsis ? <span className="px-1 text-slate-400">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cx(
                      "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold",
                      pageNumber === currentPage
                        ? "bg-[var(--color-active-menu)] text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled || !draftPolicyId}
              onClick={() => {
                if (!draftPolicyId) {
                  return;
                }
                rememberRecentPolicy(draftPolicyId);
                onSelect(draftPolicyId);
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Select Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
