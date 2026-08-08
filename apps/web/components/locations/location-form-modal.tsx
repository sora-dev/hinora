"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";
import type { LocationManager, LocationStatus } from "./location-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type LocationFormValues = {
  name: string;
  code: string;
  managerUserId: string;
  status: LocationStatus;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  description: string;
};

export type LocationManagerOption = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string;
  initials: string;
};

type UserApiRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  jobTitle: string | null;
};

type UsersListResponse = {
  data: UserApiRecord[];
};

type LocationFormModalProps = {
  mode: "create" | "edit";
  initialValues?: Partial<LocationFormValues>;
  initialManager?: LocationManagerOption | null;
  onClose: () => void;
  onSubmit: (values: LocationFormValues, manager: LocationManagerOption | null) => void;
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

function toManagerOption(user: UserApiRecord): LocationManagerOption {
  return {
    id: user.id,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    jobTitle: user.jobTitle,
    department: user.department,
    initials: getInitials(user.fullName || `${user.firstName} ${user.lastName}`),
  };
}

export function emptyLocationFormValues(): LocationFormValues {
  return {
    name: "",
    code: "",
    managerUserId: "",
    status: "Active",
    streetAddress: "",
    city: "",
    province: "",
    postalCode: "",
    email: "",
    phone: "",
    description: "",
  };
}

export function managerFromLocation(manager: LocationManager): LocationManagerOption | null {
  if (!manager.name || manager.name === "Unassigned") return null;
  return {
    id: manager.id ?? "",
    fullName: manager.name,
    email: manager.email,
    jobTitle: manager.jobTitle ?? null,
    department: "",
    initials: manager.initials,
  };
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-sm font-semibold text-slate-700">
      {children}
      {required ? <span className="text-[var(--color-error)]"> *</span> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="mb-3 text-sm font-bold text-slate-900">{children}</h4>;
}

function ManagerPicker({
  value,
  selectedManager,
  onChange,
}: {
  value: string;
  selectedManager: LocationManagerOption | null;
  onChange: (manager: LocationManagerOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<LocationManagerOption[]>([]);
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
        setUsers((payload.data ?? []).map(toManagerOption));
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
        {selectedManager ? (
          <>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {selectedManager.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {selectedManager.fullName}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {selectedManager.jobTitle || selectedManager.email}
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
              aria-label="Clear location manager"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-sm text-slate-400">
              Search and select manager
            </span>
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

export default function LocationFormModal({
  mode,
  initialValues,
  initialManager = null,
  onClose,
  onSubmit,
}: LocationFormModalProps) {
  const [values, setValues] = useState<LocationFormValues>(() => ({
    ...emptyLocationFormValues(),
    ...initialValues,
  }));
  const [selectedManager, setSelectedManager] = useState<LocationManagerOption | null>(initialManager);

  const canSubmit = Boolean(
    values.name.trim() &&
      values.code.trim() &&
      values.streetAddress.trim() &&
      values.city.trim() &&
      values.province.trim(),
  );

  function update<K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {mode === "edit" ? "Edit Location" : "Add Location"}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {mode === "edit"
                  ? "Update location details and location information."
                  : "Create a new organizational location."}
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

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <SectionTitle>Location Information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Location Name</FieldLabel>
                <input
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="e.g. Baguio"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <FieldLabel required>Location Code</FieldLabel>
                <input
                  value={values.code}
                  onChange={(event) => update("code", event.target.value.toUpperCase())}
                  placeholder="e.g. BAG"
                  maxLength={8}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm uppercase outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <div className="block sm:col-span-2">
                <FieldLabel>Location Manager</FieldLabel>
                <ManagerPicker
                  value={values.managerUserId}
                  selectedManager={selectedManager}
                  onChange={(manager) => {
                    setSelectedManager(manager);
                    update("managerUserId", manager?.id ?? "");
                  }}
                />
              </div>
              <label className="block sm:col-span-2 sm:max-w-xs">
                <FieldLabel required>Status</FieldLabel>
                <DropdownSelect
                  value={values.status}
                  onChange={(value) => update("status", (value || "Active") as LocationStatus)}
                  options={[
                    {
                      value: "Active",
                      label: "Active",
                      badgeClassName: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      value: "Maintenance",
                      label: "Maintenance",
                      badgeClassName: "bg-amber-50 text-amber-700",
                    },
                    {
                      value: "Inactive",
                      label: "Inactive",
                      badgeClassName: "bg-slate-100 text-slate-600",
                    },
                  ]}
                  placeholder="Select status"
                  aria-label="Location status"
                />
              </label>
            </div>
          </section>

          <section>
            <SectionTitle>Address</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block sm:col-span-3">
                <FieldLabel required>Street Address</FieldLabel>
                <input
                  value={values.streetAddress}
                  onChange={(event) => update("streetAddress", event.target.value)}
                  placeholder="Street, building, or landmark"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <FieldLabel required>City</FieldLabel>
                <input
                  value={values.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="City"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <FieldLabel required>Province</FieldLabel>
                <input
                  value={values.province}
                  onChange={(event) => update("province", event.target.value)}
                  placeholder="Province"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <FieldLabel>Postal Code</FieldLabel>
                <input
                  value={values.postalCode}
                  onChange={(event) => update("postalCode", event.target.value)}
                  placeholder="Postal code"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
          </section>

          <section>
            <SectionTitle>Contact Information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="location@company.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <FieldLabel>Phone Number</FieldLabel>
                <input
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+63 ..."
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
          </section>

          <section>
            <FieldLabel>Description (optional)</FieldLabel>
            <textarea
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              placeholder="Add notes about this location."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
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
            onClick={() => onSubmit(values, selectedManager)}
            className="inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "edit" ? "Save Changes" : "Create Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
