"use client";

import { useState, useTransition } from "react";
import { addWeeklyTask, toggleWeeklyTask, deleteWeeklyTask } from "./actions";

type Task = {
  id: string;
  taskText: string;
  isDone: boolean;
};

type SuggestedTask = {
  id: string;
  taskText: string;
};

type MasterSuggestion = {
  id: string;
  taskName: string;
  dueDate: string;
};

type TaskListProps = {
  weekKey: string;
  initialTasks: Task[];
  suggestedTasks?: SuggestedTask[];
  masterSuggestions?: MasterSuggestion[];
};

export function TaskList({
  weekKey,
  initialTasks,
  suggestedTasks = [],
  masterSuggestions = [],
}: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [isPending, startTransition] = useTransition();
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [addedMaster, setAddedMaster] = useState<Set<string>>(new Set());

  const doneCount = tasks.filter((t) => t.isDone).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  function handleAdd() {
    if (!newTask.trim()) return;
    const text = newTask.trim();
    setNewTask("");
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [...prev, { id: tempId, taskText: text, isDone: false }]);
    startTransition(async () => {
      await addWeeklyTask(weekKey, text);
    });
  }

  function handleAddSuggested(task: SuggestedTask) {
    setAddedSuggestions((prev) => new Set(prev).add(task.id));
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [
      ...prev,
      { id: tempId, taskText: task.taskText, isDone: false },
    ]);
    startTransition(async () => {
      await addWeeklyTask(weekKey, task.taskText);
    });
  }

  function handleAddMaster(task: MasterSuggestion) {
    setAddedMaster((prev) => new Set(prev).add(task.id));
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [
      ...prev,
      { id: tempId, taskText: task.taskName, isDone: false },
    ]);
    startTransition(async () => {
      await addWeeklyTask(weekKey, task.taskName);
    });
  }

  function handleToggle(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isDone: !t.isDone } : t))
    );
    startTransition(async () => {
      await toggleWeeklyTask(task.id, !task.isDone);
    });
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteWeeklyTask(id);
    });
  }

  const remainingSuggestions = suggestedTasks.filter(
    (s) => !addedSuggestions.has(s.id)
  );
  const remainingMaster = masterSuggestions.filter(
    (s) => !addedMaster.has(s.id)
  );

  return (
    <div className="space-y-4">
      {/* Carry-forward from last week */}
      {remainingSuggestions.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-dashed border-white/[0.08] space-y-3">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
            Carry Forward from Last Week
          </p>
          <p className="text-[10px] font-mono text-white/20">
            These tasks were not completed last week.
          </p>
          <div className={isPending ? "opacity-60" : ""}>
            {remainingSuggestions.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-b-0"
              >
                <span className="text-sm font-serif text-white/40 flex-1">
                  {task.taskText}
                </span>
                <button
                  onClick={() => handleAddSuggested(task)}
                  className="px-3 py-1 text-[9px] font-mono uppercase tracking-widest border border-[#C49E45]/30 text-[#C49E45]/70 rounded hover:bg-[#C49E45]/10 transition-colors shrink-0"
                >
                  Add to This Week
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master task suggestions due this week */}
      {remainingMaster.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-dashed border-white/[0.08] space-y-3">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
            Master Tasks Due This Week
          </p>
          <div className={isPending ? "opacity-60" : ""}>
            {remainingMaster.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-serif text-white/40">
                    {task.taskName}
                  </span>
                  <span className="text-[9px] font-mono text-white/20 ml-2">
                    due {task.dueDate}
                  </span>
                </div>
                <button
                  onClick={() => handleAddMaster(task)}
                  className="px-3 py-1 text-[9px] font-mono uppercase tracking-widest border border-[#C49E45]/30 text-[#C49E45]/70 rounded hover:bg-[#C49E45]/10 transition-colors shrink-0"
                >
                  Add to This Week
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current week tasks */}
      <div className="bg-card border border-border p-5 rounded-lg space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          This Week&apos;s Tasks
        </p>

        {tasks.length > 0 && (
          <p
            className={`text-[11px] font-mono tracking-widest ${
              allDone ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {doneCount} / {tasks.length} TASKS DONE
            {allDone ? " — WEEK EXECUTED ✓" : ""}
          </p>
        )}

        {/* Task list */}
        <div className={isPending ? "opacity-60" : ""}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0"
            >
              <button
                onClick={() => handleToggle(task)}
                className={`w-5 h-5 flex items-center justify-center border rounded-sm text-[11px] shrink-0 transition-colors ${
                  task.isDone
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-transparent hover:border-border/80"
                }`}
              >
                {task.isDone ? "✓" : ""}
              </button>
              <span
                className={`flex-1 text-sm font-serif ${
                  task.isDone
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {task.taskText}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-xs font-mono px-2 py-1 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors"
              >
                ✗
              </button>
            </div>
          ))}
        </div>

        {/* Add task */}
        <div className="flex gap-2 pt-1">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a task for this week..."
            className="flex-1 bg-background border border-border text-foreground p-2.5 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!newTask.trim()}
            className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
