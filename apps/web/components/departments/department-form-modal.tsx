"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  FileStack,
  Globe2,
  Info,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  LOCATION_OPTIONS,
  getLocationScopeHelp,
  ORGANIZATION_WIDE_SCOPE,
} from "./location-options";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const DESCRIPTION_MAX = 500;

export type DepartmentFormStatus = "Active" | "Inactive";

export type DepartmentHeadOption = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string;
  initials: string;
};

export type DepartmentFormValues = {
  name: string;
  status: DepartmentFormStatus;
  code: string;
  establishedDate: string;
  description: string;
  displayOrder: string;
  headUserId: string;
  parentDepartmentId: string;
  locationScope: string;
  costCenter: string;
  autoAssignMandatory: boolean;
  enableNotifications: boolean;
  inheritAssignments: boolean;
};

export type ParentDepartmentOption = {
  id: string;
  name: string;
};

type UserApiRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  jobTitle: string | null;
  status: string;
};

type UsersListResponse = {
  data: UserApiRecord[];
};

type DepartmentFormModalProps = {
  mode: "create" | "edit";
  initialValues?: Partial<DepartmentFormValues>;
  initialHead?: DepartmentHeadOption | null;
  parentDepartments: ParentDepartmentOption[];
  onClose: () => void;
  onSubmit: (values: DepartmentFormValues, head: DepartmentHeadOption | null) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toHeadOption(user: UserApiRecord): DepartmentHeadOption {
  return {
    id: user.id,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    jobTitle: user.jobTitle,
    department: user.department,
    initials: getInitials(user.fullName || `${user.firstName} ${user.lastName}`),
  };
}

export function emptyDepartmentFormValues(): DepartmentFormValues {
  return {
    name: "",
    status: "Active",
    code: "",
    establishedDate: "",
    description: "",
    displayOrder: "1",
    headUserId: "",
    parentDepartmentId: "",
    locationScope: ORGANIZATION_WIDE_SCOPE,
    costCenter: "",
    autoAssignMandatory: true,
    enableNotifications: true,
    inheritAssignments: true,
  };
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {children}
        {required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </span>
      {hint ? <Info className="h-3.5 w-3.5 text-slate-400" /> : null}
    </div>
  );
}

function HelpText({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-500">{children}</p>;
}

function SectionCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-active-menu)] text-xs font-bold text-white">
          {number}
        </span>
        <h4 className="text-base font-bold text-slate-900">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function SettingCard({
  checked,
  onChange,
  icon: Icon,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition",
        checked
          ? "border-[var(--color-active-menu)]/30 bg-blue-50/50"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--color-active-menu)] focus:ring-[var(--color-active-menu)]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <span>{title}</span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
      </div>
    </label>
  );
}

