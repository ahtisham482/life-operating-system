export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { BookForm } from "./book-form";
import { DeleteBookActionButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
import type { BookActionItem } from "@/lib/db/schema";

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
  const { data: rows } = await supabase
    .from("book_action_items")
    .select("*")
    .order("book_name", { ascending: true })
    .order("phase_number", { ascending: true })
    .order("order", { ascending: true });

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
            {"\u{1F4DA}"} Book Coach
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            {allItems.length} total · {statusCounts.toDo} to do ·{" "}
            {statusCounts.inProgress} in progress · {statusCounts.done} done ·{" "}
            {statusCounts.blocked} blocked
          </p>
        </div>
        <BookForm />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
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
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                (params.status ?? "") === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {s || "All Statuses"}
            </a>
          )
        )}
        {bookNames.length > 0 && (
          <>
            <span className="mx-1 text-border">|</span>
            <a
              href={
                params.status
                  ? `?status=${encodeURIComponent(params.status)}`
                  : "/books"
              }
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                !params.book
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              All Books
            </a>
            {bookNames.map((b) => (
              <a
                key={b}
                href={`?book=${encodeURIComponent(b)}${params.status ? `&status=${encodeURIComponent(params.status)}` : ""}`}
                className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                  params.book === b
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
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
        <div className="py-16 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
          No book action items yet. Add your first book.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(bookGroups.entries()).map(([bookName, phases]) => (
            <div key={bookName} className="space-y-4">
              {/* Book header */}
              <div className="border-b border-border/50 pb-2">
                <h2 className="text-lg font-serif tracking-wide text-foreground">
                  {"\u{1F4D6}"} {bookName}
                </h2>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                  {Array.from(phases.values()).reduce((sum, phaseItems) => sum + phaseItems.length, 0)} action items
                  · {phases.size} phases
                </p>
              </div>

              {/* Phase groups */}
              {Array.from(phases.entries()).map(([phaseName, phaseItems]) => (
                <div key={phaseName} className="space-y-2 pl-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {phaseName}
                  </h3>
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    {phaseItems.map((item: BookActionItem, i: number) => (
                      <ActionItemRow key={item.id} item={item} even={i % 2 === 0} />
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
  even,
}: {
  item: BookActionItem;
  even: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-t border-border/30 first:border-t-0 ${
        even ? "" : "bg-card/20"
      }`}
    >
      {/* Order number */}
      <span className="text-[10px] font-mono text-muted-foreground/60 w-6 text-right shrink-0">
        {item.order}.
      </span>

      {/* Action item text */}
      <div className="flex-1 min-w-0">
        <span
          className={`font-serif ${
            item.status === "Done"
              ? "line-through text-muted-foreground"
              : item.status === "Abandoned"
                ? "line-through text-muted-foreground/60"
                : ""
          }`}
        >
          {item.actionItem}
        </span>
        {item.dependsOn && (
          <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
            depends on: {item.dependsOn}
          </p>
        )}
        {item.pageContent && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
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
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 w-28 text-right">
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
