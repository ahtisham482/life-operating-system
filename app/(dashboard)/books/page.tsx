export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { BookForm } from "./book-form";
import { DeleteBookActionButton } from "./delete-button";
import { PrescribedBooks } from "./prescribed-books";
import { CustomLibrary } from "./custom-library";
import { Badge } from "@/components/ui/badge";
import type { BookActionItem } from "@/lib/db/schema";

type PrescribedBook = { id: string; title: string; author: string; status: string; sortOrder: number };
type CustomBook = { id: string; title: string; status: string; insight: string | null };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "To Do": "outline",
  "Blocked": "destructive",
  "In Progress": "default",
  "Done": "secondary",
  "Abandoned": "secondary",
};

const STATUS_ICON: Record<string, string> = {
  "To Do": "\u2610",
  "Blocked": "\u26D4",
  "In Progress": "\u25C9",
  "Done": "\u2705",
  "Abandoned": "\u274C",
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch all book data in parallel
  const [{ data: rows }, { data: prescribedRows }, { data: customRows }] = await Promise.all([
    supabase
      .from("book_action_items")
      .select("*")
      .order("book_name", { ascending: true })
      .order("phase_number", { ascending: true })
      .order("order", { ascending: true }),
    supabase
      .from("prescribed_books")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("custom_books")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const prescribedBooks = (prescribedRows || []).map((r) => fromDb<PrescribedBook>(r));
  const customBooks = (customRows || []).map((r) => fromDb<CustomBook>(r));

  const allItems = (rows || []).map((r) => fromDb<BookActionItem>(r));

  // Get unique book names for filter
  const bookNames = Array.from(new Set(allItems.map((item) => item.bookName))).sort();

  // Filter
  const filtered = allItems.filter((item) => {
    if (params.book && item.bookName !== params.book) return false;
    if (params.status && item.status !== params.status) return false;
    return true;
  });

  // Group by book, then by phase
  const bookGroups = new Map<string, Map<string, BookActionItem[]>>();
  for (const item of filtered) {
    if (!bookGroups.has(item.bookName)) {
      bookGroups.set(item.bookName, new Map());
    }
    const phases = bookGroups.get(item.bookName)!;
    if (!phases.has(item.phaseName)) {
      phases.set(item.phaseName, []);
    }
    phases.get(item.phaseName)!.push(item);
  }

  // Count stats
  const statusCounts = {
    toDo: allItems.filter((i) => i.status === "To Do").length,
    inProgress: allItems.filter((i) => i.status === "In Progress").length,
    done: allItems.filter((i) => i.status === "Done").length,
    blocked: allItems.filter((i) => i.status === "Blocked").length,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Knowledge Building
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Reading Tracker
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          Prescribed reading, your library, and book action items.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Prescribed Reading List */}
      <div className="animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        <PrescribedBooks books={prescribedBooks} />
      </div>

      {/* Custom Library */}
      <div className="animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <CustomLibrary books={customBooks} />
      </div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Book Coach Header */}
      <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <div className="space-y-1">
          <h2 className="text-lg font-serif tracking-widest uppercase text-white/90">
            {"\u{1F4DA}"} Book Coach — Action Items
          </h2>
          <p className="text-xs font-mono text-white/40 tracking-wider">
            {allItems.length} total · {statusCounts.toDo} to do ·{" "}
            {statusCounts.inProgress} in progress · {statusCounts.done} done ·{" "}
            {statusCounts.blocked} blocked
          </p>
        </div>
        <BookForm />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        {["", "To Do", "Blocked", "In Progress", "Done", "Abandoned"].map(
          (s) => (
            <a
              key={s}
              href={
                s
                  ? `?status=${encodeURIComponent(s)}${params.book ? `&book=${encodeURIComponent(params.book)}` : ""}`
                  : params.book
                    ? `?book=${encodeURIComponent(params.book)}`
                    : "/books"
              }
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                (params.status ?? "") === s
                  ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                  : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
              }`}
            >
              {s || "All Statuses"}
            </a>
          )
        )}
        {bookNames.length > 0 && (
          <>
            <span className="mx-1 text-white/[0.05] self-center">|</span>
            <a
              href={
                params.status
                  ? `?status=${encodeURIComponent(params.status)}`
                  : "/books"
              }
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                !params.book
                  ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                  : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
              }`}
            >
              All Books
            </a>
            {bookNames.map((b) => (
              <a
                key={b}
                href={`?book=${encodeURIComponent(b)}${params.status ? `&status=${encodeURIComponent(params.status)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  params.book === b
                    ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                    : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
                }`}
              >
                {b}
              </a>
            ))}
          </>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No book action items yet. Add your first book.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
          {Array.from(bookGroups.entries()).map(([bookName, phases]) => (
            <div key={bookName} className="space-y-4">
              {/* Book header */}
              <div className="border-b border-white/[0.08] pb-2">
                <h2 className="text-lg font-serif tracking-wide text-white/90">
                  {"\u{1F4D6}"} {bookName}
                </h2>
                <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
                  {Array.from(phases.values()).reduce((sum, phaseItems) => sum + phaseItems.length, 0)} action items
                  · {phases.size} phases
                </p>
              </div>

              {/* Phase groups */}
              {Array.from(phases.entries()).map(([phaseName, phaseItems]) => (
                <div key={phaseName} className="space-y-2 pl-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/40 font-serif">
                    {phaseName}
                  </h3>
                  <div className="glass-card rounded-2xl overflow-hidden">
                    {phaseItems.map((item: BookActionItem) => (
                      <ActionItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionItemRow({
  item,
}: {
  item: BookActionItem;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.04] first:border-t-0 hover:bg-white/[0.02] transition-colors"
    >
      {/* Order number */}
      <span className="text-[10px] font-mono text-white/30 w-6 text-right shrink-0">
        {item.order}.
      </span>

      {/* Action item text */}
      <div className="flex-1 min-w-0">
        <span
          className={`font-serif ${
            item.status === "Done"
              ? "line-through text-white/40"
              : item.status === "Abandoned"
                ? "line-through text-white/30"
                : "text-white/90"
          }`}
        >
          {item.actionItem}
        </span>
        {item.dependsOn && (
          <p className="text-[10px] text-white/30 font-mono mt-0.5">
            depends on: {item.dependsOn}
          </p>
        )}
        {item.pageContent && (
          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
            {item.pageContent}
          </p>
        )}
      </div>

      {/* Type badge */}
      <Badge variant="secondary" className="shrink-0">
        {item.itemType}
      </Badge>

      {/* Status badge */}
      <Badge variant={STATUS_VARIANT[item.status] ?? "outline"} className="shrink-0">
        {STATUS_ICON[item.status] ?? "\u2610"} {item.status}
      </Badge>

      {/* Life area */}
      <span className="text-xs text-white/40 whitespace-nowrap shrink-0 w-28 text-right">
        {item.lifeArea ?? "\u2014"}
      </span>

      {/* Input needed indicator */}
      {item.inputNeeded && (
        <span className="text-[9px] font-mono text-primary border border-primary/30 px-1 rounded shrink-0">
          INPUT
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <BookForm bookAction={item} />
        <DeleteBookActionButton id={item.id} />
      </div>
    </div>
  );
}
