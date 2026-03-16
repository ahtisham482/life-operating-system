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
import { createTask, updateTask, type TaskFormData } from "./actions";
import type { Task } from "@/lib/db/schema";

const EMPTY: TaskFormData = {
  taskName: "",
  status: "To Do",
  priority: null,
  lifeArea: null,
  type: null,
  dueDate: null,
  notes: null,
  recurring: false,
  frequency: null,
  repeatEveryDays: null,
};

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

export function TaskForm({ task }: { task?: Task }) {
  const isEdit = Boolean(task);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskFormData>(
    task
      ? {
          taskName: task.taskName,
          status: task.status,
          priority: task.priority ?? null,
          lifeArea: task.lifeArea ?? null,
          type: task.type ?? null,
          dueDate: task.dueDate ?? null,
          notes: task.notes ?? null,
          recurring: task.recurring,
          frequency: task.frequency ?? null,
          repeatEveryDays: task.repeatEveryDays ?? null,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);

  function set(field: keyof TaskFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.taskName.trim()) return;
    setSaving(true);
    try {
      if (isEdit && task) {
        await updateTask(task.id, form);
      } else {
        await createTask(form);
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
          <Button variant="ghost" size="icon" aria-label="Edit task">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Task Name */}
          <div className="space-y-1.5">
            <Label htmlFor="taskName">Task Name *</Label>
            <Input
              id="taskName"
              value={form.taskName}
              onChange={(e) => set("taskName", e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>

          {/* Row: Status + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="To Do">☐ To Do</option>
                <option value="In Progress">◉ In Progress</option>
                <option value="Done">✅ Done</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={form.type ?? ""}
                onChange={(e) => set("type", e.target.value || null)}
                className={FIELD_CLASS}
              >
                <option value="">— Select —</option>
                <option value="✅ Task">✅ Task</option>
                <option value="🏗️ Project">🏗️ Project</option>
                <option value="🔧 Subtask">🔧 Subtask</option>
                <option value="🔁 Habit">🔁 Habit</option>
              </select>
            </div>
          </div>

          {/* Row: Priority + Life Area */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={form.priority ?? ""}
                onChange={(e) => set("priority", e.target.value || null)}
                className={FIELD_CLASS}
              >
                <option value="">— None —</option>
                <option value="🔴 High">🔴 High</option>
                <option value="🟡 Medium">🟡 Medium</option>
                <option value="🟢 Low">🟢 Low</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lifeArea">Life Area</Label>
              <select
                id="lifeArea"
                value={form.lifeArea ?? ""}
                onChange={(e) => set("lifeArea", e.target.value || null)}
                className={FIELD_CLASS}
              >
                <option value="">— None —</option>
                <option value="💼 Job">💼 Job</option>
                <option value="🚀 Business Building">🚀 Business Building</option>
                <option value="📖 Personal Dev">📖 Personal Dev</option>
                <option value="🏠 Home & Life">🏠 Home &amp; Life</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due Date</Label>
            <input
              type="date"
              id="dueDate"
              value={form.dueDate ?? ""}
              onChange={(e) => set("dueDate", e.target.value || null)}
              className={FIELD_CLASS}
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="recurring"
              checked={form.recurring}
              onCheckedChange={(v) => set("recurring", Boolean(v))}
            />
            <Label htmlFor="recurring" className="cursor-pointer">
              Recurring Task
            </Label>
          </div>

          {form.recurring && (
            <div className="grid grid-cols-2 gap-3 pl-7">
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  value={form.frequency ?? ""}
                  onChange={(e) => set("frequency", e.target.value || null)}
                  className={FIELD_CLASS}
                >
                  <option value="">— Select —</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {form.frequency === "Custom" && (
                <div className="space-y-1.5">
                  <Label htmlFor="repeatEveryDays">Every N Days</Label>
                  <Input
                    type="number"
                    id="repeatEveryDays"
                    min={1}
                    value={form.repeatEveryDays ?? ""}
                    onChange={(e) =>
                      set("repeatEveryDays", e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="e.g. 3"
                  />
                </div>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={saving || !form.taskName.trim()}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
