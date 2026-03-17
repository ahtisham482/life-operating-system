"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Check, GripVertical } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { updateTaskField, markTaskDone, updateTask } from "./actions";

const PRIORITY_DOT: Record<string, string> = {
  "🔴 High": "bg-red-500",
  "🟡 Medium": "bg-yellow-500",
  "🟢 Low": "bg-emerald-500",
};

// ─── Relative Due Date Display ──────────────────────
function formatDueDate(dateStr: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      text: abs === 1 ? "Overdue 1d" : `Overdue ${abs}d`,
      color: "text-red-400",
    };
  }
  if (diffDays === 0) return { text: "Due today", color: "text-[#C49E45]" };
  if (diffDays === 1) return { text: "Tomorrow", color: "text-yellow-400/70" };
  if (diffDays <= 7)
    return { text: `${diffDays}d left`, color: "text-white/30" };
  return { text: dateStr, color: "text-white/20" };
}

// ─── Sortable Task Card (used inside SortableContext) ─
export function TaskCard({
  task,
  isFocused,
  onContextMenu,
  onCardClick,
  onTaskUpdate,
  onTaskDelete,
  onFocus,
  onTriggerEdit,
}: {
  task: Task;
  isFocused?: boolean;
  onContextMenu: (e: React.MouseEvent, task: Task) => void;
  onCardClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (id: string) => void;
  onFocus?: () => void;
  onTriggerEdit?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.taskName);
  const [completing, setCompleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // Trigger edit from parent (keyboard shortcut)
  useEffect(() => {
    if (onTriggerEdit) {
      // This is handled via the prop callback pattern
    }
  }, [onTriggerEdit]);

  // Sync edit text when task name changes externally
  useEffect(() => {
    if (!editing) setEditText(task.taskName);
  }, [task.taskName, editing]);

  // Scroll into view when focused via keyboard
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dotColor = task.priority
    ? PRIORITY_DOT[task.priority] ?? "bg-white/20"
    : null;

  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  // ─── Inline Title Edit ──────────────────────
  const saveTitle = useCallback(async () => {
    const trimmed = editText.trim();
    setEditing(false);
    if (!trimmed || trimmed === task.taskName) {
      setEditText(task.taskName);
      return;
    }
    // Optimistic update
    onTaskUpdate({ ...task, taskName: trimmed });
    try {
      await updateTaskField(task.id, "task_name", trimmed);
    } catch {
      onTaskUpdate(task); // rollback
    }
  }, [editText, task, onTaskUpdate]);

  // Allow parent to start editing
  const startEditing = useCallback(() => {
    setEditing(true);
  }, []);

  // Expose startEditing via data attribute for parent access
  useEffect(() => {
    if (cardRef.current) {
      (cardRef.current as HTMLDivElement & { _startEdit?: () => void })._startEdit = startEditing;
    }
  }, [startEditing]);

  // ─── Status Toggle ─────────────────────────
  const toggleComplete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);

    if (task.status === "Done") {
      // Un-complete: move back to To Do
      onTaskUpdate({ ...task, status: "To Do" });
      try {
        await updateTask(task.id, { status: "To Do" });
      } catch {
        onTaskUpdate(task);
      }
    } else {
      // Complete: move to Done
      onTaskUpdate({ ...task, status: "Done" });
      try {
        await markTaskDone(task.id);
      } catch {
        onTaskUpdate(task);
      }
    }
    setCompleting(false);
  }, [task, completing, onTaskUpdate]);

  return (
    <motion.div
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`glass-card rounded-xl p-3 hover:border-white/[0.1] transition-all group cursor-default ${
        task.status === "Done" ? "opacity-50" : ""
      } ${isDragging ? "shadow-lg shadow-black/30" : ""} ${
        isFocused
          ? "ring-1 ring-[#C49E45]/40 border-[#C49E45]/20"
          : ""
      }`}
      onContextMenu={(e) => onContextMenu(e, task)}
      onClick={onFocus}
      tabIndex={0}
      onKeyDown={(e) => {
        if (editing) return; // don't intercept while editing title
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      {/* Top row: checkbox + title + priority + grip */}
      <div className="flex items-start gap-2">
        {/* Status checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete();
          }}
          className={`w-[18px] h-[18px] min-w-[18px] mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
            task.status === "Done"
              ? "bg-[#C49E45]/80 border-[#C49E45]/60 text-black"
              : "border-white/20 hover:border-[#C49E45]/50 hover:bg-[#C49E45]/10"
          }`}
          title={
            task.status === "Done" ? "Mark incomplete" : "Mark complete"
          }
        >
          {task.status === "Done" && <Check className="w-3 h-3" />}
        </button>

        {/* Title (editable) */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setEditText(task.taskName);
                  setEditing(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-serif bg-transparent text-white/90 outline-none border-b border-[#C49E45]/30 pb-0.5"
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className={`text-sm font-serif leading-snug cursor-text block ${
                task.status === "Done"
                  ? "line-through text-white/25"
                  : "text-white/90 hover:text-white"
              }`}
              title="Click to edit title"
            >
              {task.taskName}
            </span>
          )}
        </div>

        {/* Priority dot */}
        {dotColor && (
          <span
            className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0`}
          />
        )}

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="w-5 h-5 flex items-center justify-center rounded text-white/15 hover:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Notes preview */}
      {task.notes && (
        <p className="text-[10px] text-white/20 mt-1.5 line-clamp-2 pl-6">
          {task.notes}
        </p>
      )}

      {/* Bottom row: metadata */}
      <div
        className="flex items-center gap-2 mt-2 flex-wrap pl-6 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onCardClick(task);
        }}
        title="Click to view details"
      >
        {task.lifeArea && (
          <span className="text-[9px] font-mono text-white/30 bg-white/[0.04] px-2 py-0.5 rounded tracking-wider">
            {task.lifeArea}
          </span>
        )}
        {task.recurring && task.type !== "🔁 Habit" && task.frequency && (
          <span className="text-[9px] font-mono text-white/20 border border-white/[0.05] px-1.5 py-0.5 rounded">
            {task.frequency}
          </span>
        )}
        {task.type === "🔁 Habit" && (
          <span className="text-[9px] font-mono text-[#C49E45]/50 px-1">
            🔁
          </span>
        )}
        {dueInfo && (
          <span
            className={`text-[9px] font-mono ml-auto ${dueInfo.color}`}
          >
            {dueInfo.text}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Drag Overlay Card (non-interactive preview) ──────
export function TaskCardOverlay({ task }: { task: Task }) {
  const dotColor = task.priority
    ? PRIORITY_DOT[task.priority] ?? "bg-white/20"
    : null;

  return (
    <div className="glass-card rounded-xl p-3 shadow-2xl shadow-black/40 border border-[#C49E45]/20 rotate-[2deg] scale-105 w-[300px]">
      <div className="flex items-start gap-2">
        <span
          className={`w-[18px] h-[18px] min-w-[18px] mt-0.5 rounded border flex-shrink-0 flex items-center justify-center ${
            task.status === "Done"
              ? "bg-[#C49E45]/80 border-[#C49E45]/60 text-black"
              : "border-white/20"
          }`}
        >
          {task.status === "Done" && <Check className="w-3 h-3" />}
        </span>
        <span
          className={`text-sm font-serif leading-snug flex-1 ${
            task.status === "Done"
              ? "line-through text-white/25"
              : "text-white/90"
          }`}
        >
          {task.taskName}
        </span>
        {dotColor && (
          <span
            className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0`}
          />
        )}
      </div>
    </div>
  );
}
