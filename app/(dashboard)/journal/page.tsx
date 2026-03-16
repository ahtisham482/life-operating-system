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
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
            Self-Reflection
          </p>
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
            Journal
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {allEntries.length} total &middot; {filtered.length} shown
          </p>
        </div>
        <JournalForm />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {["", ...MOODS].map((m) => (
          <a
            key={m}
            href={m ? `?mood=${encodeURIComponent(m)}` : "/journal"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.mood ?? "") === m
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {m || "All Moods"}
          </a>
        ))}
        <span className="mx-1 text-white/[0.05] self-center">|</span>
        {["", ...CATEGORIES].map((c) => (
          <a
            key={c}
            href={c ? `?category=${encodeURIComponent(c)}` : "/journal"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.category ?? "") === c
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {c || "All Categories"}
          </a>
        ))}
      </div>

      {/* Journal Entries */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No journal entries yet. Start writing.
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
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
    <div className="glass-card rounded-2xl p-6 space-y-3 hover:border-white/[0.08] transition-all">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="font-serif text-white/90 text-base leading-snug">
            {entry.title}
          </h2>
          <p className="text-[10px] font-mono text-white/25 tracking-wider">
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
      <p className="text-sm text-white/30 font-serif leading-relaxed line-clamp-3">
        {entry.entry}
      </p>
    </div>
  );
}
