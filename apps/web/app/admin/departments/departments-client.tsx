"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DashboardMobileNav, DashboardSidebar } from "../../../components/dashboard/dashboard-nav";
import {
  DashboardStatCard,
  DashboardTopbar,
} from "../../../components/dashboard/primitives";
import {
  getLocationById,
  ORGANIZATION_WIDE_SCOPE,
} from "../../../components/departments/location-options";
import DepartmentFormModal, {
  emptyDepartmentFormValues,
  type DepartmentFormValues,
  type DepartmentHeadOption,
} from "../../../components/departments/department-form-modal";
import { DropdownSelect } from "../../../components/ui/dropdown-select";

type DepartmentStatus = "Active" | "Inactive";

type DepartmentHead = {
  id?: string;
  name: string;
  email: string;
  initials: string;
  jobTitle?: string | null;
};

type DepartmentEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  status: "Active" | "On Leave";
};

type DepartmentPolicy = {
  id: string;
  title: string;
  status: "Assigned" | "Completed" | "Overdue";
  dueAt: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
};

type Department = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  description: string;
  head: DepartmentHead;
  employees: number;
  compliance: number;
  policies: number;
  status: DepartmentStatus;
  locations: string[];
  createdAt: string;
  establishedDate?: string;
  displayOrder?: number;
  parentDepartmentId?: string;
  locationScope?: string;
  costCenter?: string;
  autoAssignMandatory?: boolean;
  enableNotifications?: boolean;
  inheritAssignments?: boolean;
  avatarTone: string;
  employeeList: DepartmentEmployee[];
  policyList: DepartmentPolicy[];
  activity: ActivityItem[];
  complianceTrend: number[];
};

const PAGE_SIZE = 7;

