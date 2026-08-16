"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Clock3,
  Globe,
  Info,
  KeyRound,
  Lock,
  LockKeyhole,
  Monitor,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";

type MfaPolicy = "admins" | "all" | "optional";
type IpPolicy = "any" | "whitelist";
type AuthMethod = "email" | "google" | "microsoft" | "totp";

type PasswordPolicy = {
  minLength: string;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  special: boolean;
  expiration: string;
};

type SecuritySettings = {
  password: PasswordPolicy;
  sessionTimeout: string;
  maxLoginAttempts: string;
  lockoutDuration: string;
  maxConcurrentSessions: string;
  mfaPolicy: MfaPolicy;
  authMethods: Record<AuthMethod, boolean>;
  ipPolicy: IpPolicy;
};

const defaultSecuritySettings: SecuritySettings = {
  password: {
    minLength: "8",
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    expiration: "90",
  },
  sessionTimeout: "30",
  maxLoginAttempts: "5",
  lockoutDuration: "15",
  maxConcurrentSessions: "2",
  mfaPolicy: "admins",
  authMethods: {
    email: true,
    google: true,
    microsoft: true,
    totp: true,
  },
  ipPolicy: "any",
};

const timeoutOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "120", label: "2 hours" },
];

const attemptOptions = [
  { value: "3", label: "3 attempts" },
  { value: "5", label: "5 attempts" },
  { value: "8", label: "8 attempts" },
  { value: "10", label: "10 attempts" },
];

const lockoutOptions = [
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
];

const concurrentOptions = [
  { value: "1", label: "1 session per user" },
  { value: "2", label: "2 sessions per user" },
  { value: "3", label: "3 sessions per user" },
  { value: "5", label: "5 sessions per user" },
];

const minLengthOptions = [
  { value: "8", label: "8 characters" },
  { value: "10", label: "10 characters" },
  { value: "12", label: "12 characters" },
  { value: "16", label: "16 characters" },
];

const expirationOptions = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "never", label: "Never expires" },
];

const mfaOptions: Array<{ value: MfaPolicy; label: string; description: string }> = [
  {
    value: "admins",
    label: "Required for Administrators only",
    description: "MFA is required for all administrator accounts",
  },
  {
    value: "all",
    label: "Required for all users",
    description: "MFA is required for all user accounts",
  },
  {
    value: "optional",
    label: "Optional for all users",
    description: "Users can enable MFA voluntarily",
  },
];

