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
  "😊 Good",
  "😐 Neutral",
  "😔 Low",
  "🔥 Fired Up",
  "😤 Frustrated",
] as const;

const CATEGORIES = [
  "General",
  "Dopamine Reset",
  "Financial",
  "Work",
  "Mindset",
] as const;

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

function makeEmpty(): JournalFormData {
  return {
    title: "",
    date: getTodayKarachi(),
    entry: "",
    mood: "😊 Good",
    category: "General",
  };
}

export function JournalForm({
  journalEntry,
}: {
  journalEntry?: JournalEntry;
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

          {/* Row: Mood + Category */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Entry */}
          <div className="space-y-1.5">
            <Label htmlFor="entry">Entry *</Label>
            <Textarea
              id="entry"
              value={form.entry}
              onChange={(e) => set("entry", e.target.value)}
              placeholder="Write your thoughts..."
              className="min-h-[200px]"
              required
            />
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
