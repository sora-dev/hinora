"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bookmark,
  BookOpenText,
  Bot,
  FileText,
  FolderClosed,
  Grid2X2,
  Headphones,
  List,
  MoonStar,
  MoreHorizontal,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { DashboardPanel, DashboardTopbar } from "../dashboard/primitives";
import { DashboardMobileNav, DashboardSidebar } from "../dashboard/dashboard-nav";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import { ModuleGuide } from "../dashboard/module-guide";
import { getApiBaseUrl } from "../../lib/api-base-url";

type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
type PolicyType = "POLICY" | "GUIDELINE" | "PROCEDURE";
type CategoryStatus = "ACTIVE" | "INACTIVE";

type PolicyLibraryExperienceProps = {
  mode: "admin" | "employee";
  profileName: string;
  profileRole: string;
  avatarText: string;
};

type CategoryCard = {
  key: string;
  label: string;
  count: number;
  Icon: LucideIcon;
  color?: string;
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
  category: {
    id: string;
    name: string;
    code: string;
    color: string;
  } | null;
};

type CategoryNode = {
  id: string;
  name: string;
  code: string;
  description: string;
  parentId: string | null;
  status: CategoryStatus;
  color: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  policyCount: number;
  documentCount: number;
  assignedDepartments: number;
  children: CategoryNode[];
};

