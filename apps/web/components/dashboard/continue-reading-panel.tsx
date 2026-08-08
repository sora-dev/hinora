"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenText, Bot, ChevronRight, ShieldCheck } from "lucide-react";
import { DashboardPanel } from "./primitives";
import { getSessionUserIdentity } from "./session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type ContinueReadingItem = {
  policyId: string;
  title: string;
  progress: number;
  meta: string;
  href: string;
  tone: string;
  barTone: string;
  Icon: typeof ShieldCheck;
};

function formatLastAccessed(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `Last accessed ${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last accessed ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 14) {
    return `Last accessed ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return `Last accessed ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getItemPresentation(index: number, progress: number) {
  if (progress >= 100) {
    return {
      tone: "bg-emerald-50 text-[var(--color-success)]",
      barTone: "bg-[var(--color-success)]",
      Icon: BookOpenText,
    };
  }

  if (index % 3 === 1) {
    return {
      tone: "bg-emerald-50 text-[var(--color-success)]",
      barTone: "bg-[var(--color-success)]",
      Icon: BookOpenText,
    };
  }

  if (index % 3 === 2) {
    return {
      tone: "bg-amber-50 text-[var(--color-warning)]",
      barTone: "bg-gradient-to-r from-[var(--color-warning)] to-[var(--color-success)]",
      Icon: Bot,
    };
  }

  return {
    tone: "bg-violet-50 text-[var(--color-ai-accent)]",
    barTone: "bg-gradient-to-r from-[var(--color-ai-accent)] to-[var(--color-active-menu)]",
    Icon: ShieldCheck,
  };
}

export function ContinueReadingPanel() {
  const [items, setItems] = useState<ContinueReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadContinueReading() {
      const identity = getSessionUserIdentity();

      if (!identity) {
        if (!cancelled) {
          setItems([]);
          setIsLoading(false);
          setErrorMessage("Sign in to see your reading progress.");
        }
        return;
      }

      try {
        const params = new URLSearchParams({ limit: "5" });
        if (identity.userId) {
          params.set("userId", identity.userId);
        }
        if (identity.email) {
          params.set("email", identity.email);
        }

        const response = await fetch(`${API_BASE_URL}/reading-progress?${params.toString()}`);
        const payload = (await response.json()) as {
          data?: Array<{
            policyId: string;
            progressPercent: number;
            lastAccessedAt: string;
            policy: {
              title: string;
            };
          }>;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load continue reading.");
        }

        if (cancelled) {
          return;
        }

        const mapped = (payload.data ?? []).map((row, index) => {
          const presentation = getItemPresentation(index, row.progressPercent);

          return {
            policyId: row.policyId,
            title: row.policy.title,
            progress: row.progressPercent,
            meta: formatLastAccessed(row.lastAccessedAt),
            href: `/employee/policy-library/${row.policyId}`,
            ...presentation,
          };
        });

        setItems(mapped);
        setErrorMessage("");
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load continue reading.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadContinueReading();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardPanel title="Continue Reading" action="View all" className="rounded-2xl">
      {isLoading ? (
        <div className="py-6 text-sm text-slate-500">Loading reading progress...</div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="py-6 text-sm text-slate-500">{errorMessage}</div>
      ) : null}

      {!isLoading && !errorMessage && items.length === 0 ? (
        <div className="py-6 text-sm text-slate-500">
          Start reading a policy and your progress will show up here.
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <ul className="space-y-3.5">
          {items.map((item) => {
            const Icon = item.Icon;

            return (
              <li key={item.policyId}>
                <Link href={item.href} className="flex items-start gap-3 rounded-xl transition hover:bg-slate-50">
                  <span className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="m-0 text-[0.95rem] font-semibold text-slate-900">{item.title}</h3>
                        <p className="m-0 text-[0.8rem] text-slate-500">{item.meta}</p>
                      </div>
                      <span className="text-[0.8rem] font-bold text-slate-500">{item.progress}%</span>
                    </div>
                    <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={`block h-full rounded-full ${item.barTone}`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </DashboardPanel>
  );
}
