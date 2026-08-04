"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Bot,
  Building2,
  CircleHelp,
  ClipboardList,
  Download,
  FilePlus2,
  FileText,
  Files,
  Filter,
  FolderTree,
  HardDrive,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  Workflow,
  ChartColumn,
} from "lucide-react";
import {
  DashboardMobileNav,
  DashboardPanel,
  DashboardSidebar,
  DashboardStatCard,
  DashboardTopbar,
  type DashboardNavSection,
} from "../../../components/dashboard/primitives";
import { useSidebarPermissions } from "../../../components/dashboard/use-sidebar-permissions";

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

type UploadFormState = {
  title: string;
  description: string;
  categoryId: string;
  department: string;
  type: PolicyType;
  status: PolicyStatus;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const sidebarSections: readonly DashboardNavSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", Icon: LayoutDashboard, href: "/admin/dashboard" },
      { label: "Policy Management", Icon: Files, href: "/admin/policy-management", active: true },
      { label: "Policy Library", Icon: Files, href: "/admin/policy-library" },
      { label: "Categories", Icon: FolderTree, href: "/admin/categories" },
      { label: "Users", Icon: Users, href: "/admin/users" },
      { label: "Roles & Permissions", Icon: ShieldCheck, href: "/admin/roles-permissions" },
      { label: "Acknowledgments", Icon: BadgeCheck, href: "#" },
      { label: "AI Assistant Analytics", Icon: Bot, href: "#" },
      { label: "Reports", Icon: ChartColumn, href: "#" },
      { label: "Audit Logs", Icon: ClipboardList, href: "#" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Company", Icon: Building2, href: "#" },
      { label: "Settings", Icon: Settings2, href: "#" },
      { label: "Integrations", Icon: Workflow, href: "#" },
      { label: "System Health", Icon: Activity, href: "#" },
      { label: "Backup & Restore", Icon: HardDrive, href: "#" },
    ],
  },
];

const defaultUploadForm: UploadFormState = {
  title: "",
  description: "",
  categoryId: "",
  department: "",
  type: "POLICY",
  status: "DRAFT",
};

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

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
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
  const permissionSections = useSidebarPermissions(sidebarSections);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | PolicyStatus>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [data, setData] = useState<PoliciesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(defaultUploadForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setUploadForm((current) => (current.categoryId ? current : { ...current, categoryId: nextCategoryId }));
  }, []);

  const totalCategories = data?.filters.categories.length ?? 0;
  const policies = data?.data ?? [];

  async function handleUploadSubmit() {
    if (!selectedFile) {
      setErrorMessage("Please choose a policy file to upload.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      formData.append("categoryId", uploadForm.categoryId);
      formData.append("department", uploadForm.department);
      formData.append("type", uploadForm.type);
      formData.append("status", uploadForm.status);
      formData.append("createdBy", "John Dela Cruz");

      const response = await fetch(`${API_BASE_URL}/policies/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to upload policy.");
      }

      setShowUploadModal(false);
      setUploadForm({ ...defaultUploadForm, categoryId: categoryFilter });
      setSelectedFile(null);
      setSuccessMessage("Policy uploaded successfully.");
      await loadPolicies();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload policy.");
    } finally {
      setIsSubmitting(false);
    }
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
    <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar
        className="bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_20%),linear-gradient(180deg,var(--color-sidebar)_0%,var(--color-sidebar-end)_100%)]"
        sections={permissionSections}
        footer={
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Rural Bank of Itogon</div>
              <div className="text-[0.8rem] text-slate-200/70">Organization</div>
            </div>
          </div>
        }
      />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, files, categories, or departments..."
          notificationCount={3}
          secondaryActionIcon={CircleHelp}
          secondaryActionLabel="Help"
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav sections={permissionSections} />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Policy Management</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Policy Management</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Upload policies and associate them with the correct category from the database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "" | PolicyStatus)}
                  className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
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
                  setUploadForm({ ...defaultUploadForm, categoryId: categoryFilter });
                  setSelectedFile(null);
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

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="">All Categories</option>
                {(data?.filters.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No policies found for the current filters.
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
                              <div className="text-xs text-slate-400">{policy.fileName}</div>
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
        </div>
      </section>

      {showUploadModal ? (
        <Modal
          title="Upload Policy"
          description="Upload a new policy and associate it with a category from the database."
          onClose={() => setShowUploadModal(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Policy Title</label>
              <input
                value={uploadForm.title}
                onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
                placeholder="e.g. Information Security Policy"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none"
                placeholder="Summarize what this policy covers."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Category</label>
              <select
                value={uploadForm.categoryId}
                onChange={(event) => setUploadForm((current) => ({ ...current, categoryId: event.target.value }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="">Select category</option>
                {(data?.filters.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Department</label>
              <input
                value={uploadForm.department}
                onChange={(event) => setUploadForm((current) => ({ ...current, department: event.target.value }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
                placeholder="e.g. IT Department"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Type</label>
              <select
                value={uploadForm.type}
                onChange={(event) => setUploadForm((current) => ({ ...current, type: event.target.value as PolicyType }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="POLICY">Policy</option>
                <option value="GUIDELINE">Guideline</option>
                <option value="PROCEDURE">Procedure</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Status</label>
              <select
                value={uploadForm.status}
                onChange={(event) => setUploadForm((current) => ({ ...current, status: event.target.value as PolicyStatus }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Policy File</label>
              <label className="mt-2 flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="mt-2 text-sm font-semibold text-slate-700">
                  {selectedFile ? selectedFile.name : "Choose a file to upload"}
                </span>
                <span className="mt-1 text-xs text-slate-400">PDF, DOC, or DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleUploadSubmit()}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Uploading..." : "Upload Policy"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
