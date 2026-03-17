export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
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
  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  let tasks = (rows || []).map((r) => fromDb<Task>(r));

  if (params.lifeArea) {
    tasks = tasks.filter((t) => t.lifeArea === params.lifeArea);
  }

  const lifeAreas = [
    "",
    "💼 Job",
    "🚀 Business Building",
    "📖 Personal Dev",
    "🏠 Home & Life",
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div
        className="flex items-start justify-between animate-slide-up"
        style={{ animationDelay: "0s", animationFillMode: "both" }}
      >
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
            Task Management
          </p>
          <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
            Master Tasks
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            {tasks.length} total
          </p>
        </div>
        <TaskForm />
      </div>

      {/* Life Area Filter */}
      <div
        className="flex gap-1.5 flex-wrap animate-slide-up"
        style={{ animationDelay: "0.03s", animationFillMode: "both" }}
      >
        {lifeAreas.map((a) => (
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

      <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent" />

      {/* Kanban Board — fully interactive client component */}
      <KanbanBoard initialTasks={tasks} />
    </div>
  );
}
