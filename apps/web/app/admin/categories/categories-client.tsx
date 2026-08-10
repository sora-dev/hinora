"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Files,
  FolderTree,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  ArrowRight,
  ArrowLeftRight,
  Power,
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
import {
  DropdownSelect,
  type DropdownOption,
} from "../../../components/ui/dropdown-select";
import { EmptyState } from "../../../components/ui/empty-state";
import { ModuleGuide } from "../../../components/dashboard/module-guide";
import { API_BASE_URL } from "../../../lib/api-base-url";

type CategoryStatus = "ACTIVE" | "INACTIVE";

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
  parentName?: string | null;
  policies?: PolicyRow[];
  childrenCount?: number;
  children: CategoryNode[];
};

type PolicyStatus = "Published" | "Draft";
type PolicyType = "Policy" | "Guideline";

type PolicyRow = {
  id: string;
  title: string;
  type: PolicyType;
  status: PolicyStatus;
  updatedAt: string;
  updatedBy: string;
};

type CategoriesResponse = {
  data: CategoryNode[];
  total: number;
};

type CategoryDetailResponse = {
  data: CategoryNode;
};


const categoryTree: CategoryNode[] = [
  {
    id: "board-governance",
    name: "Board Governance",
    code: "BG",
    description: "Board-level governance and oversight policy categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#2563EB",
    createdAt: "2024-05-01T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-08T10:00:00.000Z",
    updatedBy: "Jethro Simbulan",
    policyCount: 8,
    documentCount: 4,
    assignedDepartments: 2,
    children: [],
  },
  {
    id: "human-resources",
    name: "Human Resources",
    code: "HR",
    description: "Employee lifecycle, performance, and workplace policies.",
    parentId: null,
    status: "ACTIVE",
    color: "#F59E0B",
    createdAt: "2024-05-02T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-10T10:00:00.000Z",
    updatedBy: "Jethro Simbulan",
    policyCount: 35,
    documentCount: 18,
    assignedDepartments: 3,
    children: [],
  },
  {
    id: "information-technology",
    name: "Information Technology",
    code: "IT",
    description: "IT operations, assets, and system access policies.",
    parentId: null,
    status: "ACTIVE",
    color: "#10B981",
    createdAt: "2024-05-02T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-12T10:00:00.000Z",
    updatedBy: "Maria Santos",
    policyCount: 42,
    documentCount: 21,
    assignedDepartments: 4,
    children: [],
  },
  {
    id: "information-security",
    name: "Information Security",
    code: "INFOSEC",
    description: "Security governance, incident response, and risk protection policies.",
    parentId: null,
    status: "ACTIVE",
    color: "#7C3AED",
    createdAt: "2024-05-04T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "Jethro Simbulan",
    policyCount: 38,
    documentCount: 26,
    assignedDepartments: 4,
    children: [
      {
        id: "cybersecurity",
        name: "Cybersecurity",
        code: "INFOSEC-01",
        description:
          "Policies related to cybersecurity protection, threat prevention, secure systems, and vulnerability management.",
        parentId: "information-security",
        status: "ACTIVE",
        color: "#2563EB",
        createdAt: "2024-05-05T10:00:00.000Z",
        createdBy: "Jethro Simbulan",
        updatedAt: "2024-05-13T10:00:00.000Z",
        updatedBy: "Jethro Simbulan",
        policyCount: 18,
        documentCount: 26,
        assignedDepartments: 4,
        children: [],
      },
      {
        id: "access-control",
        name: "Access Control",
        code: "INFOSEC-02",
        description: "Identity and access controls for critical systems and data.",
        parentId: "information-security",
        status: "ACTIVE",
        color: "#0EA5E9",
        createdAt: "2024-05-06T10:00:00.000Z",
        createdBy: "Hinora Seed",
        updatedAt: "2024-05-10T10:00:00.000Z",
        updatedBy: "Maria Santos",
        policyCount: 12,
        documentCount: 12,
        assignedDepartments: 3,
        children: [],
      },
      {
        id: "endpoint-security",
        name: "Endpoint Security",
        code: "INFOSEC-03",
        description: "Device hardening, endpoint security tooling, and monitoring policies.",
        parentId: "information-security",
        status: "ACTIVE",
        color: "#22C55E",
        createdAt: "2024-05-06T10:00:00.000Z",
        createdBy: "Hinora Seed",
        updatedAt: "2024-05-11T10:00:00.000Z",
        updatedBy: "Maria Santos",
        policyCount: 10,
        documentCount: 8,
        assignedDepartments: 2,
        children: [],
      },
      {
        id: "incident-response",
        name: "Incident Response",
        code: "INFOSEC-04",
        description: "Incident triage, reporting, escalation, and recovery policies.",
        parentId: "information-security",
        status: "INACTIVE",
        color: "#F97316",
        createdAt: "2024-05-07T10:00:00.000Z",
        createdBy: "Hinora Seed",
        updatedAt: "2024-05-12T10:00:00.000Z",
        updatedBy: "Jethro Simbulan",
        policyCount: 8,
        documentCount: 5,
        assignedDepartments: 1,
        children: [],
      },
    ],
  },
  {
    id: "compliance",
    name: "Compliance",
    code: "COMP",
    description: "Compliance requirements and regulatory policy categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#0EA5E9",
    createdAt: "2024-05-08T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-12T10:00:00.000Z",
    updatedBy: "Maria Santos",
    policyCount: 27,
    documentCount: 16,
    assignedDepartments: 5,
    children: [],
  },
  {
    id: "risk-management",
    name: "Risk Management",
    code: "RISK",
    description: "Risk registers, controls, and mitigation categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#7C3AED",
    createdAt: "2024-05-09T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 22,
    documentCount: 10,
    assignedDepartments: 3,
    children: [],
  },
  {
    id: "operations",
    name: "Operations",
    code: "OPS",
    description: "Location and back-office operating procedures categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#22C55E",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 31,
    documentCount: 14,
    assignedDepartments: 2,
    children: [],
  },
  {
    id: "finance",
    name: "Finance",
    code: "FIN",
    description: "Finance, accounting, and treasury policy categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#F59E0B",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 18,
    documentCount: 9,
    assignedDepartments: 2,
    children: [],
  },
  {
    id: "credit",
    name: "Credit",
    code: "CRD",
    description: "Credit and loan processing categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#2563EB",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 25,
    documentCount: 12,
    assignedDepartments: 2,
    children: [],
  },
  {
    id: "treasury",
    name: "Treasury",
    code: "TRY",
    description: "Liquidity and treasury operations categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#10B981",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 16,
    documentCount: 6,
    assignedDepartments: 1,
    children: [],
  },
  {
    id: "legal",
    name: "Legal",
    code: "LGL",
    description: "Legal compliance and contract categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#6366F1",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 9,
    documentCount: 4,
    assignedDepartments: 1,
    children: [],
  },
  {
    id: "internal-audit",
    name: "Internal Audit",
    code: "AUD",
    description: "Audit findings and follow-ups categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#EF4444",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 7,
    documentCount: 3,
    assignedDepartments: 1,
    children: [],
  },
  {
    id: "customer-service",
    name: "Customer Service",
    code: "CS",
    description: "Customer interactions and service categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#14B8A6",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 14,
    documentCount: 8,
    assignedDepartments: 1,
    children: [],
  },
  {
    id: "location-operations",
    name: "Location Operations",
    code: "LOC",
    description: "Location and teller operations categories.",
    parentId: null,
    status: "ACTIVE",
    color: "#F97316",
    createdAt: "2024-05-10T10:00:00.000Z",
    createdBy: "Hinora Seed",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "John Dela Cruz",
    policyCount: 20,
    documentCount: 11,
    assignedDepartments: 2,
    children: [],
  },
] as const;

