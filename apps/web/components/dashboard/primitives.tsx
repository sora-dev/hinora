import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Bell, Menu } from "lucide-react";
import GlobalCommandBar from "./global-command-bar";
import ProfileDropdown from "./profile-dropdown";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type DashboardNavItem = {
  label: string;
  Icon: LucideIcon;
  active?: boolean;
  badge?: string;
  href?: string;
};

export type DashboardNavSection = {
  label?: string;
  items: readonly DashboardNavItem[];
};

type BrandLockupProps = {
  paddingClassName?: string;
  subtitleClassName?: string;
};

export function BrandLockup({
  paddingClassName = "px-2 pb-6",
  subtitleClassName = "text-white/70",
}: BrandLockupProps) {
  return (
    <div className={cx("flex items-center gap-3", paddingClassName)}>
      <div className="relative h-12 w-[158px]">
        <Image
          src="/branding/hinora-logo-white.png"
          alt="Hinora AI Policy Library"
          fill
          sizes="158px"
          className="object-contain object-left"
          priority
        />
      </div>
      <span className={cx("sr-only", subtitleClassName)}>Hinora AI Policy Library</span>
    </div>
  );
}

type DashboardSidebarProps = {
  sections: readonly DashboardNavSection[];
  footer?: ReactNode;
  className?: string;
  navClassName?: string;
  brandPaddingClassName?: string;
  brandSubtitleClassName?: string;
};

export function DashboardSidebar({
  sections,
  footer,
  className,
  navClassName,
  brandPaddingClassName,
  brandSubtitleClassName,
}: DashboardSidebarProps) {
  return (
    <aside
      className={cx(
        "hidden px-4 py-[22px] text-white xl:flex xl:flex-col",
        className,
      )}
    >
      <BrandLockup
        paddingClassName={brandPaddingClassName}
        subtitleClassName={brandSubtitleClassName}
      />

      <nav className={cx("flex flex-1 flex-col gap-[18px] overflow-y-auto pr-1", navClassName)}>
        {sections.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`} className="space-y-2">
            {section.label ? (
              <div className="px-2 text-[0.68rem] font-bold tracking-[0.14em] text-slate-200/50">
                {section.label}
              </div>
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href ?? "#"}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-semibold transition",
                    item.active
                      ? "bg-[var(--color-active-menu)] text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)]"
                      : "text-white/88 hover:bg-[var(--color-hover)]",
                  )}
                >
                  <item.Icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1 text-[0.7rem] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {footer ? <div className="pt-4">{footer}</div> : null}
    </aside>
  );
}

type DashboardMobileNavProps = {
  sections: readonly DashboardNavSection[];
  className?: string;
};

export function DashboardMobileNav({
  sections,
  className,
}: DashboardMobileNavProps) {
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
                <div className="px-1 text-[0.68rem] font-bold tracking-[0.14em] text-slate-400">
                  {section.label}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {section.items.map((item) => (
                  <a
                    key={item.label}
                    href={item.href ?? "#"}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                      item.active
                        ? "border-[var(--color-active-menu)] bg-blue-50 text-[var(--color-active-menu)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[var(--color-active-menu)]/40 hover:bg-slate-50",
                    )}
                  >
                    <item.Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1 text-[0.7rem] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

type DashboardTopbarProps = {
  searchPlaceholder: string;
  searchMaxWidthClassName?: string;
  notificationCount: number;
  secondaryActionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  profileName: string;
  profileRole: string;
  avatarText: string;
  avatarClassName?: string;
  showMenuButton?: boolean;
  className?: string;
};

export function DashboardTopbar({
  searchPlaceholder,
  searchMaxWidthClassName = "max-w-[700px]",
  notificationCount,
  secondaryActionIcon: SecondaryActionIcon,
  secondaryActionLabel,
  profileName,
  profileRole,
  avatarText,
  avatarClassName = "from-[var(--color-active-menu)] to-[var(--color-hover)]",
  showMenuButton = false,
  className,
}: DashboardTopbarProps) {
  return (
    <header
      className={cx(
        "sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {showMenuButton ? (
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 xl:hidden"
            type="button"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        <GlobalCommandBar
          placeholder={searchPlaceholder}
          className={searchMaxWidthClassName}
        />
      </div>

      <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start">
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
          type="button"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1 text-[0.68rem] font-bold text-white">
            {notificationCount}
          </span>
        </button>

        {SecondaryActionIcon && secondaryActionLabel ? (
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
            type="button"
            aria-label={secondaryActionLabel}
          >
            <SecondaryActionIcon className="h-5 w-5" />
          </button>
        ) : null}

        <ProfileDropdown
          profileName={profileName}
          profileRole={profileRole}
          avatarText={avatarText}
          avatarClassName={avatarClassName}
        />
      </div>
    </header>
  );
}

type DashboardPanelProps = {
  title: string;
  action?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({
  title,
  action,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <article
      className={cx(
        "rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[1.08rem] font-bold text-slate-900">{title}</h2>
        {action ? (
          <a href="#" className="text-[0.85rem] font-bold text-[var(--color-active-menu)]">
            {action}
          </a>
        ) : null}
      </div>
      {children}
    </article>
  );
}

type DashboardStatCardProps = {
  title: string;
  value: string;
  Icon: LucideIcon;
  iconClassName: string;
  detail?: string;
  detailSecondary?: string;
  valueMeta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function DashboardStatCard({
  title,
  value,
  Icon,
  iconClassName,
  detail,
  detailSecondary,
  valueMeta,
  trailing,
  className,
}: DashboardStatCardProps) {
  return (
    <article
      className={cx(
        "flex items-center gap-3.5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className={cx("flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ring-1 ring-inset ring-black/4", iconClassName)}>
        <Icon className="h-5.5 w-5.5" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[0.82rem] font-bold text-slate-600">{title}</div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <strong className="text-[2rem] leading-none text-slate-900">{value}</strong>
          {valueMeta ?? trailing}
        </div>
        {detail || detailSecondary ? (
          <div
            className={cx(
              "mt-2 gap-3 text-[0.74rem] text-slate-500",
              detailSecondary ? "flex items-center justify-between" : "block",
            )}
          >
            {detail ? <span>{detail}</span> : null}
            {detailSecondary ? <span>{detailSecondary}</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
