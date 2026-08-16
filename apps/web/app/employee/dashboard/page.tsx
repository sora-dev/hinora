import type { Metadata } from "next";
import {
  BookMarked,
  BookOpenText,
  Bot,
  Bookmark,
  ChevronRight,
  Download,
  Headphones,
  Home,
  Megaphone,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  DashboardPanel,
  DashboardStatCard,
  DashboardTopbar,
} from "../../../components/dashboard/primitives";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "../../../components/dashboard/dashboard-nav";
import { ContinueReadingPanel } from "../../../components/dashboard/continue-reading-panel";

const statCards = [
  {
    title: "Policies Available",
    value: "245",
    description: "All published policies",
    tone: "bg-blue-50 text-[var(--color-active-menu)]",
    Icon: BookOpenText,
  },
  {
    title: "Pending Acknowledgments",
    value: "3",
    description: "Policies to acknowledge",
    tone: "bg-amber-50 text-[var(--color-warning)]",
    Icon: ShieldCheck,
  },
  {
    title: "Bookmarked Policies",
    value: "12",
    description: "Saved for later",
    tone: "bg-emerald-50 text-[var(--color-success)]",
    Icon: BookMarked,
  },
  {
    title: "Listened This Month",
    value: "15",
    description: "Audio policy sessions",
    tone: "bg-violet-50 text-[var(--color-ai-accent)]",
    Icon: Headphones,
  },
] as const;

const examples = [
  "What is our leave policy?",
  "Explain BSP Circular 1160.",
  "Summarize our IT Security Policy.",
  "What is our data privacy policy?",
] as const;

const updatedPolicies = [
  { title: "Anti-Money Laundering Policy", date: "Updated on May 10, 2024" },
  { title: "Cybersecurity Policy", date: "Updated on May 9, 2024" },
  { title: "HR Manual", date: "Updated on May 8, 2024" },
  { title: "Procurement Policy", date: "Updated on May 7, 2024" },
] as const;

const pendingAcknowledgments = [
  {
    title: "Information Security Policy",
    due: "Due on May 20, 2024",
    badge: "Due Soon",
    tone: "bg-red-50 text-[var(--color-error)]",
    badgeTone: "bg-red-50 text-[var(--color-error)]",
    Icon: ShieldCheck,
  },
  {
    title: "Data Privacy Manual",
    due: "Due by May 25, 2024",
    badge: "Due Soon",
    tone: "bg-amber-50 text-[var(--color-warning)]",
    badgeTone: "bg-amber-50 text-[var(--color-warning)]",
    Icon: BookOpenText,
  },
  {
    title: "Business Continuity Plan",
    due: "Due on June 5, 2024",
    badge: "Not Due Yet",
    tone: "bg-blue-50 text-[var(--color-active-menu)]",
    badgeTone: "bg-blue-50 text-[var(--color-active-menu)]",
    Icon: Home,
  },
] as const;

const quickActions = [
  { label: "Browse Policies", Icon: Search },
  { label: "Ask AI", Icon: Bot },
  { label: "Listen to Policy", Icon: Headphones },
  { label: "Download PDF", Icon: Download },
  { label: "My Bookmarks", Icon: Bookmark },
] as const;

export const metadata: Metadata = {
  title: "Hinora | Employee Dashboard",
  description: "Employee dashboard for Hinora AI Policy Library",
};

