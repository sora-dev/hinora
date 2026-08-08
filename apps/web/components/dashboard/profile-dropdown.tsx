"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  ChevronDown,
  Globe,
  HelpCircle,
  KeyRound,
  Languages,
  LogOut,
  Palette,
  Shield,
  User,
} from "lucide-react";
import { getProfileHrefFromPathname } from "./navigation";

type ProfileDropdownProps = {
  profileName: string;
  profileRole: string;
  avatarText: string;
  avatarClassName: string;
};

type MenuItem = {
  label: string;
  Icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  toneClassName?: string;
};

const sessionStorageKey = "hinora_session";

export default function ProfileDropdown({
  profileName,
  profileRole,
  avatarText,
  avatarClassName,
}: ProfileDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const profileHref = getProfileHrefFromPathname(pathname);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSignOut() {
    window.localStorage.removeItem(sessionStorageKey);
    router.push("/");
  }

  const primaryItems: MenuItem[] = [
    { label: "My Profile", Icon: User, href: profileHref },
    { label: "Change Password", Icon: KeyRound },
    { label: "Appearance", Icon: Palette },
    { label: "Language", Icon: Languages },
    { label: "MFA / Two-Factor Authentication", Icon: Shield },
    { label: "Active Sessions", Icon: Globe },
  ];

  const supportItems: MenuItem[] = [
    { label: "Help", Icon: HelpCircle, toneClassName: "text-[var(--color-error)]" },
    { label: "Documentation", Icon: BookOpenText },
  ];

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-slate-50"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white ${avatarClassName}`}
        >
          {avatarText}
        </div>
        <div className="min-w-0 text-left">
          <div className="truncate text-[0.92rem] font-bold text-slate-900">{profileName}</div>
          <div className="truncate text-[0.8rem] text-slate-500">{profileRole}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,var(--color-sidebar)_0%,var(--color-sidebar-end)_100%)] p-3 text-white shadow-[0_28px_60px_rgba(15,23,42,0.38)]">
          <div className="px-3 pb-3">
            <div className="text-sm font-bold text-white">{profileName}</div>
            <div className="text-xs text-white/55">{profileRole}</div>
          </div>

          <div className="space-y-1">
            {primaryItems.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] font-medium text-white/90 transition hover:bg-white/6"
                >
                  <item.Icon className="h-4.5 w-4.5 text-white/80" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onSelect}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] font-medium text-white/90 transition hover:bg-white/6"
                >
                  <item.Icon className="h-4.5 w-4.5 text-white/80" />
                  <span>{item.label}</span>
                </button>
              ),
            )}
          </div>

          <div className="my-3 border-t border-white/12" />

          <div className="space-y-1">
            {supportItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] font-medium text-white/90 transition hover:bg-white/6"
              >
                <item.Icon className={`h-4.5 w-4.5 ${item.toneClassName ?? "text-white/80"}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="my-3 border-t border-white/12" />

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] font-medium text-white/90 transition hover:bg-white/6"
          >
            <LogOut className="h-4.5 w-4.5 text-amber-400" />
            <span>Sign Out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
