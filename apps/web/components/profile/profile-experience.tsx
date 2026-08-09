"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  History,
  Info,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  MonitorSmartphone,
  Moon,
  Palette,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Sun,
  Tablet,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import { getHinoraSession } from "../dashboard/session";
import type { NavVariant } from "../dashboard/navigation";
import { DropdownSelect } from "../ui/dropdown-select";

type ProfileTab =
  | "personal"
  | "security"
  | "devices"
  | "preferences"
  | "activity";

type SessionDevice = {
  id: string;
  name: string;
  details: string;
  location: string;
  ip: string;
  firstLogin: string;
  lastActive: string;
  Icon: LucideIcon;
  iconTone: string;
};

const tabs: Array<{ id: ProfileTab; label: string; Icon: typeof UserRound }> = [
  { id: "personal", label: "Personal Information", Icon: UserRound },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "devices", label: "Devices & Sessions", Icon: MonitorSmartphone },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
  { id: "activity", label: "Activity", Icon: Activity },
];

const currentSession: SessionDevice = {
  id: "current",
  name: "MacBook Pro (macOS)",
  details: "Chrome 125.0.0.0 • macOS 14.5",
  location: "Baguio City, Philippines",
  ip: "IP: 203.177.45.128",
  firstLogin: "Today, 8:42 AM",
  lastActive: "Just now",
  Icon: Laptop,
  iconTone: "bg-emerald-50 text-[var(--color-success)]",
};

const otherSessions: SessionDevice[] = [
  {
    id: "windows",
    name: "Windows Desktop",
    details: "Edge 124.0.0.0 • Windows 11",
    location: "Makati City, Philippines",
    ip: "IP: 112.198.22.91",
    firstLogin: "Today, 7:10 AM",
    lastActive: "2 hours ago",
    Icon: Monitor,
    iconTone: "bg-blue-50 text-[var(--color-active-menu)]",
  },
  {
    id: "iphone",
    name: "iPhone 14 Pro",
    details: "Safari Mobile • iOS 17.5",
    location: "Baguio City, Philippines",
    ip: "IP: 203.177.45.130",
    firstLogin: "Yesterday, 6:15 PM",
    lastActive: "5 hours ago",
    Icon: Smartphone,
    iconTone: "bg-violet-50 text-violet-600",
  },
  {
    id: "ipad",
    name: "iPad Air",
    details: "Safari • iPadOS 17.4",
    location: "Quezon City, Philippines",
    ip: "IP: 49.148.77.203",
    firstLogin: "May 28, 2026",
    lastActive: "1 day ago",
    Icon: Tablet,
    iconTone: "bg-orange-50 text-orange-600",
  },
  {
    id: "unknown",
    name: "Unknown Device",
    details: "Chrome Mobile • Android",
    location: "Cebu City, Philippines",
    ip: "IP: 49.147.11.88",
    firstLogin: "May 22, 2026",
    lastActive: "3 days ago",
    Icon: Globe2,
    iconTone: "bg-slate-100 text-slate-600",
  },
];

const recentSecurityActivity = [
  { id: "1", title: "New sign-in on Windows Desktop", when: "Today" },
  { id: "2", title: "New sign-in on iPhone 14 Pro", when: "Yesterday" },
  { id: "3", title: "Password changed", when: "May 20, 2026" },
  { id: "4", title: "MFA enabled", when: "May 10, 2026" },
];

const staySecureTips: Array<{ title: string; Icon: LucideIcon }> = [
  { title: "Use a strong password", Icon: KeyRound },
  { title: "Enable MFA", Icon: Fingerprint },
  { title: "Review your devices", Icon: MonitorSmartphone },
];

type ThemeOption = "light" | "dark" | "system";

const themeOptions: Array<{ id: ThemeOption; label: string; Icon: LucideIcon }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

const primaryColors = [
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "indigo", label: "Indigo", value: "#1e3a8a" },
  { id: "purple", label: "Purple", value: "#7c3aed" },
  { id: "green", label: "Green", value: "#16a34a" },
  { id: "cyan", label: "Cyan", value: "#0891b2" },
  { id: "orange", label: "Orange", value: "#ea580c" },
  { id: "red", label: "Red", value: "#dc2626" },
  { id: "pink", label: "Pink", value: "#db2777" },
  { id: "grey", label: "Grey", value: "#64748b" },
];