function AskIllustration() {
  return (
    <svg viewBox="0 0 260 160" aria-hidden="true" className="h-auto w-full max-w-[250px]">
      <defs>
        <linearGradient id="employee-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <ellipse cx="145" cy="130" rx="92" ry="12" fill="#EDE9FE" />
      <path
        d="M97 40c0-7 6-13 13-13h55c7 0 13 6 13 13v62c0 7-6 13-13 13h-37l-16 11 2-11h-4c-7 0-13-6-13-13V40Z"
        fill="#fff"
        stroke="url(#employee-glow)"
        strokeWidth="5"
      />
      <path d="M116 52h45M116 68h38M116 84h28" fill="none" stroke="#C4B5FD" strokeWidth="6" strokeLinecap="round" />
      <path d="m157 65 19 20" fill="none" stroke="#DDD6FE" strokeWidth="10" strokeLinecap="round" />
      <rect x="175" y="30" width="56" height="42" rx="12" fill="url(#employee-glow)" />
      <circle cx="192" cy="51" r="5" fill="#fff" />
      <circle cx="203" cy="51" r="5" fill="#fff" />
      <circle cx="214" cy="51" r="5" fill="#fff" />
      <path
        d="M94 105c15 10 32 20 52 20s38-10 54-20"
        fill="none"
        stroke="#DDD6FE"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M68 60 74 68 82 62 76 74 83 82 72 80 66 90 65 78 54 75 64 69 68 60Z" fill="#DDD6FE" />
      <path d="M35 78 38 84 44 86 38 89 36 95 33 89 27 87 33 84 35 78Z" fill="#DDD6FE" />
    </svg>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="employee" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, manuals, or ask Hinora..."
          searchMaxWidthClassName="max-w-[660px]"
          notificationCount={3}
          secondaryActionIcon={Bookmark}
          secondaryActionLabel="Bookmarks"
          profileName="John Dela Cruz"
          profileRole="IT Department"
          avatarText="J"
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          className="py-3.5"
        />
        <DashboardMobileNav variant="employee" />

        <div className="px-4 py-4 md:px-5">
          <section className="mb-3">
            <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Good morning, John! 👋</h1>
            <p className="mt-1 text-slate-500">Welcome back to Hinora. Ask, read, learn.</p>
          </section>

          <section className="mb-3 grid items-center gap-4 rounded-[18px] border border-slate-200 bg-gradient-to-b from-[var(--color-hero-from)] to-[var(--color-hero-via)] px-5 py-[18px] xl:grid-cols-[minmax(0,1.5fr)_280px]">
            <div>
              <h2 className="text-[1.55rem] font-bold text-slate-900">Ask Hinora anything about our policies.</h2>

              <label className="mt-4 flex h-[54px] items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 text-slate-400">
                <Sparkles className="h-[18px] w-[18px] text-[var(--color-ai-accent)]" />
                <input
                  type="text"
                  placeholder="Ask a question or search for policies..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-slate-800 outline-none"
                />
                <button
                  type="button"
                  aria-label="Submit question"
                  className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[var(--color-active-menu)] text-white"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </label>

              <div className="mt-4">
                <span className="block text-[0.84rem] font-bold text-slate-500">Try these examples:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-[0.82rem] font-bold text-slate-600"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <AskIllustration />
            </div>
          </section>

          <section className="mb-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.description}
                Icon={card.Icon}
                iconClassName={card.tone}
                trailing={<ChevronRight className="h-5 w-5 text-slate-400" />}
                className="rounded-2xl"
              />
            ))}
          </section>

          <section className="mb-3 grid gap-3 2xl:grid-cols-3">
            <ContinueReadingPanel />

            <DashboardPanel title="Recently Updated Policies" action="View all" className="rounded-2xl">
              <ul className="space-y-3.5">
                {updatedPolicies.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[0.7rem] font-extrabold text-[var(--color-success)]">
                      NEW
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="m-0 text-[0.95rem] font-semibold text-slate-900">{item.title}</h3>
                      <p className="m-0 text-[0.8rem] text-slate-500">{item.date}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </li>
                ))}
              </ul>
            </DashboardPanel>

            <DashboardPanel title="My Pending Acknowledgments" action="View all" className="rounded-2xl">
              <ul className="space-y-3.5">
                {pendingAcknowledgments.map((item) => {
                  const Icon = item.Icon;

                  return (
                    <li key={item.title} className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 text-[0.95rem] font-semibold text-slate-900">{item.title}</h3>
                        <p className="m-0 text-[0.8rem] text-slate-500">{item.due}</p>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[0.7rem] font-extrabold ${item.badgeTone}`}>
                        {item.badge}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>
          </section>

          <section className="grid gap-3 2xl:grid-cols-[1.12fr_1.3fr_0.9fr]">
            <DashboardPanel title="Recent Announcements" action="View all" className="rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-[0.95rem] font-semibold text-slate-900">New Data Privacy Manual is now available</h3>
                  <p className="m-0 text-[0.8rem] text-slate-500">
                    Please review and acknowledge the updated policy.
                  </p>
                  <span className="mt-2.5 block text-[0.78rem] text-slate-400">May 9, 2024 · Posted by Admin</span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </DashboardPanel>

            <DashboardPanel title="Quick Actions" className="rounded-2xl">
              <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {quickActions.map((action) => {
                  const Icon = action.Icon;

                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-center text-[0.8rem] font-bold text-slate-700"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-[var(--color-ai-accent)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </DashboardPanel>

            <article className="rounded-2xl border border-slate-200 bg-white p-[18px] shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <h2 className="text-[1.2rem] font-bold text-slate-900">Need Help?</h2>
              <p className="mt-2 text-slate-500">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex h-[46px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-active-menu)] to-[var(--color-hover)] font-extrabold text-white"
              >
                Contact Support
              </button>
            </article>
          </section>

          <footer className="flex flex-col gap-2 px-1 pt-4 text-[0.8rem] text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>© 2024 Hinora. All rights reserved.</span>
            <span>Hinora AI Policy Library &amp; Knowledge Management System</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
