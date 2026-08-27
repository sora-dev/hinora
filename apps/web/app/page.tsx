"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bot,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api-base-url";
import { collectDeviceClientInfo } from "../lib/device-info";

const testAccounts = [
  {
    label: "Admin",
    email: "admin@hinora.com",
    password: "admin123",
    Icon: UserCog,
  },
  {
    label: "Employee",
    email: "employee@hinora.com",
    password: "employe123",
    Icon: UserRound,
  },
  {
    label: "Manager",
    email: "maria.santos@hinora.com",
    password: "TempPass123!",
    Icon: UserRound,
  },
] as const;

const sessionStorageKey = "hinora_session";
type LoginFormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

function BrandLockup() {
  return (
    <div className="flex items-center gap-4 text-slate-900">
      <div className="relative h-14 w-[214px]">
        <Image
          src="/branding/hinora-logo-colored.png"
          alt="Hinora AI Policy Library"
          fill
          sizes="214px"
          className="object-contain object-left"
          priority
        />
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 text-sm font-semibold text-white/90">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span>{label}</span>
    </li>
  );
}

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const helperText = testAccounts.map((account) => `${account.label}: ${account.email} / ${account.password}`);

  const handleSubmit = async (event: LoginFormSubmitEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log("API BASE URL =", apiBaseUrl);
      if (!apiBaseUrl) {
        throw new Error(
          "API URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in Vercel to your Railway URL, then redeploy.",
        );
      }

      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          ...collectDeviceClientInfo(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            accessToken?: string;
            sessionId?: string;
            redirectTo?: string;
            user?: {
              id: string;
              email: string;
              role: string;
              roleTitle: string;
              fullName: string;
            };
          }
        | null;

      if (!response.ok || !payload?.accessToken || !payload.user || !payload.redirectTo) {
        throw new Error(payload?.message ?? "Invalid email or password.");
      }

      const sessionPayload = {
        accessToken: payload.accessToken,
        sessionId: payload.sessionId,
        userId: payload.user.id,
        email: payload.user.email,
        role: payload.user.role,
        roleTitle: payload.user.roleTitle,
        name: payload.user.fullName,
        redirectTo: payload.redirectTo,
        rememberMe,
      };

      window.localStorage.setItem(sessionStorageKey, JSON.stringify(sessionPayload));
      router.push(payload.redirectTo);
      return;
    } catch (error: unknown) {
      setIsSubmitting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in right now.",
      );
    }
  };

  const fillDemoCredentials = (accountIndex: number) => {
    const account = testAccounts[accountIndex];
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage("");
  };

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] xl:grid-cols-[minmax(360px,48%)_minmax(420px,52%)]">
      <section className="flex items-stretch justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex w-full max-w-[540px] flex-col px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <BrandLockup />

          <div className="mt-12 sm:mt-16">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Welcome back</h1>
            <p className="mt-3 text-base text-slate-500 sm:text-[1.04rem]">
              Sign in to continue to your account
            </p>
          </div>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <label htmlFor="email" className="text-[0.94rem] font-bold text-slate-800">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white/95 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label htmlFor="password" className="text-[0.94rem] font-bold text-slate-800">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white/95 pl-11 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="remember-me" className="inline-flex cursor-pointer items-center gap-2.5 text-[0.96rem] font-semibold text-slate-700">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                />
                <span>Remember Me</span>
              </label>

              <a href="#forgot-password" className="text-[0.94rem] font-semibold text-[var(--color-active-menu)]">
                Forgot Password?
              </a>
            </div>

            <button
              className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] font-extrabold tracking-[0.04em] text-white shadow-[0_16px_32px_rgba(37,99,235,0.18)] transition hover:-translate-y-0.5"
              type="submit"
            >
              {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
            </button>

            {errorMessage ? <p className="-mt-1 text-sm font-semibold text-red-600">{errorMessage}</p> : null}

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="mb-3 flex flex-col gap-1">
                <strong className="text-[0.98rem] text-slate-800">Test Access</strong>
                <span className="text-[0.82rem] leading-6 text-slate-500">These accounts are now checked against Supabase</span>
              </div>

              <ul className="space-y-2.5">
                {testAccounts.map((account, index) => {
                  const Icon = account.Icon;

                  return (
                    <li
                      key={account.email}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <strong className="block text-[0.92rem] text-slate-900">{account.label}</strong>
                          <span className="mt-1 block text-[0.82rem] text-slate-500">{account.email}</span>
                          <code className="mt-1.5 block text-[0.8rem] font-bold text-[var(--color-active-menu)]">{account.password}</code>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-10 min-w-[76px] items-center justify-center rounded-xl border border-slate-200 bg-blue-50 px-4 font-semibold text-[var(--color-active-menu)] transition hover:bg-blue-100"
                        onClick={() => fillDemoCredentials(index)}
                      >
                        Use
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-[0.82rem] leading-6 text-slate-500">{helperText.join(" | ")}</p>
              <p className="mt-2 text-[0.8rem] leading-6 text-slate-400">
                Inactive and locked accounts remain blocked by the real login rules.
              </p>
            </div>

            <div className="flex items-center gap-4 text-slate-300" aria-hidden="true">
              <span className="h-px flex-1 bg-current" />
              <strong className="text-sm tracking-[0.2em] text-slate-400">OR</strong>
              <span className="h-px flex-1 bg-current" />
            </div>

            <button
              className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white/85 font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white"
              type="button"
            >
              <Building2 className="h-[18px] w-[18px]" />
              <span>Sign in with SSO</span>
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">© 2026 Hinora. All rights reserved.</p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_22%),linear-gradient(180deg,var(--color-sidebar)_0%,var(--color-sidebar-end)_100%)] xl:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(37,99,235,0.18),transparent_18%),radial-gradient(circle_at_88%_33%,rgba(29,78,216,0.18),transparent_8%),radial-gradient(circle_at_95%_68%,rgba(124,58,237,0.16),transparent_12%)]" />
        <div className="absolute -bottom-28 left-0 right-0 h-[340px] bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.32),transparent_58%)]" />
        <div className="absolute -bottom-8 left-[-8%] h-56 w-[78%] rounded-[100%] border border-white/15" />
        <div className="absolute -bottom-16 right-[-5%] h-64 w-[72%] rounded-[100%] border border-white/10" />
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 py-16 text-center">
          <div className="flex h-36 w-36 items-center justify-center rounded-[32px] border-4 border-white/85 bg-white/95 shadow-[0_30px_70px_rgba(2,12,45,0.28)]">
            <div className="relative h-24 w-24">
              <Image
                src="/branding/hinora-logo-icon.png"
                alt="Rural Bank of Hinora"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-7">
            <p className="text-lg tracking-[0.35em] text-white/90">RURAL BANK OF</p>
            <h2 className="mt-2 text-7xl font-semibold tracking-wide text-white">HINORA</h2>
            <p className="mt-6 text-xl text-amber-300">AI-powered policy compliance</p>
          </div>

          <div className="mt-8 h-px w-full max-w-[420px] bg-white/20" />

          <div className="mt-8">
            <span className="text-sm uppercase tracking-[0.28em] text-white/70">Powered by</span>
            <div className="mt-4 flex items-center justify-center">
              <div className="relative h-16 w-[260px]">
                <Image
                  src="/branding/hinora-logo-white.png"
                  alt="Hinora AI Policy Library"
                  fill
                  sizes="260px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <p className="mt-4 text-lg text-white/85">AI Policy Library &amp; Knowledge Management System</p>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <StatPill icon={ShieldCheck} label="Secure" />
            <StatPill icon={BadgeCheck} label="Compliant" />
            <StatPill icon={Bot} label="Intelligent" />
          </ul>
        </div>
      </section>
    </main>
  );
}
