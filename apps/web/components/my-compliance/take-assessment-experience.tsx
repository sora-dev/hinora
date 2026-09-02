"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Flag,
} from "lucide-react";
import { DashboardMobileNav, DashboardSidebar } from "../dashboard/dashboard-nav";
import SessionProfileDropdown from "../dashboard/session-profile-dropdown";
import { getSessionProfileDisplay } from "../dashboard/session";
import { useResolvedNavVariant } from "../dashboard/use-sidebar-permissions";
import NotificationBell from "../inbox/notification-bell";
import { ThemeToggle } from "../theme/theme-toggle";
import { EmptyState } from "../ui/empty-state";
import {
  DEFAULT_TAKE_INSTRUCTIONS,
  fetchTakeAssessment,
  formatAssessmentDate,
  saveTakeDraft,
  submitTakeAssessment,
  type TakeAssessment,
  type TakeSubmitResult,
} from "./take-assessment-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function dueLabel(dueAt: string | null) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay.getTime() - start.getTime()) / 86_400_000);
  const date = formatAssessmentDate(dueAt);
  if (days < 0) return `Due: ${date} (overdue)`;
  if (days === 0) return `Due: ${date} (today)`;
  if (days === 1) return `Due: ${date} (in 1 day)`;
  return `Due: ${date} (in ${days} days)`;
}

function instructionItems(value: string | null) {
  const raw = value?.split(/\n+|•|;/).map((item) => item.trim()).filter(Boolean) ?? [];
  return raw.length > 0 ? raw : DEFAULT_TAKE_INSTRUCTIONS;
}