const MOCK_DEPARTMENTS: Department[] = [
  {
    id: "dept-it",
    name: "Information Technology",
    shortName: "IT Department",
    code: "IT",
    description:
      "Owns infrastructure, security controls, and digital systems that support company-wide policy enforcement.",
    head: {
      name: "John Dela Cruz",
      email: "john.delacruz@company.com",
      initials: "JD",
    },
    employees: 18,
    compliance: 100,
    policies: 12,
    status: "Active",
    locations: ["Head Office", "Baguio"],
    createdAt: "May 15, 2024",
    avatarTone: "bg-violet-100 text-violet-700",
    employeeList: [
      {
        id: "e1",
        name: "John Dela Cruz",
        email: "john.delacruz@company.com",
        role: "Department Head",
        initials: "JD",
        status: "Active",
      },
      {
        id: "e2",
        name: "Alyssa Ramos",
        email: "alyssa.ramos@company.com",
        role: "Security Analyst",
        initials: "AR",
        status: "Active",
      },
      {
        id: "e3",
        name: "Kenji Ortega",
        email: "kenji.ortega@company.com",
        role: "Systems Engineer",
        initials: "KO",
        status: "Active",
      },
      {
        id: "e4",
        name: "Patricia Lim",
        email: "patricia.lim@company.com",
        role: "IT Support Lead",
        initials: "PL",
        status: "On Leave",
      },
    ],
    policyList: [
      { id: "p1", title: "Acceptable Use Policy", status: "Completed", dueAt: "Jun 12, 2026" },
      { id: "p2", title: "Data Classification Standard", status: "Completed", dueAt: "Jun 20, 2026" },
      { id: "p3", title: "Incident Response Playbook", status: "Assigned", dueAt: "Aug 15, 2026" },
      { id: "p4", title: "Access Control Policy", status: "Completed", dueAt: "Jul 01, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Compliance reached 100%",
        detail: "All assigned policies were acknowledged by IT staff.",
        at: "Aug 2, 2026 · 10:24 AM",
      },
      {
        id: "a2",
        title: "Policy assigned",
        detail: "Incident Response Playbook assigned to 18 employees.",
        at: "Jul 28, 2026 · 3:12 PM",
      },
      {
        id: "a3",
        title: "Department head updated",
        detail: "John Dela Cruz set as department head.",
        at: "Jul 10, 2026 · 9:05 AM",
      },
    ],
    complianceTrend: [88, 91, 96, 100],
  },
  {
    id: "dept-hr",
    name: "Human Resources",
    shortName: "HR Department",
    code: "HR",
    description: "Manages people operations, onboarding, and employment policy acknowledgement.",
    head: {
      name: "Maria Santos",
      email: "maria.santos@company.com",
      initials: "MS",
    },
    employees: 15,
    compliance: 93,
    policies: 10,
    status: "Active",
    locations: ["Head Office", "Cebu"],
    createdAt: "Mar 02, 2024",
    avatarTone: "bg-sky-100 text-sky-700",
    employeeList: [
      {
        id: "e1",
        name: "Maria Santos",
        email: "maria.santos@company.com",
        role: "Department Head",
        initials: "MS",
        status: "Active",
      },
      {
        id: "e2",
        name: "Diane Cruz",
        email: "diane.cruz@company.com",
        role: "HR Business Partner",
        initials: "DC",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Code of Conduct", status: "Completed", dueAt: "May 30, 2026" },
      { id: "p2", title: "Workplace Harassment Policy", status: "Assigned", dueAt: "Aug 22, 2026" },
      { id: "p3", title: "Leave Management Policy", status: "Overdue", dueAt: "Jul 15, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Reminder sent",
        detail: "2 employees reminded about Leave Management Policy.",
        at: "Aug 4, 2026 · 2:40 PM",
      },
    ],
    complianceTrend: [84, 87, 90, 93],
  },
  {
    id: "dept-ac",
    name: "Accounting",
    shortName: "Finance & Accounting",
    code: "AC",
    description: "Handles financial controls, procurement oversight, and related policy compliance.",
    head: {
      name: "Roberto Cruz",
      email: "roberto.cruz@company.com",
      initials: "RC",
    },
    employees: 12,
    compliance: 100,
    policies: 8,
    status: "Active",
    locations: ["Head Office"],
    createdAt: "Jan 18, 2024",
    avatarTone: "bg-amber-100 text-amber-700",
    employeeList: [
      {
        id: "e1",
        name: "Roberto Cruz",
        email: "roberto.cruz@company.com",
        role: "Department Head",
        initials: "RC",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Expense Reimbursement Policy", status: "Completed", dueAt: "Jun 01, 2026" },
      { id: "p2", title: "Procurement Policy", status: "Completed", dueAt: "Jun 18, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "All policies completed",
        detail: "Accounting closed the current compliance cycle.",
        at: "Jul 22, 2026 · 11:18 AM",
      },
    ],
    complianceTrend: [92, 95, 98, 100],
  },
  {
    id: "dept-ops",
    name: "Operations",
    shortName: "Operations Department",
    code: "OP",
    description: "Coordinates day-to-day business operations and location execution standards.",
    head: {
      name: "Ana Reyes",
      email: "ana.reyes@company.com",
      initials: "AR",
    },
    employees: 22,
    compliance: 91,
    policies: 15,
    status: "Active",
    locations: ["Head Office", "Davao", "Cebu"],
    createdAt: "Feb 09, 2024",
    avatarTone: "bg-emerald-100 text-emerald-700",
    employeeList: [
      {
        id: "e1",
        name: "Ana Reyes",
        email: "ana.reyes@company.com",
        role: "Department Head",
        initials: "AR",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Location Operations Manual", status: "Assigned", dueAt: "Aug 30, 2026" },
      { id: "p2", title: "Safety Protocol", status: "Completed", dueAt: "May 12, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "New location linked",
        detail: "Davao added to Operations coverage.",
        at: "Jul 05, 2026 · 4:02 PM",
      },
    ],
    complianceTrend: [80, 85, 89, 91],
  },
  {
    id: "dept-legal",
    name: "Legal & Compliance",
    shortName: "Legal Department",
    code: "LC",
    description: "Oversees regulatory obligations, policy governance, and legal risk.",
    head: {
      name: "Carlos Mendoza",
      email: "carlos.mendoza@company.com",
      initials: "CM",
    },
    employees: 8,
    compliance: 100,
    policies: 14,
    status: "Active",
    locations: ["Head Office"],
    createdAt: "Apr 21, 2024",
    avatarTone: "bg-rose-100 text-rose-700",
    employeeList: [
      {
        id: "e1",
        name: "Carlos Mendoza",
        email: "carlos.mendoza@company.com",
        role: "Department Head",
        initials: "CM",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Regulatory Compliance Framework", status: "Completed", dueAt: "Jun 08, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Framework published",
        detail: "Regulatory Compliance Framework marked complete.",
        at: "Jun 08, 2026 · 1:45 PM",
      },
    ],
    complianceTrend: [94, 97, 99, 100],
  },
  {
    id: "dept-mkt",
    name: "Marketing",
    shortName: "Marketing Department",
    code: "MK",
    description: "Leads brand, communications, and external messaging controls.",
    head: {
      name: "Sofia Garcia",
      email: "sofia.garcia@company.com",
      initials: "SG",
    },
    employees: 10,
    compliance: 85,
    policies: 6,
    status: "Active",
    locations: ["Head Office", "Baguio"],
    createdAt: "May 03, 2024",
    avatarTone: "bg-fuchsia-100 text-fuchsia-700",
    employeeList: [
      {
        id: "e1",
        name: "Sofia Garcia",
        email: "sofia.garcia@company.com",
        role: "Department Head",
        initials: "SG",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Brand Guidelines", status: "Assigned", dueAt: "Aug 18, 2026" },
      { id: "p2", title: "Social Media Policy", status: "Overdue", dueAt: "Jul 20, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Overdue alert",
        detail: "Social Media Policy is past due for 3 employees.",
        at: "Aug 1, 2026 · 8:30 AM",
      },
    ],
    complianceTrend: [78, 80, 83, 85],
  },
  {
    id: "dept-cs",
    name: "Customer Service",
    shortName: "Customer Support",
    code: "CS",
    description: "Supports customer interactions and service quality standards.",
    head: {
      name: "Miguel Torres",
      email: "miguel.torres@company.com",
      initials: "MT",
    },
    employees: 25,
    compliance: 88,
    policies: 9,
    status: "Active",
    locations: ["Head Office", "Cebu", "Davao"],
    createdAt: "Jun 11, 2024",
    avatarTone: "bg-cyan-100 text-cyan-700",
    employeeList: [
      {
        id: "e1",
        name: "Miguel Torres",
        email: "miguel.torres@company.com",
        role: "Department Head",
        initials: "MT",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Customer Data Handling", status: "Assigned", dueAt: "Aug 25, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Training completed",
        detail: "Customer Data Handling orientation finished for shift leads.",
        at: "Jul 30, 2026 · 5:10 PM",
      },
    ],
    complianceTrend: [81, 84, 86, 88],
  },
  {
    id: "dept-sales",
    name: "Sales",
    shortName: "Sales Department",
    code: "SL",
    description: "Drives revenue programs and partner engagement policies.",
    head: {
      name: "Elena Vargas",
      email: "elena.vargas@company.com",
      initials: "EV",
    },
    employees: 16,
    compliance: 82,
    policies: 7,
    status: "Active",
    locations: ["Head Office", "Cebu"],
    createdAt: "Jul 01, 2024",
    avatarTone: "bg-orange-100 text-orange-700",
    employeeList: [
      {
        id: "e1",
        name: "Elena Vargas",
        email: "elena.vargas@company.com",
        role: "Department Head",
        initials: "EV",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Sales Ethics Policy", status: "Assigned", dueAt: "Sep 01, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Department created",
        detail: "Sales department added to the organization chart.",
        at: "Jul 01, 2024 · 10:00 AM",
      },
    ],
    complianceTrend: [70, 74, 79, 82],
  },
  {
    id: "dept-qa",
    name: "Quality Assurance",
    shortName: "QA Department",
    code: "QA",
    description: "Ensures process quality and audit readiness across teams.",
    head: {
      name: "Hannah Lee",
      email: "hannah.lee@company.com",
      initials: "HL",
    },
    employees: 9,
    compliance: 96,
    policies: 5,
    status: "Active",
    locations: ["Head Office"],
    createdAt: "Aug 14, 2024",
    avatarTone: "bg-lime-100 text-lime-700",
    employeeList: [
      {
        id: "e1",
        name: "Hannah Lee",
        email: "hannah.lee@company.com",
        role: "Department Head",
        initials: "HL",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Quality Management Policy", status: "Completed", dueAt: "Jun 30, 2026" },
    ],
    activity: [],
    complianceTrend: [90, 92, 94, 96],
  },
  {
    id: "dept-rd",
    name: "Research & Development",
    shortName: "R&D Department",
    code: "RD",
    description: "Builds product innovations and protects intellectual property practices.",
    head: {
      name: "Noah Kim",
      email: "noah.kim@company.com",
      initials: "NK",
    },
    employees: 11,
    compliance: 90,
    policies: 8,
    status: "Active",
    locations: ["Head Office", "Baguio"],
    createdAt: "Sep 05, 2024",
    avatarTone: "bg-indigo-100 text-indigo-700",
    employeeList: [
      {
        id: "e1",
        name: "Noah Kim",
        email: "noah.kim@company.com",
        role: "Department Head",
        initials: "NK",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "IP Protection Policy", status: "Assigned", dueAt: "Aug 28, 2026" },
    ],
    activity: [],
    complianceTrend: [82, 85, 88, 90],
  },
  {
    id: "dept-fac",
    name: "Facilities",
    shortName: "Facilities Management",
    code: "FC",
    description: "Maintains workplace safety, facilities access, and site operations.",
    head: {
      name: "Omar Hassan",
      email: "omar.hassan@company.com",
      initials: "OH",
    },
    employees: 7,
    compliance: 79,
    policies: 4,
    status: "Inactive",
    locations: ["Head Office"],
    createdAt: "Oct 12, 2024",
    avatarTone: "bg-slate-200 text-slate-700",
    employeeList: [
      {
        id: "e1",
        name: "Omar Hassan",
        email: "omar.hassan@company.com",
        role: "Department Head",
        initials: "OH",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Workplace Safety Policy", status: "Overdue", dueAt: "Jul 10, 2026" },
    ],
    activity: [
      {
        id: "a1",
        title: "Department deactivated",
        detail: "Facilities temporarily marked inactive for reorganization.",
        at: "Aug 3, 2026 · 9:15 AM",
      },
    ],
    complianceTrend: [86, 84, 81, 79],
  },
  {
    id: "dept-proc",
    name: "Procurement",
    shortName: "Procurement Department",
    code: "PR",
    description: "Manages vendor onboarding and purchasing compliance.",
    head: {
      name: "Grace Tan",
      email: "grace.tan@company.com",
      initials: "GT",
    },
    employees: 6,
    compliance: 97,
    policies: 5,
    status: "Active",
    locations: ["Head Office"],
    createdAt: "Nov 20, 2024",
    avatarTone: "bg-teal-100 text-teal-700",
    employeeList: [
      {
        id: "e1",
        name: "Grace Tan",
        email: "grace.tan@company.com",
        role: "Department Head",
        initials: "GT",
        status: "Active",
      },
    ],
    policyList: [
      { id: "p1", title: "Vendor Due Diligence Policy", status: "Completed", dueAt: "Jun 25, 2026" },
    ],
    activity: [],
    complianceTrend: [90, 93, 95, 97],
  },
];

const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function complianceBarTone(value: number) {
  if (value >= 95) return "bg-emerald-500";
  if (value >= 85) return "bg-amber-400";
  return "bg-orange-500";
}

function statusTone(status: DepartmentStatus) {
  return status === "Active"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
}

function formatEstablishedDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveLocationsFromScope(locationScope: string) {
  if (locationScope === ORGANIZATION_WIDE_SCOPE) {
    return ["Organization-wide"];
  }
  const location = getLocationById(locationScope);
  return location ? [location.name] : ["Head Office"];
}

export default function AdminDepartmentsClient() {
  const [departments, setDepartments] = useState(MOCK_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | DepartmentStatus>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Partial<DepartmentFormValues>>(
    emptyDepartmentFormValues(),
  );
  const [formInitialHead, setFormInitialHead] = useState<DepartmentHeadOption | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments.filter((department) => {
      if (statusFilter && department.status !== statusFilter) return false;
      if (!query) return true;
      return (
        department.name.toLowerCase().includes(query) ||
        department.shortName.toLowerCase().includes(query) ||
        department.code.toLowerCase().includes(query) ||
        department.head.name.toLowerCase().includes(query)
      );
    });
  }, [departments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalEmployees = departments.reduce((sum, item) => sum + item.employees, 0);
    const totalPolicies = departments.reduce((sum, item) => sum + item.policies, 0);
    const averageCompliance =
      departments.length === 0
        ? 0
        : Math.round(
            departments.reduce((sum, item) => sum + item.compliance, 0) / departments.length,
          );

    return {
      totalDepartments: departments.length,
      totalEmployees,
      averageCompliance,
      totalPolicies,
    };
  }, [departments]);

  useEffect(() => {
    if (!filterOpen && !menuOpenId) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (filterOpen && !filterRef.current?.contains(target)) {
        setFilterOpen(false);
      }
      if (menuOpenId && !menuRef.current?.contains(target)) {
        setMenuOpenId(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [filterOpen, menuOpenId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function closeFormModal() {
    setFormMode(null);
    setEditingDepartmentId(null);
    setFormInitialValues(emptyDepartmentFormValues());
    setFormInitialHead(null);
  }

  function openCreateModal() {
    setFormMode("create");
    setEditingDepartmentId(null);
    setFormInitialValues(emptyDepartmentFormValues());
    setFormInitialHead(null);
    setMenuOpenId(null);
  }

  function openEditModal(department: Department) {
    setFormMode("edit");
    setEditingDepartmentId(department.id);
    setFormInitialValues({
      name: department.name,
      status: department.status,
      code: department.code,
      establishedDate: department.establishedDate ?? "",
      description: department.description,
      displayOrder: String(department.displayOrder ?? 1),
      headUserId: department.head.id ?? "",
      parentDepartmentId: department.parentDepartmentId ?? "",
      locationScope: department.locationScope ?? ORGANIZATION_WIDE_SCOPE,
      costCenter: department.costCenter ?? "",
      autoAssignMandatory: department.autoAssignMandatory ?? true,
      enableNotifications: department.enableNotifications ?? true,
      inheritAssignments: department.inheritAssignments ?? true,
    });
    setFormInitialHead(
      department.head.id
        ? {
            id: department.head.id,
            fullName: department.head.name,
            email: department.head.email,
            jobTitle: department.head.jobTitle ?? null,
            department: department.name,
            initials: department.head.initials,
          }
        : department.head.name !== "Unassigned"
          ? {
              id: "",
              fullName: department.head.name,
              email: department.head.email,
              jobTitle: department.head.jobTitle ?? null,
              department: department.name,
              initials: department.head.initials,
            }
          : null,
    );
    setMenuOpenId(null);
  }

  function handleSubmitDepartment(values: DepartmentFormValues, head: DepartmentHeadOption | null) {
    if (!values.name.trim() || !values.code.trim()) return;

    const headRecord: DepartmentHead = head
      ? {
          id: head.id,
          name: head.fullName,
          email: head.email,
          initials: head.initials,
          jobTitle: head.jobTitle,
        }
      : {
          name: "Unassigned",
          email: "unassigned@company.com",
          initials: "UA",
        };

    const shared = {
      name: values.name.trim(),
      shortName: `${values.name.trim()} Department`,
      code: values.code.trim().toUpperCase().slice(0, 8),
      description: values.description.trim() || "No description provided.",
      head: headRecord,
      status: values.status,
      locations: resolveLocationsFromScope(values.locationScope),
      establishedDate: values.establishedDate,
      displayOrder: Number(values.displayOrder) || 1,
      parentDepartmentId: values.parentDepartmentId || undefined,
      locationScope: values.locationScope,
      costCenter: values.costCenter.trim() || undefined,
      autoAssignMandatory: values.autoAssignMandatory,
      enableNotifications: values.enableNotifications,
      inheritAssignments: values.inheritAssignments,
    };

    if (formMode === "edit" && editingDepartmentId) {
      setDepartments((current) =>
        current.map((department) =>
          department.id === editingDepartmentId
            ? {
                ...department,
                ...shared,
                createdAt: values.establishedDate
                  ? formatEstablishedDate(values.establishedDate)
                  : department.createdAt,
              }
            : department,
        ),
      );
      closeFormModal();
      return;
    }

    const next: Department = {
      id: `dept-${Date.now()}`,
      ...shared,
      employees: 0,
      compliance: 0,
      policies: 0,
      createdAt: values.establishedDate
        ? formatEstablishedDate(values.establishedDate)
        : new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
      avatarTone: AVATAR_TONES[departments.length % AVATAR_TONES.length],
      employeeList: [],
      policyList: [],
      activity: [
        {
          id: `a-${Date.now()}`,
          title: "Department created",
          detail: `${values.name.trim()} was added to the organization.`,
          at: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ],
      complianceTrend: [0, 0, 0, 0],
    };

    setDepartments((current) => [next, ...current]);
    closeFormModal();
  }

  const parentDepartmentOptions = useMemo(
    () =>
      departments
        .filter((department) => department.id !== editingDepartmentId)
        .map((department) => ({ id: department.id, name: department.name })),
    [departments, editingDepartmentId],
  );

  const statCards: Array<{
    title: string;
    value: string;
    detail: string;
    Icon: LucideIcon;
    iconClassName: string;
  }> = [
    {
      title: "Total Departments",
      value: String(stats.totalDepartments),
      detail: "Active departments",
      Icon: Users,
      iconClassName: "bg-violet-50 text-violet-600",
    },
    {
      title: "Total Employees",
      value: String(stats.totalEmployees),
      detail: "Across all departments",
      Icon: Users,
      iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
    },
    {
      title: "Average Compliance",
      value: `${stats.averageCompliance}%`,
      detail: "Across all departments",
      Icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Policies Assigned",
      value: String(stats.totalPolicies),
      detail: "Across all departments",
      Icon: BookOpen,
      iconClassName: "bg-amber-50 text-amber-600",
    },
  ];

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search departments..."
          notificationCount={3}
          secondaryActionIcon={CircleHelp}
          secondaryActionLabel="Help"
          profileName="John Dela Cruz"
          profileRole="Administrator"
          avatarText="JD"
          avatarClassName="from-[var(--color-sidebar)] to-[var(--color-sidebar-end)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant="admin" />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Departments</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">Dashboard</span>
                <span>›</span>
                <span>Departments</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </button>
          </div>

          <section className="mb-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                Icon={card.Icon}
                iconClassName={card.iconClassName}
              />
            ))}
          </section>

          <article className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-[1.08rem] font-bold text-slate-900">
                  All Departments ({filtered.length})
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 sm:min-w-[220px]">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by department name..."
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                    />
                  </label>
                  <div ref={filterRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((current) => !current)}
                      className={cx(
                        "inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition",
                        filterOpen || statusFilter
                          ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300",
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                    </button>
                    {filterOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </div>
                        <DropdownSelect
                          value={statusFilter}
                          onChange={(value) => setStatusFilter(value as "" | DepartmentStatus)}
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                          ]}
                          placeholder="All Statuses"
                          allowClear
                          size="sm"
                          aria-label="Filter by status"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Department Head</th>
                      <th className="px-4 py-3">Employees</th>
                      <th className="px-4 py-3">Compliance</th>
                      <th className="px-4 py-3">Policies</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageItems.map((department) => {
                      return (
                        <tr
                          key={department.id}
                          className="text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={cx(
                                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  department.avatarTone,
                                )}
                              >
                                {department.code}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {department.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {department.shortName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.68rem] font-bold text-slate-600">
                                {department.head.initials}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {department.head.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {department.head.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {department.employees}
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[110px]">
                              <div className="mb-1 text-sm font-bold text-slate-800">
                                {department.compliance}%
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={cx(
                                    "h-full rounded-full",
                                    complianceBarTone(department.compliance),
                                  )}
                                  style={{ width: `${department.compliance}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {department.policies}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cx(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                                statusTone(department.status),
                              )}
                            >
                              {department.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className="relative inline-flex"
                              ref={menuOpenId === department.id ? menuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setMenuOpenId((current) =>
                                    current === department.id ? null : department.id,
                                  );
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={`Actions for ${department.name}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {menuOpenId === department.id ? (
                                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditModal(department);
                                    }}
                                    className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 lg:hidden">
                {pageItems.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => openEditModal(department)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          department.avatarTone,
                        )}
                      >
                        {department.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{department.name}</div>
                            <div className="text-xs text-slate-500">{department.head.name}</div>
                          </div>
                          <span
                            className={cx(
                              "inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                              statusTone(department.status),
                            )}
                          >
                            {department.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{department.employees} employees</span>
                          <span className="font-semibold text-slate-700">
                            {department.compliance}% compliance
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">
                  No departments match your search or filters.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {rangeStart} to {rangeEnd} of {filtered.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cx(
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition",
                        pageNumber === currentPage
                          ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)] shadow-[0_0_0_1px_var(--color-active-menu)]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
          </article>
        </div>
      </section>

      {formMode ? (
        <DepartmentFormModal
          mode={formMode}
          initialValues={formInitialValues}
          initialHead={formInitialHead}
          parentDepartments={parentDepartmentOptions}
          onClose={closeFormModal}
          onSubmit={handleSubmitDepartment}
        />
      ) : null}
    </main>
  );
}
