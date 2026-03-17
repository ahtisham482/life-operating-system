export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { TaskForm } from "./task-form";
import { DeleteTaskButton } from "./delete-button";
import { QuickAdd } from "./quick-add";
import type { Task } from "@/lib/db/schema";

const PRIORITY_DOT: Record<string, string> = {
  "🔴 High": "bg-red-500",
  "🟡 Medium": "bg-yellow-500",
  "🟢 Low": "bg-emerald-500",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; lifeArea?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  const allTasks = (rows || []).map((r) => fromDb<Task>(r));

  // Apply life area filter only (status filtering is replaced by Kanban columns)
  const filtered = allTasks.filter((t) => {
    if (params.lifeArea && t.lifeArea !== params.lifeArea) return false;
    return true;
  });

  const byStatus = {
    todo: filtered.filter((t) => t.status === "To Do"),
    inProgress: filtered.filter((t) => t.status === "In Progress"),
    done: filtered.filter((t) => t.status === "Done"),
  };

  const columns: { key: keyof typeof byStatus; label: string; active: boolean }[] = [
    { key: "todo", label: "To Do", active: false },
    { key: "inProgress", label: "In Progress", active: true },
    { key: "done", label: "Done", active: false },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2 min-w-0">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
            Task Management
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-gradient-primary">
            Master Tasks
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {allTasks.length} total &middot; {byStatus.todo.length} to do &middot; {byStatus.inProgress.length} in progress &middot; {byStatus.done.length} done
          </p>
        </div>
        <TaskForm />
      </div>

      {/* Quick Add */}
      <div className="animate-slide-up" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <QuickAdd />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Life Area Filter */}
      <div className="flex gap-1.5 flex-wrap animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {["", "💼 Job", "🚀 Business Building", "📖 Personal Dev", "🏠 Home & Life"].map((a) => (
          <a
            key={a}
            href={a ? `?lifeArea=${encodeURIComponent(a)}` : "/tasks"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.lifeArea ?? "") === a
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {a || "All Areas"}
          </a>
        ))}
      </div>

      {/* Kanban Board */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No tasks found. Create your first task.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col">
              {/* Column container */}
              <div
                className={`glass-card rounded-2xl flex flex-col min-h-[300px] ${
                  col.active ? "border-t-2 border-t-[#C49E45]/60" : ""
                }`}
              >
                {/* Column header */}
                <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                  <h3 className="text-sm font-serif text-white/80 tracking-wide">
                    {col.label}
                  </h3>
                  <span className="text-[10px] font-mono bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                    {byStatus[col.key].length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {byStatus[col.key].length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[100px]">
                      <p className="text-[10px] font-mono text-white/15 tracking-widest uppercase">
                        No tasks
                      </p>
                    </div>
                  ) : (
                    byStatus[col.key].map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const dotColor = task.priority ? PRIORITY_DOT[task.priority] ?? "bg-white/20" : null;

  return (
    <div
      className={`glass-card rounded-xl p-4 hover:border-white/[0.1] transition-all group ${
        task.status === "Done" ? "opacity-60" : ""
      }`}
    >
      {/* Top row: task name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Priority dot */}
          {dotColor && (
            <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
          )}
          <span
            className={`text-sm font-serif leading-snug ${
              task.status === "Done"
                ? "line-through text-white/25"
                : "text-white/90"
            }`}
          >
            {task.taskName}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <TaskForm task={task} />
          <DeleteTaskButton id={task.id} />
        </div>
      </div>

      {/* Notes preview */}
      {task.notes && (
        <p className="text-[10px] text-white/25 mt-1.5 line-clamp-2 ml-4">
          {task.notes}
        </p>
      )}

      {/* Bottom row: life area tag + meta */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
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
          <span className="text-[9px] font-mono text-primary/50 px-1">🔁</span>
        )}
        {task.dueDate && (
          <span className="text-[9px] font-mono text-white/20 ml-auto">
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}
