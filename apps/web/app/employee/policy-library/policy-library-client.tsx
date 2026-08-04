"use client";

import {
  Bell,
  BookOpenText,
  Bot,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  ShieldCheck,
  UserRound,
  Bookmark,
} from "lucide-react";
import type { DashboardNavSection } from "../../../components/dashboard/primitives";
import PolicyLibraryExperience from "../../../components/policy-library/policy-library-experience";

const menuSections: readonly DashboardNavSection[] = [
  {
    items: [
      { label: "Dashboard", Icon: LayoutDashboard, href: "/employee/dashboard" },
      { label: "Policy Library", Icon: BookOpenText, href: "/employee/policy-library", active: true },
      { label: "AI Assistant", Icon: Bot, href: "#" },
      { label: "My Acknowledgments", Icon: ShieldCheck, href: "#" },
      { label: "Bookmarks", Icon: Bookmark, href: "#" },
      { label: "Notifications", Icon: Bell, href: "#", badge: "3" },
      { label: "Help & Support", Icon: HelpCircle, href: "#" },
      { label: "Profile", Icon: UserRound, href: "#" },
    ],
  },
];

export default function EmployeePolicyLibraryClient() {
  return (
    <PolicyLibraryExperience
      mode="employee"
      sections={menuSections}
      profileName="John Dela Cruz"
      profileRole="IT Department"
      avatarText="J"
      footer={
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-[rgba(11,31,58,0.72)] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200">
              <Lightbulb className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-3 text-base font-bold text-white">Ask Hinora</h3>
            <p className="mt-2 text-[0.88rem] leading-6 text-slate-200/75">
              Ask questions about policies and get instant answers powered by AI.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white"
            >
              <span>Ask Now</span>
              <Bot className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-sidebar)] font-bold">
              JD
            </div>
            <div>
              <div className="text-sm font-bold text-white">John Dela Cruz</div>
              <div className="text-[0.8rem] text-slate-200/70">IT Department</div>
            </div>
          </div>
        </div>
      }
    />
  );
}
