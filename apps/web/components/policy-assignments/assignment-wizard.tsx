"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  Check,
  FileText,
  Globe2,
  Info,
  MapPin,
  Pencil,
  Search,
  Settings,
  Shield,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api-base-url";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  formatAssignmentDate,
  scopeLabelFor,
  toDateInputValue,
  type AssignmentPriority,
  type AssignmentScopeKind,
} from "./policy-assignments-data";

export type { AssignmentPriority };

export type AssignmentWizardValue = {
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  effectiveDate: string;
  scopeKind: AssignmentScopeKind;
  scopeTarget: string;
  userIds: string[];
  recipients: number;
  assignedAt: string;
  dueAt: string;
  notes: string;
  internalNotes: string;
  priority: AssignmentPriority;
};

type PolicyChoice = {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  nextReview: string;
  status: string;
};

type NamedOption = { id: string; name: string };
type UserOption = {
  id: string;
  name: string;
  email: string;
  department: string;
  departmentId: string;
  location: string;
  locationId: string;
  roleTitle: string;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: "Select Policy" },
  { id: 2, label: "Assignment Scope" },
  { id: 3, label: "Assignment Details" },
  { id: 4, label: "Review" },
  { id: 5, label: "Confirm" },
];

const scopeChoices: Array<{
  kind: AssignmentScopeKind;
  title: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    kind: "organization",
    title: "Organization-wide",
    description: "Assign to all active users in the organization.",
    Icon: Globe2,
  },
  {
    kind: "department",
    title: "Department",
    description: "Assign to users under a specific department.",
    Icon: Building2,
  },
  {
    kind: "location",
    title: "Branch",
    description: "Assign to users under a specific branch.",
    Icon: MapPin,
  },
  {
    kind: "role",
    title: "Role",
    description: "Assign to users with a specific role.",
    Icon: Shield,
  },
  {
    kind: "user",
    title: "Specific Users",
    description: "Assign to selected individual users.",
    Icon: User,
  },
];

