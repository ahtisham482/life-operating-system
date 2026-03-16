"use client";

import { useState, useTransition } from "react";
import { addWeeklyTask, toggleWeeklyTask, deleteWeeklyTask } from "./actions";

type Task = {
  id: string;
  taskText: string;
  isDone: boolean;
};

type TaskListProps = {
  weekKey: string;
  initialTasks: Task[];
};

export function TaskList({ weekKey, initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [isPending, startTransition] = useTransition();

  const doneCount = tasks.filter((t) => t.isDone).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  function handleAdd() {
    if (!newTask.trim()) return;
    const text = newTask.trim();
    setNewTask("");
    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [...prev, { id: tempId, taskText: text, isDone: false }]);
    startTransition(async () => {
      await addWeeklyTask(weekKey, text);
    });
  }

  function handleToggle(task: Task) {
    // Optimistic toggle
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

  return (
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
  );
}
