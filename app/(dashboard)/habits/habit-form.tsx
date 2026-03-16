"use client";

import { useState, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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

type HabitGroup = {
  title: string;
  keys: (keyof HabitChecks)[];
};

const MORNING_KEYS: (keyof HabitChecks)[] = [
  "leftBy9",
  "exercise",
  "clothes",
  "readAM",
  "quickAction",
];

const DAYTIME_KEYS: (keyof HabitChecks)[] = [
  "actionLog",
  "skillStudy",
  "bike",
  "needDesire",
  "cashRecall",
];

const EVENING_KEYS_BASE: (keyof HabitChecks)[] = [
  "readPM",
  "tafseer",
  "phoneOutBy10",
];

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

type HabitFormProps = {
  entry?: HabitEntry | null;
  date: string;
  day: string;
  streaks: Record<string, number>;
};

export function HabitForm({ entry, date, day, streaks }: HabitFormProps) {
  const [habits, setHabits] = useState<HabitChecks>(
    entry?.habits ? { ...DEFAULT_HABITS, ...entry.habits } : { ...DEFAULT_HABITS }
  );
  const [notes, setNotes] = useState<string>(entry?.notes ?? "");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!(entry?.notes));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if weekendPlan should be shown
  const isWeekendDay = day === "Friday" || day === "Saturday";
  const eveningKeys: (keyof HabitChecks)[] = isWeekendDay
    ? [...EVENING_KEYS_BASE, "weekendPlan"]
    : EVENING_KEYS_BASE;

  const groups: HabitGroup[] = [
    { title: "Morning Routine", keys: MORNING_KEYS },
    { title: "Daytime Focus", keys: DAYTIME_KEYS },
    { title: "Evening Wind-Down", keys: eveningKeys },
  ];

  const allVisibleKeys = [...MORNING_KEYS, ...DAYTIME_KEYS, ...eveningKeys];
  const totalCount = allVisibleKeys.length;
  const completedCount = allVisibleKeys.filter((k) => habits[k]).length;

  const showSaved = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedIndicator(true);
    savedTimerRef.current = setTimeout(() => setSavedIndicator(false), 1500);
  }, []);

  function toggleHabit(key: keyof HabitChecks, checked: boolean) {
    const updated = { ...habits, [key]: checked };
    setHabits(updated);

    // Debounced auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await upsertHabitEntry(date, day, updated, notes.trim() || null);
        showSaved();
      } catch {
        // Silently fail — user can retry
      }
    }, 500);
  }

  return (
    <div className="space-y-6">
      {/* Completion counter + progress bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono text-muted-foreground tracking-wider">
          <span className="text-primary font-semibold">{completedCount}</span>{" "}
          / {totalCount} habits completed
        </p>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="text-[10px] font-mono text-[#C49E45] tracking-wider">
              Saved
            </span>
          )}
          <div className="w-32 h-1.5 bg-border/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grouped habit checkboxes */}
      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
            {group.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.keys.map((key) => {
              const habitStreak = streaks[key] ?? 0;

              return (
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
                    className={`text-sm font-mono flex-1 ${
                      habits[key] ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {HABIT_LABELS[key]}
                  </span>
                  {habitStreak >= 2 && (
                    <span className="text-[10px] font-mono text-orange-400/80">
                      🔥{habitStreak}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Collapsible Notes */}
      <div>
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
        >
          {notesOpen ? "Hide notes ▾" : "Add notes ▸"}
        </button>

        {notesOpen && (
          <div className="mt-3 space-y-3 animate-slide-up" style={{ animationFillMode: "both" }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any reflections on today..."
              rows={3}
              className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <button
              onClick={async () => {
                try {
                  await upsertHabitEntry(date, day, habits, notes.trim() || null);
                  showSaved();
                } catch {
                  // Silently fail
                }
              }}
              className="px-5 py-2 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors"
            >
              Save Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
