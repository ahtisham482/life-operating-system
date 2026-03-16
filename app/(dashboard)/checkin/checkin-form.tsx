"use client";

import { useState, useTransition } from "react";
import { upsertCheckin } from "./actions";

const MOODS = ["🔥 On Fire", "⚡ Energized", "😐 Neutral", "😔 Drained", "🌀 Scattered"];

type CheckinFormProps = {
  today: string;
  todayEntry?: {
    leadDone: boolean | null;
    mood: string;
    reflection: string;
    blockers: string;
  };
  seasonGoal?: string;
  leadDomainLabel?: string;
  leadDomainDesc?: string;
};

export function CheckinForm({
  today,
  todayEntry,
  seasonGoal,
  leadDomainLabel,
  leadDomainDesc,
}: CheckinFormProps) {
  const [leadDone, setLeadDone] = useState<boolean | null>(todayEntry?.leadDone ?? null);
  const [mood, setMood] = useState(todayEntry?.mood ?? "");
  const [reflection, setReflection] = useState(todayEntry?.reflection ?? "");
  const [blockers, setBlockers] = useState(todayEntry?.blockers ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (leadDone === null) return;
    startTransition(async () => {
      await upsertCheckin(today, leadDone, mood, reflection, blockers);
    });
  }

  return (
    <div className="space-y-6">
      {/* Lead Priority Card */}
      {seasonGoal && (
        <div className="bg-card border border-primary/30 p-5 rounded-lg">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
            Your Current Lead Priority
          </p>
          <p className="text-base font-serif text-primary">{seasonGoal}</p>
          {leadDomainLabel && (
            <p className="text-xs font-mono text-muted-foreground/60 mt-1.5">
              {leadDomainLabel} — {leadDomainDesc}
            </p>
          )}
        </div>
      )}

      {/* Today's Check-In Card */}
      <div className="bg-card border border-border p-5 rounded-lg space-y-5">
        {/* Lead Done Question */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Did you move your lead priority forward today?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLeadDone(true)}
              className={`w-12 h-12 flex items-center justify-center text-lg border-2 rounded transition-colors ${
                leadDone === true
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground/40 hover:border-border/80"
              }`}
            >
              ✓
            </button>
            <button
              onClick={() => setLeadDone(false)}
              className={`w-12 h-12 flex items-center justify-center text-lg border-2 rounded transition-colors ${
                leadDone === false
                  ? "border-red-500/60 bg-red-500/10 text-red-400"
                  : "border-border text-muted-foreground/40 hover:border-border/80"
              }`}
            >
              ✗
            </button>
            <span className="text-xs font-mono text-muted-foreground ml-2">
              {leadDone === true
                ? "Yes — good. Keep going."
                : leadDone === false
                ? "No — what stopped you?"
                : "Tap to answer"}
            </span>
          </div>
        </div>

        {/* Mood */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Mood & Energy
          </p>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${
                  mood === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Reflection */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
            One-Line Reflection — What happened today?
          </p>
          <input
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write one honest sentence about today..."
            className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Blockers */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
            What blocked you or scattered you today?
          </p>
          <input
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="Optional — be honest with yourself..."
            className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isPending || leadDone === null}
          className="px-6 py-2.5 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Today"}
        </button>
      </div>
    </div>
  );
}
