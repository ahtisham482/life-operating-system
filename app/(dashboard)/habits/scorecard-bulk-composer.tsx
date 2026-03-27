"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ScorecardEntryInput } from "@/lib/schemas/scorecard";
import { SCORECARD_TEMPLATE_SECTIONS } from "./scorecard-content";

type BulkDraftEntry = {
  id: string;
  timeOfAction: string;
  behaviorDescription: string;
  behaviorCategory: string;
  rating: ScorecardEntryInput["rating"];
};

interface ScorecardBulkComposerProps {
  guided?: boolean;
  isPending: boolean;
  onSubmit: (entries: ScorecardEntryInput[]) => void;
  onClose?: () => void;
}

export function ScorecardBulkComposer({
  guided = false,
  isPending,
  onSubmit,
  onClose,
}: ScorecardBulkComposerProps) {
  const [entries, setEntries] = useState<BulkDraftEntry[]>([]);

  function addSuggestedEntry(entry: Omit<BulkDraftEntry, "id">) {
    setEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), ...entry },
    ]);
  }

  function updateEntry(id: string, field: keyof BulkDraftEntry, value: string) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    );
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function handleSubmit() {
    if (entries.length === 0) return;
    onSubmit(
      entries.map((entry) => ({
        timeOfAction: entry.timeOfAction,
        endTime: null,
        durationMinutes: null,
        behaviorDescription: entry.behaviorDescription,
        behaviorCategory: entry.behaviorCategory || null,
        rating: entry.rating,
        ratingReason: null,
        linkedIdentityId: null,
        identityAlignment: null,
        location: null,
        energyLevel: null,
        emotionalState: null,
        wasAutomatic: true,
        triggeredByEntryId: null,
        triggerType: null,
      })),
    );
  }

  return (
    <div className="glass-card rounded-[28px] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FEC89A]/70">
            {guided ? "Guided Yesterday Map" : "Bulk Add"}
          </p>
          <h3 className="text-2xl font-serif italic text-[#FFF8F0] mt-2">
            {guided ? "Rebuild the day from memory" : "Log a stretch of the day"}
          </h3>
          <p className="text-sm text-[#FFF8F0]/45 mt-2 max-w-2xl leading-relaxed">
            Tap suggestions to add them, then edit the time or rating so the list reflects what actually happened.
          </p>
        </div>
        {onClose ? (
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={onClose}
          >
            Close
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
        {SCORECARD_TEMPLATE_SECTIONS.map((section) => (
          <div
            key={section.label}
            className="rounded-[22px] border border-[#FFF8F0]/[0.06] bg-[#0D0D1A]/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#34D399]/70">
                  {section.label}
                </p>
                <p className="text-[12px] text-[#FFF8F0]/35 mt-1">{section.timeRange}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {section.behaviors.map((behavior) => (
                <button
                  key={`${section.label}-${behavior.behavior}-${behavior.time}`}
                  type="button"
                  onClick={() =>
                    addSuggestedEntry({
                      timeOfAction: behavior.time,
                      behaviorDescription: behavior.behavior,
                      behaviorCategory: behavior.category,
                      rating: behavior.suggestedRating,
                    })
                  }
                  className="rounded-full border border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] px-3 py-2 text-left hover:border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/[0.08]"
                >
                  <span className="text-[11px] font-mono text-[#FEC89A]">{behavior.time}</span>
                  <span className="ml-2 text-[12px] text-[#FFF8F0]/75">{behavior.behavior}</span>
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-1">
              {section.prompts.map((prompt) => (
                <li key={prompt} className="text-[12px] text-[#FFF8F0]/38">
                  • {prompt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.03] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/40">
            Selected entries
          </p>
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/55 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={() =>
              addSuggestedEntry({
                timeOfAction: "",
                behaviorDescription: "",
                behaviorCategory: "",
                rating: "=",
              })
            }
          >
            Add blank row
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-[#FFF8F0]/35">
            Pick a few starter behaviors above, or add a blank row and type them manually.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 rounded-2xl border border-[#FFF8F0]/[0.05] bg-[#0D0D1A]/50 p-3 sm:grid-cols-[110px_1fr_110px_72px]"
              >
                <input
                  type="time"
                  value={entry.timeOfAction}
                  onChange={(event) => updateEntry(entry.id, "timeOfAction", event.target.value)}
                  className="rounded-xl border border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] px-3 py-2 text-sm text-[#FFF8F0]/85"
                />
                <input
                  value={entry.behaviorDescription}
                  onChange={(event) =>
                    updateEntry(entry.id, "behaviorDescription", event.target.value)
                  }
                  className="rounded-xl border border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] px-3 py-2 text-sm text-[#FFF8F0]/85"
                  placeholder="Describe the behavior"
                />
                <select
                  value={entry.rating}
                  onChange={(event) =>
                    updateEntry(entry.id, "rating", event.target.value as BulkDraftEntry["rating"])
                  }
                  className="rounded-xl border border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] px-3 py-2 text-sm text-[#FFF8F0]/85"
                >
                  <option value="+">+ Builds me</option>
                  <option value="=">= Neutral</option>
                  <option value="-">- Against me</option>
                </select>
                <Button
                  variant="destructive"
                  className="border-[#FF6B6B]/20 bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20"
                  disabled={isPending}
                  onClick={() => removeEntry(entry.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onClose ? (
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          className="bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
          disabled={isPending || entries.length === 0}
          onClick={handleSubmit}
        >
          {isPending ? "Saving..." : "Add selected entries"}
        </Button>
      </div>
    </div>
  );
}
