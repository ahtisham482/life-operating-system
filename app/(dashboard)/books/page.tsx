export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { BookForm } from "./book-form";
import { DeleteBookActionButton } from "./delete-button";
import { PrescribedBooks } from "./prescribed-books";
import { CustomLibrary } from "./custom-library";
import { BookTabs } from "./book-tabs";
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
  searchParams: Promise<{ book?: string; status?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || "prescribed";
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

  const totalBooks = prescribedBooks.length + customBooks.length;

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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2">
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
            Reading Library
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {totalBooks} books
          </p>
        </div>
        <BookForm />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Tab Buttons */}
      <div className="animate-slide-up" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <BookTabs activeTab={activeTab} />
      </div>

      {/* Prescribed Tab */}
      {activeTab === "prescribed" && (
        <div className="space-y-8 animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
          {/* Book Grid */}
          {prescribedBooks.length > 0 ? (
            <div className="grid grid-cols-3 gap-6">
              {prescribedBooks.map((book) => {
                const actionCount = allItems.filter(
                  (item) => item.bookName.toLowerCase().includes(book.title.toLowerCase().split(" ").slice(0, 2).join(" "))
                ).length;

                return (
                  <BookCard
                    key={book.id}
                    title={book.title}
                    author={book.author}
                    status={book.status === "done" ? "Completed" : book.status === "reading" ? "Reading" : "To Read"}
                    actionCount={actionCount}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center glass-card rounded-2xl">
              <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
                No prescribed books yet.
              </p>
            </div>
          )}

          {/* Interactive prescribed list */}
          <PrescribedBooks books={prescribedBooks} />
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === "custom" && (
        <div className="space-y-8 animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
          {/* Book Grid */}
          {customBooks.length > 0 && (
            <div className="grid grid-cols-3 gap-6">
              {customBooks.map((book) => (
                <BookCard
                  key={book.id}
                  title={book.title}
                  author={book.insight || ""}
                  status={book.status === "Finished" ? "Completed" : book.status === "Currently Reading" ? "Reading" : "To Read"}
                  actionCount={0}
                />
              ))}
            </div>
          )}

          {/* Add book form + list */}
          <CustomLibrary books={customBooks} />
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Book Coach — Action Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <div className="space-y-1">
            <h2 className="text-lg font-serif tracking-wide text-white/90">
              Action Items
            </h2>
            <p className="text-[10px] font-mono text-white/30 tracking-wider">
              {allItems.length} total &middot; {statusCounts.toDo} to do &middot;{" "}
              {statusCounts.inProgress} in progress &middot; {statusCounts.done} done
            </p>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center glass-card rounded-2xl">
            <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
              No book action items yet. Add your first book.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            {Array.from(bookGroups.entries()).map(([bookName, phases]) => (
              <div key={bookName} className="space-y-4">
                {/* Book header */}
                <div className="border-b border-white/[0.08] pb-2">
                  <h2 className="text-lg font-serif tracking-wide text-white/90">
                    {bookName}
                  </h2>
                  <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
                    {Array.from(phases.values()).reduce((sum, phaseItems) => sum + phaseItems.length, 0)} action items
                    &middot; {phases.size} phases
                  </p>
                </div>

                {/* Phase groups */}
                {Array.from(phases.entries()).map(([phaseName, phaseItems]) => (
                  <div key={phaseName} className="space-y-2 pl-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">
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
    </div>
  );
}

/* ── Book Card Component ── */
function BookCard({
  title,
  author,
  status,
  actionCount,
}: {
  title: string;
  author: string;
  status: "Reading" | "Completed" | "To Read";
  actionCount: number;
}) {
  const statusColors = {
    Reading: "bg-[#C49E45]/20 text-[#C49E45]",
    Completed: "bg-green-500/20 text-green-400",
    "To Read": "bg-white/[0.06] text-white/40",
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-white/[0.08] transition-all min-h-[200px]">
      <div className="space-y-2">
        <h3 className="text-lg font-serif text-white/90 leading-snug">
          {title}
        </h3>
        {author && (
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {author}
          </p>
        )}
      </div>
      <div className="space-y-3 mt-4">
        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${statusColors[status]}`}>
          {status}
        </span>
        {actionCount > 0 && (
          <p className="text-[10px] font-mono text-white/20">
            {actionCount} action items
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Action Item Row ── */
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

