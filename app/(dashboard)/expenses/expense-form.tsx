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
import { createExpense, updateExpense, type ExpenseFormData } from "./actions";
import type { Expense } from "@/lib/db/schema";

const CATEGORIES = [
  "Food & Drinks",
  "Transport",
  "Bills & Utilities",
  "Shopping",
  "Health",
  "Business",
  "Entertainment",
  "Other",
] as const;

const TYPES = ["Need", "Desire"] as const;

function getTodayKarachiLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const EMPTY: ExpenseFormData = {
  item: "",
  amountPkr: 0,
  category: "Food & Drinks",
  date: getTodayKarachiLocal(),
  type: "Need",
  notes: null,
};

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

export function ExpenseForm({ expense }: { expense?: Expense }) {
  const isEdit = Boolean(expense);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>(
    expense
      ? {
          item: expense.item,
          amountPkr: Number(expense.amountPkr),
          category: expense.category,
          date: expense.date,
          type: expense.type,
          notes: expense.notes ?? null,
        }
      : { ...EMPTY, date: getTodayKarachiLocal() }
  );
  const [saving, setSaving] = useState(false);

  function set(field: keyof ExpenseFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item.trim() || !form.amountPkr) return;
    setSaving(true);
    try {
      if (isEdit && expense) {
        await updateExpense(expense.id, form);
      } else {
        await createExpense(form);
      }
      setOpen(false);
      if (!isEdit) setForm({ ...EMPTY, date: getTodayKarachiLocal() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Edit expense">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-3.5 w-3.5" />
            New Expense
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "New Expense"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Item */}
          <div className="space-y-1.5">
            <Label htmlFor="item">Item *</Label>
            <Input
              id="item"
              value={form.item}
              onChange={(e) => set("item", e.target.value)}
              placeholder="What did you spend on?"
              required
            />
          </div>

          {/* Row: Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amountPkr">Amount (PKR) *</Label>
              <Input
                type="number"
                id="amountPkr"
                min={0}
                step="0.01"
                value={form.amountPkr || ""}
                onChange={(e) =>
                  set("amountPkr", e.target.value ? Number(e.target.value) : 0)
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
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

          {/* Row: Date + Type */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={FIELD_CLASS}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="Any additional context..."
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
              disabled={saving || !form.item.trim() || !form.amountPkr}
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
