export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { TaskForm } from "./task-form";
import { DeleteTaskButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
import { QuickAdd } from "./quick-add";
import type { Task } from "@/lib/db/schema";

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  "🔴 High": "destructive",
  "🟡 Medium": "default",
  "🟢 Low": "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  "To Do": "☐",
  "In Progress": "◉",
  "Done": "✅",
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

  const filtered = allTasks.filter((t) => {
    if (params.status && t.status !== params.status) return false;
    if (params.lifeArea && t.lifeArea !== params.lifeArea) return false;
    return true;
  });

  const byStatus = {
    todo: filtered.filter((t) => t.status === "To Do"),
    inProgress: filtered.filter((t) => t.status === "In Progress"),
    done: filtered.filter((t) => t.status === "Done"),
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
            Task Management
          </p>
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
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

      {/* Filter bar */}
      <div className="flex gap-1.5 flex-wrap animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {["", "To Do", "In Progress", "Done"].map((s) => (
          <a
            key={s}
            href={s ? `?status=${encodeURIComponent(s)}` : "/tasks"}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
              (params.status ?? "") === s
                ? "border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
                : "border-white/[0.05] text-white/40 hover:text-white/90 hover:border-white/[0.08]"
            }`}
          >
            {s || "All"}
          </a>
        ))}
        <span className="mx-1 text-white/[0.05] self-center">|</span>
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

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl">
          <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
            No tasks found. Create your first task.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Task</th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Area</th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Priority</th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Status</th>
                <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Due</th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <tr className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {task.type === "🔁 Habit" && <span className="text-primary/70 text-xs">🔁</span>}
          <span className={`font-serif ${task.status === "Done" ? "line-through text-white/25" : "text-white/90"}`}>
            {task.taskName}
          </span>
          {task.recurring && task.type !== "🔁 Habit" && (
            <span className="text-[9px] font-mono text-white/25 border border-white/[0.05] px-1 rounded">
              {task.frequency}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="text-[10px] text-white/25 mt-0.5 line-clamp-1">{task.notes}</p>
        )}
      </td>
      <td className="px-5 py-3.5 text-[11px] text-white/40 whitespace-nowrap">
        {task.lifeArea ?? "—"}
      </td>
      <td className="px-5 py-3.5">
        {task.priority ? (
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "secondary"}>
            {task.priority}
          </Badge>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 font-mono text-[11px]">
        {STATUS_LABEL[task.status] ?? "☐"}{" "}
        <span className="text-white/40">{task.status}</span>
      </td>
      <td className="px-5 py-3.5 text-[11px] text-white/25 font-mono">
        {task.dueDate ?? "—"}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 justify-end">
          <TaskForm task={task} />
          <DeleteTaskButton id={task.id} />
        </div>
      </td>
    </tr>
  );
}