const authMethodOptions: Array<{ id: AuthMethod; label: string; description: string }> = [
  {
    id: "email",
    label: "Email & Password",
    description: "Standard email and password login",
  },
  {
    id: "google",
    label: "Google Workspace",
    description: "Sign in with Google account",
  },
  {
    id: "microsoft",
    label: "Microsoft 365",
    description: "Sign in with Microsoft account",
  },
  {
    id: "totp",
    label: "Authenticator App (TOTP)",
    description: "Time-based one-time password",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CardHeader({
  Icon,
  iconClassName,
  title,
  description,
  action,
}: {
  Icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconClassName ?? "bg-blue-50 text-[var(--color-active-menu)]",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function RadioOption({
  name,
  checked,
  label,
  description,
  onSelect,
}: {
  name: string;
  checked: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-[var(--color-active-menu)]"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function CheckboxOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function PolicyRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
      </div>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[var(--color-success)]">
        <Check className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export default function SettingsSecurityTab() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSecuritySettings);
  const [savedSettings, setSavedSettings] = useState<SecuritySettings>(defaultSecuritySettings);
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  function update<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setBanner(null);
  }

  function updatePassword<K extends keyof PasswordPolicy>(key: K, value: PasswordPolicy[K]) {
    setSettings((current) => ({
      ...current,
      password: { ...current.password, [key]: value },
    }));
    setBanner(null);
  }

  function saveChanges() {
    if (!settings.authMethods.email && !settings.authMethods.google && !settings.authMethods.microsoft) {
      setBanner({
        type: "error",
        text: "Keep at least one sign-in method enabled.",
      });
      return;
    }

    setSavedSettings(settings);
    setEditingPolicy(false);
    setBanner({ type: "success", text: "Security settings saved successfully." });
  }

  function resetToDefault() {
    setSettings(defaultSecuritySettings);
    setSavedSettings(defaultSecuritySettings);
    setEditingPolicy(false);
    setBanner(null);
  }

  const passwordRules = [
    { label: "Minimum length", value: `${settings.password.minLength} characters` },
    {
      label: "Include uppercase letters",
      value: settings.password.uppercase ? "Required" : "Optional",
    },
    {
      label: "Include lowercase letters",
      value: settings.password.lowercase ? "Required" : "Optional",
    },
    { label: "Include numbers", value: settings.password.numbers ? "Required" : "Optional" },
    {
      label: "Include special characters",
      value: settings.password.special ? "Required" : "Optional",
    },
    {
      label: "Password expiration",
      value:
        settings.password.expiration === "never"
          ? "Never expires"
          : `${settings.password.expiration} days`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure system-wide security policies and authentication settings.
        </p>
      </div>

      {banner ? (
        <div
          className={cx(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
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

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
        <CardHeader
          Icon={Lock}
          title="Password Policy"
          description="Define password requirements for all users in the system."
          action={
            <button
              type="button"
              onClick={() => setEditingPolicy((current) => !current)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              {editingPolicy ? "Done" : "Edit Policy"}
            </button>
          }
        />

        {editingPolicy ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Minimum length
              </label>
              <DropdownSelect
                value={settings.password.minLength}
                onChange={(value) => updatePassword("minLength", value || "8")}
                options={minLengthOptions}
                aria-label="Minimum length"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password expiration
              </label>
              <DropdownSelect
                value={settings.password.expiration}
                onChange={(value) => updatePassword("expiration", value || "90")}
                options={expirationOptions}
                aria-label="Password expiration"
              />
            </div>
            {(
              [
                ["uppercase", "Include uppercase letters"],
                ["lowercase", "Include lowercase letters"],
                ["numbers", "Include numbers"],
                ["special", "Include special characters"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3"
              >
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={settings.password[key]}
                  onChange={(event) => updatePassword(key, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--color-active-menu)]"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {passwordRules.map((rule) => (
              <PolicyRule key={rule.label} label={rule.label} value={rule.value} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={Clock3}
            title="Session Timeout"
            description="Automatically log out inactive users."
          />
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Timeout Duration
            </label>
            <DropdownSelect
              value={settings.sessionTimeout}
              onChange={(value) => update("sessionTimeout", value || "30")}
              options={timeoutOptions}
              aria-label="Timeout Duration"
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={UserRound}
            title="Maximum Login Attempts"
            description="Limit the number of failed login attempts."
          />
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Max Attempts</label>
            <DropdownSelect
              value={settings.maxLoginAttempts}
              onChange={(value) => update("maxLoginAttempts", value || "5")}
              options={attemptOptions}
              aria-label="Max Attempts"
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={LockKeyhole}
            iconClassName="bg-blue-50 text-[var(--color-active-menu)]"
            title="Account Lockout Duration"
            description="Lock account after maximum failed attempts."
          />
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Lockout Duration
            </label>
            <DropdownSelect
              value={settings.lockoutDuration}
              onChange={(value) => update("lockoutDuration", value || "15")}
              options={lockoutOptions}
              aria-label="Lockout Duration"
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={Monitor}
            title="Concurrent Session Limits"
            description="Limit the number of active sessions per user."
          />
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Max Concurrent Sessions
            </label>
            <DropdownSelect
              value={settings.maxConcurrentSessions}
              onChange={(value) => update("maxConcurrentSessions", value || "2")}
              options={concurrentOptions}
              aria-label="Max Concurrent Sessions"
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={ShieldCheck}
            title="Multi-Factor Authentication (MFA)"
            description="Configure MFA requirement for users."
          />
          <div className="mt-4 space-y-1">
            {mfaOptions.map((option) => (
              <RadioOption
                key={option.value}
                name="mfa-policy"
                checked={settings.mfaPolicy === option.value}
                label={option.label}
                description={option.description}
                onSelect={() => update("mfaPolicy", option.value)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={KeyRound}
            title="Allowed Authentication Methods"
            description="Select the authentication methods allowed in the system."
          />
          <div className="mt-4 space-y-1">
            {authMethodOptions.map((option) => (
              <CheckboxOption
                key={option.id}
                checked={settings.authMethods[option.id]}
                label={option.label}
                description={option.description}
                onChange={(checked) =>
                  update("authMethods", {
                    ...settings.authMethods,
                    [option.id]: checked,
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeader
            Icon={Globe}
            title="IP Restrictions"
            description="Restrict system access to specific IP addresses."
          />
          <div className="mt-4 space-y-1">
            <RadioOption
              name="ip-policy"
              checked={settings.ipPolicy === "any"}
              label="Allow access from any IP address"
              description="No IP restrictions applied"
              onSelect={() => update("ipPolicy", "any")}
            />
            <RadioOption
              name="ip-policy"
              checked={settings.ipPolicy === "whitelist"}
              label="Restrict access to specific IP addresses"
              description="Only allow access from whitelisted IPs"
              onSelect={() => update("ipPolicy", "whitelist")}
            />
          </div>
          <div
            className={cx(
              "mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
              settings.ipPolicy === "any"
                ? "border-blue-100 bg-blue-50 text-[var(--color-active-menu)]"
                : "border-amber-100 bg-amber-50 text-amber-800",
            )}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {settings.ipPolicy === "any"
                ? "IP restrictions are not active. The system is accessible from any IP address."
                : "IP restrictions will apply after this setting is connected to the backend."}
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetToDefault}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Default
        </button>
        <button
          type="button"
          onClick={saveChanges}
          disabled={!isDirty}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
