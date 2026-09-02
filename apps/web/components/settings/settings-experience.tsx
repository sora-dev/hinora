"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Building2,
  Check,
  DatabaseBackup,
  FileText,
  Monitor,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { DropdownSelect } from "../ui/dropdown-select";
import {
  defaultOrganizationSettings,
  fetchOrganizationSettings,
  normalizeOrganizationSettings,
  persistOrganizationSettings,
  type OrganizationSettings,
} from "../../lib/organization-settings";
import SettingsSecurityTab from "./settings-security-tab";
import SettingsDocumentsTab from "./settings-documents-tab";
import SettingsBackupTab from "./settings-backup-tab";

type SettingsTab = "general" | "security" | "documents" | "system" | "backup";

const tabs: Array<{ id: SettingsTab; label: string; Icon: LucideIcon }> = [
  { id: "general", label: "General", Icon: SlidersHorizontal },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "documents", label: "Documents", Icon: FileText },
  { id: "system", label: "System", Icon: Monitor },
  { id: "backup", label: "Backup & Recovery", Icon: DatabaseBackup },
];

const timeZoneOptions = [
  { value: "asia-manila", label: "(UTC+08:00) Asia/Manila" },
  { value: "asia-singapore", label: "(UTC+08:00) Asia/Singapore" },
  { value: "asia-tokyo", label: "(UTC+09:00) Asia/Tokyo" },
  { value: "utc", label: "(UTC+00:00) UTC" },
];

const dateFormatOptions = [
  { value: "mm-dd-yyyy", label: "MM/DD/YYYY" },
  { value: "dd-mm-yyyy", label: "DD/MM/YYYY" },
  { value: "yyyy-mm-dd", label: "YYYY-MM-DD" },
];

const timeFormatOptions = [
  { value: "12h", label: "12-hour (02:30 PM)" },
  { value: "24h", label: "24-hour (14:30)" },
];

const languageOptions = [
  { value: "en-ph", label: "English (Philippines)" },
  { value: "en-us", label: "English (United States)" },
  { value: "fil", label: "Filipino" },
];

const landingPageOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "policy-library", label: "Policy Library" },
  { value: "compliance", label: "Compliance Center" },
  { value: "assignments", label: "My Assignments" },
];

