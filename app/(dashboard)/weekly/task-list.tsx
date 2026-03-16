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
      {/* Task Checklist */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        {tasks.length > 0 && (
          <p
            className={`text-[9px] font-mono tracking-[0.3em] uppercase ${
              allDone ? "text-[#C49E45]" : "text-white/30"
            }`}
          >
            {doneCount}/{tasks.length} done
            {allDone ? " — WEEK EXECUTED" : ""}
          </p>
        )}

        {/* Task list */}
        <div className={isPending ? "opacity-60" : ""}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0 group"
            >
              <button
                onClick={() => handleToggle(task)}
                className={`size-5 flex items-center justify-center border rounded transition-colors shrink-0 ${
                  task.isDone
                    ? "border-[#C49E45]/40 bg-[#C49E45]/10 text-[#C49E45]"
                    : "border-white/10 text-transparent hover:border-white/20"
                }`}
              >
                {task.isDone ? "✓" : ""}
              </button>
              <span
                className={`flex-1 text-sm font-serif ${
                  task.isDone
                    ? "line-through text-white/25"
                    : "text-white/70"
                }`}
              >
                {task.taskText}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-[10px] font-mono px-1.5 py-0.5 text-white/10 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                ✗
              </button>
            </div>
          ))}
        </div>

        {/* Add task input */}
        <div className="flex gap-2 pt-1">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 bg-black/20 border border-white/[0.06] text-white/80 p-2.5 text-sm font-serif rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 placeholder:text-white/15"
          />
          <button
            onClick={handleAdd}
            disabled={!newTask.trim()}
            className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest border border-[#C49E45]/30 text-[#C49E45]/70 hover:bg-[#C49E45]/10 rounded-lg transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>

      {/* Carry-forward from last week */}
      {remainingSuggestions.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-dashed space-y-3">
          <p className="text-[8px] font-mono tracking-[0.3em] text-white/30 uppercase">
            Carry Forward
          </p>
          <div className={isPending ? "opacity-60" : ""}>
            {remainingSuggestions.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-white/[0.04] last:border-b-0"
              >
                <span className="text-xs font-serif text-white/30 flex-1">
                  {task.taskText}
                </span>
                <button
                  onClick={() => handleAddSuggested(task)}
                  className="px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border border-[#C49E45]/20 text-[#C49E45]/50 rounded hover:bg-[#C49E45]/10 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master task suggestions */}
      {remainingMaster.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-dashed space-y-3">
          <p className="text-[8px] font-mono tracking-[0.3em] text-white/30 uppercase">
            Master Tasks Due This Week
          </p>
          <div className={isPending ? "opacity-60" : ""}>
            {remainingMaster.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 py-2 border-b border-white/[0.04] last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-serif text-white/30">
                    {task.taskName}
                  </span>
                  <span className="text-[8px] font-mono text-white/15 ml-2">
                    due {task.dueDate}
                  </span>
                </div>
                <button
                  onClick={() => handleAddMaster(task)}
                  className="px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest border border-[#C49E45]/20 text-[#C49E45]/50 rounded hover:bg-[#C49E45]/10 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
