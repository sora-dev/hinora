import type { Metadata } from "next";
import {
  Activity,
  BadgeCheck,
  Bot,
  CalendarDays,
  CircleCheckBig,
  CircleHelp,
  ClipboardList,
  Database,
  Files,
  HardDrive,
  MessageSquareText,
  SquareStack,
  Users,
  Workflow,
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

const statCards = [
  {
    title: "Total Policies",
    value: "342",
    detail: "Published: 278",
    trend: "5%",
    tone: "bg-[var(--color-active-menu)]",
    Icon: Files,
  },
  {
    title: "Total Users",
    value: "1,254",
    detail: "Active: 1,086",
    trend: "8%",
    tone: "bg-[var(--color-success)]",
    Icon: Users,
  },
  {
    title: "Acknowledgment Rate",
    value: "92.4%",
    detail: "Total Completed: 4,512",
    trend: "3.6%",
    tone: "bg-[var(--color-warning)]",
    Icon: CircleCheckBig,
  },
  {
    title: "AI Questions Today",
    value: "864",
    detail: "This Month: 18,742",
    trend: "12%",
    tone: "bg-[var(--color-ai-accent)]",
    Icon: MessageSquareText,
  },
] as const;

const policyStatus = [
  { label: "Published", value: 278, percent: "81.3%", color: "#2563EB" },
  { label: "Under Review", value: 32, percent: "9.4%", color: "#F59E0B" },
  { label: "Draft", value: 18, percent: "5.3%", color: "#7C3AED" },
  { label: "Archived", value: 14, percent: "4.1%", color: "#CBD5E1" },
] as const;

const topQuestions = [
  { label: "Password Policy", value: "1,248" },
  { label: "Leave Policy", value: "986" },
  { label: "Procurement Policy", value: "842" },
  { label: "Data Privacy", value: "731" },
  { label: "IT Security Policy", value: "689" },
] as const;

const activityFeed = [
  {
    tone: "bg-emerald-50 text-emerald-600",
    text: 'John Dela Cruz uploaded "Information Security Policy v2.0"',
    time: "2 minutes ago",
    Icon: Files,
  },
  {
    tone: "bg-violet-50 text-violet-600",
    text: 'Mary Jane Reyes approved "Procurement Manual"',
    time: "15 minutes ago",
    Icon: BadgeCheck,
  },
  {
    tone: "bg-amber-50 text-amber-600",
    text: 'HR Department updated "Employee Handbook"',
    time: "1 hour ago",
    Icon: ClipboardList,
  },
  {
    tone: "bg-blue-50 text-blue-600",
    text: 'Legal Team archived "BSP Circular 905"',
    time: "2 hours ago",
    Icon: SquareStack,
  },
  {
    tone: "bg-teal-50 text-teal-600",
    text: 'New user "Carlos Mendoza" was added by Admin',
    time: "3 hours ago",
    Icon: Users,
  },
] as const;

const approvals = [
  {
    title: "Data Governance Policy v1.0",
    meta: "Submitted by: IT Department",
    date: "May 13, 2024",
    badge: "For Review",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "Outsourcing Policy v2.1",
    meta: "Submitted by: Compliance Department",
    date: "May 12, 2024",
    badge: "For Review",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "Business Continuity Plan",
    meta: "Submitted by: Risk Management",
    date: "May 11, 2024",
    badge: "For Approval",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Social Media Policy",
    meta: "Submitted by: HR Department",
    date: "May 10, 2024",
    badge: "For Publishing",
    tone: "bg-emerald-50 text-emerald-700",
  },
] as const;

const systemHealth = [
  { label: "AI Service", meta: "Operational", badge: "Healthy", tone: "bg-emerald-50 text-emerald-700", Icon: Bot },
  { label: "Database", meta: "Operational", badge: "Healthy", tone: "bg-emerald-50 text-emerald-700", Icon: Database },
  { label: "Storage Usage", meta: "68% of 1 TB", badge: "Warning", tone: "bg-amber-50 text-amber-700", Icon: HardDrive },
  { label: "Last Backup", meta: "May 13, 2024 02:00 AM", badge: "Success", tone: "bg-emerald-50 text-emerald-700", Icon: Workflow },
  { label: "System Uptime", meta: "15 days, 6 hours", badge: "Healthy", tone: "bg-emerald-50 text-emerald-700", Icon: Activity },
] as const;

const linePoints = "8,90 46,72 84,78 122,44 160,68 198,18 236,55 274,34";

export const metadata: Metadata = {
  title: "Hinora | Admin Dashboard",
  description: "Administrative overview for Hinora AI Policy Library",
};

export default function AdminDashboardPage() {
  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant="admin" />

      <section className="flex min-w-0 flex-col">
        <DashboardTopbar
          searchPlaceholder="Search policies, users, documents, or ask Hinora..."
          notificationCount={2}
          secondaryActionIcon={CircleHelp}
          secondaryActionLabel="Help"
          profileName="Admin User"
          profileRole="System Administrator"
          avatarText="A"
          avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
          showMenuButton
          className="bg-white/88"
        />
        <DashboardMobileNav variant="admin" />

        <div className="px-4 py-5 md:px-5">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[2rem] font-extrabold leading-tight text-slate-900">Admin Dashboard</h1>
              <p className="mt-1 text-slate-500">Overview of system, users, policies, and activity.</p>
            </div>

            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 font-semibold text-slate-700"
              type="button"
            >
              <CalendarDays className="h-4 w-4" />
              <span>May 13, 2024 - May 13, 2024</span>
            </button>
          </div>

          <section className="mb-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card) => (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                detailSecondary="vs last 30 days"
                Icon={card.Icon}
                iconClassName={card.tone}
                valueMeta={<span className="whitespace-nowrap text-[0.86rem] font-bold text-[var(--color-success)]">↑ {card.trend}</span>}
              />
            ))}
          </section>

          <section className="mb-4 grid gap-4 2xl:grid-cols-[1.08fr_1.08fr_1.35fr]">
            <DashboardPanel title="Policy Status Overview">
              <div className="grid items-center gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="flex justify-center">
                  <div
                    className="grid h-[150px] w-[150px] place-items-center rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at center, #fff 43%, transparent 44%), conic-gradient(#2563EB 0 81.3%, #F59E0B 81.3% 90.7%, #7C3AED 90.7% 96%, #CBD5E1 96% 100%)",
                    }}
                  >
                    <div className="flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_#edf2f7]">
                      <strong className="text-[2rem] leading-none text-slate-900">342</strong>
                      <span className="text-[0.76rem] text-slate-500">Total Policies</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 text-[0.9rem]">
                  {policyStatus.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3 text-slate-500">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span>
                        {item.value} ({item.percent})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href="#" className="mt-3 inline-flex text-[0.85rem] font-bold text-[var(--color-active-menu)]">
                View all policies →
              </a>
            </DashboardPanel>

            <DashboardPanel title="User Compliance Overview">
              <div className="space-y-3.5">
                <div className="relative min-h-[170px]">
                  <svg viewBox="0 0 240 130" aria-hidden="true" className="w-full">
                    <path
                      d="M30 110a90 90 0 0 1 180 0"
                      fill="none"
                      stroke="#e6ebf3"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M30 110a90 90 0 0 1 180 0"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="16"
                      strokeLinecap="round"
                      pathLength="100"
                      strokeDasharray="92.4 100"
                    />
                  </svg>
                  <div className="absolute inset-x-0 top-[52px] text-center">
                    <strong className="block text-[2.2rem] leading-none text-slate-900">92.4%</strong>
                    <span className="text-[0.82rem] text-slate-500">Overall Compliance</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-[0.82rem] text-slate-500">Completed</span>
                    <strong className="mt-1.5 block text-[1.9rem] leading-none text-[var(--color-success)]">4,512</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-[0.82rem] text-slate-500">Pending</span>
                    <strong className="mt-1.5 block text-[1.9rem] leading-none text-[var(--color-warning)]">372</strong>
                  </div>
                </div>
              </div>
              <a href="#" className="mt-3 inline-flex text-[0.85rem] font-bold text-[var(--color-active-menu)]">
                View compliance report →
              </a>
            </DashboardPanel>

            <DashboardPanel title="AI Assistant Analytics" action="View full report">
              <div className="grid gap-3.5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="mb-3 text-[0.92rem] font-bold text-slate-900">Top Questions This Month</h3>
                  <ol className="space-y-2.5">
                    {topQuestions.map((item) => (
                      <li key={item.label} className="flex items-center justify-between gap-3 text-[0.9rem]">
                        <span className="text-slate-700">{item.label}</span>
                        <strong className="text-slate-900">{item.value}</strong>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="mb-3 text-[0.92rem] font-bold text-slate-900">Questions Trend</h3>
                  <svg className="w-full" viewBox="0 0 282 120" aria-hidden="true">
                    <line x1="8" y1="96" x2="274" y2="96" stroke="#e1e7f0" strokeWidth="1.5" />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {linePoints.split(" ").map((point) => {
                      const [cx, cy] = point.split(",");
                      return <circle key={point} cx={cx} cy={cy} r="4.5" fill="#2563EB" />;
                    })}
                  </svg>
                  <div className="mt-2 flex justify-between text-[0.76rem] text-slate-400">
                    <span>May 7</span>
                    <span>May 9</span>
                    <span>May 11</span>
                    <span>May 13</span>
                  </div>
                </div>
              </div>
            </DashboardPanel>
          </section>

          <section className="grid gap-4 2xl:grid-cols-[1.08fr_1fr_0.82fr]">
            <DashboardPanel title="Recent Activity" action="View all →">
              <ul className="space-y-3">
                {activityFeed.map((item, index) => {
                  const Icon = item.Icon;

                  return (
                    <li
                      key={item.text}
                      className={`flex items-start gap-3 ${index === 0 ? "" : "border-t border-slate-100 pt-3"}`}
                    >
                      <span className={`mt-0.5 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] ${item.tone}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[0.92rem] font-semibold text-slate-900">{item.text}</p>
                        <span className="text-[0.8rem] text-slate-500">{item.time}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>

            <DashboardPanel title="Pending Approvals" action="View all →">
              <ul className="space-y-3">
                {approvals.map((item, index) => (
                  <li
                    key={item.title}
                    className={`flex items-start justify-between gap-3 ${index === 0 ? "" : "border-t border-slate-100 pt-3"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[0.92rem] font-semibold text-slate-900">{item.title}</p>
                      <span className="block text-[0.8rem] text-slate-500">{item.meta}</span>
                      <small className="mt-1 block text-[0.8rem] text-slate-500">{item.date}</small>
                    </div>
                    <span className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[0.74rem] font-bold ${item.tone}`}>
                      {item.badge}
                    </span>
                  </li>
                ))}
              </ul>
            </DashboardPanel>

            <DashboardPanel title="System Health" action="View details →">
              <ul className="space-y-3">
                {systemHealth.map((item, index) => {
                  const Icon = item.Icon;

                  return (
                    <li
                      key={item.label}
                      className={`flex items-start justify-between gap-3 ${index === 0 ? "" : "border-t border-slate-100 pt-3"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <p className="m-0 text-[0.92rem] font-semibold text-slate-900">{item.label}</p>
                          <span className="text-[0.8rem] text-slate-500">{item.meta}</span>
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[0.74rem] font-bold ${item.tone}`}>
                        {item.badge}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </DashboardPanel>
          </section>

          <footer className="flex flex-col gap-2 px-1 pt-5 text-[0.82rem] text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>© 2026 Hinora. All rights reserved.</span>
            <span>Hinora v1.0.0</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
