"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import {
  createJournalEntry,
  updateJournalEntry,
  type JournalFormData,
} from "./actions";
import type { JournalEntry } from "@/lib/db/schema";
import { getTodayKarachi } from "@/lib/utils";

const MOODS = [
  "\u{1F60A} Good",
  "\u{1F610} Neutral",
  "\u{1F614} Low",
  "\u{1F525} Fired Up",
  "\u{1F624} Frustrated",
] as const;

const CATEGORIES = [
  "General",
  "Dopamine Reset",
  "Financial",
  "Work",
  "Mindset",
  "Deen / Spiritual",
  "Health",
] as const;

const PROMPTS = [
  "What is one thing you learned today?",
  "What would you do differently today?",
  "What are you grateful for right now?",
  "What challenged you and how did you respond?",
  "What is one thing you want to remember from today?",
  "What gave you energy today? What drained it?",
  "What is one small win you had today?",
];

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return PROMPTS[dayOfYear % PROMPTS.length];
}

function getAutoTitle(): string {
  const now = new Date();
  const karachiTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const hour = karachiTime.getHours();

  let period: string;
  if (hour < 12) {
    period = "Morning";
  } else if (hour < 18) {
    period = "Afternoon";
  } else {
    period = "Evening";
  }

  const dateStr = karachiTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${dateStr} \u2014 ${period}`;
}

function makeEmpty(): JournalFormData {
  return {
    title: getAutoTitle(),
    date: getTodayKarachi(),
    entry: "",
    mood: "\u{1F60A} Good",
    category: "General",
  };
}

export function JournalForm({
  journalEntry,
  checkinReflection,
}: {
  journalEntry?: JournalEntry;
  checkinReflection?: string | null;
}) {
  const isEdit = Boolean(journalEntry);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<JournalFormData>(
    journalEntry
      ? {
          title: journalEntry.title,
          date: journalEntry.date,
          entry: journalEntry.entry,
          mood: journalEntry.mood,
          category: journalEntry.category,
        }
      : makeEmpty()
  );
  const [saving, setSaving] = useState(false);

  function set(field: keyof JournalFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.entry.trim()) return;
    setSaving(true);
    try {
      if (isEdit && journalEntry) {
        await updateJournalEntry(journalEntry.id, form);
      } else {
        await createJournalEntry(form);
      }
      setOpen(false);
      if (!isEdit) setForm(makeEmpty());
    } finally {
      setSaving(false);
    }
  }

  const dailyPrompt = getDailyPrompt();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen && !isEdit) {
        setForm(makeEmpty());
      }
    }}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Edit journal entry">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-3.5 w-3.5" />
            New Entry
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Journal Entry" : "New Journal Entry"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Check-in reflection prompt */}
          {checkinReflection && !isEdit && (
            <div className="bg-[#C49E45]/[0.05] border border-[#C49E45]/10 rounded-lg px-4 py-3 mb-3">
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#C49E45]/60 mb-1">From your check-in today</p>
              <p className="text-sm font-serif text-white/60 italic">&ldquo;{checkinReflection}&rdquo;</p>
              <p className="text-[9px] font-mono text-white/30 mt-1">Want to expand on this?</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What's on your mind?"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <input
              type="date"
              id="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={FIELD_CLASS}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={FIELD_CLASS}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Daily prompt (new entries only) */}
          {!isEdit && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-3">
              <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-1">Today&apos;s prompt</p>
              <p className="text-sm font-serif text-white/50 italic">{dailyPrompt}</p>
            </div>
          )}

          {/* Entry */}
          <div className="space-y-1.5">
            <Label htmlFor="entry">Entry *</Label>
            <Textarea
              id="entry"
              value={form.entry}
              onChange={(e) => set("entry", e.target.value)}
              placeholder={!isEdit ? dailyPrompt : "Write your thoughts..."}
              className="min-h-[200px]"
              required
            />
          </div>

          {/* Mood (after entry for new, so you write first then classify) */}
          <div className="space-y-1.5">
            <Label htmlFor="mood">Mood</Label>
            <select
              id="mood"
              value={form.mood}
              onChange={(e) => set("mood", e.target.value)}
              className={FIELD_CLASS}
            >
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.title.trim() || !form.entry.trim()}
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