const cybersecurityPolicies: PolicyRow[] = [
  {
    id: "infosec-policy",
    title: "Information Security Policy",
    type: "Policy",
    status: "Published",
    updatedAt: "2024-05-13T10:00:00.000Z",
    updatedBy: "Jethro Simbulan",
  },
  {
    id: "vuln-policy",
    title: "Vulnerability Management Policy",
    type: "Policy",
    status: "Published",
    updatedAt: "2024-05-10T10:00:00.000Z",
    updatedBy: "Maria Santos",
  },
  {
    id: "pentest-policy",
    title: "Penetration Testing Policy",
    type: "Policy",
    status: "Published",
    updatedAt: "2024-05-08T10:00:00.000Z",
    updatedBy: "Jethro Simbulan",
  },
  {
    id: "security-awareness",
    title: "Security Awareness Training Policy",
    type: "Policy",
    status: "Draft",
    updatedAt: "2024-05-05T10:00:00.000Z",
    updatedBy: "Angelo Rivera",
  },
  {
    id: "secure-coding",
    title: "Secure Coding Guidelines",
    type: "Guideline",
    status: "Published",
    updatedAt: "2024-05-02T10:00:00.000Z",
    updatedBy: "Maria Santos",
  },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function countCategories(nodes: readonly CategoryNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countCategories(node.children), 0);
}

