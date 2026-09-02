"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, ClipboardCheck, FileText, Megaphone, Sparkles } from "lucide-react";
import {
  fetchInbox,
  markAllInboxRead,
  markInboxRead,
  relativeTime,
  type InboxCategory,
  type InboxItem,
} from "./inbox-data";
import { useInboxUnreadCount } from "./use-inbox-unread-count";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function inboxHref(pathname: string | null) {
  return pathname?.startsWith("/admin") ? "/admin/notifications" : "/employee/notifications";
}

function categoryIcon(category: InboxCategory) {
  if (category === "ASSIGNMENT") return FileText;
  if (category === "COMPLIANCE") return ClipboardCheck;
  if (category === "SYSTEM") return Megaphone;
  return Sparkles;
}

export default function NotificationBell() {
  const pathname = usePathname();
  const router = useRouter();
  const href = inboxHref(pathname);
  const unreadCount = useInboxUnreadCount();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchInbox({ tab: unreadCount > 0 ? "unread" : "all", page: 1, pageSize: 6 })
      .then((payload) => {
        if (!cancelled) setItems(payload.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, unreadCount]);

  async function openItem(item: InboxItem) {
    if (!item.read) {
      try {
        await markInboxRead(item.id, true);
      } catch {
        // Navigation still proceeds if the read update fails.
      }
    }
    setOpen(false);
    router.push(`${href}?id=${item.id}`);
  }

  async function handleMarkAll() {
    try {
      await markAllInboxRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      // Keep the current list if the update fails.
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-active-menu)] px-1 text-[0.68rem] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Notifications</div>
              <div className="text-xs font-semibold text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </div>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-active-menu)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all
              </button>
            ) : null}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-50" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <ul>
                {items.map((item) => {
                  const Icon = categoryIcon(item.category);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void openItem(item)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <span
                          className={cx(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            item.read ? "bg-transparent" : "bg-[var(--color-active-menu)]",
                          )}
                        />
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-active-menu)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">{item.title}</span>
                          <span className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</span>
                          <span className="mt-1 block text-[0.7rem] font-semibold text-slate-400">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 p-2">
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center rounded-xl text-sm font-bold text-[var(--color-active-menu)] hover:bg-blue-50"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