export default function TakeAssessmentExperience() {
  const params = useParams<{ policyId: string }>();
  const router = useRouter();
  const policyId = params.policyId;
  const navVariant = useResolvedNavVariant("employee");
  const profile = getSessionProfileDisplay({
    name: "Employee User",
    role: "Employee",
    avatarText: "EU",
  });

  const [data, setData] = useState<TakeAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TakeSubmitResult | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setDraftReady(false);
    void fetchTakeAssessment(policyId)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        if (payload.draft && payload.canTake) {
          setAnswers(payload.draft.answers);
          setBookmarks(payload.draft.bookmarks);
          setIndex(Math.min(payload.draft.index, Math.max(0, payload.questions.length - 1)));
          setStartedAt(payload.draft.startedAt || new Date().toISOString());
        } else {
          setAnswers({});
          setBookmarks([]);
          setIndex(0);
          setStartedAt(new Date().toISOString());
        }
        setDraftReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to open this assessment.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId]);

  useEffect(() => {
    if (!data?.canTake || !draftReady) return;
    const timer = window.setTimeout(() => {
      void saveTakeDraft(policyId, {
        answers,
        bookmarks,
        index,
        startedAt,
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, bookmarks, data?.canTake, draftReady, index, policyId, startedAt]);

  const question = data?.questions[index] ?? null;
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );
  const progressPct = data?.questions.length
    ? Math.round((answeredCount / data.questions.length) * 100)
    : 0;
  const statusLabel = result
    ? result.passed
      ? "Passed"
      : "Submitted"
    : data?.canTake
      ? answeredCount > 0
        ? "In Progress"
        : "Not Started"
      : data?.lastResult?.passed
        ? "Passed"
        : "Completed";

  async function handleSubmit() {
    if (!data || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = await submitTakeAssessment(policyId, answers);
      setResult(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to submit this assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--color-background)] text-slate-900 xl:grid-cols-[272px_minmax(0,1fr)]">
      <DashboardSidebar variant={navVariant} />
      <section className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-5">
          <Link
            href="/employee/compliance?tab=assessments"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-active-menu)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Compliance
          </Link>
          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
            <ThemeToggle />
            <SessionProfileDropdown
              profileName={profile.name}
              profileRole={profile.role}
              avatarText={profile.avatarText}
              avatarClassName="from-[var(--color-active-menu)] to-[var(--color-hover)]"
            />
          </div>
        </header>
        <DashboardMobileNav variant={navVariant} />

        <div className="min-w-0 overflow-x-clip px-4 py-5 md:px-5">
          {loading ? (
            <div className="h-[32rem] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          ) : error && !data ? (
            <EmptyState icon={ClipboardCheck} title="Unable to open assessment" description={error} />
          ) : data ? (
            <div className="flex min-w-0 flex-wrap gap-4">
              <div className="min-w-0 flex-1 basis-[min(100%,36rem)] space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[var(--color-ai-accent)]">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-extrabold text-slate-900">{data.title}</h1>
                        <span
                          className={cx(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold",
                            statusLabel === "Passed"
                              ? "bg-emerald-50 text-[var(--color-success)]"
                              : statusLabel === "In Progress"
                                ? "bg-blue-50 text-[var(--color-active-menu)]"
                                : "bg-amber-50 text-[var(--color-warning)]",
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {data.policyTitle} {data.policyVersion}
                      </p>
                      {data.dueAt ? (
                        <p className="mt-2 text-sm font-semibold text-[var(--color-error)]">
                          {dueLabel(data.dueAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                    <span>{data.questions.length || data.lastResult?.totalQuestions || 0} Questions</span>
                    <span>Passing Score: {data.passingScore}%</span>
                    <span>
                      Attempts Allowed: {data.maximumAttempts === 0 ? "Unlimited" : data.maximumAttempts}
                    </span>
                    <span>
                      Time Limit: {data.timeLimitMinutes === 0 ? "None" : `${data.timeLimitMinutes} minutes`}
                    </span>
                  </div>
                </section>

                {result || !data.canTake ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                    <div
                      className={cx(
                        "mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl",
                        (result?.passed ?? data.lastResult?.passed)
                          ? "bg-emerald-50 text-[var(--color-success)]"
                          : "bg-amber-50 text-[var(--color-warning)]",
                      )}
                    >
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                      {(result?.passed ?? data.lastResult?.passed)
                        ? "Assessment passed"
                        : result
                          ? "Assessment submitted"
                          : "Assessment already completed"}
                    </h2>
                    {(result?.showScoreImmediately ?? true) ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Score: {result?.percent ?? data.lastResult?.percent ?? 0}% (
                        {result?.correct ?? data.lastResult?.correct ?? 0} of{" "}
                        {result?.totalQuestions ?? data.lastResult?.totalQuestions ?? 0})
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">Your score will be shared after review.</p>
                    )}
                    {result?.certificateNumber ? (
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        Certificate {result.certificateNumber} was issued.
                      </p>
                    ) : null}
                    {error ? <p className="mt-3 text-sm font-semibold text-[var(--color-error)]">{error}</p> : null}
                    <button
                      type="button"
                      onClick={() => router.push("/employee/compliance?tab=assessments")}
                      className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-active-menu)] px-5 text-sm font-bold text-white"
                    >
                      Back to My Compliance
                    </button>
                  </section>
                ) : question ? (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                        <span>
                          Question {index + 1} of {data.questions.length}
                        </span>
                        <span>{progressPct}% Complete</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[var(--color-active-menu)]"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Question {index + 1}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{question.prompt}</p>
                      <div className="mt-5 space-y-2.5">
                        {question.options.map((option, optionIndex) => {
                          const selected = answers[question.id] === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                setAnswers((current) => ({ ...current, [question.id]: option.id }))
                              }
                              className={cx(
                                "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                                selected
                                  ? "border-[var(--color-active-menu)] bg-blue-50"
                                  : "border-slate-200 bg-white hover:border-slate-300",
                              )}
                            >
                              <span
                                className={cx(
                                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                  selected
                                    ? "bg-[var(--color-active-menu)] text-white"
                                    : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {LETTERS[optionIndex] ?? optionIndex + 1}
                              </span>
                              <span className="pt-1 text-sm font-medium text-slate-800">{option.text}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setAnswers((current) => {
                              const next = { ...current };
                              delete next[question.id];
                              return next;
                            })
                          }
                          className="text-sm font-bold text-slate-500 hover:text-slate-800"
                        >
                          Clear Answer
                        </button>
                      </div>
                    </article>

                    {error ? <p className="text-sm font-semibold text-[var(--color-error)]">{error}</p> : null}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => setIndex((current) => Math.max(0, current - 1))}
                        className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBookmarks((current) =>
                            current.includes(question.id)
                              ? current.filter((id) => id !== question.id)
                              : [...current, question.id],
                          )
                        }
                        className={cx(
                          "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold",
                          bookmarks.includes(question.id)
                            ? "border-amber-200 bg-amber-50 text-[var(--color-warning)]"
                            : "border-slate-200 bg-white text-slate-600",
                        )}
                      >
                        <Flag className="h-4 w-4" />
                        Bookmark
                      </button>
                      {index === data.questions.length - 1 ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleSubmit()}
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {submitting ? "Submitting..." : "Submit Assessment"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIndex((current) => Math.min(data.questions.length - 1, current + 1))}
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-bold text-white"
                        >
                          Next Question
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No questions available"
                    description="This assessment does not have questions yet."
                  />
                )}
              </div>

              <aside className="min-w-0 w-full basis-full space-y-4 xl:w-[280px] xl:flex-none xl:basis-[280px] 2xl:w-[320px] 2xl:basis-[320px]">
                <div className="xl:hidden">
                  <button
                    type="button"
                    onClick={() => setRailOpen((open) => !open)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[var(--color-active-menu)]"
                  >
                    {railOpen ? "Hide Question Navigator" : "View Question Navigator"}
                    <ChevronDown className={cx("h-4 w-4 transition", railOpen && "rotate-180")} />
                  </button>
                </div>

                <div className={cx("space-y-4", railOpen ? "block" : "hidden xl:block")}>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-900">Questions</h3>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {data.questions.map((item, questionIndex) => {
                        const answered = Boolean(answers[item.id]);
                        const bookmarked = bookmarks.includes(item.id);
                        const current = questionIndex === index;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setIndex(questionIndex)}
                            className={cx(
                              "inline-flex h-9 items-center justify-center rounded-lg border text-xs font-bold",
                              current
                                ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)] text-white"
                                : bookmarked
                                  ? "border-amber-300 bg-amber-50 text-[var(--color-warning)]"
                                  : answered
                                    ? "border-emerald-200 bg-emerald-50 text-[var(--color-success)]"
                                    : "border-slate-200 bg-white text-slate-600",
                            )}
                          >
                            {questionIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                    <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                      <li>Blue: Current</li>
                      <li>Green: Answered</li>
                      <li>Orange: Bookmarked</li>
                    </ul>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-900">Assessment Overview</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      {[
                        ["Total Questions", data.questions.length || data.lastResult?.totalQuestions || 0],
                        ["Passing Score", `${data.passingScore}%`],
                        [
                          "Attempts Allowed",
                          data.maximumAttempts === 0 ? "Unlimited" : data.maximumAttempts,
                        ],
                        [
                          "Your Attempts",
                          data.maximumAttempts === 0
                            ? `${data.attemptCount}`
                            : `${data.attemptCount} of ${data.maximumAttempts}`,
                        ],
                        [
                          "Time Limit",
                          data.timeLimitMinutes === 0 ? "None" : `${data.timeLimitMinutes} minutes`,
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="font-semibold text-slate-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>

                  <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                    <h3 className="text-sm font-bold text-slate-900">Assessment Instructions</h3>
                    <ul className="mt-3 space-y-2.5">
                      {instructionItems(data.instructions).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
