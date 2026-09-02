import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import NotificationBell from "../inbox/notification-bell";
import { ThemeToggle } from "../theme/theme-toggle";
import GlobalCommandBar from "./global-command-bar";
import SessionProfileDropdown from "./session-profile-dropdown";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

type DashboardTopbarProps = {
  searchPlaceholder: string;
  searchMaxWidthClassName?: string;
  notificationCount: number;
  notificationsHref?: string;
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
        "sticky top-0 z-30 flex flex-col gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between",
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
        <NotificationBell />

        {SecondaryActionIcon && secondaryActionLabel ? (
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
            type="button"
            aria-label={secondaryActionLabel}
          >
            <SecondaryActionIcon className="h-5 w-5" />
          </button>
        ) : null}

        <ThemeToggle />

        <SessionProfileDropdown
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
  /** Renders the action as a button instead of a link. */
  onAction?: () => void;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({
  title,
  action,
  onAction,
  children,
  className,
}: DashboardPanelProps) {
  const actionClassName = "text-[0.85rem] font-bold text-[var(--color-active-menu)]";

  return (
    <article
      className={cx(
        "rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[1.08rem] font-bold text-slate-900">{title}</h2>
        {action && onAction ? (
          <button type="button" onClick={onAction} className={actionClassName}>
            {action}
          </button>
        ) : action ? (
          <a href="#" className={actionClassName}>
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
