export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { TaskForm } from "./task-form";
import { KanbanBoard } from "./kanban-board";
import type { Task } from "@/lib/db/schema";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ lifeArea?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  // Only fetch top-level tasks (exclude subtasks that have a parent)
  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .is("parent_project_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let tasks = (rows || []).map((r) => fromDb<Task>(r));

  if (params.lifeArea) {
    tasks = tasks.filter((t) => t.lifeArea === params.lifeArea);
  }

  const today = getTodayKarachi();
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== "Done"
  ).length;
  const dueTodayTasks = tasks.filter(
    (t) => t.dueDate === today && t.status !== "Done"
  ).length;
  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "🔴 High" && t.status !== "Done"
  ).length;

  const lifeAreas = [
    "",
    "💼 Job",
    "🚀 Business Building",
    "📖 Personal Dev",
    "🏠 Home & Life",
  ];

  return (
    <div className="relative min-h-screen">
      {/* Sunset gradient backdrop */}
      <div
        className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #FF6B6B 0%, #FEC89A 40%, #FFD93D 100%)",
          opacity: 0.08,
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      <div className="relative p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
          <div className="space-y-2 min-w-0">
            <p className="text-[9px] font-mono tracking-[0.35em] text-[#FFF8F0]/20 uppercase">
              Task Management
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-gradient-primary">
              Tasks
            </h1>
            <p className="text-sm font-serif italic text-[#FFF8F0]/40 tracking-wide">
              what needs to be done
            </p>
            <p className="text-[11px] font-mono text-[#FFF8F0]/30 tracking-wider">
              {totalTasks} total
            </p>
          </div>
          <TaskForm />
        </div>

        {/* Quick Stats */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up"
          style={{ animationDelay: "0.02s", animationFillMode: "both" }}
        >
          {[
            { label: "Total", value: totalTasks, color: "text-[#FFF8F0]/70" },
            { label: "Overdue", value: overdueTasks, color: overdueTasks > 0 ? "text-[#FF6B6B]" : "text-[#FFF8F0]/40" },
            { label: "Due Today", value: dueTodayTasks, color: dueTodayTasks > 0 ? "text-[#FEC89A]" : "text-[#FFF8F0]/40" },
            { label: "High Priority", value: highPriorityTasks, color: highPriorityTasks > 0 ? "text-[#FF6B6B]" : "text-[#FFF8F0]/40" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] backdrop-blur-sm p-3 sm:p-4"
            >
              <p className="text-[9px] font-mono tracking-[0.3em] text-[#FFF8F0]/25 uppercase mb-1">
                {stat.label}
              </p>
              <p className={`text-xl sm:text-2xl font-serif font-semibold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Life Area Filter */}
        <div
          className="flex gap-2 flex-wrap animate-slide-up"
          style={{ animationDelay: "0.04s", animationFillMode: "both" }}
        >
          {lifeAreas.map((a) => (
            <a
              key={a}
              href={a ? `?lifeArea=${encodeURIComponent(a)}` : "/tasks"}
              className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border backdrop-blur-sm transition-all ${
                (params.lifeArea ?? "") === a
                  ? "border-[#FF6B6B]/30 bg-[#FF6B6B]/[0.12] text-[#FF6B6B] shadow-[0_0_12px_rgba(255,107,107,0.1)]"
                  : "border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/90 hover:border-[#FFF8F0]/[0.1] hover:bg-[#FFF8F0]/[0.04]"
              }`}
            >
              {a || "All Areas"}
            </a>
          ))}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B6B]/20 to-transparent" />

        {/* Kanban Board — fully interactive client component */}
        <KanbanBoard initialTasks={tasks} />
      </div>
    </div>
  );
}
