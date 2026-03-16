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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";
import {
  createBookAction,
  updateBookAction,
  type BookActionFormData,
} from "./actions";
import type { BookActionItem } from "@/lib/db/schema";

const PHASES = [
  { number: 1, name: "Phase 1 - Foundation" },
  { number: 2, name: "Phase 2 - Deep Practice" },
  { number: 3, name: "Phase 3 - Integration" },
  { number: 4, name: "Phase 4 - Mastery" },
  { number: 5, name: "Phase 5 - Teaching" },
] as const;

const ITEM_TYPES = [
  "\u{1F4CB} Action",
  "\u{1F501} Habit",
  "\u{1F4DD} Reflection",
  "\u{1F3AF} Milestone",
] as const;

const STATUSES = [
  "To Do",
  "Blocked",
  "In Progress",
  "Done",
  "Abandoned",
] as const;

const LIFE_AREAS = [
  "\u{1F4BC} Job",
  "\u{1F680} Business Building",
  "\u{1F4D6} Personal Dev",
  "\u{1F3E0} Home & Life",
] as const;

const EMPTY: BookActionFormData = {
  actionItem: "",
  bookName: "",
  status: "To Do",
  phaseNumber: 1,
  phaseName: "Phase 1 - Foundation",
  itemType: "\u{1F4CB} Action",
  order: 1,
  lifeArea: null,
  inputNeeded: false,
  dependsOn: null,
  pageContent: null,
};

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

export function BookForm({ bookAction }: { bookAction?: BookActionItem }) {
  const isEdit = Boolean(bookAction);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookActionFormData>(
    bookAction
      ? {
          actionItem: bookAction.actionItem,
          bookName: bookAction.bookName,
          status: bookAction.status,
          phaseNumber: bookAction.phaseNumber,
          phaseName: bookAction.phaseName,
          itemType: bookAction.itemType,
          order: bookAction.order,
          lifeArea: bookAction.lifeArea ?? null,
          inputNeeded: bookAction.inputNeeded,
          dependsOn: bookAction.dependsOn ?? null,
          pageContent: bookAction.pageContent ?? null,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);

  function set(field: keyof BookActionFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhaseChange(phaseValue: string) {
    const phase = PHASES.find((p) => p.name === phaseValue);
    if (phase) {
      setForm((prev) => ({
        ...prev,
        phaseNumber: phase.number,
        phaseName: phase.name,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.actionItem.trim() || !form.bookName.trim()) return;
    setSaving(true);
    try {
      if (isEdit && bookAction) {
        await updateBookAction(bookAction.id, form);
      } else {
        await createBookAction(form);
      }
      setOpen(false);
      if (!isEdit) setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Edit action item">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-3.5 w-3.5" />
            New Action Item
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Action Item" : "New Action Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Action Item */}
          <div className="space-y-1.5">
            <Label htmlFor="actionItem">Action Item *</Label>
            <Input
              id="actionItem"
              value={form.actionItem}
              onChange={(e) => set("actionItem", e.target.value)}
              placeholder="What action to take from the book?"
              required
            />
          </div>

          {/* Book Name */}
          <div className="space-y-1.5">
            <Label htmlFor="bookName">Book Name *</Label>
            <Input
              id="bookName"
              value={form.bookName}
              onChange={(e) => set("bookName", e.target.value)}
              placeholder="e.g. Atomic Habits"
              required
            />
          </div>

          {/* Row: Status + Item Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={FIELD_CLASS}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="itemType">Item Type</Label>
              <select
                id="itemType"
                value={form.itemType}
                onChange={(e) => set("itemType", e.target.value)}
                className={FIELD_CLASS}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Phase + Order */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phase">Phase</Label>
              <select
                id="phase"
                value={form.phaseName}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className={FIELD_CLASS}
              >
                {PHASES.map((p) => (
                  <option key={p.number} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order">Order *</Label>
              <Input
                type="number"
                id="order"
                min={1}
                value={form.order}
                onChange={(e) =>
                  set("order", e.target.value ? Number(e.target.value) : 1)
                }
                required
              />
            </div>
          </div>

          {/* Life Area */}
          <div className="space-y-1.5">
            <Label htmlFor="lifeArea">Life Area</Label>
            <select
              id="lifeArea"
              value={form.lifeArea ?? ""}
              onChange={(e) => set("lifeArea", e.target.value || null)}
              className={FIELD_CLASS}
            >
              <option value="">— None —</option>
              {LIFE_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Input Needed */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="inputNeeded"
              checked={form.inputNeeded}
              onCheckedChange={(v) => set("inputNeeded", Boolean(v))}
            />
            <Label htmlFor="inputNeeded" className="cursor-pointer">
              Input Needed
            </Label>
          </div>

          {/* Depends On */}
          <div className="space-y-1.5">
            <Label htmlFor="dependsOn">Depends On</Label>
            <Input
              id="dependsOn"
              value={form.dependsOn ?? ""}
              onChange={(e) => set("dependsOn", e.target.value || null)}
              placeholder="e.g. Complete Phase 1 items first"
            />
          </div>

          {/* Page Content */}
          <div className="space-y-1.5">
            <Label htmlFor="pageContent">Page Content</Label>
            <Textarea
              id="pageContent"
              value={form.pageContent ?? ""}
              onChange={(e) => set("pageContent", e.target.value || null)}
              placeholder="Notes, quotes, or page references..."
              rows={3}
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
              disabled={
                saving || !form.actionItem.trim() || !form.bookName.trim()
              }
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Action Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