type CategoryTreeResponse = {
  data: CategoryNode[];
  total: number;
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
    categories: Array<{
      id: string;
      name: string;
      code: string;
    }>;
    statuses: PolicyStatus[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type DisplayPolicyRecord = {
  id: string;
  title: string;
  code: string;
  categoryLabel: string;
  categoryColor: string | null;
  typeLabel: string;
  statusLabel: string;
  statusTone: string;
  department: string;
  updatedAt: string;
  updatedBy: string;
  iconTone: string;
  Icon: LucideIcon;
  readerHref: string;
};

const popularSearches = [
  "Leave Policy",
  "Password Policy",
  "BSP Circular 1160",
  "Data Privacy",
  "IT Security",
] as const;

const quickAccessItems = [
  { label: "My Bookmarks", Icon: Bookmark },
  { label: "My Acknowledgments", Icon: ShieldCheck },
  { label: "Recently Read", Icon: BookOpenText },
  { label: "Audio Policies", Icon: Headphones },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseCandidates() {
  return [normalizeApiBaseUrl(getApiBaseUrl())];
}

async function requestJson<T>(path: string) {
  let lastError: Error | null = null;

  for (const apiBaseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`);

      if (!response.ok) {
        const responseText = await response.text();

        try {
          const errorBody = JSON.parse(responseText) as { message?: string };
          throw new Error(errorBody.message ?? `Request failed with status ${response.status}`);
        } catch {
          throw new Error(responseText || `Request failed with status ${response.status}`);
        }
      }

      return {
        data: (await response.json()) as T,
        apiBaseUrl,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown request error.");
    }
  }

  throw lastError ?? new Error("Unable to reach the API.");
}

function getCategoryChipStyle(color?: string | null) {
  if (!color) {
    return undefined;
  }

  return {
    backgroundColor: `${color}18`,
    color,
  };
}

function getStatusTone(status: PolicyStatus) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-[var(--color-success)]";
  }

  if (status === "UNDER_REVIEW") {
    return "bg-amber-50 text-[var(--color-warning)]";
  }

  if (status === "ARCHIVED") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-violet-50 text-[var(--color-ai-accent)]";
}

function formatStatusLabel(status: PolicyStatus) {
  if (status === "UNDER_REVIEW") {
    return "Under Review";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatTypeLabel(type: PolicyType) {
  if (type === "GUIDELINE") {
    return "Guideline";
  }

  if (type === "PROCEDURE") {
    return "Procedure";
  }

  return "Policy";
}

function getPolicyReaderHref(mode: "admin" | "employee", policyId: string) {
  return `/${mode}/policy-library/${policyId}`;
}

function getPolicyPresentation(
  policy: PolicyRecord,
  mode: "admin" | "employee",
  _apiBaseUrl: string,
): DisplayPolicyRecord {
  const typeLabel = formatTypeLabel(policy.type);
  const categoryColor = policy.category?.color ?? null;

  return {
    id: policy.id,
    title: policy.title,
    code: policy.fileName,
    categoryLabel: policy.category?.name ?? "Uncategorized",
    categoryColor,
    typeLabel,
    statusLabel: formatStatusLabel(policy.status),
    statusTone: getStatusTone(policy.status),
    department: policy.department,
    updatedAt: formatDate(policy.updatedAt),
    updatedBy: policy.createdBy,
    iconTone: categoryColor ? "" : "bg-slate-100 text-slate-600",
    Icon:
      policy.type === "GUIDELINE"
        ? BookOpenText
        : policy.type === "PROCEDURE"
          ? FolderClosed
          : FileText,
    readerHref: getPolicyReaderHref(mode, policy.id),
  };
}

function LibraryIllustration() {
  return (
    <svg viewBox="0 0 280 180" aria-hidden="true" className="h-auto w-full max-w-[250px]">
      <defs>
        <linearGradient id="policy-library-book" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <ellipse cx="154" cy="150" rx="84" ry="14" fill="#E9E7FF" />
      <path d="M85 118c0-9 7-16 16-16h41v38H101c-9 0-16-7-16-16v-6Z" fill="#E0E7FF" />
      <rect x="108" y="40" width="78" height="90" rx="12" fill="url(#policy-library-book)" opacity="0.92" />
      <rect x="122" y="28" width="82" height="96" rx="12" fill="url(#policy-library-book)" />
      <path d="M141 44h44M141 57h44M141 70h32" fill="none" stroke="#DDD6FE" strokeWidth="6" strokeLinecap="round" />
      <path d="M195 58c0 11 7 21 18 24 11-3 18-13 18-24V47l-18-7-18 7v11Z" fill="#fff" opacity="0.94" />
      <path d="m205 58 7 8 12-15" fill="none" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="72" y="84" width="32" height="42" rx="10" fill="#DDD6FE" />
      <path d="M82 95h12M82 105h12M82 115h10" fill="none" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 98c0-8 6-14 14-14h10v52H56c-8 0-14-6-14-14V98Z" fill="#E9E7FF" />
      <path d="M233 28 237 37 247 39 239 45 241 55 233 49 224 55 227 45 219 39 229 37 233 28Z" fill="#C4B5FD" />
      <path d="M246 72 249 78 256 80 249 83 247 90 244 83 237 81 244 78 246 72Z" fill="#DDD6FE" />
    </svg>
  );
}

export default function PolicyLibraryExperience({
  mode,
  profileName,
  profileRole,
  avatarText,
}: PolicyLibraryExperienceProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"" | PolicyStatus>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoriesResponse, setCategoriesResponse] = useState<CategoryTreeResponse | null>(null);
  const [policiesResponse, setPoliciesResponse] = useState<PoliciesResponse | null>(null);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isPoliciesLoading, setIsPoliciesLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedApiBaseUrl, setResolvedApiBaseUrl] = useState(
    getApiBaseCandidates()[0],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);

    try {
      const { data, apiBaseUrl } = await requestJson<CategoryTreeResponse>("/categories");
      setCategoriesResponse(data);
      setResolvedApiBaseUrl(apiBaseUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load categories.");
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setIsPoliciesLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("pageSize", "100");

      if (debouncedQuery) {
        params.set("search", debouncedQuery);
      }

      if (selectedCategoryId !== "all") {
        params.set("categoryId", selectedCategoryId);
      }

      if (selectedStatus) {
        params.set("status", selectedStatus);
      }

      const { data, apiBaseUrl } = await requestJson<PoliciesResponse>(`/policies?${params.toString()}`);
      setPoliciesResponse(data);
      setResolvedApiBaseUrl(apiBaseUrl);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load policies.");
    } finally {
      setIsPoliciesLoading(false);
    }
  }, [debouncedQuery, selectedCategoryId, selectedStatus]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const allCategories = useMemo(
    () => flattenCategories(categoriesResponse?.data ?? []).filter((category) => category.status === "ACTIVE"),
    [categoriesResponse],
  );

  const categoryIconCycle: LucideIcon[] = useMemo(
    () => [ShieldCheck, Bookmark, FolderClosed, Sparkles, FileText, BookOpenText],
    [],
  );

  const categoryCards = useMemo<CategoryCard[]>(() => {
    const dynamicCards = allCategories
      .slice()
      .sort((left, right) => right.policyCount - left.policyCount)
      .map((category, index) => ({
        key: category.id,
        label: category.name,
        count: category.policyCount,
        Icon: categoryIconCycle[index % categoryIconCycle.length] ?? FolderClosed,
        color: category.color,
      }));

    return [
      {
        key: "all",
        label: "All Policies",
        count: policiesResponse?.stats.totalPolicies ?? 0,
        Icon: BookOpenText,
        color: "var(--color-active-menu)",
      },
      ...dynamicCards,
    ];
  }, [allCategories, categoryIconCycle, policiesResponse?.stats.totalPolicies]);

  const filteredPolicies = useMemo(() => {
    return (policiesResponse?.data ?? []).map((policy) =>
      getPolicyPresentation(policy, mode, resolvedApiBaseUrl),
    );
  }, [mode, policiesResponse, resolvedApiBaseUrl]);

  const totalPolicies = policiesResponse?.pagination.total ?? 0;
  const statuses = policiesResponse?.filters.statuses ?? [];
  const isLoading = isCategoriesLoading || isPoliciesLoading;

  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant={mode} />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, manuals, circulars, or keywords..."
          searchMaxWidthClassName="max-w-[660px]"
          notificationCount={3}
          secondaryActionIcon={MoonStar}
          secondaryActionLabel="Theme"
          profileName={profileName}
          profileRole={profileRole}
          avatarText={avatarText}
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant={mode} />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-5">
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Policy Library</h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse, search, and read all company policies and documents.
            </p>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <section className="grid gap-4 rounded-[20px] border border-slate-200 bg-gradient-to-br from-[rgba(124,58,237,0.08)] via-white to-[rgba(37,99,235,0.04)] px-5 py-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div>
                  <h2 className="text-[1.55rem] font-bold text-slate-900">Find the policy you need</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search or browse our complete collection of policies and documents.
                  </p>

                  <label className="mt-5 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm">
                    <Search className="h-4.5 w-4.5" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by policy title, keyword, or document ID..."
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-active-menu)] text-white"
                      aria-label="Search policies"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Popular searches:
                    </span>
                    {popularSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <LibraryIllustration />
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {categoryCards.map((category) => {
                  const active = selectedCategoryId === category.key;
                  const categoryStyle = getCategoryChipStyle(category.color);

                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.key)}
                      className={cx(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                        active
                          ? "border-[var(--color-active-menu)] bg-blue-50 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                          : "border-slate-200 bg-white hover:border-[var(--color-active-menu)]/30",
                      )}
                    >
                      <span
                        className={cx(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          !categoryStyle && "bg-blue-50 text-[var(--color-active-menu)]",
                        )}
                        style={categoryStyle}
                      >
                        <category.Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                          {category.label}
                        </span>
                        <span className="mt-1 block text-base font-bold text-slate-900">{category.count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <DashboardPanel title="Recent Policies" className="p-0">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-500">Status:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("")}
                      className={cx(
                        "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold",
                        selectedStatus === ""
                          ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-700",
                      )}
                    >
                      <span>All</span>
                    </button>
                    {statuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={cx(
                          "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold",
                          selectedStatus === status
                            ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                            : "border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        <span>{formatStatusLabel(status)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={cx(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                        viewMode === "list"
                          ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-500",
                      )}
                    >
                      <List className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cx(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                        viewMode === "grid"
                          ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-500",
                      )}
                    >
                      <Grid2X2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {viewMode === "list" ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full text-left">
                      <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                        {filteredPolicies.map((policy) => (
                          <tr key={policy.id}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cx(
                                    "flex h-10 w-10 items-center justify-center rounded-xl",
                                    policy.iconTone || "text-white",
                                  )}
                                  style={policy.categoryColor ? getCategoryChipStyle(policy.categoryColor) : undefined}
                                >
                                  <policy.Icon className="h-4.5 w-4.5" />
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-900">{policy.title}</div>
                                  <div className="text-xs text-slate-400">{policy.code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={getCategoryChipStyle(policy.categoryColor)}
                              >
                                {policy.categoryLabel}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-700">{policy.typeLabel}</div>
                              <div className="text-xs text-slate-400">{policy.department}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-700">{policy.updatedAt}</div>
                              <div className="text-xs text-slate-400">by {policy.updatedBy}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", policy.statusTone)}>
                                {policy.statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <Link
                                href={policy.readerHref}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-active-menu)]/25 bg-blue-50 px-4 text-sm font-semibold text-[var(--color-active-menu)]"
                              >
                                Read
                              </Link>
                            </td>
                            <td className="px-3 py-4 text-slate-400">
                              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                                <Bookmark className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="px-3 py-4 text-slate-400">
                              <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPolicies.map((policy) => (
                      <article key={policy.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={cx(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              policy.iconTone || "text-white",
                            )}
                            style={policy.categoryColor ? getCategoryChipStyle(policy.categoryColor) : undefined}
                          >
                            <policy.Icon className="h-5 w-5" />
                          </span>
                          <button type="button" className="text-slate-400">
                            <Bookmark className="h-4.5 w-4.5" />
                          </button>
                        </div>
                        <h3 className="mt-4 text-base font-bold text-slate-900">{policy.title}</h3>
                        <p className="mt-1 text-xs text-slate-400">{policy.code}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={getCategoryChipStyle(policy.categoryColor)}
                          >
                            {policy.categoryLabel}
                          </span>
                          <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", policy.statusTone)}>
                            {policy.statusLabel}
                          </span>
                          <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                            {policy.typeLabel}
                          </span>
                        </div>
                        <div className="mt-4 text-sm text-slate-500">
                          <div>{policy.department}</div>
                          <div>{policy.updatedAt}</div>
                          <div className="text-xs">by {policy.updatedBy}</div>
                        </div>
                        <Link
                          href={policy.readerHref}
                          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                        >
                          Open Policy
                        </Link>
                      </article>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-500">
                    Showing {filteredPolicies.length} of {totalPolicies} policies
                  </span>
                  <a
                    href={mode === "admin" ? "/admin/policy-management" : "/employee/policy-library"}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--color-active-menu)]"
                  >
                    <span>{mode === "admin" ? "Manage Policies" : "Refresh Library"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </DashboardPanel>
            </div>

            <div className="space-y-4">
              <DashboardPanel title="Filter Policies" className="space-y-4">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter by keyword..."
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Category
                  </span>
                  <DropdownSelect
                    value={selectedCategoryId === "all" ? "" : selectedCategoryId}
                    onChange={(value) => setSelectedCategoryId(value || "all")}
                    options={allCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    placeholder="All Categories"
                    allowClear
                    aria-label="Filter by category"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </span>
                  <DropdownSelect
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value as "" | PolicyStatus)}
                    options={statuses.map((status) => ({
                      value: status,
                      label: formatStatusLabel(status),
                    }))}
                    placeholder="All Status"
                    allowClear
                    aria-label="Filter by status"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                  <div className="font-semibold text-slate-700">Categories Loaded</div>
                  <div className="mt-1">{allCategories.length} active categories available</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedCategoryId("all");
                    setSelectedStatus("");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-active-menu)]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Clear All</span>
                </button>
              </DashboardPanel>

              <DashboardPanel title="Quick Access" className="p-0">
                <div className="divide-y divide-slate-100">
                  {quickAccessItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                        <item.Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-slate-700">{item.label}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel title="Need Help?" className="space-y-4">
                <p className="text-sm leading-6 text-slate-500">
                  Can&apos;t find what you&apos;re looking for? Ask Hinora or contact support.
                </p>
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-[var(--color-active-menu)]"
                >
                  <Bot className="h-4.5 w-4.5" />
                  <span>Ask Hinora</span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  <Headphones className="h-4.5 w-4.5" />
                  <span>Contact Support</span>
                </button>
              </DashboardPanel>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-error)]">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              Loading policy library...
            </div>
          ) : null}

          {!isLoading && filteredPolicies.length === 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {(policiesResponse?.stats.totalPolicies ?? 0) === 0 ? (
                <EmptyState
                  icon={BookOpenText}
                  title="No policies have been added yet."
                  description={
                    mode === "admin"
                      ? "Published policies will appear here for browsing and reading across the organization."
                      : "No policies have been published for you yet. Check back later or contact your administrator."
                  }
                  actionLabel={mode === "admin" ? "Go to Policy Management" : undefined}
                  onAction={
                    mode === "admin"
                      ? () => {
                          window.location.href = "/admin/policy-management";
                        }
                      : undefined
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching policies"
                  description="Try a different keyword, category, or status filter."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setQuery("");
                    setSelectedCategoryId("all");
                    setSelectedStatus("");
                  }}
                  className="py-12"
                />
              )}
            </div>
          ) : null}

          {mode === "admin" ? (
            <ModuleGuide guideKey="Policy Library" />
          ) : (
            <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>© 2024 Hinora. All rights reserved.</span>
              <span>Hinora AI Policy Library &amp; Knowledge Management System</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
