"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Download,
  FilePlus2,
  FileText,
  Files,
  Filter,
  FolderTree,
  Pencil,
  Search,
  Upload,
} from "lucide-react";
import {
  DashboardPanel,
  DashboardStatCard,
  DashboardTopbar,
} from "../../../components/dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../../../components/dashboard/dashboard-nav";
import { DropdownSelect } from "../../../components/ui/dropdown-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";
import UploadPolicyWizard, {
  type UploadWizardSubmitPayload,
  type WizardExistingPolicy,
} from "../../../components/policy-library/upload-policy-wizard";
import { getHinoraSession } from "../../../components/dashboard/session";
import { API_BASE_URL } from "../../../lib/api-base-url";

type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type PolicyAnalysisStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
type PolicyAnalysisProvider = "OPENAI" | "LOCAL_FALLBACK";

type CategoryOption = {
  id: string;
  name: string;
  code: string;
};

type PolicyRecord = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  filePath: string;
  fileType: string;
  department: string;
  type: PolicyType;
  status: PolicyStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  analysisStatus: PolicyAnalysisStatus;
  analysisProvider: PolicyAnalysisProvider | null;
  analysisCompletedAt: string | null;
  analysisError: string | null;
  summaryShort: string | null;
  category: {
    id: string;
    name: string;
    code: string;
    color: string;
  } | null;
};

