export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { TaskForm } from "./task-form";
import { DeleteTaskButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
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
  const allTasks = await db.select().from(tasks).orderBy(tasks.createdAt);

  // Client-side filter (simple for Phase 1)
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
            ✅ Master Tasks
          </h1>
          <p className="text-xs font-mono text-muted-foreground tracking-wider">
            {allTasks.length} total · {byStatus.todo.length} to do · {byStatus.inProgress.length} in progress · {byStatus.done.length} done
          </p>
        </div>
        <TaskForm />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {["", "To Do", "In Progress", "Done"].map((s) => (
          <a
            key={s}
            href={s ? `?status=${encodeURIComponent(s)}` : "/tasks"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.status ?? "") === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {s || "All"}
          </a>
        ))}
        <span className="mx-1 text-border">|</span>
        {["", "💼 Job", "🚀 Business Building", "📖 Personal Dev", "🏠 Home & Life"].map((a) => (
          <a
            key={a}
            href={a ? `?lifeArea=${encodeURIComponent(a)}` : "/tasks"}
            className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              (params.lifeArea ?? "") === a
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {a || "All Areas"}
          </a>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
          No tasks found. Create your first task →
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border/50">
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Task</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Area</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Priority</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Due</th>
                <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => (
                <TaskRow key={task.id} task={task} even={i % 2 === 0} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, even }: { task: Task; even: boolean }) {
  return (
    <tr className={`border-t border-border/30 ${even ? "" : "bg-card/20"}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {task.type === "🔁 Habit" && <span className="text-primary text-xs">🔁</span>}
          <span className={`font-serif ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>
            {task.taskName}
          </span>
          {task.recurring && task.type !== "🔁 Habit" && (
            <span className="text-[9px] font-mono text-muted-foreground/60 border border-border/30 px-1 rounded">
              {task.frequency}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.notes}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {task.lifeArea ?? "—"}
      </td>
      <td className="px-4 py-3">
        {task.priority ? (
          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "secondary"}>
            {task.priority}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {STATUS_LABEL[task.status] ?? "☐"}{" "}
        <span className="text-muted-foreground">{task.status}</span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
        {task.dueDate ?? "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <TaskForm task={task} />
          <DeleteTaskButton id={task.id} />
        </div>
      </td>
    </tr>
  );
}
