"use client";

import { useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  BookOpenText,
  Building2,
  ChartColumn,
  ClipboardCheck,
  FilePenLine,
  FileText,
  LayoutGrid,
  Network,
  ScrollText,
  Settings,
  Shield,
  SquarePen,
  UserLock,
  UserPlus,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

export type ModuleGuideStep = {
  title: string;
  description: string;
  tone?: "blue" | "violet" | "emerald" | "amber";
};

export type ModuleGuideContent = {
  title: string;
  description: string;
  buttonLabel: string;
  Icon: LucideIcon;
  modalDescription: string;
  steps: ModuleGuideStep[];
};

const toneClasses: Record<NonNullable<ModuleGuideStep["tone"]>, string> = {
  blue: "border-blue-100 bg-blue-50 text-[var(--color-active-menu)]",
  violet: "border-violet-100 bg-violet-50 text-[var(--color-ai-accent)]",
  emerald: "border-emerald-100 bg-emerald-50 text-[var(--color-success)]",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
};

export const moduleGuides: Record<string, ModuleGuideContent> = {
  "Policy Library": {
    title: "Policy Library Guide",
    description:
      "Browse, search, and read published policies. Use filters and bookmarks to find the documents your teams need.",
    buttonLabel: "View Library Guide",
    Icon: FileText,
    modalDescription: "How to explore and use the shared policy library.",
    steps: [
      {
        title: "Search and filter",
        description: "Use keywords, categories, and status filters to narrow the library quickly.",
        tone: "blue",
      },
      {
        title: "Open a policy",
        description: "Select any policy card to open the reader, review details, and track related context.",
        tone: "violet",
      },
      {
        title: "Keep favorites handy",
        description: "Bookmark frequently used policies so they are easier to reopen later.",
        tone: "emerald",
      },
    ],
  },
  "Policy Management": {
    title: "Policy Management Guide",
    description:
      "Upload, review, and publish policy documents. Track drafts, AI analysis, and document lifecycle status.",
    buttonLabel: "View Policy Guide",
    Icon: FilePenLine,
    modalDescription: "How to create and manage policies from upload to publish.",
    steps: [
      {
        title: "Upload a document",
        description: "Start with Upload Policy to add a file and capture title, category, and ownership details.",
        tone: "blue",
      },
      {
        title: "Review AI processing",
        description: "Let Hinora summarize and prepare the draft, then refine metadata before publishing.",
        tone: "violet",
      },
      {
        title: "Publish when ready",
        description: "Move completed policies from draft to published so they appear in the library and compliance flows.",
        tone: "emerald",
      },
    ],
  },
  "Policy Assignments": {
    title: "Policy Assignments Guide",
    description:
      "Assign policies to departments, locations, roles, or people, each with due dates and acknowledgement expectations.",
    buttonLabel: "View Assignment Guide",
    Icon: ClipboardCheck,
    modalDescription: "How to roll policies out to the right audience.",
    steps: [
      {
        title: "Choose a policy",
        description: "Select the published policy you want employees to acknowledge or complete.",
        tone: "blue",
      },
      {
        title: "Define the audience",
        description: "Assign by department, location, role, or individual users based on who needs it.",
        tone: "violet",
      },
      {
        title: "Set due dates",
        description: "Give each assignment a deadline so Compliance Center can track progress and overdue work.",
        tone: "emerald",
      },
    ],
  },
  Categories: {
    title: "Category Management Guide",
    description:
      "Create a clear category tree so policies stay organized and easy to find across the library.",
    buttonLabel: "View Category Guide",
    Icon: LayoutGrid,
    modalDescription: "How to structure parent and child categories.",
    steps: [
      {
        title: "Create parent categories",
        description: "Start with high-level groups such as HR, IT, or Risk before adding nested topics.",
        tone: "blue",
      },
      {
        title: "Add subcategories",
        description: "Break large groups into smaller topics so policy browsing stays precise.",
        tone: "violet",
      },
      {
        title: "Link policies",
        description: "Assign categories when uploading or editing policies so filters and reports stay accurate.",
        tone: "emerald",
      },
    ],
  },
  "Compliance Center": {
    title: "Compliance Center Guide",
    description:
      "Monitor acknowledgements, assessments, and notifications so every policy rollout stays on track.",
    buttonLabel: "View Compliance Guide",
    Icon: BadgeCheck,
    modalDescription: "How to track compliance after policies are assigned.",
    steps: [
      {
        title: "Select a policy",
        description: "Use the policies list to focus on one document and review its compliance status.",
        tone: "blue",
      },
      {
        title: "Review employees",
        description: "Check who is pending, completed, or overdue, then follow up from the employee views.",
        tone: "violet",
      },
      {
        title: "Use notifications",
        description: "Send reminders and review activity so outstanding acknowledgements do not stall.",
        tone: "emerald",
      },
    ],
  },
  "Assessment Builder": {
    title: "Assessment Builder Guide",
    description:
      "Create quizzes and knowledge checks for policies so employees can prove understanding before acknowledgement.",
    buttonLabel: "View Assessment Guide",
    Icon: SquarePen,
    modalDescription: "How to build and attach assessments to policies.",
    steps: [
      {
        title: "Pick a policy",
        description: "Choose the published policy the assessment should cover before writing questions.",
        tone: "blue",
      },
      {
        title: "Add questions",
        description: "Create questions manually or generate drafts with AI, then refine the answer set.",
        tone: "violet",
      },
      {
        title: "Configure and save",
        description: "Set pass marks, attempts, and related settings, then save the assessment for rollout.",
        tone: "emerald",
      },
    ],
  },
  Reports: {
    title: "Reports Guide",
    description:
      "Generate compliance and acknowledgement reports across policies, departments, and locations for review.",
    buttonLabel: "View Reports Guide",
    Icon: ChartColumn,
    modalDescription: "How to prepare reporting views for leadership and auditors.",
    steps: [
      {
        title: "Choose a report scope",
        description: "Filter by policy, department, location, or time range before exporting results.",
        tone: "blue",
      },
      {
        title: "Review metrics",
        description: "Check completion, overdue, and assessment outcomes to spot risk areas early.",
        tone: "violet",
      },
      {
        title: "Export for stakeholders",
        description: "Download or share the report for audits, leadership reviews, and compliance follow-up.",
        tone: "emerald",
      },
    ],
  },
  Users: {
    title: "User Management Guide",
    description:
      "Create, manage and organize system users. Assign roles and permissions to control access to policies and features.",
    buttonLabel: "View User Guide",
    Icon: UserPlus,
    modalDescription: "Quick reference for creating, updating, and controlling user access.",
    steps: [
      {
        title: "Create users",
        description:
          "Use Add New User to create individual accounts with a department, role, title, status, and temporary password.",
        tone: "blue",
      },
      {
        title: "Import users",
        description:
          "Use Import Users for bulk creation through CSV, including email, username, department, role, and password fields.",
        tone: "violet",
      },
      {
        title: "Manage access",
        description:
          "Use the action icons to view details, edit user data, reset passwords, and lock or unlock accounts.",
        tone: "emerald",
      },
    ],
  },
  Departments: {
    title: "Department Management Guide",
    description:
      "Organize your company structure into departments so users, policies, and compliance can be scoped correctly.",
    buttonLabel: "View Department Guide",
    Icon: Network,
    modalDescription: "How to configure departments for people and policy assignment.",
    steps: [
      {
        title: "Add a department",
        description: "Create each department with a name, code, status, and optional department head.",
        tone: "blue",
      },
      {
        title: "Set location scope",
        description: "Choose organization-wide coverage or a specific location when the department is site-based.",
        tone: "violet",
      },
      {
        title: "Connect people and policies",
        description: "Assign users to departments and use those groups when rolling out policy assignments.",
        tone: "emerald",
      },
    ],
  },
  Location: {
    title: "Location Management Guide",
    description:
      "Manage physical offices and sites so users and policy assignments can be organized by location.",
    buttonLabel: "View Location Guide",
    Icon: Building2,
    modalDescription: "How to configure locations used across departments and assignments.",
    steps: [
      {
        title: "Add a location",
        description: "Create each office or site with a name, code, address, and optional location manager.",
        tone: "blue",
      },
      {
        title: "Capture contact details",
        description: "Add email and phone so teams know how to reach the location operations contact.",
        tone: "violet",
      },
      {
        title: "Use locations in scoping",
        description: "Select locations in department settings and future assignment flows to target the right sites.",
        tone: "emerald",
      },
    ],
  },
  "Roles & Permissions": {
    title: "Roles & Permissions Guide",
    description:
      "Design system and custom roles, then grant module access so every user sees only what they need.",
    buttonLabel: "View Roles Guide",
    Icon: UserLock,
    modalDescription: "How to configure role-based access across Hinora.",
    steps: [
      {
        title: "Review system roles",
        description: "Start with built-in roles to understand the default permission baseline.",
        tone: "blue",
      },
      {
        title: "Create custom roles",
        description: "Add tailored roles when a team needs a permission set that does not match the defaults.",
        tone: "violet",
      },
      {
        title: "Grant module access",
        description: "Toggle view and action rights per module, then assign the role to users in User Management.",
        tone: "emerald",
      },
    ],
  },
  "Audit Logs": {
    title: "Audit Logs Guide",
    description:
      "Review system activity for policy changes, user updates, and compliance actions during audits and investigations.",
    buttonLabel: "View Audit Guide",
    Icon: ScrollText,
    modalDescription: "How to use audit history for accountability and investigations.",
    steps: [
      {
        title: "Filter the timeline",
        description: "Narrow events by user, module, action type, or date range to find the record you need.",
        tone: "blue",
      },
      {
        title: "Inspect event details",
        description: "Open an entry to see who performed the action, when it happened, and what changed.",
        tone: "violet",
      },
      {
        title: "Export for review",
        description: "Download relevant activity when auditors or compliance officers request evidence.",
        tone: "emerald",
      },
    ],
  },
  "My Compliance": {
    title: "My Compliance Guide",
    description:
      "Track your assigned policies, complete acknowledgements and assessments, and keep your compliance score up to date.",
    buttonLabel: "View Compliance Guide",
    Icon: Shield,
    modalDescription: "How to use My Compliance to finish assigned work and monitor your progress.",
    steps: [
      {
        title: "Review your overview",
        description: "Start on Overview to see your score, upcoming deadlines, and a summary of open work.",
        tone: "blue",
      },
      {
        title: "Complete assigned tasks",
        description: "Use My Tasks, Assessments, and Acknowledgements to finish each policy assigned to you.",
        tone: "violet",
      },
      {
        title: "Keep certificates handy",
        description: "Passed assessments appear under Certificates so you can show completed compliance later.",
        tone: "emerald",
      },
    ],
  },
  Bookmarks: {
    title: "Bookmarks Guide",
    description:
      "Save policies you refer to often, organize them into collections, and open them again without searching the library.",
    buttonLabel: "View Bookmarks Guide",
    Icon: Bookmark,
    modalDescription: "How to save and organize policies for quick access.",
    steps: [
      {
        title: "Save a policy",
        description: "Use Add Bookmark in the policy reader so the document appears on this page.",
        tone: "blue",
      },
      {
        title: "Filter and switch views",
        description: "Search, filter by type or collection, and toggle grid or list to find a saved policy quickly.",
        tone: "violet",
      },
      {
        title: "Organize collections",
        description: "Group bookmarks into folders like Security or Compliance, then move or remove items as needed.",
        tone: "emerald",
      },
    ],
  },
  Notifications: {
    title: "Notification Center Guide",
    description:
      "Review assignments, compliance reminders, and system updates. Mark items as read or open the related policy.",
    buttonLabel: "View Notifications Guide",
    Icon: Bell,
    modalDescription: "How to work through alerts in Notification Center.",
    steps: [
      {
        title: "Scan your inbox",
        description: "Use tabs and filters to focus on unread items, assignments, compliance, or system updates.",
        tone: "blue",
      },
      {
        title: "Open the details",
        description: "Select a notification to see the message, due date, and the steps you need to complete.",
        tone: "violet",
      },
      {
        title: "Take action",
        description: "Mark items as read, delete them, or jump to the related policy.",
        tone: "emerald",
      },
    ],
  },
  Profile: {
    title: "Profile Guide",
    description:
      "Keep your personal details, role information, and account preferences up to date.",
    buttonLabel: "View Profile Guide",
    Icon: UserRound,
    modalDescription: "How to manage your own account profile in Hinora.",
    steps: [
      {
        title: "Review your details",
        description: "Confirm your name, role, department, and location information are accurate.",
        tone: "blue",
      },
      {
        title: "Update preferences",
        description: "Adjust profile settings that affect how you use notifications and account options.",
        tone: "violet",
      },
      {
        title: "Secure your account",
        description: "Change passwords through the approved flow and keep access limited to your own credentials.",
        tone: "emerald",
      },
    ],
  },
  Settings: {
    title: "Settings Guide",
    description:
      "Configure organization-level preferences that shape how Hinora behaves across teams and modules.",
    buttonLabel: "View Settings Guide",
    Icon: Settings,
    modalDescription: "How to approach organization settings safely.",
    steps: [
      {
        title: "Review organization defaults",
        description: "Check branding, address, locale, and baseline preferences before making changes. The address is used on printed reports.",
        tone: "blue",
      },
      {
        title: "Adjust module behavior",
        description: "Update settings that affect notifications, acknowledgements, and workflow defaults.",
        tone: "violet",
      },
      {
        title: "Save carefully",
        description: "Confirm changes with stakeholders when settings affect company-wide compliance processes.",
        tone: "amber",
      },
    ],
  },
};

function GuideModal({
  guide,
  onClose,
}: {
  guide: ModuleGuideContent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-2xl rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
              <guide.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{guide.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{guide.modalDescription}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {guide.steps.map((step) => (
            <div
              key={step.title}
              className={`rounded-2xl border p-4 ${toneClasses[step.tone ?? "blue"]}`}
            >
              <div className="text-sm font-bold">{step.title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ModuleGuideProps = {
  guideKey: keyof typeof moduleGuides | string;
  showFooter?: boolean;
  className?: string;
  children?: ReactNode;
};

export function ModuleGuide({ guideKey, showFooter = true, className }: ModuleGuideProps) {
  const [open, setOpen] = useState(false);
  const guide = moduleGuides[guideKey];

  if (!guide) {
    return null;
  }

  const Icon = guide.Icon;

  return (
    <>
      <div className={className ?? "mt-4"}>
        <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-active-menu)] to-[var(--color-hover)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{guide.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{guide.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 text-sm font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-100"
            >
              <BookOpenText className="h-4 w-4" />
              <span>{guide.buttonLabel}</span>
            </button>
          </div>
        </div>

        {showFooter ? (
          <footer className="flex flex-col gap-2 px-1 pt-5 text-[0.82rem] text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>© 2026 Hinora. All rights reserved.</span>
            <span>Hinora AI Policy Library &amp; Knowledge Management System</span>
          </footer>
        ) : null}
      </div>

      {open ? <GuideModal guide={guide} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function PageFooter() {
  return (
    <footer className="flex flex-col gap-2 px-1 pt-5 text-[0.82rem] text-slate-400 md:flex-row md:items-center md:justify-between">
      <span>© 2026 Hinora. All rights reserved.</span>
      <span>Hinora AI Policy Library &amp; Knowledge Management System</span>
    </footer>
  );
}