type PoliciesResponse = {
  data: PolicyRecord[];
  stats: {
    totalPolicies: number;
    publishedPolicies: number;
    draftPolicies: number;
    underReviewPolicies: number;
  };
  filters: {
    categories: CategoryOption[];
    statuses: PolicyStatus[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PolicyRecordLike = Partial<PolicyRecord> &
  Pick<PolicyRecord, "id" | "title" | "fileName" | "filePath" | "fileType" | "createdAt" | "updatedAt" | "createdBy">;


function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusTone(status: PolicyStatus) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "UNDER_REVIEW") return "bg-amber-50 text-[var(--color-warning)]";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500";
  return "bg-violet-50 text-[var(--color-ai-accent)]";
}

function typeTone(type: PolicyType) {
  if (type === "POLICY") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (type === "GUIDELINE") return "bg-violet-50 text-[var(--color-ai-accent)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

function analysisTone(status: PolicyAnalysisStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (status === "FAILED") return "bg-red-50 text-[var(--color-error)]";
  return "bg-slate-100 text-slate-500";
}

function formatAnalysisStatus(status: PolicyAnalysisStatus) {
  if (status === "NOT_STARTED") {
    return "Not Started";
  }

  if (status === "IN_PROGRESS") {
    return "Analyzing";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function normalizePolicyRecord(policy: PolicyRecordLike): PolicyRecord {
  return {
    id: policy.id,
    title: policy.title,
    description: policy.description ?? null,
    fileName: policy.fileName,
    filePath: policy.filePath,
    fileType: policy.fileType,
    department: policy.department ?? "General",
    type: policy.type ?? "POLICY",
    status: policy.status ?? "DRAFT",
    version: typeof policy.version === "number" ? policy.version : 1,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    createdBy: policy.createdBy,
    analysisStatus: policy.analysisStatus ?? "NOT_STARTED",
    analysisProvider: policy.analysisProvider ?? null,
    analysisCompletedAt: policy.analysisCompletedAt ?? null,
    analysisError: policy.analysisError ?? null,
    summaryShort: policy.summaryShort ?? null,
    category: policy.category ?? null,
  };
}

function normalizePoliciesResponse(response: PoliciesResponse): PoliciesResponse {
  return {
    ...response,
    data: (response.data ?? []).map((policy) => normalizePolicyRecord(policy)),
  };
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export default function AdminPolicyLibraryClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | PolicyStatus>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [data, setData] = useState<PoliciesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<WizardExistingPolicy | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reanalyzingPolicyId, setReanalyzingPolicyId] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);

    try {
      const response = await requestJson<PoliciesResponse>(`/policies?${params.toString()}`);
      setData(normalizePoliciesResponse(response));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load policies.");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, search, statusFilter]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextCategoryId = params.get("categoryId") ?? "";
    if (!nextCategoryId) {
      return;
    }

    setCategoryFilter((current) => current || nextCategoryId);
  }, []);

  const totalCategories = data?.filters.categories.length ?? 0;
  const policies = data?.data ?? [];

  function toExistingPolicy(policy: PolicyRecord): WizardExistingPolicy {
    return {
      id: policy.id,
      title: policy.title,
      description: policy.description,
      fileName: policy.fileName,
      department: policy.department,
      type: policy.type,
      status: policy.status,
      version: policy.version,
      categoryId: policy.category?.id ?? null,
    };
  }

  function closePolicyWizard() {
    setShowUploadModal(false);
    setEditingPolicy(null);
  }

  async function submitPolicyUpload(
    payload: UploadWizardSubmitPayload,
    status: "DRAFT" | "PUBLISHED",
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    if (payload.file) {
      formData.append("file", payload.file);
    }
    formData.append("title", payload.form.title.trim());
    formData.append("description", payload.form.description.trim());
    formData.append("categoryId", payload.form.categoryId);
    formData.append("department", payload.form.department.trim());
    formData.append("type", payload.form.type);
    formData.append("status", status);
    formData.append("aiOptions", JSON.stringify(payload.aiOptions));
    formData.append(
      "createdBy",
      getHinoraSession()?.name?.trim() || "Admin User",
    );
    formData.append(
      "updatedBy",
      getHinoraSession()?.name?.trim() || "Admin User",
    );

    const isEdit = Boolean(editingPolicy);
    if (!isEdit && !payload.file) {
      throw new Error("A policy file is required.");
    }

    const response = await fetch(
      isEdit ? `${API_BASE_URL}/policies/${editingPolicy?.id}` : `${API_BASE_URL}/policies/upload`,
      {
        method: isEdit ? "PATCH" : "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(
        errorBody?.message ??
          (status === "PUBLISHED" ? "Unable to publish policy." : "Unable to save draft."),
      );
    }

    const versioned = isEdit && payload.file;
    setSuccessMessage(
      status === "PUBLISHED"
        ? versioned
          ? "New policy version published successfully."
          : "Policy published successfully."
        : versioned
          ? "New policy version saved as draft."
          : "Policy draft saved successfully.",
    );
    await loadPolicies();
  }

  function exportPolicies() {
    const header = ["Title", "Category", "Department", "Type", "Status", "AI Status", "Created By"];
    const rows = policies.map((policy) => [
      policy.title,
      policy.category?.name ?? "",
      policy.department,
      policy.type,
      policy.status,
      policy.analysisStatus,
      policy.createdBy,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "policy-management.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleReanalyzePolicy(policy: PolicyRecord) {
    setReanalyzingPolicyId(policy.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await requestJson(`/policies/${policy.id}/reanalyze`, {
        method: "POST",
        body: JSON.stringify({ requestedBy: "John Dela Cruz" }),
      });
      setSuccessMessage(`AI analysis refreshed for ${policy.title}.`);
      await loadPolicies();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to re-analyze this policy.");
    } finally {
      setReanalyzingPolicyId(null);
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, files, categories, or departments..."
          notificationCount={3}
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant="admin" />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Policy Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Upload policies and associate them with the correct category from the database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as "" | PolicyStatus)}
                options={[
                  { value: "DRAFT", label: "Draft" },
                  { value: "UNDER_REVIEW", label: "Under Review" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
                placeholder="All Status"
                allowClear
                leadingIcon={Filter}
                size="sm"
                className="min-w-[10rem]"
                aria-label="Filter by status"
              />
              <button
                type="button"
                onClick={exportPolicies}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <Download className="h-4 w-4" />
                <span>Export Policies</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPolicy(null);
                  setShowUploadModal(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Policy</span>
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--color-success)]">
              {successMessage}
            </div>
          ) : null}

          <section className="mb-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <DashboardStatCard title="Total Policies" value={`${data?.stats.totalPolicies ?? 0}`} Icon={Files} iconClassName="bg-blue-50 text-[var(--color-active-menu)]" detail="All uploaded policies" />
            <DashboardStatCard title="Published" value={`${data?.stats.publishedPolicies ?? 0}`} Icon={FileText} iconClassName="bg-emerald-50 text-[var(--color-success)]" detail="Visible to employees" />
            <DashboardStatCard title="Drafts" value={`${data?.stats.draftPolicies ?? 0}`} Icon={FilePlus2} iconClassName="bg-violet-50 text-[var(--color-ai-accent)]" detail="Still being prepared" />
            <DashboardStatCard title="Categories" value={`${totalCategories}`} Icon={FolderTree} iconClassName="bg-amber-50 text-[var(--color-warning)]" detail="Available for association" />
          </section>

          <DashboardPanel title="Policies" className="p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 lg:max-w-md">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search policies, departments, or category names..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                />
              </label>

              <DropdownSelect
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value)}
                options={(data?.filters.categories ?? []).map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                placeholder="All Categories"
                allowClear
                className="min-w-[12rem]"
                aria-label="Filter by category"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Policy</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">AI Analysis</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Loading policies...
                      </td>
                    </tr>
                  ) : policies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        {(data?.stats.totalPolicies ?? 0) === 0 ? (
                          <EmptyState
                            icon={Files}
                            title="No policies have been added yet."
                            description="Upload your first policy document so teams can review, acknowledge, and stay compliant."
                            actionLabel="Upload First Policy"
                            onAction={() => setShowUploadModal(true)}
                          />
                        ) : (
                          <EmptyState
                            icon={Search}
                            title="No matching policies"
                            description="Try another search term or clear filters to see all policies."
                            actionLabel="Clear filters"
                            onAction={() => {
                              setSearch("");
                              setCategoryFilter("");
                              setStatusFilter("");
                            }}
                            className="py-12"
                          />
                        )}
                      </td>
                    </tr>
                  ) : (
                    policies.map((policy) => (
                      <tr key={policy.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                              <Files className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">{policy.title}</div>
                              <div className="text-xs text-slate-400">
                                {policy.fileName} · v{policy.version}.0
                              </div>
                              {policy.summaryShort ? (
                                <div className="mt-1 max-w-[360px] text-xs leading-5 text-slate-500">
                                  {policy.summaryShort}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {policy.category ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: policy.category.color }} />
                              {policy.category.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{policy.department}</td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", typeTone(policy.type))}>
                            {policy.type.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusTone(policy.status))}>
                            {policy.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cx(
                                "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
                                analysisTone(policy.analysisStatus),
                              )}
                            >
                              {formatAnalysisStatus(policy.analysisStatus)}
                            </span>
                            <div className="text-xs text-slate-400">
                              {policy.analysisProvider === "OPENAI"
                                ? "OpenAI"
                                : policy.analysisProvider === "LOCAL_FALLBACK"
                                  ? "Local fallback"
                                  : "Pending"}
                            </div>
                            {policy.analysisError ? (
                              <div className="max-w-[220px] text-xs text-[var(--color-error)]">
                                {policy.analysisError}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">{formatDate(policy.updatedAt)}</div>
                          <div className="text-xs text-slate-400">
                            {policy.analysisCompletedAt
                              ? `AI ready ${formatDate(policy.analysisCompletedAt)}`
                              : `by ${policy.createdBy}`}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowUploadModal(false);
                                setEditingPolicy(toExistingPolicy(policy));
                              }}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReanalyzePolicy(policy)}
                              disabled={reanalyzingPolicyId === policy.id}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Bot className="h-3.5 w-3.5" />
                              <span>
                                {reanalyzingPolicyId === policy.id ? "Analyzing..." : "Re-analyze"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DashboardPanel>
          <ModuleGuide guideKey="Policy Management" />
        </div>
      </section>

      <UploadPolicyWizard
        open={showUploadModal || Boolean(editingPolicy)}
        onClose={closePolicyWizard}
        existingPolicy={editingPolicy}
        categories={data?.filters.categories ?? []}
        departmentOptions={Array.from(
          new Set((data?.data ?? []).map((policy) => policy.department).filter(Boolean)),
        )}
        onSaveDraft={(payload) => submitPolicyUpload(payload, "DRAFT")}
        onPublish={(payload) => submitPolicyUpload(payload, "PUBLISHED")}
      />
    </main>
  );
}
