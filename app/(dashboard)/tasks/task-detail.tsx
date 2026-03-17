"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Trash2 } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { updateTask, deleteTask } from "./actions";

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-white/[0.08] rounded-md text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 transition-colors";

export function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({
    taskName: task.taskName,
    status: task.status,
    priority: task.priority ?? "",
    lifeArea: task.lifeArea ?? "",
    type: task.type ?? "",
    dueDate: task.dueDate ?? "",
    notes: task.notes ?? "",
    recurring: task.recurring,
    frequency: task.frequency ?? "",
    repeatEveryDays: task.repeatEveryDays,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    setForm({
      taskName: task.taskName,
      status: task.status,
      priority: task.priority ?? "",
      lifeArea: task.lifeArea ?? "",
      type: task.type ?? "",
      dueDate: task.dueDate ?? "",
      notes: task.notes ?? "",
      recurring: task.recurring,
      frequency: task.frequency ?? "",
      repeatEveryDays: task.repeatEveryDays,
    });
    setConfirmDelete(false);
  }, [task]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSave = useCallback(async () => {
    if (!form.taskName.trim()) return;
    setSaving(true);

    const data = {
      taskName: form.taskName,
      status: form.status,
      priority: form.priority || null,
      lifeArea: form.lifeArea || null,
      type: form.type || null,
      dueDate: form.dueDate || null,
      notes: form.notes || null,
      recurring: form.recurring,
      frequency: form.frequency || null,
      repeatEveryDays: form.repeatEveryDays,
    };

    // Optimistic update
    onUpdate({
      ...task,
      ...data,
      status: data.status as Task["status"],
      priority: data.priority as Task["priority"],
      lifeArea: data.lifeArea as Task["lifeArea"],
      type: data.type as Task["type"],
      frequency: data.frequency as Task["frequency"],
    });

    try {
      await updateTask(task.id, data);
    } catch {
      onUpdate(task); // rollback
    } finally {
      setSaving(false);
    }
  }, [form, task, onUpdate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  }, [task.id, onDelete, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[480px] bg-zinc-900/95 backdrop-blur-xl border-l border-white/[0.06] flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-serif text-white/80 tracking-wide">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Task Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              Task Name
            </label>
            <input
              value={form.taskName}
              onChange={(e) => set("taskName", e.target.value)}
              className="w-full text-lg font-serif bg-transparent text-white/90 outline-none border-b border-white/[0.08] pb-1 focus:border-[#C49E45]/30"
              placeholder="Task name..."
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">None</option>
                <option value="🔴 High">🔴 High</option>
                <option value="🟡 Medium">🟡 Medium</option>
                <option value="🟢 Low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Type + Life Area */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Select</option>
                <option value="✅ Task">✅ Task</option>
                <option value="🏗️ Project">🏗️ Project</option>
                <option value="🔧 Subtask">🔧 Subtask</option>
                <option value="🔁 Habit">🔁 Habit</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                Life Area
              </label>
              <select
                value={form.lifeArea}
                onChange={(e) => set("lifeArea", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">None</option>
                <option value="💼 Job">💼 Job</option>
                <option value="🚀 Business Building">🚀 Business Building</option>
                <option value="📖 Personal Dev">📖 Personal Dev</option>
                <option value="🏠 Home & Life">🏠 Home &amp; Life</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => set("recurring", e.target.checked)}
              className="w-4 h-4 rounded border border-white/20 bg-transparent accent-[#C49E45]"
            />
            <span className="text-xs text-white/60">Recurring Task</span>
          </div>
          {form.recurring && (
            <div className="grid grid-cols-2 gap-3 pl-7">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                  Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => set("frequency", e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Select</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              {form.frequency === "Custom" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                    Every N Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.repeatEveryDays ?? ""}
                    onChange={(e) =>
                      set(
                        "repeatEveryDays",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className={FIELD_CLASS}
                    placeholder="e.g. 3"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-transparent border border-white/[0.08] rounded-md text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 resize-none transition-colors"
              placeholder="Any additional context..."
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs font-mono text-white/40 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-mono text-red-400/50 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-mono text-white/40 hover:text-white/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.taskName.trim()}
              className="px-4 py-1.5 text-xs font-mono text-black bg-[#C49E45] hover:bg-[#D4AF37] rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