const priorities: AssignmentPriority[] = ["Low", "Medium", "High"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function addYears(isoDate: string, years: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setFullYear(date.getFullYear() + years);
  return toDateInputValue(date);
}

function formatPolicyStatus(status: string) {
  if (status === "PUBLISHED" || status === "Published") return "Published";
  if (status === "UNDER_REVIEW") return "Under Review";
  if (status === "DRAFT") return "Draft";
  if (status === "ARCHIVED") return "Archived";
  return status;
}

function priorityDot(priority: AssignmentPriority) {
  if (priority === "High") return "bg-red-500";
  if (priority === "Low") return "bg-emerald-500";
  return "bg-amber-500";
}

function emptyDraft(): AssignmentWizardValue {
  const assignedAt = toDateInputValue(new Date());
  const due = new Date();
  due.setDate(due.getDate() + 30);
  return {
    policyId: "",
    policyTitle: "",
    policyVersion: "",
    effectiveDate: "",
    scopeKind: "organization",
    scopeTarget: "",
    userIds: [],
    recipients: 0,
    assignedAt,
    dueAt: toDateInputValue(due),
    notes: "",
    internalNotes: "",
    priority: "Medium",
  };
}

export function AssignmentWizard({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: Partial<AssignmentWizardValue>;
  onClose: () => void;
  onSave: (value: AssignmentWizardValue) => void | Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<AssignmentWizardValue>({ ...emptyDraft(), ...initial });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [policyQuery, setPolicyQuery] = useState("");
  const [policyStatus, setPolicyStatus] = useState("Published");
  const [policies, setPolicies] = useState<PolicyChoice[]>([]);
  const [departments, setDepartments] = useState<NamedOption[]>([]);
  const [locations, setLocations] = useState<NamedOption[]>([]);
  const [roles, setRoles] = useState<NamedOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initial?.userIds ?? []);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) return;

    void Promise.all([
      fetch(`${apiBaseUrl}/policies?pageSize=100`).then((response) => response.json()),
      fetch(`${apiBaseUrl}/departments/options`).then((response) => response.json()),
      fetch(`${apiBaseUrl}/locations/options`).then((response) => response.json()),
      fetch(`${apiBaseUrl}/roles-permissions/roles`).then((response) => response.json()),
      fetch(`${apiBaseUrl}/users?pageSize=200&status=ACTIVE`).then((response) => response.json()),
    ])
      .then(([policyPayload, departmentPayload, locationPayload, rolePayload, userPayload]) => {
        const livePolicies: PolicyChoice[] = Array.isArray(policyPayload?.data)
          ? policyPayload.data.map((item: {
              id?: string;
              title?: string;
              version?: number | string;
              status?: string;
              createdAt?: string;
            }) => {
              const created = item.createdAt ? item.createdAt.slice(0, 10) : toDateInputValue(new Date());
              return {
                id: item.id || crypto.randomUUID(),
                title: item.title?.trim() || "Untitled policy",
                version: typeof item.version === "number" ? `${item.version}.0` : item.version || "1.0",
                effectiveDate: created,
                nextReview: addYears(created, 1),
                status: formatPolicyStatus(item.status || "Published"),
              };
            })
          : [];
        setPolicies(livePolicies);

        if (Array.isArray(departmentPayload?.data)) setDepartments(departmentPayload.data);
        if (Array.isArray(locationPayload?.data)) setLocations(locationPayload.data);

        const roleRows = Array.isArray(rolePayload?.data) ? rolePayload.data : [];
        setRoles(
          roleRows
            .map((role: { id?: string; name?: string }) => ({
              id: role.id || role.name || "",
              name: role.name || "",
            }))
            .filter((role: NamedOption) => role.name),
        );

        if (Array.isArray(userPayload?.data)) {
          setUsers(
            userPayload.data.map((user: {
              id: string;
              fullName?: string;
              firstName?: string;
              lastName?: string;
              email?: string;
              department?: string;
              departmentId?: string;
              location?: string;
              locationId?: string;
              roleTitle?: string;
            }) => ({
              id: user.id,
              name: user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "User",
              email: user.email || "",
              department: user.department || "",
              departmentId: user.departmentId || "",
              location: user.location || "",
              locationId: user.locationId || "",
              roleTitle: user.roleTitle || "",
            })),
          );
        }
      })
      .catch(() => {
        setPolicies([]);
      });
  }, []);

  const selectedPolicy =
    policies.find((policy) => policy.id === draft.policyId) ??
    policies.find((policy) => policy.title === draft.policyTitle && policy.version === draft.policyVersion) ??
    policies.find((policy) => policy.title === draft.policyTitle) ??
    null;

  const filteredPolicies = useMemo(() => {
    const query = policyQuery.trim().toLowerCase();
    return policies.filter((policy) => {
      if (policyStatus && policy.status !== policyStatus) return false;
      if (!query) return true;
      return `${policy.title} ${policy.version}`.toLowerCase().includes(query);
    });
  }, [policies, policyQuery, policyStatus]);

  const audienceName = useMemo(() => {
    const options =
      draft.scopeKind === "department" ? departments : draft.scopeKind === "location" ? locations : roles;
    return (
      options.find((item) => item.id === draft.scopeTarget || item.name === draft.scopeTarget)?.name ||
      draft.scopeTarget
    );
  }, [departments, draft.scopeKind, draft.scopeTarget, locations, roles]);

  const scopedUsers = useMemo(() => {
    if (draft.scopeKind === "department") {
      return users.filter(
        (user) => user.departmentId === draft.scopeTarget || user.department === audienceName,
      );
    }
    if (draft.scopeKind === "location") {
      return users.filter(
        (user) => user.locationId === draft.scopeTarget || user.location === audienceName,
      );
    }
    if (draft.scopeKind === "role") {
      return users.filter((user) => user.roleTitle === audienceName);
    }
    if (draft.scopeKind === "user") {
      return users.filter((user) => selectedUserIds.includes(user.id));
    }
    return users;
  }, [audienceName, draft.scopeKind, draft.scopeTarget, selectedUserIds, users]);

  const recipientCount = useMemo(() => {
    if (draft.scopeKind === "user") return selectedUserIds.length;
    if (draft.scopeKind === "organization") return users.length;
    return scopedUsers.length;
  }, [draft.scopeKind, scopedUsers.length, selectedUserIds.length, users.length]);

  const scopeIncludes = useMemo(() => {
    if (draft.scopeKind === "organization") return "All active users in the organization";
    if (draft.scopeKind === "department") return audienceName ? `Users in ${audienceName}` : "A selected department";
    if (draft.scopeKind === "location") return audienceName ? `Users in ${audienceName}` : "A selected branch";
    if (draft.scopeKind === "role") return audienceName ? `Users with the ${audienceName} role` : "A selected role";
    if (selectedUserIds.length === 1) return scopedUsers[0]?.name || "1 selected user";
    return selectedUserIds.length ? `${selectedUserIds.length} selected users` : "Selected individual users";
  }, [audienceName, draft.scopeKind, scopedUsers, selectedUserIds.length]);

  function update<K extends keyof AssignmentWizardValue>(key: K, value: AssignmentWizardValue[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function selectPolicy(policy: PolicyChoice) {
    setDraft((current) => ({
      ...current,
      policyId: policy.id,
      policyTitle: policy.title,
      policyVersion: policy.version,
      effectiveDate: policy.effectiveDate,
    }));
    setError("");
  }

  function changeScope(kind: AssignmentScopeKind) {
    setDraft((current) => ({
      ...current,
      scopeKind: kind,
      scopeTarget: "",
    }));
    setSelectedUserIds([]);
    setError("");
  }

  async function goNext() {
    if (step === 1 && !draft.policyId && !draft.policyTitle) {
      setError("Select a policy to continue.");
      return;
    }
    if (step === 2) {
      if ((draft.scopeKind === "department" || draft.scopeKind === "location" || draft.scopeKind === "role") && !draft.scopeTarget) {
        setError("Choose an audience for this assignment.");
        return;
      }
      if (draft.scopeKind === "user" && selectedUserIds.length === 0) {
        setError("Select at least one user.");
        return;
      }
    }
    if (step === 3) {
      if (!draft.assignedAt || !draft.dueAt) {
        setError("Start date and due date are required.");
        return;
      }
      if (draft.dueAt < draft.assignedAt) {
        setError("Due date must be on or after the start date.");
        return;
      }
    }
    if (step === 5) {
      if (!draft.policyId && !selectedPolicy?.id) {
        setError("Select a policy to continue.");
        return;
      }
      try {
        setSaving(true);
        await onSave({
          ...draft,
          policyId: draft.policyId || selectedPolicy?.id || "",
          userIds: selectedUserIds,
          recipients: recipientCount,
          effectiveDate: draft.effectiveDate || selectedPolicy?.effectiveDate || draft.assignedAt,
        });
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Unable to save this assignment.");
      } finally {
        setSaving(false);
      }
      return;
    }
    setStep((current) => (current + 1) as WizardStep);
  }

  const nextLabel =
    step === 4 ? "Review & Confirm" : step === 5 ? (mode === "edit" ? "Save assignment" : "Confirm Assignment") : "Next";

  const visibleUsers = users.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return true;
    return `${user.name} ${user.email} ${user.department} ${user.roleTitle}`.toLowerCase().includes(query);
  });

  const targetOptions =
    draft.scopeKind === "department"
      ? departments
      : draft.scopeKind === "location"
        ? locations
        : roles;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "edit" ? "Edit Policy Assignment" : "New Policy Assignment"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4 sm:px-8">
          <ol className="grid grid-cols-5">
            {steps.map((item, index) => {
              const done = step > item.id;
              const active = step === item.id;
              return (
                <li key={item.id} className="relative flex flex-col items-center text-center">
                  {index > 0 ? (
                    <span
                      className={cx(
                        "absolute right-1/2 top-4 h-0.5 w-full",
                        step > item.id - 1 ? "bg-[var(--color-active-menu)]" : "bg-slate-200",
                      )}
                    />
                  ) : null}
                  <span
                    className={cx(
                      "relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      done || active
                        ? "bg-[var(--color-active-menu)] text-white"
                        : "border border-slate-200 bg-white text-slate-400",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : item.id}
                  </span>
                  <span
                    className={cx(
                      "mt-2 hidden text-[11px] font-semibold sm:block",
                      active ? "text-[var(--color-active-menu)]" : done ? "text-slate-700" : "text-slate-400",
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {step === 1 ? (
            <StepSelectPolicy
              query={policyQuery}
              status={policyStatus}
              policies={filteredPolicies}
              selected={selectedPolicy}
              total={filteredPolicies.length}
              onQuery={setPolicyQuery}
              onStatus={setPolicyStatus}
              onSelect={selectPolicy}
            />
          ) : null}

          {step === 2 ? (
            <StepAssignmentScope
              draft={draft}
              departments={departments.length}
              branches={locations.length}
              users={recipientCount}
              includes={scopeIncludes}
              targetOptions={targetOptions}
              visibleUsers={visibleUsers}
              selectedUserIds={selectedUserIds}
              userQuery={userQuery}
              onChangeScope={changeScope}
              onTarget={(value) => update("scopeTarget", value)}
              onNotes={(value) => update("notes", value)}
              onUserQuery={setUserQuery}
              onToggleUser={(id) =>
                setSelectedUserIds((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
              }
            />
          ) : null}

          {step === 3 ? (
            <StepAssignmentDetails draft={draft} onChange={update} />
          ) : null}

          {step === 4 || step === 5 ? (
            <StepReview
              confirm={step === 5}
              draft={draft}
              selectedPolicy={selectedPolicy}
              includes={scopeIncludes}
              recipients={recipientCount}
              departments={departments.length}
              branches={locations.length}
              onEdit={setStep}
            />
          ) : null}

          {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => (current - 1) as WizardStep)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving..." : nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSelectPolicy({
  query,
  status,
  policies,
  selected,
  total,
  onQuery,
  onStatus,
  onSelect,
}: {
  query: string;
  status: string;
  policies: PolicyChoice[];
  selected: PolicyChoice | null;
  total: number;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onSelect: (policy: PolicyChoice) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900">Select Policy</h3>
      <p className="mt-1 text-sm text-slate-500">Choose the policy you want to assign to users.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search policies..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
          />
        </label>
        <DropdownSelect
          value={status}
          onChange={(value) => onStatus(value || "Published")}
          options={[
            { value: "Published", label: "Published" },
            { value: "Under Review", label: "Under Review" },
            { value: "Draft", label: "Draft" },
          ]}
          className="sm:w-48"
          aria-label="Filter by status"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        {policies.map((policy) => {
          const active = selected?.id === policy.id || (selected?.title === policy.title && selected?.version === policy.version);
          return (
            <button
              key={policy.id}
              type="button"
              onClick={() => onSelect(policy)}
              className={cx(
                "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-0",
                active ? "border-l-2 border-l-[var(--color-active-menu)] bg-blue-50/70" : "hover:bg-slate-50",
              )}
            >
              <span
                className={cx(
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-[var(--color-active-menu)]" : "border-slate-300",
                )}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-[var(--color-active-menu)]" /> : null}
              </span>
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 sm:inline-flex">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{policy.title}</span>
                <span className="mt-0.5 block text-xs text-slate-400">Version {policy.version}</span>
              </span>
              <span className="hidden min-w-[7.5rem] text-sm text-slate-500 lg:block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Effective Date</span>
                {formatAssignmentDate(policy.effectiveDate)}
              </span>
              <span className="hidden min-w-[7.5rem] text-sm text-slate-500 xl:block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Next Review</span>
                {formatAssignmentDate(policy.nextReview)}
              </span>
              <span
                className={cx(
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                  policy.status === "Published"
                    ? "bg-emerald-50 text-emerald-700"
                    : policy.status === "Under Review"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500",
                )}
              >
                {policy.status}
              </span>
            </button>
          );
        })}
        {policies.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No policies match the current filters.</p>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Showing {total === 0 ? 0 : 1} to {total} of {total} policies
      </p>
    </div>
  );
}

function StepAssignmentScope({
  draft,
  departments,
  branches,
  users,
  includes,
  targetOptions,
  visibleUsers,
  selectedUserIds,
  userQuery,
  onChangeScope,
  onTarget,
  onNotes,
  onUserQuery,
  onToggleUser,
}: {
  draft: AssignmentWizardValue;
  departments: number;
  branches: number;
  users: number;
  includes: string;
  targetOptions: NamedOption[];
  visibleUsers: UserOption[];
  selectedUserIds: string[];
  userQuery: string;
  onChangeScope: (kind: AssignmentScopeKind) => void;
  onTarget: (value: string) => void;
  onNotes: (value: string) => void;
  onUserQuery: (value: string) => void;
  onToggleUser: (id: string) => void;
}) {
  const needsTarget = draft.scopeKind === "department" || draft.scopeKind === "location" || draft.scopeKind === "role";

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900">Assignment Scope</h3>
      <p className="mt-1 text-sm text-slate-500">Choose who will receive this policy assignment.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-2">
          {scopeChoices.map((choice) => {
            const active = draft.scopeKind === choice.kind;
            return (
              <button
                key={choice.kind}
                type="button"
                onClick={() => onChangeScope(choice.kind)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left",
                  active
                    ? "border-[var(--color-active-menu)] bg-blue-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span
                  className={cx(
                    "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-[var(--color-active-menu)]" : "border-slate-300",
                  )}
                >
                  {active ? <span className="h-2 w-2 rounded-full bg-[var(--color-active-menu)]" /> : null}
                </span>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
                  <choice.Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">{choice.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{choice.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-900">Scope Preview</h4>
          <p className="mt-1 text-sm text-slate-500">This is a preview of the users who will be included in this assignment.</p>

          {needsTarget ? (
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-semibold text-slate-600">
                {draft.scopeKind === "department" ? "Department" : draft.scopeKind === "location" ? "Branch" : "Role"}
              </p>
              <DropdownSelect
                value={
                  targetOptions.some((item) => item.id === draft.scopeTarget)
                    ? draft.scopeTarget
                    : targetOptions.find((item) => item.name === draft.scopeTarget)?.id || draft.scopeTarget
                }
                onChange={(value) => onTarget(value)}
                options={targetOptions.map((item) => ({ value: item.id, label: item.name }))}
                placeholder="Select..."
                aria-label="Audience"
              />
            </div>
          ) : null}

          {draft.scopeKind === "user" ? (
            <div className="mt-4">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400">
                <Search className="h-4 w-4" />
                <input
                  value={userQuery}
                  onChange={(event) => onUserQuery(event.target.value)}
                  placeholder="Search users..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                />
              </label>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                {visibleUsers.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50">
                      <input type="checkbox" checked={checked} onChange={() => onToggleUser(user.id)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">{user.name}</span>
                        <span className="block text-xs text-slate-400">{user.email}</span>
                      </span>
                    </label>
                  );
                })}
                {visibleUsers.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">No users found.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-slate-700">
            <span className="inline-flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
              {includes}.
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Total Users" value={String(users || 0)} />
            <Stat label="Departments" value={String(departments || 0)} />
            <Stat label="Branches" value={String(branches || 0)} />
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(event) => onNotes(event.target.value)}
              rows={3}
              placeholder="Add an optional note for this assignment (visible to administrators)..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
            />
          </label>

          {draft.scopeKind !== "user" ? (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <span className="inline-flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                New users added to this scope after this assignment will automatically receive this policy.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepAssignmentDetails({
  draft,
  onChange,
}: {
  draft: AssignmentWizardValue;
  onChange: <K extends keyof AssignmentWizardValue>(key: K, value: AssignmentWizardValue[K]) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900">Assignment Details</h3>
      <p className="mt-1 text-sm text-slate-500">Configure the dates and requirements for this assignment.</p>

      <section className="mt-5">
        <h4 className="text-sm font-bold text-slate-900">Schedule</h4>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <DateField
            label="Start Date"
            required
            value={draft.assignedAt}
            help="Date when this assignment starts for recipients."
            onChange={(value) => onChange("assignedAt", value)}
          />
          <DateField
            label="Due Date"
            required
            value={draft.dueAt}
            help="The deadline for recipients to complete the requirements."
            onChange={(value) => onChange("dueAt", value)}
          />
        </div>
        <InfoBanner text="Recipients will be notified immediately after this assignment is created." />
      </section>

      <section className="mt-6">
        <h4 className="text-sm font-bold text-slate-900">Additional Settings (Optional)</h4>
        <div className="mt-3 grid gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">Priority Level</span>
            <DropdownSelect
              value={draft.priority}
              onChange={(value) => onChange("priority", (value || "Medium") as AssignmentPriority)}
              options={priorities.map((item) => ({ value: item, label: item }))}
              renderValue={(option) =>
                option ? (
                  <span className="inline-flex items-center gap-2">
                    <span className={cx("h-2 w-2 rounded-full", priorityDot(option.value as AssignmentPriority))} />
                    {option.label}
                  </span>
                ) : (
                  "Medium"
                )
              }
              aria-label="Priority Level"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">Notes (Internal)</span>
            <textarea
              value={draft.internalNotes}
              onChange={(event) => onChange("internalNotes", event.target.value)}
              rows={3}
              placeholder="Add internal notes for administrators (not visible to recipients)..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function StepReview({
  confirm,
  draft,
  selectedPolicy,
  includes,
  recipients,
  departments,
  branches,
  onEdit,
}: {
  confirm: boolean;
  draft: AssignmentWizardValue;
  selectedPolicy: PolicyChoice | null;
  includes: string;
  recipients: number;
  departments: number;
  branches: number;
  onEdit: (step: WizardStep) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900">{confirm ? "Confirm Assignment" : "Review Assignment"}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {confirm
          ? "Please confirm the details below. Once confirmed, this policy will be assigned to the selected recipients."
          : "Review the assignment before confirming."}
      </p>

      <div className="mt-4 space-y-3">
        <ReviewCard icon={FileText} title="Policy Information" onEdit={confirm ? undefined : () => onEdit(1)}>
          <ReviewField label="Policy" value={draft.policyTitle} />
          <ReviewField label="Version" value={draft.policyVersion} />
          <ReviewField label="Effective Date" value={formatAssignmentDate(draft.effectiveDate || selectedPolicy?.effectiveDate || draft.assignedAt)} />
        </ReviewCard>

        <ReviewCard icon={Users} title="Assignment Scope" onEdit={confirm ? undefined : () => onEdit(2)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <ReviewField label="Scope Type" value={scopeLabelFor(draft.scopeKind, draft.scopeTarget)} />
              <ReviewField label="Includes" value={includes} />
            </div>
            {confirm ? (
              <p className="text-sm font-bold text-[var(--color-active-menu)]">Total Recipients: {recipients} users</p>
            ) : null}
          </div>
          {!confirm ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat icon={Users} label="Total Users" value={String(recipients)} />
              <MiniStat icon={Building2} label="Departments" value={String(departments)} />
              <MiniStat icon={MapPin} label="Branches" value={String(branches)} />
            </div>
          ) : null}
        </ReviewCard>

        <ReviewCard icon={CalendarDays} title="Assignment Details" onEdit={confirm ? undefined : () => onEdit(3)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ReviewField label="Start Date" value={formatAssignmentDate(draft.assignedAt)} />
            <ReviewField label="Due Date" value={formatAssignmentDate(draft.dueAt)} />
          </div>
          {!confirm ? <InfoBanner text="Recipients will be notified immediately after this assignment is created." /> : null}
        </ReviewCard>

        {confirm ? (
          <ReviewCard icon={Bell} title="Notifications">
            <ReviewField label="Initial Notification" value="Recipients will be notified immediately." />
            <ReviewField label="Method" value="In-app notifications and email." />
            <InfoBanner text="Recipients will be notified immediately after this assignment is created." />
          </ReviewCard>
        ) : null}

        <ReviewCard icon={Settings} title="Additional Settings (Optional)" onEdit={confirm ? undefined : () => onEdit(3)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Priority Level</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className={cx("h-2 w-2 rounded-full", priorityDot(draft.priority))} />
                {draft.priority}
              </p>
            </div>
            <ReviewField label="Notes (Internal)" value={draft.internalNotes.trim() || "No notes added"} />
          </div>
        </ReviewCard>
      </div>

      {confirm ? (
        <InfoBanner text="This assignment will be created and cannot be edited for assigned users. You can update the assignment scope or due date later if needed." />
      ) : null}
    </div>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  onEdit,
  children,
}: {
  icon: LucideIcon;
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-active-menu)] hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function DateField({
  label,
  required,
  value,
  help,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  help: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <span className="relative block">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)]"
        />
      </span>
      <span className="mt-1.5 block text-xs text-slate-400">{help}</span>
    </label>
  );
}

function InfoBanner({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-slate-700">
      <span className="inline-flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
        {text}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-base font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
