"use client";

import { useEffect, useId, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CloudUpload,
  Crosshair,
  Eye,
  FileText,
  Hash,
  Info,
  Languages,
  Layers,
  Link2,
  ListChecks,
  ListTree,
  MessageCircle,
  NotebookPen,
  Plus,
  Save,
  Scale,
  ScanText,
  Send,
  Sparkles,
  Tag,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
const DESCRIPTION_MAX = 500;

export type WizardCategoryOption = {
  id: string;
  name: string;
  code: string;
};

export type ExtractedPolicyPreview = {
  title: string;
  version: string;
  department: string;
  effectiveDate: string;
  reviewDate: string;
  pages: string;
  language: string;
  keywords: string[];
};

export type PolicyInformationForm = {
  title: string;
  description: string;
  version: string;
  pages: string;
  categoryId: string;
  department: string;
  type: "POLICY" | "GUIDELINE" | "PROCEDURE";
  status: "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
  effectiveDate: string;
  reviewDate: string;
  tags: string[];
  owner: string;
  regulatoryReferences: string;
  relatedPolicies: string;
  audience: string;
  internalNotes: string;
};

export type AiProcessingOptions = {
  generateSummary: boolean;
  extractKeywords: boolean;
  generateHighlights: boolean;
  enableAiChat: boolean;
  generateAssessmentQuestions: boolean;
  enableOcr: boolean;
};

const DEFAULT_AI_OPTIONS: AiProcessingOptions = {
  generateSummary: true,
  extractKeywords: true,
  generateHighlights: true,
  enableAiChat: true,
  generateAssessmentQuestions: true,
  enableOcr: true,
};

type AiOptionKey = keyof AiProcessingOptions;

type AiOptionConfig = {
  key: AiOptionKey;
  title: string;
  description: string;
  Icon: LucideIcon;
  iconClassName: string;
  badge?: "recommended" | "optional";
};

const UPLOAD_STEPS = [
  { id: 1, label: "Upload Document", hint: "Upload your file" },
  { id: 2, label: "Policy Information", hint: "Review & edit details" },
  { id: 3, label: "AI Processing", hint: "Configure AI options" },
  { id: 4, label: "Review & Publish", hint: "Confirm & publish" },
] as const;

const DEFAULT_DEPARTMENTS = [
  "Information Technology",
  "Human Resources",
  "Finance",
  "Compliance",
  "Operations",
  "Legal",
  "Risk Management",
  "General",
];

const AI_OPTION_CONFIG: AiOptionConfig[] = [
  {
    key: "generateSummary",
    title: "Generate AI Summary",
    description: "Create a concise summary of the policy content.",
    Icon: ListChecks,
    iconClassName: "bg-emerald-50 text-[var(--color-success)]",
    badge: "recommended",
  },
  {
    key: "extractKeywords",
    title: "Extract Keywords & Tags",
    description: "Identify key topics, terms, and tags for better searchability.",
    Icon: Tag,
    iconClassName: "bg-violet-50 text-[var(--color-ai-accent)]",
    badge: "recommended",
  },
  {
    key: "generateHighlights",
    title: "Generate Key Highlights",
    description: "Extract important points and key takeaways.",
    Icon: ListTree,
    iconClassName: "bg-amber-50 text-[var(--color-warning)]",
  },
  {
    key: "enableAiChat",
    title: "Enable AI Chat (Policy Q&A)",
    description: "Allow users to ask questions about this policy.",
    Icon: MessageCircle,
    iconClassName: "bg-cyan-50 text-cyan-600",
    badge: "recommended",
  },
  {
    key: "generateAssessmentQuestions",
    title: "Generate Assessment Questions",
    description: "Create assessment questions based on the policy content.",
    Icon: Crosshair,
    iconClassName: "bg-rose-50 text-rose-500",
    badge: "optional",
  },
  {
    key: "enableOcr",
    title: "Enable OCR (Scanned Documents)",
    description: "Extract text from scanned images to make content searchable.",
    Icon: ScanText,
    iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
  },
];

export type UploadWizardSubmitPayload = {
  file: File;
  form: PolicyInformationForm;
  aiOptions: AiProcessingOptions;
};

type UploadPolicyWizardProps = {
  open: boolean;
  onClose: () => void;
  categories?: WizardCategoryOption[];
  departmentOptions?: string[];
  onSaveDraft?: (payload: UploadWizardSubmitPayload) => void | Promise<void>;
  onPublish?: (payload: UploadWizardSubmitPayload) => void | Promise<void>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDisplayDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatPolicyType(type: PolicyInformationForm["type"]) {
  if (type === "GUIDELINE") return "Guideline";
  if (type === "PROCEDURE") return "Procedure";
  return "Policy";
}

function formatPolicyStatus(status: PolicyInformationForm["status"]) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultDescription(title: string) {
  return `This policy establishes the rules, guidelines, and responsibilities for ${title.toLowerCase()}, helping teams stay aligned on expected controls and compliance behavior.`;
}

/** Lightweight client-side preview until real extraction lands later. */
function buildExtractedPreview(file: File): ExtractedPolicyPreview {
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const versionMatch = baseName.match(/\bv?(\d+(?:\.\d+)*)\b/i);
  const version = versionMatch?.[1] ?? "1.0";
  const title =
    baseName
      .replace(/\bv?\d+(?:\.\d+)*\b/gi, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled Policy";

  const effective = new Date();
  const review = new Date(effective);
  review.setFullYear(review.getFullYear() + 1);

  return {
    title,
    version,
    department: "Information Technology",
    effectiveDate: toDateInputValue(effective),
    reviewDate: toDateInputValue(review),
    pages: "",
    language: "English",
    keywords: ["Security", "Access Control", "Data Protection", "MFA", "Confidentiality"],
  };
}

function buildFormFromExtracted(
  extracted: ExtractedPolicyPreview,
  categories: WizardCategoryOption[],
): PolicyInformationForm {
  const matchedCategory =
    categories.find((category) =>
      category.name.toLowerCase().includes("security"),
    ) ??
    categories[0] ??
    null;

  return {
    title: extracted.title,
    description: buildDefaultDescription(extracted.title).slice(0, DESCRIPTION_MAX),
    version: extracted.version,
    pages: extracted.pages === "—" ? "" : extracted.pages,
    categoryId: matchedCategory?.id ?? "",
    department: extracted.department,
    type: "POLICY",
    status: "DRAFT",
    effectiveDate: extracted.effectiveDate,
    reviewDate: extracted.reviewDate,
    tags: [...extracted.keywords],
    owner: "",
    regulatoryReferences: "",
    relatedPolicies: "",
    audience: "All Employees",
    internalNotes: "",
  };
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {children}
      {required ? <span className="text-[var(--color-error)]"> *</span> : null}
    </label>
  );
}

function TextInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100",
        props.className,
      )}
    />
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid gap-4 border-b border-slate-200 px-5 py-4 sm:grid-cols-4 sm:gap-0">
      {UPLOAD_STEPS.map((step, index) => {
        const active = currentStep === step.id;
        const complete = currentStep > step.id;
        const connectorActive = currentStep > step.id;

        return (
          <li
            key={step.id}
            className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:px-2 sm:text-center"
          >
            {index < UPLOAD_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cx(
                  "pointer-events-none absolute left-[calc(50%+22px)] top-4 hidden h-px w-[calc(100%-44px)] sm:block",
                  connectorActive ? "bg-[var(--color-active-menu)]" : "bg-slate-200",
                )}
              />
            ) : null}

            <span
              className={cx(
                "relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                active || complete
                  ? "bg-[var(--color-active-menu)] text-white"
                  : "border border-slate-300 bg-white text-slate-400",
              )}
            >
              {complete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.id}
            </span>

            <div className="min-w-0 pt-0.5 sm:pt-2">
              <div
                className={cx(
                  "text-sm font-bold leading-tight",
                  active ? "text-[var(--color-active-menu)]" : "text-slate-700",
                )}
              >
                {step.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{step.hint}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PreviewField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function estimateProcessingTime(options: AiProcessingOptions, pageCount: number) {
  const enabledCount = Object.values(options).filter(Boolean).length;
  if (enabledCount === 0) {
    return "~ 5–10 seconds";
  }

  const pages = Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 20;
  const low = Math.max(20, Math.round(15 + enabledCount * 4 + pages * 0.4));
  const high = Math.max(low + 15, Math.round(low * 1.6));
  return `~ ${low}–${high} seconds`;
}

function AiProcessingStep({
  options,
  language,
  pages,
  onToggle,
}: {
  options: AiProcessingOptions;
  language: string;
  pages: string;
  onToggle: (key: AiOptionKey) => void;
}) {
  const pageCount = Number.parseInt(pages, 10);
  const pageLabel =
    Number.isFinite(pageCount) && pageCount > 0
      ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
      : "Not specified";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[var(--color-ai-accent)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Processing Options</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose which AI features you want to generate for this policy.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
          <p>
            AI will analyze your document and generate helpful content to enhance discoverability
            and understanding.
          </p>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {AI_OPTION_CONFIG.map((option) => {
            const checked = options[option.key];
            const OptionIcon = option.Icon;

            return (
              <label
                key={option.key}
                className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50/80"
              >
                <span
                  className={cx(
                    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    option.iconClassName,
                  )}
                >
                  <OptionIcon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{option.title}</span>
                    {option.badge === "recommended" ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-success)]">
                        Recommended
                      </span>
                    ) : null}
                    {option.badge === "optional" ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-warning)]">
                        Optional
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                </div>

                <span className="relative mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option.key)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "inline-flex h-5 w-5 items-center justify-center rounded-md border transition",
                      checked
                        ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)] text-white"
                        : "border-slate-300 bg-white text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[var(--color-active-menu)]" />
          <h3 className="text-sm font-bold text-slate-900">Processing Information</h3>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
          <div className="sm:px-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Estimated Time
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">
              {estimateProcessingTime(options, pageCount)}
            </div>
          </div>
          <div className="sm:px-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Content Language
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">{language || "English"}</div>
          </div>
          <div className="sm:px-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Document Pages
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">{pageLabel}</div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
          <p>
            You can modify or regenerate any AI-generated content later from the policy details
            page.
          </p>
        </div>
      </section>
    </div>
  );
}

function PolicyInformationStep({
  form,
  categories,
  departments,
  additionalOpen,
  newTag,
  onFormChange,
  onToggleAdditional,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
}: {
  form: PolicyInformationForm;
  categories: WizardCategoryOption[];
  departments: string[];
  additionalOpen: boolean;
  newTag: string;
  onFormChange: <K extends keyof PolicyInformationForm>(
    key: K,
    value: PolicyInformationForm[K],
  ) => void;
  onToggleAdditional: () => void;
  onNewTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Policy Information</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review the extracted information below and make any necessary changes.
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
        <p>
          We&apos;ve extracted the details below from your document using AI. Please review and
          update if needed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel required>Policy Title</FieldLabel>
          <TextInput
            value={form.title}
            onChange={(event) => onFormChange("title", event.target.value)}
            placeholder="e.g. Information Security Policy"
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel required>Description</FieldLabel>
          <textarea
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            onChange={(event) => onFormChange("description", event.target.value)}
            rows={4}
            placeholder="Summarize what this policy covers."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-1 text-right text-xs text-slate-400">
            {form.description.length}/{DESCRIPTION_MAX}
          </div>
        </div>

        <div>
          <FieldLabel>Version</FieldLabel>
          <TextInput
            value={form.version}
            onChange={(event) => onFormChange("version", event.target.value)}
            placeholder="e.g. 2.3"
          />
        </div>

        <div>
          <FieldLabel>Pages</FieldLabel>
          <TextInput
            value={form.pages}
            onChange={(event) => onFormChange("pages", event.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 38"
            inputMode="numeric"
          />
        </div>

        <div>
          <FieldLabel required>Category</FieldLabel>
          <DropdownSelect
            value={form.categoryId}
            onChange={(value) => onFormChange("categoryId", value)}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            placeholder="Select category"
            className="mt-2"
            aria-label="Category"
          />
        </div>

        <div>
          <FieldLabel required>Department</FieldLabel>
          <DropdownSelect
            value={form.department}
            onChange={(value) => onFormChange("department", value)}
            options={departments.map((department) => ({
              value: department,
              label: department,
            }))}
            placeholder="Select department"
            className="mt-2"
            aria-label="Department"
          />
        </div>

        <div>
          <FieldLabel required>Policy Type</FieldLabel>
          <DropdownSelect
            value={form.type}
            onChange={(value) => {
              if (value) onFormChange("type", value);
            }}
            options={[
              { value: "POLICY", label: "Policy" },
              { value: "GUIDELINE", label: "Guideline" },
              { value: "PROCEDURE", label: "Procedure" },
            ]}
            allowClear={false}
            className="mt-2"
            aria-label="Policy Type"
          />
        </div>

        <div>
          <FieldLabel required>Status</FieldLabel>
          <DropdownSelect
            value={form.status}
            onChange={(value) => {
              if (value) onFormChange("status", value);
            }}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "UNDER_REVIEW", label: "Under Review" },
              { value: "PUBLISHED", label: "Published" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
            allowClear={false}
            className="mt-2"
            aria-label="Status"
          />
        </div>

        <div>
          <FieldLabel>Effective Date</FieldLabel>
          <div className="relative mt-2">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(event) => onFormChange("effectiveDate", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Review Date</FieldLabel>
          <div className="relative mt-2">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={form.reviewDate}
              onChange={(event) => onFormChange("reviewDate", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[var(--color-active-menu)]" />
          <span className="text-xs font-bold text-slate-600">Tags / Keywords (AI Extracted)</span>
          <Info className="h-3.5 w-3.5 text-slate-400" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[var(--color-active-menu)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="rounded-full p-0.5 transition hover:bg-blue-100"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1.5">
            <input
              value={newTag}
              onChange={(event) => onNewTagChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddTag();
                }
              }}
              placeholder="New tag"
              className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)]"
            />
            <button
              type="button"
              onClick={onAddTag}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[var(--color-active-menu)] hover:text-[var(--color-active-menu)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add tag
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={onToggleAdditional}
          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3.5 text-left transition hover:bg-slate-100/80"
          aria-expanded={additionalOpen}
        >
          <div>
            <div className="text-sm font-bold text-slate-800">Additional Information (Optional)</div>
            <div className="mt-0.5 text-xs text-slate-500">
              Add ownership, compliance references, related policies, and internal notes.
            </div>
          </div>
          <ChevronDown
            className={cx(
              "h-4 w-4 shrink-0 text-slate-400 transition",
              additionalOpen && "rotate-180",
            )}
          />
        </button>

        {additionalOpen ? (
          <div className="grid gap-4 border-t border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Policy Owner</FieldLabel>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.owner}
                  onChange={(event) => onFormChange("owner", event.target.value)}
                  placeholder="e.g. Jane Reyes, CISO"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Audience / Applies To</FieldLabel>
              <div className="relative mt-2">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.audience}
                  onChange={(event) => onFormChange("audience", event.target.value)}
                  placeholder="e.g. All Employees, Managers, Contractors"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Regulatory / Compliance References</FieldLabel>
              <div className="relative mt-2">
                <Scale className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  value={form.regulatoryReferences}
                  onChange={(event) => onFormChange("regulatoryReferences", event.target.value)}
                  rows={2}
                  placeholder="e.g. ISO 27001, GDPR, BSP Circular, SOC 2"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Related Policies</FieldLabel>
              <div className="relative mt-2">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.relatedPolicies}
                  onChange={(event) => onFormChange("relatedPolicies", event.target.value)}
                  placeholder="e.g. Acceptable Use Policy, Data Retention Policy"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Internal Notes</FieldLabel>
              <div className="relative mt-2">
                <NotebookPen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  value={form.internalNotes}
                  onChange={(event) => onFormChange("internalNotes", event.target.value)}
                  rows={3}
                  placeholder="Add reviewer notes, rollout reminders, or anything the publishing team should know."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-active-menu)] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function buildAiPreviewItems(
  form: PolicyInformationForm,
  aiOptions: AiProcessingOptions,
) {
  const pageCount = Number.parseInt(form.pages, 10);
  const pagesLabel =
    Number.isFinite(pageCount) && pageCount > 0 ? `${pageCount}` : "your";
  const highlightCount = Math.max(4, Math.min(18, form.tags.length * 2 || 8));
  const questionCount = Math.max(5, Math.min(15, Math.round(highlightCount * 0.8)));

  return [
    {
      key: "generateSummary" as const,
      title: "AI Summary",
      detail: form.description.trim()
        ? form.description.trim().slice(0, 72) + (form.description.length > 72 ? "..." : "")
        : "Concise summary will be generated from the policy content.",
      Icon: ListChecks,
      iconClassName: "bg-emerald-50 text-[var(--color-success)]",
    },
    {
      key: "generateHighlights" as const,
      title: "Key Highlights",
      detail: `${highlightCount} key points extracted`,
      Icon: ListTree,
      iconClassName: "bg-amber-50 text-[var(--color-warning)]",
    },
    {
      key: "extractKeywords" as const,
      title: "Keywords & Tags",
      detail: `${Math.max(form.tags.length, 1)} keywords generated`,
      Icon: Tag,
      iconClassName: "bg-violet-50 text-[var(--color-ai-accent)]",
    },
    {
      key: "enableAiChat" as const,
      title: "AI Chat (Q&A)",
      detail: "Enabled",
      Icon: MessageCircle,
      iconClassName: "bg-cyan-50 text-cyan-600",
    },
    {
      key: "generateAssessmentQuestions" as const,
      title: "Assessment Questions",
      detail: `${questionCount} questions generated`,
      Icon: Crosshair,
      iconClassName: "bg-rose-50 text-rose-500",
    },
    {
      key: "enableOcr" as const,
      title: "OCR",
      detail: `Text extracted from ${pagesLabel} pages`,
      Icon: ScanText,
      iconClassName: "bg-blue-50 text-[var(--color-active-menu)]",
    },
  ].map((item) => ({
    ...item,
    enabled: aiOptions[item.key],
  }));
}

function ReviewPublishStep({
  form,
  file,
  categoryName,
  aiOptions,
  showPreview,
  showAssignmentNote,
  onTogglePreview,
  onConfigureAssignment,
}: {
  form: PolicyInformationForm;
  file: File;
  categoryName: string;
  aiOptions: AiProcessingOptions;
  showPreview: boolean;
  showAssignmentNote: boolean;
  onTogglePreview: () => void;
  onConfigureAssignment: () => void;
}) {
  const aiItems = buildAiPreviewItems(form, aiOptions);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
            <Eye className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Review & Publish</h3>
            <p className="mt-1 text-sm text-slate-500">
              Review all details before publishing your policy.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onTogglePreview}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" />
          <span>{showPreview ? "Hide Preview" : "Preview Policy"}</span>
        </button>
      </div>

      {showPreview ? (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-active-menu)]">
            Policy Preview
          </div>
          <h4 className="mt-2 text-lg font-bold text-slate-900">{form.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{form.description}</p>
          {form.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-active-menu)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900">Policy Summary</h4>
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-[var(--color-success)]">
              Ready to Publish
            </span>
          </div>

          <div className="space-y-3.5">
            <SummaryRow icon={FileText} label="Policy Title" value={form.title || "—"} />
            <SummaryRow icon={Hash} label="Version" value={form.version || "—"} />
            <SummaryRow icon={Building2} label="Department" value={form.department || "—"} />
            <SummaryRow icon={Layers} label="Category" value={categoryName || "—"} />
            <SummaryRow icon={FileText} label="Policy Type" value={formatPolicyType(form.type)} />
            <SummaryRow
              icon={Info}
              label="Status"
              value={
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-[var(--color-warning)]">
                  {formatPolicyStatus(form.status)}
                </span>
              }
            />
            <SummaryRow
              icon={CalendarDays}
              label="Effective Date"
              value={formatDisplayDate(form.effectiveDate)}
            />
            <SummaryRow
              icon={CalendarDays}
              label="Review Date"
              value={formatDisplayDate(form.reviewDate)}
            />
            <SummaryRow icon={Layers} label="Pages" value={form.pages || "—"} />
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[var(--color-error)]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                  File
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-800">{file.name}</div>
                <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900">AI Generated Content Preview</h4>
            <button
              type="button"
              onClick={onTogglePreview}
              className="text-sm font-semibold text-[var(--color-active-menu)] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {aiItems.map((item) => {
              const ItemIcon = item.Icon;
              return (
                <div
                  key={item.key}
                  className={cx(
                    "flex items-start gap-3 rounded-xl border px-3 py-2.5",
                    item.enabled
                      ? "border-slate-100 bg-slate-50/60"
                      : "border-slate-100 bg-white opacity-60",
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      item.iconClassName,
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{item.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {item.enabled ? item.detail : "Skipped for this upload"}
                    </div>
                  </div>
                  {item.enabled ? (
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[var(--color-success)]">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">
                      Off
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Assignments (Optional)</h4>
            <p className="mt-1 text-sm text-slate-500">
              Choose who should be assigned or notified about this policy.
            </p>
          </div>
          <button
            type="button"
            onClick={onConfigureAssignment}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" />
            <span>Configure Assignment</span>
          </button>
        </div>
        {showAssignmentNote ? (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
            Assignments can be configured after upload from{" "}
            <span className="font-semibold text-slate-800">Policy Assignments</span>. Publish or
            save this policy first, then assign it to departments, locations, or employees.
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
          <div>
            <div className="text-sm font-bold text-slate-900">What happens next?</div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                <span>The policy will be saved as a draft.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                <span>AI-generated content will be available in the policy details page.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                <span>You can publish now or update more details before publishing.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function UploadPolicyWizard({
  open,
  onClose,
  categories = [],
  departmentOptions = [],
  onSaveDraft,
  onPublish,
}: UploadPolicyWizardProps) {
  const fileInputId = useId();
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPolicyPreview | null>(null);
  const [form, setForm] = useState<PolicyInformationForm | null>(null);
  const [aiOptions, setAiOptions] = useState<AiProcessingOptions>(DEFAULT_AI_OPTIONS);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPolicyPreview, setShowPolicyPreview] = useState(false);
  const [showAssignmentNote, setShowAssignmentNote] = useState(false);

  const departments = Array.from(
    new Set(
      [...DEFAULT_DEPARTMENTS, ...departmentOptions, form?.department ?? ""].filter(Boolean),
    ),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setSelectedFile(null);
    setExtracted(null);
    setForm(null);
    setAiOptions(DEFAULT_AI_OPTIONS);
    setIsDragging(false);
    setLocalError("");
    setAdditionalOpen(false);
    setNewTag("");
    setIsSavingDraft(false);
    setIsPublishing(false);
    setShowPolicyPreview(false);
    setShowAssignmentNote(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function updateForm<K extends keyof PolicyInformationForm>(
    key: K,
    value: PolicyInformationForm[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function assignFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      setExtracted(null);
      setForm(null);
      setLocalError("");
      return;
    }

    if (!isAcceptedFile(file)) {
      setLocalError("Unsupported format. Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setLocalError("File is too large. Maximum size is 100MB.");
      return;
    }

    const preview = buildExtractedPreview(file);
    setLocalError("");
    setSelectedFile(file);
    setExtracted(preview);
    setForm(buildFormFromExtracted(preview, categories));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    assignFile(event.dataTransfer.files?.[0] ?? null);
  }

  function validateStep2() {
    if (!form) {
      return "Please complete the policy information.";
    }
    if (!form.title.trim()) return "Policy title is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.categoryId) return "Category is required.";
    if (!form.department.trim()) return "Department is required.";
    if (!form.type) return "Policy type is required.";
    if (!form.status) return "Status is required.";
    return "";
  }

  function handleNext() {
    if (step === 1 && !selectedFile) {
      setLocalError("Please upload a policy file to continue.");
      return;
    }

    if (step === 2) {
      const error = validateStep2();
      if (error) {
        setLocalError(error);
        return;
      }
    }

    setLocalError("");
    setStep((current) => Math.min(4, current + 1));
  }

  function handleBack() {
    setLocalError("");
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSaveDraft() {
    if (!selectedFile || !form) {
      setLocalError("Please upload a file and complete the required fields first.");
      return;
    }

    const error = validateStep2();
    if (error) {
      setLocalError(error);
      return;
    }

    setIsSavingDraft(true);
    setLocalError("");

    try {
      await onSaveDraft?.({
        file: selectedFile,
        form: { ...form, status: "DRAFT" },
        aiOptions,
      });
      onClose();
    } catch (saveError) {
      setLocalError(
        saveError instanceof Error ? saveError.message : "Unable to save draft.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handlePublish() {
    if (!selectedFile || !form) {
      setLocalError("Please upload a file and complete the required fields first.");
      return;
    }

    const error = validateStep2();
    if (error) {
      setLocalError(error);
      return;
    }

    setIsPublishing(true);
    setLocalError("");

    try {
      await onPublish?.({
        file: selectedFile,
        form: { ...form, status: "PUBLISHED" },
        aiOptions,
      });
      onClose();
    } catch (publishError) {
      setLocalError(
        publishError instanceof Error ? publishError.message : "Unable to publish policy.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  function handleAddTag() {
    const next = newTag.trim();
    if (!next || !form) return;
    if (form.tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setNewTag("");
      return;
    }
    updateForm("tags", [...form.tags, next]);
    setNewTag("");
  }

  const nextLabel =
    step === 1
      ? "Next: Policy Information"
      : step === 2
        ? "Next: AI Processing"
        : "Next: Review & Publish";

  const showStep2Actions = step >= 2;
  const categoryName =
    categories.find((category) => category.id === form?.categoryId)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-policy-title"
        className="flex max-h-[min(92vh,920px)] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="upload-policy-title" className="text-lg font-bold text-slate-900">
                Upload Policy
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a new policy document and configure its details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Stepper currentStep={step} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <label
                htmlFor={fileInputId}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={cx(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                  isDragging
                    ? "border-[var(--color-active-menu)] bg-blue-50/70"
                    : "border-blue-200 bg-slate-50/60 hover:border-[var(--color-active-menu)] hover:bg-blue-50/40",
                )}
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
                  <CloudUpload className="h-7 w-7" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Drag and drop your policy file here or
                </p>
                <span className="mt-3 inline-flex h-10 items-center rounded-xl border border-[var(--color-active-menu)] bg-white px-4 text-sm font-bold text-[var(--color-active-menu)] shadow-sm">
                  Browse Files
                </span>
                <p className="mt-3 text-xs text-slate-400">
                  Supported formats: PDF, DOC, DOCX • Max file size: 100MB
                </p>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(event) => {
                    assignFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>

              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[var(--color-error)]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{selectedFile.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{formatFileSize(selectedFile.size)}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-success)]">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => assignFile(null)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {selectedFile && extracted ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">Extracted Information (AI Preview)</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      We&apos;ve extracted the following details from your document.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <PreviewField icon={FileText} label="Title" value={extracted.title} />
                    <PreviewField icon={CalendarDays} label="Review Date" value={extracted.reviewDate} />
                    <PreviewField icon={Hash} label="Version" value={extracted.version} />
                    <PreviewField icon={Layers} label="Pages" value={extracted.pages || "—"} />
                    <PreviewField icon={Building2} label="Department" value={extracted.department} />
                    <PreviewField icon={Languages} label="Language" value={extracted.language} />
                    <PreviewField
                      icon={CalendarDays}
                      label="Effective Date"
                      value={extracted.effectiveDate}
                    />
                    <PreviewField
                      icon={Tag}
                      label="Keywords (AI)"
                      value={extracted.keywords.join(", ")}
                    />
                  </div>
                </section>
              ) : null}

              {selectedFile ? (
                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                  <p>
                    Please review the extracted information in the next step and make any necessary
                    changes.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 && form ? (
            <PolicyInformationStep
              form={form}
              categories={categories}
              departments={departments}
              additionalOpen={additionalOpen}
              newTag={newTag}
              onFormChange={updateForm}
              onToggleAdditional={() => setAdditionalOpen((current) => !current)}
              onNewTagChange={setNewTag}
              onAddTag={handleAddTag}
              onRemoveTag={(tag) =>
                updateForm(
                  "tags",
                  form.tags.filter((item) => item !== tag),
                )
              }
            />
          ) : null}

          {step === 3 ? (
            <AiProcessingStep
              options={aiOptions}
              language={extracted?.language ?? "English"}
              pages={form?.pages ?? ""}
              onToggle={(key) =>
                setAiOptions((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
            />
          ) : null}

          {step === 4 && form && selectedFile ? (
            <ReviewPublishStep
              form={form}
              file={selectedFile}
              categoryName={categoryName}
              aiOptions={aiOptions}
              showPreview={showPolicyPreview}
              showAssignmentNote={showAssignmentNote}
              onTogglePreview={() => setShowPolicyPreview((current) => !current)}
              onConfigureAssignment={() => setShowAssignmentNote(true)}
            />
          ) : null}

          {localError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
              {localError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {showStep2Actions ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showStep2Actions ? (
              <button
                type="button"
                disabled={isSavingDraft || isPublishing}
                onClick={() => void handleSaveDraft()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingDraft ? "Saving..." : "Save as Draft"}</span>
              </button>
            ) : null}
            {step === 4 ? (
              <button
                type="button"
                disabled={isSavingDraft || isPublishing}
                onClick={() => void handlePublish()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:bg-[var(--color-hover)] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{isPublishing ? "Publishing..." : "Publish Policy"}</span>
                {!isPublishing ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:bg-[var(--color-hover)]"
              >
                <span>{nextLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
