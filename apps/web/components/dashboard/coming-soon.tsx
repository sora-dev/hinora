"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Hammer, Sparkles } from "lucide-react";
import DashboardShell from "./dashboard-shell";
import { ModuleGuide } from "./module-guide";
import { getAskHinoraHref, getNavSections, isNavItemActive, type NavVariant } from "./navigation";

type ComingSoonProps = {
  variant: NavVariant;
  description?: string;
};

export default function ComingSoon({ variant, description }: ComingSoonProps) {
  const pathname = usePathname();

  const activeItem = getNavSections(variant)
    .flatMap((section) => section.items)
    .find((item) => isNavItemActive(item.href, pathname));

  const ModuleIcon = activeItem?.Icon ?? Hammer;
  const title = activeItem?.label ?? "Module";

  return (
    <DashboardShell variant={variant}>
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5">
          <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {description ?? "This module is planned for an upcoming Hinora release."}
          </p>
        </div>

        <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[var(--color-nav-active)]">
            <ModuleIcon className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">{title} is in development</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            The navigation and permissions for this module are already wired up. The screens and
            APIs behind it are being built next.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${variant}/dashboard`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={getAskHinoraHref(variant)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-nav-active)] px-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask Hinora AI</span>
            </Link>
          </div>
        </div>

        {variant === "admin" && activeItem?.label && activeItem.label !== "Dashboard" ? (
          <ModuleGuide guideKey={activeItem.moduleKey ?? activeItem.label} />
        ) : null}
      </div>
    </DashboardShell>
  );
}
