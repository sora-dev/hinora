"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpDown,
  Bookmark,
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Folder,
  FolderPlus,
  GraduationCap,
  Info,
  LayoutGrid,
  List,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import DashboardShell from "../dashboard/dashboard-shell";
import { ModuleGuide } from "../dashboard/module-guide";
import type { NavVariant } from "../dashboard/navigation";
import { useResolvedNavVariant } from "../dashboard/use-sidebar-permissions";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  BOOKMARKS_CHANGED_EVENT,
  createCollection,
  deleteCollection,
  fetchBookmarks,
  formatBookmarkDate,
  moveBookmark,
  removeBookmark,
  renameCollection,
  type BookmarkCollection,
  type BookmarkItem,
  type BookmarkSort,
  type BookmarkTab,
  type BookmarkType,
} from "./bookmarks-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const pageSizeOptions = [
  { value: "12", label: "12" },
  { value: "24", label: "24" },
  { value: "48", label: "48" },
];

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function typeBadge(label: string) {
  const key = label.toLowerCase();
  if (key === "policy") return "bg-violet-50 text-violet-700";
  if (key === "procedure") return "bg-blue-50 text-[var(--color-active-menu)]";
  if (key === "guideline") return "bg-sky-50 text-sky-700";
  if (key === "standard") return "bg-orange-50 text-orange-700";
  if (key === "training") return "bg-indigo-50 text-indigo-700";
  if (key === "document") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function collectionDescription(collection: BookmarkCollection) {
  if (collection.description?.trim()) return collection.description.trim();
  const key = collection.name.trim().toLowerCase();
  if (key.includes("compliance")) return "Policies and documents related to compliance and regulations.";
  if (key.includes("security")) return "Information security policies, standards, and procedures.";
  if (key.includes("training")) return "Training materials, guides, and learning resources.";
  return "Saved policies grouped for quicker access.";
}

function collectionVisual(name: string): { Icon: LucideIcon; tone: string } {
  const key = name.trim().toLowerCase();
  if (key.includes("compliance") || key.includes("regulation")) {
    return { Icon: Shield, tone: "bg-emerald-50 text-emerald-600" };
  }
  if (key.includes("security") || key.includes("privacy")) {
    return { Icon: Lock, tone: "bg-blue-50 text-[var(--color-active-menu)]" };
  }
  if (key.includes("training") || key.includes("learning")) {
    return { Icon: GraduationCap, tone: "bg-orange-50 text-orange-600" };
  }
  return { Icon: Folder, tone: "bg-slate-100 text-slate-500" };
}

function bookmarkVisual(item: BookmarkItem): { Icon: LucideIcon; tone: string } {
  const haystack = `${item.title} ${item.categoryName} ${item.collectionName ?? ""}`.toLowerCase();
  if (haystack.includes("privacy") || haystack.includes("data privacy")) {
    return { Icon: Lock, tone: "bg-emerald-500" };
  }
  if (haystack.includes("training") || haystack.includes("awareness")) {
    return { Icon: GraduationCap, tone: "bg-blue-500" };
  }
  if (haystack.includes("incident") || (haystack.includes("security") && item.type === "PROCEDURE")) {
    return { Icon: Shield, tone: "bg-sky-500" };
  }
  if (item.type === "PROCEDURE") return { Icon: Shield, tone: "bg-blue-600" };
  if (item.type === "GUIDELINE") return { Icon: BookOpenText, tone: "bg-teal-500" };
  const tones = ["bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-indigo-500"];
  return { Icon: FileText, tone: tones[item.policyId.charCodeAt(0) % tones.length] };
}

function policyHref(variant: NavVariant, policyId: string) {
  return `/${variant}/policy-library/${policyId}`;
}

export default function BookmarksExperience({ variant }: { variant: NavVariant }) {
  const resolvedVariant = useResolvedNavVariant(variant);
  const [tab, setTab] = useState<BookmarkTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<BookmarkType | "">("");
  const [collectionId, setCollectionId] = useState("");
  const [sort, setSort] = useState<BookmarkSort>("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("12");
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [uncategorized, setUncategorized] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const reloadRef = useRef<(keepNote?: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, collectionId, sort, pageSize]);

  async function reload() {
    const payload = await fetchBookmarks({
      search: debouncedSearch,
      type,
      collectionId,
      sort,
      page,
      pageSize: Number(pageSize) || 12,
    });
    setItems(payload.items);
    setCollections(payload.collections);
    setUncategorized(payload.uncategorized ?? 0);
    setTotal(payload.pagination.total);
    setTotalPages(payload.pagination.totalPages);
    setError("");
  }

  reloadRef.current = reload;

  useEffect(() => {
    function onChanged() {
      void reloadRef.current().catch(() => undefined);
    }
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(BOOKMARKS_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchBookmarks({
      search: debouncedSearch,
      type,
      collectionId,
      sort,
      page,
      pageSize: Number(pageSize) || 12,
    })
      .then((payload) => {
        if (cancelled) return;
        setItems(payload.items);
        setCollections(payload.collections);
        setUncategorized(payload.uncategorized ?? 0);
        setTotal(payload.pagination.total);
        setTotalPages(payload.pagination.totalPages);
        setError("");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load bookmarks.");
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, type, collectionId, sort, page, pageSize]);

  const size = Number(pageSize) || 12;
  const pageStart = total === 0 ? 0 : (page - 1) * size;
  const pageEnd = Math.min(pageStart + items.length, total);

  async function handleRemove(item: BookmarkItem) {
    await removeBookmark(item.id);
    setNote(`Removed “${item.title}” from bookmarks.`);
    setMenuId(null);
    await reload();
  }

  async function handleMove(item: BookmarkItem, nextCollectionId: string | null) {
    await moveBookmark(item.id, nextCollectionId);
    setNote("Bookmark moved.");
    setMenuId(null);
    await reload();
  }

  function openCollection(id: string) {
    setCollectionId(id);
    setTab("all");
    setPage(1);
  }

  return (
    <DashboardShell variant={variant}>
      <div className="px-4 py-5 md:px-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-[2rem] font-extrabold leading-tight text-slate-900">
              <Bookmark className="h-8 w-8 fill-[var(--color-active-menu)] text-[var(--color-active-menu)]" />
              Bookmarks
            </h1>
            <p className="mt-1 text-sm text-slate-500">Save important policies and documents for quick access.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold",
                  viewMode === "grid"
                    ? "bg-blue-50 text-[var(--color-active-menu)] ring-1 ring-[var(--color-active-menu)]"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold",
                  viewMode === "list"
                    ? "bg-blue-50 text-[var(--color-active-menu)] ring-1 ring-[var(--color-active-menu)]"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <List className="h-4 w-4" />
                List View
              </button>
            </div>
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Folder className="h-4 w-4" />
              Manage Collections
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-6 border-b border-slate-200">
          {(
            [
              { id: "all", label: "All Bookmarks" },
              { id: "collections", label: "Collections" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cx(
                "-mb-px border-b-2 pb-2.5 text-sm font-semibold",
                tab === item.id
                  ? "border-[var(--color-active-menu)] text-[var(--color-active-menu)]"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {note ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {note}
          </div>
        ) : null}

        {tab === "collections" ? (
          <CollectionsPanel
            collections={collections}
            uncategorized={uncategorized}
            onOpen={openCollection}
            onManage={() => setManageOpen(true)}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bookmarks..."
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
                <DropdownSelect
                  value={type}
                  onChange={(value) => setType((value as BookmarkType | "") || "")}
                  options={[
                    { value: "POLICY", label: "Policy" },
                    { value: "GUIDELINE", label: "Guideline" },
                    { value: "PROCEDURE", label: "Procedure" },
                  ]}
                  placeholder="All Types"
                  allowClear
                  size="sm"
                  className="min-w-0 lg:w-36"
                />
                <DropdownSelect
                  value={collectionId}
                  onChange={(value) => setCollectionId(value)}
                  options={[
                    { value: "none", label: "Uncategorized" },
                    ...collections.map((collection) => ({
                      value: collection.id,
                      label: collection.name,
                    })),
                  ]}
                  placeholder="All Collections"
                  allowClear
                  size="sm"
                  className="min-w-0 lg:w-44"
                />
                <DropdownSelect
                  value={sort}
                  onChange={(value) => setSort((value as BookmarkSort) || "recent")}
                  options={[
                    { value: "recent", label: "Recently Added" },
                    { value: "title", label: "Title A–Z" },
                    { value: "type", label: "Type" },
                  ]}
                  size="sm"
                  className="min-w-0 lg:w-52"
                  renderValue={(option) => `Sort by: ${option?.label ?? "Recently Added"}`}
                  aria-label="Sort bookmarks"
                />
              </div>
            </div>

            <p className="mb-3 text-sm text-slate-500">
              Showing {total === 0 ? 0 : pageStart + 1} to {pageEnd} of {total.toLocaleString()} bookmarks
            </p>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <EmptyState icon={Bookmark} title="Unable to load bookmarks" description={error} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No bookmarks yet"
                description="Save policies from the reader or library so they appear here for quick access."
                actionLabel="Open Policy Library"
                onAction={() => {
                  window.location.href = `/${resolvedVariant}/policy-library`;
                }}
              />
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((item) => (
                  <BookmarkCard
                    key={item.id}
                    item={item}
                    variant={resolvedVariant}
                    collections={collections}
                    menuOpen={menuId === item.id}
                    onToggleMenu={() => setMenuId((current) => (current === item.id ? null : item.id))}
                    onCloseMenu={() => setMenuId(null)}
                    onMove={(next) => void handleMove(item, next)}
                    onRemove={() => void handleRemove(item)}
                  />
                ))}
              </div>
            ) : (
              <BookmarkList
                items={items}
                variant={resolvedVariant}
                collections={collections}
                menuId={menuId}
                onToggleMenu={(id) => setMenuId((current) => (current === id ? null : id))}
                onCloseMenu={() => setMenuId(null)}
                onMove={(item, next) => void handleMove(item, next)}
                onRemove={(item) => void handleRemove(item)}
              />
            )}

            {items.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <div />
                <div className="flex items-center justify-center gap-1.5">
                  <PagerButton label="First page" disabled={page <= 1} onClick={() => setPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </PagerButton>
                  <PagerButton
                    label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PagerButton>
                  {pageNumbers(page, totalPages).map((item, index) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-1 text-sm font-semibold text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={cx(
                          "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold",
                          item === page
                            ? "border-[var(--color-active-menu)] bg-white text-[var(--color-active-menu)]"
                            : "border-slate-200 bg-white text-slate-600",
                        )}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <PagerButton
                    label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PagerButton>
                  <PagerButton
                    label="Last page"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </PagerButton>
                </div>
                <label className="inline-flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-end">
                  Show
                  <DropdownSelect
                    value={pageSize}
                    onChange={(value) => setPageSize(value || "12")}
                    options={pageSizeOptions}
                    size="sm"
                    className="w-[4.5rem]"
                    aria-label="Items per page"
                  />
                  per page
                </label>
              </div>
            ) : null}
          </>
        )}

        <div className="mt-5">
          <ModuleGuide guideKey="Bookmarks" />
        </div>
      </div>

      {manageOpen ? (
        <ManageCollectionsModal
          collections={collections}
          onClose={() => setManageOpen(false)}
          onChanged={async (message) => {
            setNote(message);
            await reload();
          }}
        />
      ) : null}
    </DashboardShell>
  );
}

function BookmarkCard({
  item,
  variant,
  collections,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onMove,
  onRemove,
}: {
  item: BookmarkItem;
  variant: NavVariant;
  collections: BookmarkCollection[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onMove: (collectionId: string | null) => void;
  onRemove: () => void;
}) {
  const { Icon, tone } = bookmarkVisual(item);
  const collectionLabel = item.collectionName ?? item.categoryName;

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className={cx("inline-flex h-11 w-11 items-center justify-center rounded-full text-white", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-1">
          {collectionLabel ? (
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-slate-400">
              <Folder className="h-3 w-3" />
              {collectionLabel}
            </span>
          ) : null}
          <BookmarkMenu
            open={menuOpen}
            item={item}
            variant={variant}
            collections={collections}
            onToggle={onToggleMenu}
            onClose={onCloseMenu}
            onMove={onMove}
            onRemove={onRemove}
          />
        </div>
      </div>
      <Link href={policyHref(variant, item.policyId)} className="mt-3 block">
        <h3 className="line-clamp-2 text-base font-bold text-slate-900">{item.title}</h3>
      </Link>
      <span className={cx("mt-2.5 inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-bold", typeBadge(item.typeLabel))}>
        {item.typeLabel}
      </span>
      <p className="mt-2 text-sm text-slate-500">{item.categoryName}</p>
      <p className="mt-4 text-xs font-medium text-slate-400">Bookmarked on {formatBookmarkDate(item.bookmarkedAt)}</p>
    </article>
  );
}

function BookmarkList({
  items,
  variant,
  collections,
  menuId,
  onToggleMenu,
  onCloseMenu,
  onMove,
  onRemove,
}: {
  items: BookmarkItem[];
  variant: NavVariant;
  collections: BookmarkCollection[];
  menuId: string | null;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  onMove: (item: BookmarkItem, collectionId: string | null) => void;
  onRemove: (item: BookmarkItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-slate-400">
            <tr>
              <th className="px-5 py-3">Policy</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Bookmarked</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((item) => {
              const { Icon, tone } = bookmarkVisual(item);
              return (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <Link href={policyHref(variant, item.policyId)} className="flex items-center gap-3">
                      <span className={cx("inline-flex h-10 w-10 items-center justify-center rounded-full text-white", tone)}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="font-semibold text-slate-900">{item.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cx("inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-bold", typeBadge(item.typeLabel))}>
                      {item.typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{item.collectionName ?? "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{item.categoryName}</td>
                  <td className="px-4 py-3.5 text-slate-500">{formatBookmarkDate(item.bookmarkedAt)}</td>
                  <td className="relative px-4 py-3.5 text-right">
                    <BookmarkMenu
                      open={menuId === item.id}
                      item={item}
                      variant={variant}
                      collections={collections}
                      onToggle={() => onToggleMenu(item.id)}
                      onClose={onCloseMenu}
                      onMove={(next) => onMove(item, next)}
                      onRemove={() => onRemove(item)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookmarkMenu({
  open,
  item,
  variant,
  collections,
  onToggle,
  onClose,
  onMove,
  onRemove,
}: {
  open: boolean;
  item: BookmarkItem;
  variant: NavVariant;
  collections: BookmarkCollection[];
  onToggle: () => void;
  onClose: () => void;
  onMove: (collectionId: string | null) => void;
  onRemove: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setMoving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        aria-label={`Actions for ${item.title}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          {moving ? (
            <>
              <button
                type="button"
                onClick={() => setMoving(false)}
                className="flex w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-slate-400"
              >
                Move to collection
              </button>
              <button
                type="button"
                onClick={() => onMove(null)}
                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Uncategorized
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => onMove(collection.id)}
                  className={cx(
                    "flex w-full px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50",
                    collection.id === item.collectionId ? "text-[var(--color-active-menu)]" : "text-slate-700",
                  )}
                >
                  {collection.name}
                </button>
              ))}
            </>
          ) : (
            <>
              <Link
                href={policyHref(variant, item.policyId)}
                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={onClose}
              >
                Open policy
              </Link>
              <button
                type="button"
                onClick={() => setMoving(true)}
                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Move to collection
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="flex w-full px-3 py-2 text-left text-sm font-semibold text-[var(--color-error)] hover:bg-red-50"
              >
                Remove bookmark
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CollectionsPanel({
  collections,
  uncategorized,
  onOpen,
  onManage,
}: {
  collections: BookmarkCollection[];
  uncategorized: number;
  onOpen: (id: string) => void;
  onManage: () => void;
}) {
  if (collections.length === 0 && uncategorized === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title="No collections yet"
        description="Group saved policies into collections like Security, Compliance, or Training."
        actionLabel="Manage Collections"
        onAction={onManage}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {uncategorized > 0 ? (
        <button
          type="button"
          onClick={() => onOpen("none")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[var(--color-active-menu)]/40"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Folder className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-base font-bold text-slate-900">Uncategorized</h3>
          <p className="mt-1 text-sm text-slate-500">
            {uncategorized} {uncategorized === 1 ? "bookmark" : "bookmarks"}
          </p>
        </button>
      ) : null}
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          onClick={() => onOpen(collection.id)}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[var(--color-active-menu)]/40"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
            <Folder className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-base font-bold text-slate-900">{collection.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {collection.count} {collection.count === 1 ? "bookmark" : "bookmarks"}
          </p>
        </button>
      ))}
    </div>
  );
}

function ManageCollectionsModal({
  collections,
  onClose,
  onChanged,
}: {
  collections: BookmarkCollection[];
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [sort, setSort] = useState<"az" | "za" | "newest" | "oldest" | "items">("az");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...collections].sort((left, right) => {
    if (sort === "za") return right.name.localeCompare(left.name);
    if (sort === "newest") return right.createdAt.localeCompare(left.createdAt);
    if (sort === "oldest") return left.createdAt.localeCompare(right.createdAt);
    if (sort === "items") return right.count - left.count || left.name.localeCompare(right.name);
    return left.name.localeCompare(right.name);
  });

  async function handleCreate() {
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    setError("");
    try {
      await createCollection(next);
      setName("");
      await onChanged(`Created “${next}”.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create collection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(id: string) {
    const next = editingName.trim();
    if (!next) return;
    setBusy(true);
    setError("");
    try {
      await renameCollection(id, next);
      setEditingId(null);
      await onChanged("Collection updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update collection.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(collection: BookmarkCollection) {
    setBusy(true);
    setError("");
    try {
      await deleteCollection(collection.id);
      if (editingId === collection.id) setEditingId(null);
      await onChanged(`Deleted “${collection.name}”.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete collection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 p-3 sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-active-menu)]">
                <Folder className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Manage Collections</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create and organize folders to group the policies you save often.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-center lg:p-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Add new collection</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Create a new collection to start organizing your bookmarks.
              </p>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Folder className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreate();
                }}
                placeholder="Collection name"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void handleCreate()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Collection
            </button>
          </div>

          {error ? <p className="mt-3 text-sm font-semibold text-[var(--color-error)]">{error}</p> : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Your Collections</h4>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-blue-50 px-1.5 text-xs font-bold text-[var(--color-active-menu)]">
                {collections.length}
              </span>
            </div>
            <DropdownSelect
              value={sort}
              onChange={(value) => setSort((value as typeof sort) || "az")}
              options={[
                { value: "az", label: "A to Z" },
                { value: "za", label: "Z to A" },
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "items", label: "Most items" },
              ]}
              size="sm"
              leadingIcon={ArrowUpDown}
              className="w-[13.5rem]"
              renderValue={(option) => `Sort by: ${option?.label ?? "A to Z"}`}
              aria-label="Sort collections"
            />
          </div>

          <ul className="mt-3 space-y-2.5">
            {sorted.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No collections yet. Add one above to start organizing bookmarks.
              </li>
            ) : (
              sorted.map((collection) => {
                const { Icon, tone } = collectionVisual(collection.name);
                const editing = editingId === collection.id;

                return (
                  <li
                    key={collection.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
                  >
                    {editing ? (
                      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                        <span className={cx("inline-flex h-11 w-11 items-center justify-center rounded-xl", tone)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void handleSave(collection.id);
                              if (event.key === "Escape") setEditingId(null);
                            }}
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-active-menu)] focus:ring-4 focus:ring-blue-100"
                            autoFocus
                          />
                          <p className="mt-1.5 text-sm text-slate-500">{collectionDescription({ ...collection, name: editingName || collection.name })}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSave(collection.id)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-active-menu)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-[auto_minmax(8.5rem,0.7fr)_minmax(0,1.5fr)_auto_auto] lg:items-center">
                        <span className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{collection.name}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {collection.count} {collection.count === 1 ? "item" : "items"}
                          </p>
                        </div>
                        <p className="text-sm leading-5 text-slate-500">
                          {collectionDescription(collection)}
                        </p>
                        <p className="text-xs font-medium text-slate-400 lg:text-right">
                          Created on {formatBookmarkDate(collection.createdAt)}
                        </p>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                              onClick={() => {
                                setEditingId(collection.id);
                                setEditingName(collection.name);
                              }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            aria-label={`Edit ${collection.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(collection)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-error)] hover:bg-red-100"
                            aria-label={`Delete ${collection.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2 text-sm text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active-menu)]" />
            <span>
              <span className="font-semibold text-slate-600">About collections:</span> Collections are private to you
              and help you keep your saved policies organized.
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
      aria-label={label}
    >
      {children}
    </button>
  );
}