const defaultPreferences = {
  theme: "light" as ThemeOption,
  primaryColor: "blue",
  fontSize: "Medium (Default)",
  compactMode: false,
  reduceMotion: false,
  language: "English (United States)",
  dateFormat: "MMM DD, YYYY (Aug 05, 2026)",
  timeFormat: "12-hour (1:30 PM)",
  timeZone: "(GMT+08:00) Asia/Manila",
  firstDayOfWeek: "Monday",
  defaultDashboardView: "My Compliance Overview",
  itemsPerPage: "20 items",
  showQuickActions: true,
};

const preferenceTips = [
  {
    title: "Customize your experience",
    description: "Theme and color settings apply across Hinora once saved.",
    Icon: Palette,
  },
  {
    title: "Language settings",
    description: "Choose the language used for labels, dates, and system text.",
    Icon: Globe2,
  },
  {
    title: "Dark mode",
    description: "Dark theme can reduce eye strain in low-light environments.",
    Icon: Moon,
  },
];

type ProfileExperienceProps = {
  variant: NavVariant;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Field({
  label,
  value,
  locked = false,
  className,
}: {
  label: string;
  value: string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        {label}
        {locked ? <Lock className="h-3 w-3 text-slate-400" /> : null}
      </span>
      <input
        type="text"
        value={value}
        readOnly
        className={cx(
          "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none",
          locked ? "bg-slate-50 text-slate-600" : "bg-white text-slate-800",
        )}
      />
    </label>
  );
}

function PlaceholderPanel({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: typeof Shield;
}) {
  return (
    <section className="rounded-[20px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-active-menu)]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </section>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-11 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--color-active-menu)]"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function PreferenceSelect({
  label,
  value,
  options,
  onChange,
  Icon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  Icon?: LucideIcon;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      <DropdownSelect
        value={value}
        onChange={(next) => {
          if (next) onChange(next);
        }}
        options={options.map((option) => ({ value: option, label: option }))}
        allowClear={false}
        leadingIcon={Icon}
        placeholder={label}
        aria-label={label}
      />
    </label>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-left transition hover:bg-slate-50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[var(--color-active-menu)]" : "bg-slate-300",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function evaluatePassword(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase and lowercase letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function ProfileExperience({ variant }: ProfileExperienceProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [profileName, setProfileName] = useState("Juan Dela Cruz");
  const [profileRole, setProfileRole] = useState(
    variant === "admin" ? "System Administrator" : "Employee",
  );
  const [profileEmail, setProfileEmail] = useState("juan.delacruz@ruralbank.com.ph");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);

  const updatePreference = <K extends keyof typeof defaultPreferences>(
    key: K,
    value: (typeof defaultPreferences)[K],
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const selectedPrimaryColor =
    primaryColors.find((color) => color.id === preferences.primaryColor) ?? primaryColors[0];

  useEffect(() => {
    const session = getHinoraSession();
    if (!session) {
      return;
    }

    if (session.name?.trim()) {
      setProfileName(session.name.trim());
    }
    if (session.roleTitle?.trim()) {
      setProfileRole(session.roleTitle.trim());
    } else if (session.role === "ADMIN") {
      setProfileRole("System Administrator");
    } else if (session.role === "MANAGER") {
      setProfileRole("Compliance Officer");
    } else if (session.role === "EMPLOYEE") {
      setProfileRole("Employee");
    }
    if (session.email?.trim()) {
      setProfileEmail(session.email.trim());
    }
  }, []);

  const nameParts = useMemo(() => {
    const parts = profileName.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? "Juan",
      lastName: parts.slice(1).join(" ") || "Dela Cruz",
      initials: `${parts[0]?.[0] ?? "J"}${parts[1]?.[0] ?? "D"}`.toUpperCase(),
    };
  }, [profileName]);

  const completionItems = [
    { label: "Personal Information", done: true },
    { label: "Security Setup", done: true },
    { label: "Preferences", done: true },
    { label: "Notification Preferences", done: false },
  ];

  const passwordRequirements = evaluatePassword(newPassword);
  const securityChecklist = [
    "Strong password",
    "Multi-factor authentication enabled",
    "Recovery email verified",
    "Recovery phone verified",
    "No active security alerts",
  ];
  const securityTips = [
    {
      title: "Use a strong password",
      description: "Avoid using personal information in your password.",
    },
    {
      title: "Keep your recovery options updated",
      description: "This helps you regain access if needed.",
    },
    {
      title: "Review your active sessions",
      description: "Sign out of devices you no longer use.",
    },
  ];

  return (
    <DashboardShell
      variant={variant}
      profileName={profileName}
      profileRole={profileRole}
      avatarText={nameParts.initials}
      notificationCount={3}
    >
      <div className="px-4 py-5 md:px-5 xl:px-6">
        <div className="mb-5">
          <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information, security, and preferences.
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

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {activeTab === "personal" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        View and manage your personal details.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                    <div className="relative mx-auto h-28 w-28 shrink-0 lg:mx-0">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-active-menu)] to-[var(--color-hover)] text-3xl font-bold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)]">
                        {nameParts.initials}
                      </div>
                      <button
                        type="button"
                        aria-label="Update profile photo"
                        className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[var(--color-active-menu)] text-white shadow"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="First Name" value={nameParts.firstName} />
                        <Field label="Last Name" value={nameParts.lastName} />
                        <Field label="Preferred Name" value={nameParts.firstName} />
                        <Field label="Position / Job Title" value={profileRole} />
                        <Field label="Department" value="Information Technology" locked />
                        <Field label="Location" value="Head Office" locked />
                        <Field label="Employee ID" value="EMP-2021-00123" locked />
                        <Field label="Email Address" value={profileEmail} />
                        <Field label="Phone Number" value="+63 917 123 4567" />
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Some information is managed by your administrator and cannot be changed.
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Work Information</h2>
                    <p className="mt-1 text-sm text-slate-500">View your work-related details.</p>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      label="Account Type"
                      value={variant === "admin" ? "Administrator" : "Employee"}
                      locked
                    />
                    <Field label="Role" value={profileRole} locked />
                    <Field label="Reporting To" value="IT Manager" locked />
                    <Field label="Date Hired" value="Jan 15, 2021" locked />
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "security" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Keep your password strong and secure.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-3">
                      <PasswordField
                        label="Current Password"
                        value={currentPassword}
                        visible={showCurrentPassword}
                        onToggle={() => setShowCurrentPassword((current) => !current)}
                        onChange={setCurrentPassword}
                      />
                      <PasswordField
                        label="New Password"
                        value={newPassword}
                        visible={showNewPassword}
                        onToggle={() => setShowNewPassword((current) => !current)}
                        onChange={setNewPassword}
                      />
                      <PasswordField
                        label="Confirm New Password"
                        value={confirmPassword}
                        visible={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((current) => !current)}
                        onChange={setConfirmPassword}
                      />
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-active-menu)]">
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <div className="text-sm font-bold text-slate-900">Password must contain:</div>
                          <ul className="mt-3 space-y-2">
                            {passwordRequirements.map((requirement) => (
                              <li
                                key={requirement.label}
                                className="flex items-start gap-2 text-sm font-medium text-slate-600"
                              >
                                <CheckCircle2
                                  className={cx(
                                    "mt-0.5 h-4 w-4 shrink-0",
                                    requirement.met
                                      ? "text-[var(--color-success)]"
                                      : "text-slate-300",
                                  )}
                                />
                                <span>{requirement.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Update Password</span>
                    </button>
                  </div>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Multi-Factor Authentication (MFA)
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Add an extra layer of security to your account.
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-700">
                      <ShieldCheck className="h-4.5 w-4.5" />
                      <span>MFA is enabled</span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      Manage MFA
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-active-menu)] shadow-sm">
                            <Smartphone className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-slate-900">Authenticator App</div>
                            <div className="mt-1 text-xs text-slate-500">Added on Jun 20, 2026</div>
                          </div>
                        </div>
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-[var(--color-success)]">
                          Primary
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-ai-accent)] shadow-sm">
                            <KeyRound className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-slate-900">Backup Codes</div>
                            <div className="mt-1 text-xs text-slate-500">10 codes remaining</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                        >
                          View Codes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      If you lose access to your authenticator app, use a backup code to sign in.
                    </span>
                  </div>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Recovery Options</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        These options help you recover your account if you lose access.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Manage Recovery Options</span>
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-active-menu)] shadow-sm">
                        <Mail className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900">Recovery Email</div>
                        <div className="mt-0.5 truncate text-sm text-slate-500">
                          juan.recovery@email.com
                        </div>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-[var(--color-success)]">
                        Verified
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-active-menu)] shadow-sm">
                        <Phone className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900">Recovery Phone</div>
                        <div className="mt-0.5 truncate text-sm text-slate-500">+63 917 123 4567</div>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-[var(--color-success)]">
                        Verified
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "devices" ? (
              <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Devices & Active Sessions</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage devices currently signed in to your Hinora account.
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Current Session</h3>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-bold text-[var(--color-success)]">
                      This device
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${currentSession.iconTone}`}
                        >
                          <Laptop className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="text-base font-bold text-slate-900">{currentSession.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{currentSession.details}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {currentSession.location}
                            </span>
                            <span>{currentSession.ip}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                              Active now
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              First login: {currentSession.firstLogin}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              Last active: {currentSession.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-3 lg:max-w-[220px]">
                        <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--color-success)]" />
                        <p className="text-sm font-medium leading-5 text-slate-600">
                          This is your current session. You&apos;re all set!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-7">
                  <h3 className="text-sm font-bold text-slate-900">Other Active Sessions</h3>
                  <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    {otherSessions.map((session) => {
                      const SessionIcon = session.Icon;
                      return (
                      <div
                        key={session.id}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div className="flex min-w-0 items-start gap-3.5">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${session.iconTone}`}
                          >
                            <SessionIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">{session.name}</div>
                            <div className="mt-0.5 text-sm text-slate-500">{session.details}</div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location}
                              </span>
                              <span>{session.ip}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>Last active: {session.lastActive}</span>
                              <span>First login: {session.firstLogin}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign out
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <ShieldAlert className="h-4.5 w-4.5" />
                    </span>
                    <p className="text-sm font-medium leading-5 text-slate-700">
                      Don&apos;t recognize a device? Sign out from all other devices to keep your account secure.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out all other devices
                  </button>
                </div>
              </section>
            ) : null}

            {activeTab === "preferences" ? (
              <div className="space-y-4">
                <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Appearance</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Customize how Hinora looks and feels for your account.
                    </p>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Theme
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {themeOptions.map((option) => {
                        const selected = preferences.theme === option.id;
                        const ThemeIcon = option.Icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updatePreference("theme", option.id)}
                            className={cx(
                              "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                              selected
                                ? "border-[var(--color-active-menu)] bg-blue-50/50 shadow-[0_0_0_1px_var(--color-active-menu)]"
                                : "border-slate-200 bg-white hover:border-slate-300",
                            )}
                          >
                            <span
                              className={cx(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                selected
                                  ? "bg-blue-100 text-[var(--color-active-menu)]"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <ThemeIcon className="h-5 w-5" />
                            </span>
                            <span className="flex-1 text-sm font-bold text-slate-800">
                              {option.label}
                            </span>
                            <span
                              className={cx(
                                "flex h-5 w-5 items-center justify-center rounded-full border-2",
                                selected
                                  ? "border-[var(--color-active-menu)]"
                                  : "border-slate-300 bg-white",
                              )}
                            >
                              {selected ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-active-menu)]" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Primary Color
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {primaryColors.map((color) => {
                        const selected = preferences.primaryColor === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            aria-label={color.label}
                            onClick={() => updatePreference("primaryColor", color.id)}
                            className={cx(
                              "flex h-9 w-9 items-center justify-center rounded-full transition",
                              selected
                                ? "ring-2 ring-[var(--color-active-menu)] ring-offset-2"
                                : "hover:scale-105",
                            )}
                            style={{ backgroundColor: color.value }}
                          >
                            {selected ? <Check className="h-4 w-4 text-white" /> : null}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white px-3 text-xs font-bold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Custom
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <PreferenceSelect
                      label="Font Size"
                      value={preferences.fontSize}
                      onChange={(value) => updatePreference("fontSize", value)}
                      Icon={Type}
                      options={["Small", "Medium (Default)", "Large", "Extra Large"]}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <PreferenceToggle
                      label="Compact Mode"
                      description="Display more content in less space"
                      checked={preferences.compactMode}
                      onChange={(checked) => updatePreference("compactMode", checked)}
                    />
                    <PreferenceToggle
                      label="Reduce Motion"
                      description="Minimize animations throughout the app"
                      checked={preferences.reduceMotion}
                      onChange={(checked) => updatePreference("reduceMotion", checked)}
                    />
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Regional & Language</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Set language, date, time, and regional display formats.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <PreferenceSelect
                      label="Language"
                      value={preferences.language}
                      onChange={(value) => updatePreference("language", value)}
                      Icon={Globe2}
                      options={[
                        "English (United States)",
                        "English (United Kingdom)",
                        "Filipino",
                      ]}
                    />
                    <PreferenceSelect
                      label="Date Format"
                      value={preferences.dateFormat}
                      onChange={(value) => updatePreference("dateFormat", value)}
                      Icon={CalendarDays}
                      options={[
                        "MMM DD, YYYY (Aug 05, 2026)",
                        "DD/MM/YYYY (05/08/2026)",
                        "YYYY-MM-DD (2026-08-05)",
                      ]}
                    />
                    <PreferenceSelect
                      label="Time Format"
                      value={preferences.timeFormat}
                      onChange={(value) => updatePreference("timeFormat", value)}
                      Icon={Clock3}
                      options={["12-hour (1:30 PM)", "24-hour (13:30)"]}
                    />
                    <PreferenceSelect
                      label="Time Zone"
                      value={preferences.timeZone}
                      onChange={(value) => updatePreference("timeZone", value)}
                      Icon={Globe2}
                      options={[
                        "(GMT+08:00) Asia/Manila",
                        "(GMT+09:00) Asia/Tokyo",
                        "(GMT+00:00) UTC",
                      ]}
                    />
                    <PreferenceSelect
                      label="First Day of Week"
                      value={preferences.firstDayOfWeek}
                      onChange={(value) => updatePreference("firstDayOfWeek", value)}
                      Icon={CalendarDays}
                      options={["Monday", "Sunday", "Saturday"]}
                    />
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-7">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Dashboard Preferences</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Control your default dashboard view and list density.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <PreferenceSelect
                      label="Default Dashboard View"
                      value={preferences.defaultDashboardView}
                      onChange={(value) => updatePreference("defaultDashboardView", value)}
                      Icon={LayoutDashboard}
                      options={[
                        "My Compliance Overview",
                        "Policy Library",
                        "Acknowledgements",
                      ]}
                    />
                    <PreferenceSelect
                      label="Items per Page"
                      value={preferences.itemsPerPage}
                      onChange={(value) => updatePreference("itemsPerPage", value)}
                      options={["10 items", "20 items", "50 items", "100 items"]}
                    />
                  </div>

                  <div className="mt-4">
                    <PreferenceToggle
                      label="Show Quick Actions"
                      description="Display quick action shortcuts on your dashboard"
                      checked={preferences.showQuickActions}
                      onChange={(checked) => updatePreference("showQuickActions", checked)}
                    />
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "activity" ? (
              <PlaceholderPanel
                Icon={Activity}
                title="Activity"
                description="Recent account activity, logins, and profile changes will show up in this tab."
              />
            ) : null}
          </div>

          <aside className="space-y-4">
            {activeTab === "security" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="10"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="var(--color-success)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.92)}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-[var(--color-success)]" />
                      </div>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">Strong Security Score</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Your account meets Hinora&apos;s recommended security baseline.
                    </p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {securityChecklist.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--color-success)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Security Tips</h3>
                  <ul className="mt-4 space-y-4">
                    {securityTips.map((tip) => (
                      <li key={tip.title} className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                          <Shield className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{tip.title}</div>
                          <p className="mt-1 text-sm leading-5 text-slate-500">{tip.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-active-menu)]"
                  >
                    <span>Learn more about account security</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </section>
              </>
            ) : null}

            {activeTab === "devices" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Session Summary</h3>
                  <ul className="mt-4 space-y-3">
                    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-success)]">
                          <Laptop className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-700">Current Session</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">1</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                          <Monitor className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-700">Other Active Sessions</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">{otherSessions.length}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Shield className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-700">Total Devices Used</span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {1 + otherSessions.length}
                      </span>
                    </li>
                  </ul>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Recent Security Activity</h3>
                  <ol className="relative mt-5 space-y-4 border-l border-slate-200 pl-4">
                    {recentSecurityActivity.map((item) => (
                      <li key={item.id} className="relative">
                        <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--color-active-menu)] shadow" />
                        <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">{item.when}</div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Stay Secure</h3>
                  <ul className="mt-4 space-y-3">
                    {staySecureTips.map((tip) => {
                      const TipIcon = tip.Icon;
                      return (
                      <li key={tip.title} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                          <TipIcon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{tip.title}</span>
                      </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-active-menu)]"
                  >
                    <span>Learn more about account security</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </section>
              </>
            ) : null}

            {activeTab === "preferences" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Preferences Summary</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    {[
                      {
                        label: "Theme",
                        value: preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1),
                        Icon: Sun,
                      },
                      {
                        label: "Primary Color",
                        value: selectedPrimaryColor.label,
                        Icon: Palette,
                      },
                      { label: "Language", value: "English", Icon: Globe2 },
                      { label: "Date Format", value: "MMM DD, YYYY", Icon: CalendarDays },
                      { label: "Time Zone", value: "Asia/Manila", Icon: Globe2 },
                      { label: "Time Format", value: preferences.timeFormat.includes("12") ? "12-hour" : "24-hour", Icon: Clock3 },
                      { label: "Font Size", value: preferences.fontSize.replace(" (Default)", ""), Icon: Type },
                      {
                        label: "Compact Mode",
                        value: preferences.compactMode ? "On" : "Off",
                        Icon: SlidersHorizontal,
                      },
                    ].map((item) => {
                      const ItemIcon = item.Icon;
                      return (
                        <div key={item.label} className="flex items-center justify-between gap-3">
                          <dt className="inline-flex items-center gap-2 text-slate-500">
                            <ItemIcon className="h-3.5 w-3.5" />
                            {item.label}
                          </dt>
                          <dd className="font-semibold text-slate-800">{item.value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Quick Tips</h3>
                  <ul className="mt-4 space-y-3">
                    {preferenceTips.map((tip) => {
                      const TipIcon = tip.Icon;
                      return (
                        <li
                          key={tip.title}
                          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                            <TipIcon className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{tip.title}</div>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">{tip.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-base font-bold text-slate-900">Reset Preferences</h3>
                  <p className="mt-2 text-sm leading-5 text-slate-500">
                    Restore all preferences to their defaults.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreferences(defaultPreferences)}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </button>
                </section>
              </>
            ) : null}

            {activeTab !== "security" && activeTab !== "devices" && activeTab !== "preferences" ? (
              <>
                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="10"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="var(--color-active-menu)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.85)}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-2xl font-extrabold text-slate-900">85%</div>
                        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
                          Complete
                        </div>
                      </div>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">Profile Completion</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Finish the remaining items to complete your profile.
                    </p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {completionItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2.5 text-sm font-semibold">
                        {item.done ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-[var(--color-success)]" />
                        ) : (
                          <Circle className="h-4.5 w-4.5 text-[var(--color-active-menu)]" />
                        )}
                        <span className={item.done ? "text-slate-700" : "text-slate-500"}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4.5 w-4.5 text-[var(--color-active-menu)]" />
                    <h3 className="text-base font-bold text-slate-900">Account Status</h3>
                  </div>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Status</dt>
                      <dd className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                        Active
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Last Login</dt>
                      <dd className="font-semibold text-slate-800">Today, 9:15 AM</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Member Since</dt>
                      <dd className="font-semibold text-slate-800">Jan 15, 2021</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Password Changed</dt>
                      <dd className="font-semibold text-slate-800">Jun 20, 2026</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <History className="h-4 w-4" />
                    <span>View Account Activity</span>
                  </button>
                </section>
              </>
            ) : null}
          </aside>
        </div>

        <ModuleGuide guideKey="Profile" />
      </div>
    </DashboardShell>
  );
}
