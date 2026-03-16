"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertHabitEntry } from "./actions";
import type { HabitEntry, HabitChecks } from "@/lib/db/schema";

const HABIT_LABELS: Record<keyof HabitChecks, string> = {
  quickAction: "Quick Action",
  exercise: "Exercise",
  clothes: "Clothes Ready",
  actionLog: "Action Log",
  readAM: "Read AM",
  readPM: "Read PM",
  skillStudy: "Skill Study",
  bike: "Bike",
  needDesire: "Need vs Desire",
  cashRecall: "Cash Recall",
  leftBy9: "Left by 9",
  tafseer: "Tafseer",
  phoneOutBy10: "Phone Out by 10",
  weekendPlan: "Weekend Plan",
};

const HABIT_KEYS = Object.keys(HABIT_LABELS) as (keyof HabitChecks)[];

const DEFAULT_HABITS: HabitChecks = {
  quickAction: false,
  exercise: false,
  clothes: false,
  actionLog: false,
  readAM: false,
  readPM: false,
  skillStudy: false,
  bike: false,
  needDesire: false,
  cashRecall: false,
  leftBy9: false,
  tafseer: false,
  phoneOutBy10: false,
  weekendPlan: false,
};

export function HabitForm({
  entry,
  date,
  day,
}: {
  entry?: HabitEntry | null;
  date: string;
  day: string;
}) {
  const [habits, setHabits] = useState<HabitChecks>(
    entry?.habits ? { ...DEFAULT_HABITS, ...entry.habits } : { ...DEFAULT_HABITS }
  );
  const [notes, setNotes] = useState<string>(entry?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const completedCount = HABIT_KEYS.filter((k) => habits[k]).length;

  function toggleHabit(key: keyof HabitChecks, checked: boolean) {
    setHabits((prev) => ({ ...prev, [key]: checked }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertHabitEntry(date, day, habits, notes.trim() || null);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Completion counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono text-muted-foreground tracking-wider">
          <span className="text-primary font-semibold">{completedCount}</span>{" "}
          / 14 habits completed
        </p>
        {/* Progress bar */}
        <div className="w-32 h-1.5 bg-border/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / 14) * 100}%` }}
          />
        </div>
      </div>

      {/* Habit checkboxes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {HABIT_KEYS.map((key) => (
          <label
            key={key}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
              habits[key]
                ? "border-primary/50 bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <Checkbox
              checked={habits[key]}
              onCheckedChange={(v) => toggleHabit(key, Boolean(v))}
            />
            <span
              className={`text-sm font-mono ${
                habits[key]
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              {HABIT_LABELS[key]}
            </span>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="habit-notes">Notes</Label>
        <Textarea
          id="habit-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Any reflections on today..."
          rows={3}
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : entry ? "Update Entry" : "Save Entry"}
        </Button>
        {saved && (
          <span className="text-xs font-mono text-primary tracking-wider">
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
