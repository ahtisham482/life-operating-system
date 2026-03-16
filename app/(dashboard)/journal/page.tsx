export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { JournalForm } from "./journal-form";
import { JournalCategoryFilter } from "./category-filter";
import { DeleteJournalButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
import type { JournalEntry } from "@/lib/db/schema";

const MOODS = ["\u{1F60A} Good", "\u{1F610} Neutral", "\u{1F614} Low", "\u{1F525} Fired Up", "\u{1F624} Frustrated"];

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

  // Fetch today's check-in reflection
  const today = getTodayKarachi();
  const { data: checkinRow } = await supabase
    .from("daily_checkins")
    .select("reflection")
    .eq("date", today)
    .maybeSingle();
  const checkinReflection = checkinRow?.reflection || null;

  // Auto-generated title for display
  const now = new Date();
  const karachiTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const hour = karachiTime.getHours();
  const period = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const dateStr = karachiTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const autoTitle = `${dateStr} \u2014 ${period}`;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2">
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
            Journal
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {allEntries.length} total entries
          </p>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* ═══ Writing Zone Hero ═══ */}
      <section className="animate-slide-up" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        {/* Check-in reflection prompt */}
        {checkinReflection && (
          <div className="bg-[#C49E45]/[0.04] border border-[#C49E45]/10 rounded-xl px-5 py-4 mb-4">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[#C49E45]/50 mb-1">
              Earlier you said
            </p>
            <p className="text-sm font-serif text-white/50 italic leading-relaxed">
              &ldquo;{checkinReflection}&rdquo;
            </p>
          </div>
        )}

        {/* Writing card */}
        <div className="glass-card rounded-2xl p-8 space-y-5">
          {/* Auto title */}
          <p className="font-mono text-[13px] text-white/30 tracking-wider">
            {autoTitle}
          </p>

          {/* Mood row */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider mr-1">Mood</span>
            {MOODS.map((mood) => {
              const emoji = mood.split(" ")[0];
              return (
                <span
                  key={mood}
                  className="text-xl cursor-default opacity-40 hover:opacity-100 transition-opacity"
                  title={mood}
                >
                  {emoji}
                </span>
              );
            })}
          </div>

          {/* CTA — opens the journal form dialog */}
          <JournalForm checkinReflection={checkinReflection} />
        </div>
      </section>

      {/* ═══ Past Entries ═══ */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/10 to-transparent" />

      {/* Filter — single dropdown */}
      <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
          Past Entries
          <span className="ml-2 text-white/20">{filtered.length} shown</span>
        </p>
        <JournalCategoryFilter current={params.category || ""} />
      </div>

      {/* Journal Cards */}
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
  const moodEmoji = entry.mood.split(" ")[0];

  return (
    <div className="glass-card rounded-2xl p-6 space-y-3 hover:border-white/[0.08] transition-all">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{moodEmoji}</span>
            <h2 className="font-serif text-white/90 text-base leading-snug">
              {entry.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-mono text-white/25 tracking-wider">
              {entry.date}
            </p>
            <Badge variant="outline" className="text-[9px]">{entry.category}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <JournalForm journalEntry={entry} />
          <DeleteJournalButton id={entry.id} />
        </div>
      </div>

      {/* Entry text */}
      <p className="text-sm text-white/30 font-serif leading-relaxed">
        {entry.entry}
      </p>
    </div>
  );
}
