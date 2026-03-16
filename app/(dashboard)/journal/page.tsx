export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { JournalForm } from "./journal-form";
import { DeleteJournalButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
import type { JournalEntry } from "@/lib/db/schema";

const MOOD_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  "😊 Good": "default",
  "😐 Neutral": "secondary",
  "😔 Low": "destructive",
  "🔥 Fired Up": "default",
  "😤 Frustrated": "destructive",
};

const MOODS = ["😊 Good", "😐 Neutral", "😔 Low", "🔥 Fired Up", "😤 Frustrated"];
const CATEGORIES = ["General", "Dopamine Reset", "Financial", "Work", "Mindset"];

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string; category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("journal_entries")
    .select("*")
    .order("date", { ascending: false });

  const allEntries = (rows || []).map((r) => fromDb<JournalEntry>(r));

  const filtered = allEntries.filter((e) => {
    if (params.mood && e.mood !== params.mood) return false;
    if (params.category && e.category !== params.category) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
            📔 Journal
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            {allEntries.length} total · {filtered.length} shown
          </p>
        </div>
        <JournalForm />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {["", ...MOODS].map((m) => (
          <a
            key={m}
            href={m ? `?mood=${encodeURIComponent(m)}` : "/journal"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.mood ?? "") === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {m || "All Moods"}
          </a>
        ))}
        <span className="mx-1 text-border">|</span>
        {["", ...CATEGORIES].map((c) => (
          <a
            key={c}
            href={c ? `?category=${encodeURIComponent(c)}` : "/journal"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.category ?? "") === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {c || "All Categories"}
          </a>
        ))}
      </div>

      {/* Journal Entries */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
          No journal entries yet. Start writing.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <JournalCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function JournalCard({ entry }: { entry: JournalEntry }) {
  return (
    <div className="border border-border/50 rounded-lg p-5 bg-card/20 space-y-3">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="font-serif text-foreground text-base leading-snug">
            {entry.title}
          </h2>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            {entry.date}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <JournalForm journalEntry={entry} />
          <DeleteJournalButton id={entry.id} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <Badge variant={MOOD_VARIANT[entry.mood] ?? "secondary"}>
          {entry.mood}
        </Badge>
        <Badge variant="outline">{entry.category}</Badge>
      </div>

      {/* Entry text */}
      <p className="text-sm text-muted-foreground font-serif leading-relaxed line-clamp-3">
        {entry.entry}
      </p>
    </div>
  );
}