const policyVisibilityOptions = [
  { value: "assigned", label: "Assigned Users Only" },
  { value: "all-employees", label: "All Employees" },
  { value: "managers", label: "Managers and Admins" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-[var(--color-error)]">*</span> : null}
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  required,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input
        id={id}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  hint,
  rows = 3,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        value={value ?? ""}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Street, city, province, postal code"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
      />
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PlaceholderPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
          >
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              {item.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-slate-500">
        This tab is a mockup. Values are sample defaults and are not saved to the database yet.
      </p>
    </section>
  );
}

export default function SettingsExperience() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<OrganizationSettings>(defaultOrganizationSettings);
  const [savedSettings, setSavedSettings] = useState<OrganizationSettings>(defaultOrganizationSettings);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const stored = await fetchOrganizationSettings();
        if (cancelled) {
          return;
        }
        setSettings(stored);
        setSavedSettings(stored);
      } catch (error) {
        if (!cancelled) {
          setBanner({
            type: "error",
            text: error instanceof Error ? error.message : "Unable to load organization settings.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const formSettings = normalizeOrganizationSettings(settings);
  const savedFormSettings = normalizeOrganizationSettings(savedSettings);

  const isDirty = useMemo(
    () => JSON.stringify(formSettings) !== JSON.stringify(savedFormSettings),
    [formSettings, savedFormSettings],
  );

  function updateSetting<K extends keyof OrganizationSettings>(key: K, value: OrganizationSettings[K]) {
    setSettings((current) => normalizeOrganizationSettings({ ...current, [key]: value }));
    setBanner(null);
  }

  function handleLogoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBanner({ type: "error", text: "Please choose a PNG, JPG, or SVG file." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setBanner({ type: "error", text: "Logo must be 2 MB or smaller." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      updateSetting("logoUrl", result);
    };
    reader.readAsDataURL(file);
  }

  async function saveChanges() {
    if (!formSettings.organizationName.trim() || !formSettings.organizationCode.trim()) {
      setBanner({ type: "error", text: "Organization name and code are required." });
      return;
    }

    setIsSaving(true);
    setBanner(null);

    try {
      const saved = await persistOrganizationSettings(formSettings);
      setSettings(saved);
      setSavedSettings(saved);
      setBanner({ type: "success", text: "Settings saved to the database." });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save organization settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function resetToDefault() {
    setIsSaving(true);
    setBanner(null);

    try {
      const saved = await persistOrganizationSettings(defaultOrganizationSettings);
      setSettings(saved);
      setSavedSettings(saved);
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to reset organization settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardShell variant="admin">
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5">
          <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            System-wide configuration for your Hinora organization.
          </p>
        </div>

        <div className="mb-5 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    "relative inline-flex items-center gap-2 px-3.5 py-3 text-sm font-semibold transition",
                    active
                      ? "text-[var(--color-active-menu)]"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {active ? (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--color-active-menu)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "general" ? (
          <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
            <div>
              <h2 className="text-xl font-bold text-slate-900">General Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure general settings and preferences for your organization.
                {isLoading ? " Loading saved values from the database..." : ""}
              </p>
            </div>

            {banner ? (
              <div
                className={cx(
                  "mt-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
                  banner.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-[var(--color-success)]"
                    : "border-red-200 bg-red-50 text-[var(--color-error)]",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  {banner.text}
                </span>
                <button
                  type="button"
                  onClick={() => setBanner(null)}
                  className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Organization Information</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage your organization&apos;s basic information and preferences.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <TextField
                  id="organization-name"
                  label="Organization Name"
                  required
                  value={formSettings.organizationName}
                  onChange={(value) => updateSetting("organizationName", value)}
                />
                <TextField
                  id="organization-code"
                  label="Organization Code"
                  required
                  value={formSettings.organizationCode}
                  onChange={(value) => updateSetting("organizationCode", value)}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextAreaField
                  id="organization-address"
                  label="Organization Address"
                  value={formSettings.organizationAddress}
                  hint="Used on printed reports and official documents."
                  onChange={(value) => updateSetting("organizationAddress", value)}
                />
                <div>
                  <TextField
                    id="organization-phone"
                    label="Mobile / Phone Number"
                    value={formSettings.organizationPhone}
                    placeholder="+63 ..."
                    onChange={(value) => updateSetting("organizationPhone", value)}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Shown on printed reports under the address.</p>
                </div>
              </div>

              <div className="mt-5">
                <FieldLabel required>Organization Logo</FieldLabel>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {formSettings.logoUrl ? (
                      <img
                        src={formSettings.logoUrl}
                        alt="Organization logo"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-lg font-extrabold tracking-wide text-[var(--color-active-menu)]">
                        {formSettings.organizationCode || "ORG"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">
                      Recommended: PNG, JPG or SVG. Max size: 2MB.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoSelected}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Upload className="h-4 w-4" />
                        Change Logo
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("logoUrl", null)}
                        disabled={!formSettings.logoUrl}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel required>Time Zone</FieldLabel>
                  <DropdownSelect
                    value={formSettings.timeZone}
                    onChange={(value) => updateSetting("timeZone", value || "asia-manila")}
                    options={timeZoneOptions}
                    aria-label="Time Zone"
                  />
                </div>
                <div>
                  <FieldLabel required>Date Format</FieldLabel>
                  <DropdownSelect
                    value={formSettings.dateFormat}
                    onChange={(value) => updateSetting("dateFormat", value || "mm-dd-yyyy")}
                    options={dateFormatOptions}
                    aria-label="Date Format"
                  />
                </div>
                <div>
                  <FieldLabel required>Time Format</FieldLabel>
                  <DropdownSelect
                    value={formSettings.timeFormat}
                    onChange={(value) => updateSetting("timeFormat", value || "12h")}
                    options={timeFormatOptions}
                    aria-label="Time Format"
                  />
                </div>
                <div>
                  <FieldLabel required>Default Language</FieldLabel>
                  <DropdownSelect
                    value={formSettings.language}
                    onChange={(value) => updateSetting("language", value || "en-ph")}
                    options={languageOptions}
                    aria-label="Default Language"
                  />
                </div>
                <div>
                  <FieldLabel required>Default Landing Page</FieldLabel>
                  <DropdownSelect
                    value={formSettings.landingPage}
                    onChange={(value) => updateSetting("landingPage", value || "dashboard")}
                    options={landingPageOptions}
                    aria-label="Default Landing Page"
                  />
                </div>
                <div>
                  <FieldLabel required>Default Policy Visibility</FieldLabel>
                  <DropdownSelect
                    value={formSettings.policyVisibility}
                    onChange={(value) => updateSetting("policyVisibility", value || "assigned")}
                    options={policyVisibilityOptions}
                    aria-label="Default Policy Visibility"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Select who can view policies by default when created.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void resetToDefault()}
                disabled={isLoading || isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </button>
              <button
                type="button"
                onClick={() => void saveChanges()}
                disabled={!isDirty || isLoading || isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "security" ? <SettingsSecurityTab /> : null}

        {activeTab === "documents" ? <SettingsDocumentsTab /> : null}

        {activeTab === "system" ? (
          <PlaceholderPanel
            title="System Settings"
            description="Manage platform behavior, AI features, and maintenance windows."
            items={[
              { label: "Maintenance mode", value: "Off" },
              { label: "Hinora AI assistant", value: "Enabled" },
              { label: "AI policy analysis", value: "Enabled" },
              { label: "System email sender", value: "noreply@hinora.com" },
              { label: "Audit log retention", value: "24 months" },
              { label: "Environment", value: "Production" },
            ]}
          />
        ) : null}

        {activeTab === "backup" ? <SettingsBackupTab /> : null}

        <div className="mt-5">
          <ModuleGuide guideKey="Settings" />
        </div>
      </div>
    </DashboardShell>
  );
}