function flattenCategories(nodes: readonly CategoryNode[]) {
  const output: CategoryNode[] = [];
  const visit = (node: CategoryNode) => {
    output.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return output;
}

function findCategory(nodes: readonly CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findCategory(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadge(status: CategoryStatus) {
  return status === "ACTIVE" ? "bg-emerald-50 text-[var(--color-success)]" : "bg-amber-50 text-[var(--color-warning)]";
}

const categoryStatusOptions: DropdownOption<CategoryStatus>[] = [
  { value: "ACTIVE", label: "Active", badgeClassName: "bg-emerald-50 text-[var(--color-success)]" },
  { value: "INACTIVE", label: "Inactive", badgeClassName: "bg-amber-50 text-[var(--color-warning)]" },
];

function statusDot(status: CategoryStatus) {
  return status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500";
}

function policyStatusTone(status: PolicyStatus) {
  return status === "Published" ? "bg-emerald-50 text-[var(--color-success)]" : "bg-amber-50 text-[var(--color-warning)]";
}

function policyTypeTone(type: PolicyType) {
  return type === "Policy" ? "bg-blue-50 text-[var(--color-active-menu)]" : "bg-violet-50 text-[var(--color-ai-accent)]";
}

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, description, onClose, children }: ModalProps) {
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
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
          >
            <Plus className="h-4 w-4 rotate-45" />
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

type CategoryFormState = {
  name: string;
  code: string;
  description: string;
  color: string;
  status: CategoryStatus;
  parentId: string | null;
};

type CreateCategoryMode = "parent" | "subcategory";

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]/60 focus:ring-4 focus:ring-blue-500/10";

export default function AdminCategoriesClient() {
  const [categoriesData, setCategoriesData] = useState<CategoryNode[]>([...categoryTree]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | CategoryStatus>("ALL");
  const [treeSearch, setTreeSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(["information-security"]),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("cybersecurity");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createCategoryMode, setCreateCategoryMode] = useState<CreateCategoryMode>("parent");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<CategoryNode | null>(() => ({
    ...(findCategory(categoryTree, "cybersecurity") as CategoryNode),
    parentName: "Information Security",
    policies: [...cybersecurityPolicies],
  }));
  const [formState, setFormState] = useState<CategoryFormState>({
    name: "",
    code: "",
    description: "",
    color: "#2563EB",
    status: "ACTIVE",
    parentId: null,
  });

  const totalCategoryCount = useMemo(() => countCategories(categoriesData), [categoriesData]);
  const categoryLookup = useMemo(() => flattenCategories(categoriesData), [categoriesData]);
  const allCategoriesSelectionId = categoryLookup[0]?.id ?? "";

  const selectedCategory = useMemo(() => {
    if (selectedCategoryDetail && selectedCategoryDetail.id === selectedCategoryId) {
      return selectedCategoryDetail;
    }

    if (selectedCategoryId) {
      return findCategory(categoriesData, selectedCategoryId) ?? categoryLookup[0] ?? null;
    }

    return categoryLookup[0] ?? null;
  }, [categoriesData, categoryLookup, selectedCategoryDetail, selectedCategoryId]);

  const filteredTree = useMemo(() => {
    const query = treeSearch.trim().toLowerCase();

    function matches(node: CategoryNode) {
      if (statusFilter !== "ALL" && node.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${node.name} ${node.code} ${node.description}`.toLowerCase();
      return haystack.includes(query);
    }

    function filterNodes(nodes: readonly CategoryNode[]): CategoryNode[] {
      return nodes
        .map((node) => {
          const filteredChildren = filterNodes(node.children);
          const isMatch = matches(node);
          if (!isMatch && filteredChildren.length === 0) {
            return null;
          }
          return {
            ...node,
            children: filteredChildren,
          };
        })
        .filter(Boolean) as CategoryNode[];
    }

    return filterNodes(categoriesData);
  }, [categoriesData, statusFilter, treeSearch]);

  const policiesInCategory = useMemo(
    () => selectedCategoryDetail?.policies ?? [],
    [selectedCategoryDetail],
  );

  const loadCategoryDetail = useCallback(async (categoryId: string) => {
    try {
      const response = await requestJson<CategoryDetailResponse>(`/categories/${categoryId}`);
      setSelectedCategoryDetail(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load category details.");
    }
  }, []);

  const loadCategories = useCallback(async (preferredCategoryId?: string) => {
    setIsLoading(true);

    try {
      const response = await requestJson<CategoriesResponse>("/categories");
      const nextCategories = response.data;
      const flattened = flattenCategories(nextCategories);
      const nextSelectedId =
        preferredCategoryId && flattened.some((node) => node.id === preferredCategoryId)
          ? preferredCategoryId
          : selectedCategoryId && flattened.some((node) => node.id === selectedCategoryId)
            ? selectedCategoryId
            : flattened[0]?.id ?? "";

      setCategoriesData(nextCategories);
      setExpandedIds(
        new Set(
          flattened
            .filter((node) => node.parentId)
            .map((node) => node.parentId as string),
        ),
      );
      setSelectedCategoryId(nextSelectedId);

      if (nextSelectedId) {
        await loadCategoryDetail(nextSelectedId);
      } else {
        setSelectedCategoryDetail(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, [loadCategoryDetail, selectedCategoryId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    if (selectedCategoryDetail?.id === selectedCategoryId) {
      return;
    }

    void loadCategoryDetail(selectedCategoryId);
  }, [loadCategoryDetail, selectedCategoryDetail?.id, selectedCategoryId]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openCreateModal(parentId: string | null, mode: CreateCategoryMode) {
    setCreateCategoryMode(mode);
    setFormState({
      name: "",
      code: "",
      description: "",
      color: "#2563EB",
      status: "ACTIVE",
      parentId,
    });
    setShowCreateModal(true);
  }

  function openEditModal() {
    if (!selectedCategory) {
      return;
    }

    setFormState({
      name: selectedCategory.name,
      code: selectedCategory.code,
      description: selectedCategory.description,
      color: selectedCategory.color,
      status: selectedCategory.status,
      parentId: selectedCategory.parentId,
    });
    setShowEditModal(true);
  }

  function exportCategories() {
    const header = ["Category", "Code", "Parent", "Status", "Policies"];
    const rows = categoryLookup.map((node) => [
      node.name,
      node.code,
      node.parentId ? findCategory(categoriesData, node.parentId)?.name ?? "" : "",
      node.status,
      String(node.policyCount),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateCategory() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await requestJson<CategoryDetailResponse>("/categories", {
        method: "POST",
        body: JSON.stringify({
          ...formState,
          createdBy: "John Dela Cruz",
          updatedBy: "John Dela Cruz",
        }),
      });

      setSuccessMessage(
        createCategoryMode === "parent"
          ? "Parent category created successfully."
          : "Subcategory created successfully.",
      );
      setShowCreateModal(false);
      await loadCategories(response.data.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create category.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateCategory() {
    if (!selectedCategory) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await requestJson<CategoryDetailResponse>(
        `/categories/${selectedCategory.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...formState,
            updatedBy: "John Dela Cruz",
          }),
        },
      );

      setSuccessMessage("Category updated successfully.");
      setShowEditModal(false);
      await loadCategories(response.data.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update category.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleCategoryStatus() {
    if (!selectedCategory) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const nextStatus: CategoryStatus =
        selectedCategory.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await requestJson<CategoryDetailResponse>(`/categories/${selectedCategory.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          updatedBy: "John Dela Cruz",
        }),
      });
      setSuccessMessage(
        nextStatus === "ACTIVE"
          ? "Category activated successfully."
          : "Category deactivated successfully.",
      );
      await loadCategories(selectedCategory.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update category status.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await requestJson<{ success: boolean; deletedId: string }>(
        `/categories/${selectedCategory.id}`,
        {
          method: "DELETE",
        },
      );
      setSuccessMessage("Category deleted successfully.");
      await loadCategories();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete category.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!selectedCategory && !isLoading) {
    return (
      <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
        <DashboardSidebar variant="admin" />
        <section className="flex min-w-0 flex-col">
          <DashboardTopbar
            searchPlaceholder="Search categories, policies, or departments..."
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
          <DashboardMobileNav variant="admin" />
          <div className="px-4 py-8 md:px-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Categories</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Organize policies into a clear category structure.
                </p>
              </div>
            </div>
            <DashboardPanel title="Categories" className="p-0">
              <EmptyState
                icon={FolderTree}
                title="No categories have been added yet."
                description="Categories help group policies so teams can find and assign the right documents."
                actionLabel="Add First Category"
                onAction={() => openCreateModal(null, "parent")}
              />
            </DashboardPanel>
            <ModuleGuide guideKey="Categories" />
          </div>
        </section>
      </main>
    );
  }

  function TreeNode({ node, depth }: { node: CategoryNode; depth: number }) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isActive = node.id === selectedCategoryId;

    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedCategoryId(node.id)}
          className={cx(
            "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition",
            isActive
              ? "bg-blue-50 text-[var(--color-active-menu)]"
              : "text-slate-700 hover:bg-slate-50",
          )}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          {hasChildren ? (
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(node.id);
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
              <ChevronRight className="h-4 w-4 opacity-0" />
            </span>
          )}

          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: node.color }}
          >
            <ShieldCheck className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <span className="text-xs font-bold text-slate-400">{node.policyCount}</span>
          <span className={cx("ml-1 h-2 w-2 rounded-full", statusDot(node.status))} />
        </button>

        {hasChildren && isExpanded ? (
          <div className="mt-1 space-y-1">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, documents, or categories..."
          notificationCount={3}
          secondaryActionIcon={CircleHelp}
          secondaryActionLabel="Help"
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
        />
        <DashboardMobileNav variant="admin" />

        <div className="px-4 py-5 md:px-5">
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

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Categories</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Categories</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Organize policies into logical groups to help users find information easily.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end lg:pt-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusMenu((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                >
                  <span>
                    {statusFilter === "ALL"
                      ? "All Status"
                      : statusFilter === "ACTIVE"
                        ? "Active"
                        : "Inactive"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showStatusMenu ? (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
                    {(
                      [
                        { label: "All Status", value: "ALL" },
                        { label: "Active", value: "ACTIVE" },
                        { label: "Inactive", value: "INACTIVE" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(option.value as "ALL" | CategoryStatus);
                          setShowStatusMenu(false);
                        }}
                        className={cx(
                          "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50",
                          statusFilter === option.value ? "text-[var(--color-active-menu)]" : "text-slate-700",
                        )}
                      >
                        <span>{option.label}</span>
                        {statusFilter === option.value ? <ShieldCheck className="h-4 w-4" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={exportCategories}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <Download className="h-4 w-4" />
                <span>Export Categories</span>
              </button>

              <button
                type="button"
                onClick={() => openCreateModal(null, "parent")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Category</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <DashboardPanel title="Category Tree" className="p-0">
              <div className="border-b border-slate-200 px-4 py-4">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={treeSearch}
                    onChange={(event) => setTreeSearch(event.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                  />
                </label>
              </div>

              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(allCategoriesSelectionId)}
                  className={cx(
                    "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700",
                    selectedCategoryId === allCategoriesSelectionId ? "border-[var(--color-active-menu)]/30 bg-blue-50" : "",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-[var(--color-active-menu)]" />
                    All Categories
                  </span>
                  <span className="text-xs font-bold text-slate-500">{totalCategoryCount}</span>
                </button>

                <div className="mt-4 space-y-1">
                  {filteredTree.map((node) => (
                    <TreeNode key={node.id} node={node} depth={0} />
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() => openCreateModal(selectedCategoryId, "subcategory")}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Subcategory</span>
                </button>
              </div>
            </DashboardPanel>

            <div className="space-y-4">
              <DashboardPanel title="Category Details" className="p-0">
                <div className="flex flex-col gap-5 px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm text-white"
                        style={{ backgroundColor: selectedCategory.color }}
                      >
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900">{selectedCategory.name}</h2>
                          <span
                            className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusBadge(selectedCategory.status))}
                          >
                            {selectedCategory.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">{selectedCategory.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openEditModal}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit Category</span>
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Parent Category</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <FolderTree className="h-4 w-4 text-slate-400" />
                        <span className="truncate">
                          {selectedCategory.parentId
                            ? selectedCategory.parentName ?? findCategory(categoriesData, selectedCategory.parentId)?.name ?? "-"
                            : "No parent category"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Category Code</div>
                      <div className="mt-2 text-sm font-semibold text-slate-700">{selectedCategory.code}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">Created On</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(selectedCategory.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-bold text-slate-500">Icon</div>
                      <button
                        type="button"
                        className="mt-2 inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-500" />
                          Shield
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Color</div>
                      <button
                        type="button"
                        className="mt-2 inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedCategory.color }} />
                          {selectedCategory.color.toUpperCase()}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Status</div>
                      <button
                        type="button"
                        className="mt-2 inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className={cx("h-2.5 w-2.5 rounded-full", statusDot(selectedCategory.status))} />
                          {selectedCategory.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                    <DashboardStatCard
                      title="Total Policies"
                      value={`${selectedCategory.policyCount}`}
                      Icon={Files}
                      iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
                      detail="View Policies"
                      trailing={<ArrowRight className="h-4 w-4 text-slate-400" />}
                    />
                    <DashboardStatCard
                      title="Total Documents"
                      value={`${selectedCategory.documentCount}`}
                      Icon={FileText}
                      iconClassName="bg-emerald-50 text-[var(--color-success)]"
                      detail="View Documents"
                      trailing={<ArrowRight className="h-4 w-4 text-slate-400" />}
                    />
                    <DashboardStatCard
                      title="Recently Updated"
                      value={formatDate(selectedCategory.updatedAt)}
                      Icon={CalendarDays}
                      iconClassName="bg-violet-50 text-[var(--color-ai-accent)]"
                      detail="View Changes"
                      trailing={<ArrowRight className="h-4 w-4 text-slate-400" />}
                      className="items-start min-h-[128px]"
                    />
                    <DashboardStatCard
                      title="Assigned Departments"
                      value={`${selectedCategory.assignedDepartments}`}
                      Icon={Users}
                      iconClassName="bg-amber-50 text-[var(--color-warning)]"
                      detail="View Departments"
                      trailing={<ArrowRight className="h-4 w-4 text-slate-400" />}
                    />
                  </div>
                </div>
              </DashboardPanel>

              <DashboardPanel title={`Policies in this Category (${selectedCategory.policyCount})`} className="p-0">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-700">1</span> to{" "}
                    <span className="font-semibold text-slate-700">{policiesInCategory.length}</span> of{" "}
                    <span className="font-semibold text-slate-700">{selectedCategory.policyCount}</span> policies
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/admin/policy-management?categoryId=${selectedCategory.id}`;
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  >
                    <Files className="h-4 w-4" />
                    <span>View All Policies</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[820px] w-full text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Policy Title</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Last Updated</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
                      {policiesInCategory.map((policy) => (
                        <tr key={policy.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                                <Files className="h-4 w-4" />
                              </span>
                              <span className="font-semibold text-slate-900">{policy.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", policyTypeTone(policy.type))}>
                              {policy.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", policyStatusTone(policy.status))}>
                              {policy.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-700">{formatDate(policy.updatedAt)}</div>
                            <div className="text-xs text-slate-400">by {policy.updatedBy}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                              aria-label="Policy actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>Move Policies</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleCategoryStatus()}
                      disabled={isSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-[var(--color-warning)]"
                    >
                      <Power className="h-4 w-4" />
                      <span>{selectedCategory.status === "ACTIVE" ? "Deactivate Category" : "Activate Category"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCategory()}
                      disabled={isSaving || selectedCategory.policyCount > 0 || (selectedCategory.childrenCount ?? selectedCategory.children.length) > 0}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400 disabled:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Category</span>
                    </button>
                  </div>

                  <div className="text-sm text-slate-500">
                    {selectedCategory.policyCount > 0 || (selectedCategory.childrenCount ?? selectedCategory.children.length) > 0
                      ? "Cannot delete category with existing policies or subcategories."
                      : "This category can be deleted."}
                  </div>
                </div>
              </DashboardPanel>
            </div>
          </div>
          <ModuleGuide guideKey="Categories" />
        </div>
      </section>

      {showCreateModal ? (
        <Modal
          title={createCategoryMode === "parent" ? "Create Parent Category" : "Create Subcategory"}
          description={
            createCategoryMode === "parent"
              ? "Create a top-level category and save it to the database."
              : "Create a subcategory under the selected parent and save it to the database."
          }
          onClose={() => setShowCreateModal(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Category Name</label>
              <input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                className={inputClassName}
                placeholder="e.g. Data Privacy"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Category Code</label>
              <input
                value={formState.code}
                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                className={inputClassName}
                placeholder="e.g. DP-01"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Status</label>
              <DropdownSelect
                value={formState.status}
                onChange={(value) => {
                  if (value) setFormState((current) => ({ ...current, status: value as CategoryStatus }));
                }}
                options={categoryStatusOptions}
                allowClear={false}
                aria-label="Status"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Description</label>
              <input
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                className={inputClassName}
                placeholder="Describe how this category groups policies."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Parent Category</label>
              {createCategoryMode === "parent" ? (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                  None. This will be created as a parent category.
                </div>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  {formState.parentId ? findCategory(categoriesData, formState.parentId)?.name ?? "Selected Category" : "Selected Category"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateCategory()}
              disabled={isSaving}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : createCategoryMode === "parent"
                  ? "Create Parent Category"
                  : "Create Subcategory"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal
          title="Edit Category"
          description="Update the selected category and save the changes to the database."
          onClose={() => setShowEditModal(false)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Category Name</label>
              <input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Category Code</label>
              <input
                value={formState.code}
                onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Status</label>
              <DropdownSelect
                value={formState.status}
                onChange={(value) => {
                  if (value) setFormState((current) => ({ ...current, status: value as CategoryStatus }));
                }}
                options={categoryStatusOptions}
                allowClear={false}
                aria-label="Status"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500">Description</label>
              <input
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="h-11 rounded-xl border border-slate-200 px-4 font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUpdateCategory()}
              disabled={isSaving}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
