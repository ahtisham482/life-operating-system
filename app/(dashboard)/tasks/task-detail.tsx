"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trash2, Sparkles, Plus, Check, ListChecks, Loader2 } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { updateTask, deleteTask, getSubtasks, createSubtask, toggleSubtaskStatus, deleteTask as deleteSubtask, type SubtaskRow } from "./actions";
import { parseDateString, formatDateLabel } from "@/lib/parse-date";

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-[#FFF8F0]/[0.08] rounded-md text-sm text-[#FFF8F0]/80 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 transition-colors";

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
  const [showSaved, setShowSaved] = useState(false);
  const [nlpInput, setNlpInput] = useState("");
  const [nlpPreview, setNlpPreview] = useState<string | null>(null);

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
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
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
      <div className="relative w-full max-w-[480px] bg-zinc-900/95 backdrop-blur-xl border-l border-[#FFF8F0]/[0.06] flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFF8F0]/[0.06] flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-serif text-[#FFF8F0]/80 tracking-wide">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#FFF8F0]/30 hover:text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Task Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
              Task Name
            </label>
            <input
              value={form.taskName}
              onChange={(e) => set("taskName", e.target.value)}
              className="w-full text-lg font-serif bg-transparent text-[#FFF8F0]/90 outline-none border-b border-[#FFF8F0]/[0.08] pb-1 focus:border-[#FF6B6B]/30"
              placeholder="Task name..."
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
              <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
              <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
              <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className={FIELD_CLASS}
            />

            {/* Natural language date input */}
            <div className="relative">
              <input
                type="text"
                value={nlpInput}
                onChange={(e) => {
                  setNlpInput(e.target.value);
                  if (e.target.value.trim()) {
                    const parsed = parseDateString(e.target.value);
                    setNlpPreview(parsed);
                  } else {
                    setNlpPreview(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const parsed = parseDateString(nlpInput);
                    if (parsed) {
                      set("dueDate", parsed);
                      setNlpInput("");
                      setNlpPreview(null);
                    }
                  }
                  if (e.key === "Escape") {
                    setNlpInput("");
                    setNlpPreview(null);
                  }
                }}
                placeholder="Type 'tomorrow', 'next friday', 'in 3 days'..."
                className="w-full h-8 px-3 py-1 bg-transparent border border-dashed border-[#FFF8F0]/[0.06] rounded-md text-xs font-mono text-[#FFF8F0]/60 placeholder:text-[#FFF8F0]/15 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/20 focus:border-[#FF6B6B]/20 transition-colors"
              />
              {nlpPreview && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#FF6B6B]/60 bg-[#FF6B6B]/[0.08] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {formatDateLabel(nlpPreview)}
                  </span>
                  <span className="text-[9px] font-mono text-[#FFF8F0]/15">
                    ↵
                  </span>
                </div>
              )}
            </div>

            {/* Smart date shortcuts */}
            <div className="flex gap-1.5 flex-wrap pt-1">
              {[
                { label: "Today", offset: 0 },
                { label: "Tomorrow", offset: 1 },
                { label: "Next Week", offset: 7 },
                { label: "In 2 Weeks", offset: 14 },
                { label: "No Date", offset: -1 },
              ].map(({ label, offset }) => {
                let dateVal = "";
                if (offset >= 0) {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  dateVal = d.toISOString().slice(0, 10);
                }
                const isActive = form.dueDate === dateVal;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set("dueDate", dateVal)}
                    className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${
                      isActive
                        ? "border-[#FF6B6B]/30 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                        : "border-[#FFF8F0]/[0.06] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 hover:border-[#FFF8F0]/[0.1]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => set("recurring", e.target.checked)}
              className="w-4 h-4 rounded border border-[#FFF8F0]/20 bg-transparent accent-[#FF6B6B]"
            />
            <span className="text-xs text-[#FFF8F0]/60">Recurring Task</span>
          </div>
          {form.recurring && (
            <div className="grid grid-cols-2 gap-3 pl-7">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
                  <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
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
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-transparent border border-[#FFF8F0]/[0.08] rounded-md text-sm text-[#FFF8F0]/80 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 resize-none transition-colors"
              placeholder="Any additional context..."
            />
          </div>

          {/* Subtasks Section */}
          <SubtasksSection taskId={task.id} taskType={form.type} />
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#FFF8F0]/[0.06] flex items-center justify-between flex-shrink-0">
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
                className="px-3 py-1.5 text-xs font-mono text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 transition-colors"
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

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-mono text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.taskName.trim()}
                className="px-4 py-1.5 text-xs font-mono text-white bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] hover:opacity-90 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
            {showSaved && (
              <span className="text-[10px] font-mono text-emerald-400 transition-opacity">
                ✓ Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subtasks Section ──────────────────────────────
function SubtasksSection({ taskId, taskType }: { taskId: string; taskType: string }) {
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addText, setAddText] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Fetch subtasks on mount / when taskId changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSubtasks(taskId).then((rows) => {
      if (!cancelled) {
        setSubtasks(rows);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [taskId]);

  // Focus add input when shown
  useEffect(() => {
    if (showAdd) addInputRef.current?.focus();
  }, [showAdd]);

  const handleAdd = useCallback(async () => {
    const name = addText.trim();
    if (!name) return;
    setAdding(true);
    try {
      const row = await createSubtask(taskId, name);
      setSubtasks((prev) => [...prev, row]);
      setAddText("");
      addInputRef.current?.focus();
    } catch {
      // keep text for retry
    } finally {
      setAdding(false);
    }
  }, [addText, taskId]);

  const handleToggle = useCallback(async (id: string) => {
    // Optimistic toggle
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "Done" ? "To Do" : "Done" }
          : s
      )
    );
    try {
      await toggleSubtaskStatus(id);
    } catch {
      // Refetch on error
      const rows = await getSubtasks(taskId);
      setSubtasks(rows);
    }
  }, [taskId]);

  const handleDeleteSubtask = useCallback(async (id: string) => {
    // Optimistic removal
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSubtask(id);
    } catch {
      const rows = await getSubtasks(taskId);
      setSubtasks(rows);
    }
  }, [taskId]);

  const doneCount = subtasks.filter((s) => s.status === "Done").length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-[#FFF8F0]/30" />
          <label className="text-[10px] font-mono text-[#FFF8F0]/40 tracking-widest uppercase">
            Subtasks
          </label>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono text-[#FFF8F0]/25">
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-5 h-5 flex items-center justify-center rounded text-[#FFF8F0]/20 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all"
          title="Add subtask"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1 w-full bg-[#FFF8F0]/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-[#FFF8F0]/20 animate-spin" />
        </div>
      )}

      {/* Subtask list */}
      {!loading && subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 group/sub py-1 px-1 rounded-md hover:bg-[#FFF8F0]/[0.02] transition-colors"
            >
              <button
                onClick={() => handleToggle(sub.id)}
                className={`w-4 h-4 min-w-[16px] rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  sub.status === "Done"
                    ? "bg-[#FF6B6B]/80 border-[#FF6B6B]/60 text-black"
                    : "border-[#FFF8F0]/20 hover:border-[#FF6B6B]/50 hover:bg-[#FF6B6B]/10"
                }`}
              >
                {sub.status === "Done" && <Check className="w-2.5 h-2.5" />}
              </button>
              <span
                className={`text-sm font-serif flex-1 ${
                  sub.status === "Done"
                    ? "line-through text-[#FFF8F0]/25"
                    : "text-[#FFF8F0]/70"
                }`}
              >
                {sub.taskName}
              </span>
              <button
                onClick={() => handleDeleteSubtask(sub.id)}
                className="w-4 h-4 flex items-center justify-center text-red-400/0 group-hover/sub:text-red-400/40 hover:!text-red-400 transition-all flex-shrink-0"
                title="Delete subtask"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && subtasks.length === 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-mono text-[#FFF8F0]/15 hover:text-[#FFF8F0]/30 border border-dashed border-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/[0.1] rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add a subtask
        </button>
      )}

      {/* Inline add */}
      {showAdd && (
        <div className="flex items-center gap-2">
          <input
            ref={addInputRef}
            type="text"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                setShowAdd(false);
                setAddText("");
              }
            }}
            onBlur={() => {
              if (!addText.trim()) {
                setShowAdd(false);
                setAddText("");
              }
            }}
            placeholder="Subtask name..."
            disabled={adding}
            className="flex-1 h-8 px-2 bg-transparent border border-[#FFF8F0]/[0.08] rounded-md text-sm font-serif text-[#FFF8F0]/80 placeholder:text-[#FFF8F0]/20 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 disabled:opacity-40"
          />
          {adding && (
            <Loader2 className="w-3.5 h-3.5 text-[#FFF8F0]/20 animate-spin flex-shrink-0" />
          )}
        </div>
      )}
    </div>
  );
}
