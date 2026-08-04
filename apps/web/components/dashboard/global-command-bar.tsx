"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookOpenText,
  CircleHelp,
  Files,
  FolderTree,
  Home,
  LayoutDashboard,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type CommandItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  section: "Navigation" | "Quick Actions";
  keywords: string[];
  Icon: LucideIcon;
};

const commandItems: readonly CommandItem[] = [
  {
    id: "home",
    title: "Home / Login",
    description: "Go back to the Hinora sign in page.",
    href: "/",
    section: "Navigation",
    keywords: ["home", "login", "signin", "landing"],
    Icon: Home,
  },
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    description: "Open the admin overview, insights, and approvals screen.",
    href: "/admin/dashboard",
    section: "Navigation",
    keywords: ["admin", "dashboard", "overview", "reports"],
    Icon: LayoutDashboard,
  },
  {
    id: "admin-policy-management",
    title: "Policy Management",
    description: "Open policy management to upload and organize policy documents.",
    href: "/admin/policy-management",
    section: "Navigation",
    keywords: ["policy management", "policy repository", "policies", "upload", "documents"],
    Icon: Files,
  },
  {
    id: "admin-policy-library",
    title: "Admin Policy Library",
    description: "Open the shared policy library experience for administrators.",
    href: "/admin/policy-library",
    section: "Navigation",
    keywords: ["admin policy library", "policy library", "browse policies", "read policy"],
    Icon: BookOpenText,
  },
  {
    id: "admin-users",
    title: "User Management",
    description: "Open the user management page to create, edit, or lock users.",
    href: "/admin/users",
    section: "Navigation",
    keywords: ["users", "user", "management", "accounts", "roles"],
    Icon: Users,
  },
  {
    id: "admin-categories",
    title: "Categories",
    description: "Manage the category tree and organize policy groups.",
    href: "/admin/categories",
    section: "Navigation",
    keywords: ["categories", "category", "taxonomy", "tree", "classification"],
    Icon: FolderTree,
  },
  {
    id: "admin-roles",
    title: "Roles & Permissions",
    description: "Open the roles design screen and permission matrix.",
    href: "/admin/roles-permissions",
    section: "Navigation",
    keywords: ["roles", "permissions", "matrix", "access control"],
    Icon: ShieldEllipsis,
  },
  {
    id: "employee-dashboard",
    title: "Employee Dashboard",
    description: "Open the employee dashboard and personal policy workspace.",
    href: "/employee/dashboard",
    section: "Navigation",
    keywords: ["employee", "dashboard", "user dashboard", "workspace"],
    Icon: ShieldCheck,
  },
  {
    id: "employee-policy-library",
    title: "Employee Policy Library",
    description: "Browse and read policies in the employee policy library.",
    href: "/employee/policy-library",
    section: "Navigation",
    keywords: ["employee policy library", "policy library", "browse", "documents", "reading"],
    Icon: BookOpenText,
  },
  {
    id: "ask-hinora",
    title: "Ask Hinora",
    description: "Jump to the employee dashboard to search policies with AI.",
    href: "/employee/dashboard",
    section: "Quick Actions",
    keywords: ["ask", "ai", "hinora", "assistant", "policy search"],
    Icon: Bot,
  },
  {
    id: "browse-policies",
    title: "Browse Policies",
    description: "Open the employee policy library to browse policy materials.",
    href: "/employee/policy-library",
    section: "Quick Actions",
    keywords: ["policies", "browse", "manuals", "documents"],
    Icon: BookOpenText,
  },
  {
    id: "create-user",
    title: "Create User",
    description: "Go to User Management and create a new user account.",
    href: "/admin/users",
    section: "Quick Actions",
    keywords: ["create", "add", "new user", "invite"],
    Icon: UserPlus,
  },
  {
    id: "help",
    title: "Help & Support",
    description: "Open a supported workspace area and continue from there.",
    href: "/employee/dashboard",
    section: "Quick Actions",
    keywords: ["help", "support", "guide", "assistance"],
    Icon: CircleHelp,
  },
] as const;

function matchesCommand(item: CommandItem, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const haystack = [item.title, item.description, ...item.keywords].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

export default function GlobalCommandBar({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    const filtered = commandItems.filter((item) => matchesCommand(item, query));

    return [...filtered].sort((left, right) => {
      const leftActive = left.href === pathname ? -1 : 0;
      const rightActive = right.href === pathname ? -1 : 0;
      return leftActive - rightActive;
    });
  }, [pathname, query]);

  const activeCommand = filteredCommands[activeIndex];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function closeCommandBar() {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function runCommand(command: CommandItem) {
    closeCommandBar();
    router.push(command.href);
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (filteredCommands.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(filteredCommands.length - 1, current + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === "Enter" && activeCommand) {
      event.preventDefault();
      runCommand(activeCommand);
    }
  }

  const groupedCommands = filteredCommands.reduce<Record<string, CommandItem[]>>((groups, item) => {
    groups[item.section] ??= [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={[
          "flex h-[46px] min-w-0 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-slate-400 transition hover:border-[var(--color-active-menu)]/30 hover:bg-slate-50",
          className ?? "",
        ].join(" ")}
      >
        <Search className="h-[18px] w-[18px]" />
        <span className="truncate text-slate-500">{placeholder}</span>
        <span className="ml-auto hidden rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 sm:inline-flex">
          ⌘ K
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6" onClick={closeCommandBar}>
          <div
            className="mx-auto mt-[8vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search dashboards, users, policies, and quick actions..."
                className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[0.98rem] text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={closeCommandBar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Close command bar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
              {filteredCommands.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">No results found</div>
                  <p className="mt-1 text-sm text-slate-500">Try searching for users, dashboards, policies, or Hinora.</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([section, items]) => (
                  <div key={section} className="mb-3 last:mb-0">
                    <div className="px-2 pb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {section}
                    </div>

                    <div className="space-y-2">
                      {items.map((item) => {
                        const commandIndex = filteredCommands.findIndex((command) => command.id === item.id);
                        const isActive = commandIndex === activeIndex;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => runCommand(item)}
                            className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                              isActive
                                ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                isActive
                                  ? "bg-[var(--color-active-menu)] text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <item.Icon className="h-5 w-5" />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-bold text-slate-900">{item.title}</span>
                                {item.href === pathname ? (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">
                                    Current
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span>Use the command bar across admin, users, and employee pages.</span>
              <span className="hidden sm:inline">Enter to open · ↑ ↓ to move · Esc to close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
