"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Sparkles } from "lucide-react";
import { BrandLockup } from "./primitives";
import {
  getAskHinoraHref,
  isNavItemActive,
  type NavItem,
  type NavSection,
  type NavVariant,
} from "./navigation";
import { useSidebarPermissions } from "./use-sidebar-permissions";
import { useInboxUnreadCount } from "../inbox/use-inbox-unread-count";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type NavProps = {
  variant: NavVariant;
  /** Overrides the role used to resolve module permissions. Falls back to the stored session. */
  roleTitle?: string;
  className?: string;
};

function AskHinoraCard({ variant }: { variant: NavVariant }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#5b4ae0] text-white shadow-[0_8px_20px_rgba(91,74,224,0.35)]">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[0.95rem] font-bold text-white">Ask Hinora AI</div>
          <p className="mt-1 text-[0.8rem] leading-5 text-slate-300/70">
            Get help with policies and compliance.
          </p>
        </div>
      </div>

      <Link
        href={getAskHinoraHref(variant)}
        className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-2.5 text-[0.85rem] font-bold text-[#93aaff] transition hover:bg-white/[0.12] hover:text-white"
      >
        <span>Ask Now</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pb-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--color-nav-section)]">
      {children}
    </div>
  );
}

function useResolvedSections(variant: NavVariant, roleTitle?: string) {
  return useSidebarPermissions(roleTitle, variant);
}

function navBadge(item: NavItem, unreadCount: number) {
  if (item.moduleKey === "Notifications") {
    return unreadCount > 0 ? String(unreadCount > 99 ? "99+" : unreadCount) : undefined;
  }
  return item.badge;
}

export function DashboardSidebar({ variant, roleTitle, className }: NavProps) {
  const pathname = usePathname();
  const { sections } = useResolvedSections(variant, roleTitle);
  const unreadCount = useInboxUnreadCount();

  return (
    <aside
      className={cx(
        "hidden bg-[linear-gradient(180deg,var(--color-nav-start)_0%,var(--color-nav-end)_100%)] px-4 py-[22px] text-white xl:sticky xl:top-0 xl:flex xl:h-screen xl:w-full xl:flex-col",
        className,
      )}
    >
      <BrandLockup paddingClassName="px-2 pb-6" />

      <nav className="nav-scroll flex flex-1 flex-col gap-5 overflow-y-auto pb-5 pr-1.5">
        {sections.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`}>
            {section.label ? <SectionLabel>{section.label}</SectionLabel> : null}

            <div className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const active = isNavItemActive(item.href, pathname);
                const badge = navBadge(item, unreadCount);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] leading-tight transition",
                      active
                        ? "bg-[linear-gradient(135deg,var(--color-nav-active)_0%,var(--color-nav-active-end)_100%)] font-bold text-white shadow-[0_10px_24px_rgba(79,70,229,0.35)]"
                        : "font-medium text-[var(--color-nav-item)] hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <item.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {badge ? (
                      <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-nav-active)] px-1 text-[0.68rem] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="pt-4">
        <AskHinoraCard variant={variant} />
      </div>
    </aside>
  );
}

export function DashboardMobileNav({ variant, roleTitle, className }: NavProps) {
  const pathname = usePathname();
  const { sections } = useResolvedSections(variant, roleTitle);
  const unreadCount = useInboxUnreadCount();

  return (
    <div className={cx("border-b border-slate-200 bg-white px-4 py-3 xl:hidden", className)}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Navigation
          </span>
          <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
        </summary>

        <div className="mt-3 space-y-3">
          {sections.map((section, sectionIndex) => (
            <div key={section.label ?? `mobile-section-${sectionIndex}`} className="space-y-2">
              {section.label ? (
                <div className="px-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {section.label}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {section.items.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  const badge = navBadge(item, unreadCount);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "border-[var(--color-nav-active)] bg-indigo-50 text-[var(--color-nav-active)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[var(--color-nav-active)]/40 hover:bg-slate-50",
                      )}
                    >
                      <item.Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {badge ? (
                        <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-nav-active)] px-1 text-[0.7rem] font-bold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