function DepartmentHeadPicker({
  value,
  selectedHead,
  onChange,
}: {
  value: string;
  selectedHead: DepartmentHeadOption | null;
  onChange: (head: DepartmentHeadOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<DepartmentHeadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("pageSize", "50");
        params.set("status", "ACTIVE");
        if (query.trim()) {
          params.set("search", query.trim());
        }

        const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Unable to load users.");
        }

        const payload = (await response.json()) as UsersListResponse;
        setUsers((payload.data ?? []).map(toHeadOption));
      } catch (fetchError) {
        setUsers([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load users.");
      } finally {
        setLoading(false);
      }
    }, query.trim() ? 250 : 0);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          "flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left outline-none transition",
          open
            ? "border-[var(--color-active-menu)] ring-4 ring-blue-100"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        {selectedHead ? (
          <>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {selectedHead.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {selectedHead.fullName}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {selectedHead.jobTitle || selectedHead.department || selectedHead.email}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(null);
                }
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear department head"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-sm text-slate-400">Search employees...</span>
          </>
        )}
        <ChevronDown
          className={cx("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="border-b border-slate-100 p-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, email, or role..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">Loading users...</div>
            ) : error ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--color-error)]">{error}</div>
            ) : users.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No matching active users found.
              </div>
            ) : (
              users.map((user) => {
                const active = user.id === value;
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(user);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cx(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                      active ? "bg-blue-50" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {user.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {user.fullName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {[user.jobTitle, user.department].filter(Boolean).join(" · ") || user.email}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DepartmentFormModal({
  mode,
  initialValues,
  initialHead = null,
  parentDepartments,
  onClose,
  onSubmit,
}: DepartmentFormModalProps) {
  const [values, setValues] = useState<DepartmentFormValues>(() => ({
    ...emptyDepartmentFormValues(),
    ...initialValues,
  }));
  const [selectedHead, setSelectedHead] = useState<DepartmentHeadOption | null>(initialHead);

  const locationOptions = useMemo(
    () => [
      { value: ORGANIZATION_WIDE_SCOPE, label: "Organization-wide" },
      ...LOCATION_OPTIONS.filter((location) => location.status === "Active").map((location) => ({
        value: location.id,
        label: `${location.name} · ${location.city}`,
      })),
    ],
    [],
  );

  const parentOptions = useMemo(
    () => parentDepartments.map((department) => ({ value: department.id, label: department.name })),
    [parentDepartments],
  );

  const canSubmit = Boolean(values.name.trim() && values.code.trim() && values.status);

  function update<K extends keyof DepartmentFormValues>(key: K, value: DepartmentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {mode === "edit" ? "Edit Department" : "Add Department"}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {mode === "edit"
                  ? "Update department information and settings."
                  : "Create a department and configure its organizational settings."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <SectionCard number={1} title="Department Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <FieldLabel required>Department Name</FieldLabel>
                <input
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="e.g. Information Technology"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <FieldLabel required>Status</FieldLabel>
                <DropdownSelect
                  value={values.status}
                  onChange={(value) => update("status", (value || "Active") as DepartmentFormStatus)}
                  options={[
                    {
                      value: "Active",
                      label: "Active",
                      badgeClassName: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      value: "Inactive",
                      label: "Inactive",
                      badgeClassName: "bg-slate-100 text-slate-600",
                    },
                  ]}
                  placeholder="Select status"
                  aria-label="Department status"
                />
                <HelpText>Inactive departments will not be available for new assignments.</HelpText>
              </label>

              <label className="block">
                <FieldLabel required>Department Code</FieldLabel>
                <input
                  value={values.code}
                  onChange={(event) => update("code", event.target.value.toUpperCase())}
                  placeholder="e.g. IT"
                  maxLength={8}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
                <HelpText>Short code used for reports and references (e.g. IT, HR, OPS)</HelpText>
              </label>

              <label className="block">
                <FieldLabel>Established Date</FieldLabel>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={values.establishedDate}
                    onChange={(event) => update("establishedDate", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pl-10 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </label>

              <label className="block sm:col-span-2">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={values.description}
                  maxLength={DESCRIPTION_MAX}
                  onChange={(event) => update("description", event.target.value)}
                  rows={4}
                  placeholder="Describe this department's responsibilities."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
                <div className="mt-1.5 text-xs font-semibold text-slate-400">
                  {values.description.length} / {DESCRIPTION_MAX}
                </div>
              </label>

              <label className="block sm:col-span-2 sm:max-w-[220px]">
                <FieldLabel>Display Order</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={values.displayOrder}
                  onChange={(event) => update("displayOrder", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
                <HelpText>Lower numbers appear first in lists.</HelpText>
              </label>
            </div>
          </SectionCard>

          <SectionCard number={2} title="Organizational Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="block sm:col-span-2">
                <FieldLabel>Department Head</FieldLabel>
                <DepartmentHeadPicker
                  value={values.headUserId}
                  selectedHead={selectedHead}
                  onChange={(head) => {
                    setSelectedHead(head);
                    update("headUserId", head?.id ?? "");
                  }}
                />
                <HelpText>Select the department head or manager.</HelpText>
              </div>

              <label className="block">
                <FieldLabel>Parent Department</FieldLabel>
                <DropdownSelect
                  value={values.parentDepartmentId}
                  onChange={(value) => update("parentDepartmentId", value)}
                  options={parentOptions}
                  placeholder="None"
                  allowClear
                  aria-label="Parent department"
                />
                <HelpText>Select parent department if this is a sub-department.</HelpText>
              </label>

              <label className="block">
                <FieldLabel hint>Location Scope</FieldLabel>
                <DropdownSelect
                  value={values.locationScope}
                  onChange={(value) =>
                    update("locationScope", value || ORGANIZATION_WIDE_SCOPE)
                  }
                  options={locationOptions}
                  placeholder="Organization-wide"
                  leadingIcon={Globe2}
                  aria-label="Location scope"
                />
                <HelpText>{getLocationScopeHelp(values.locationScope)}</HelpText>
              </label>

              <label className="block sm:col-span-2">
                <FieldLabel>Cost Center (Optional)</FieldLabel>
                <input
                  value={values.costCenter}
                  onChange={(event) => update("costCenter", event.target.value)}
                  placeholder="e.g. CC-IT-001"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
                <HelpText>Used for financial tracking and reporting.</HelpText>
              </label>
            </div>
          </SectionCard>

          <SectionCard number={3} title="Default Assignment Settings">
            <div className="grid gap-3 lg:grid-cols-3">
              <SettingCard
                checked={values.autoAssignMandatory}
                onChange={(checked) => update("autoAssignMandatory", checked)}
                icon={FileStack}
                title="Auto-assign mandatory policies"
                description="Automatically assign mandatory policies to users when they join this department."
              />
              <SettingCard
                checked={values.enableNotifications}
                onChange={(checked) => update("enableNotifications", checked)}
                icon={Bell}
                title="Enable compliance notifications"
                description="Send policy assignment and compliance notifications to this department."
              />
              <SettingCard
                checked={values.inheritAssignments}
                onChange={(checked) => update("inheritAssignments", checked)}
                icon={UserPlus}
                title="Inherit assignments for new employees"
                description="New employees will inherit active policy assignments from this department."
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(values, selectedHead)}
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "edit" ? "Save Changes" : "Create Department"}
          </button>
        </div>
      </div>
    </div>
  );
}
