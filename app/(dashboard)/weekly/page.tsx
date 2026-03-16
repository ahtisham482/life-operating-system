export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { WeeklyForm } from "./weekly-form";
import { TaskList } from "./task-list";

function getWeekKey(): string {
  const now = new Date();
  const karachiDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const jan1 = new Date(karachiDate.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((karachiDate.getTime() - jan1.getTime()) / 86400000 +
      jan1.getDay() +
      1) /
      7
  );
  return `${karachiDate.getFullYear()}-W${week}`;
}

type WeeklyPlan = {
  id: string;
  weekKey: string;
  leadPriority: string | null;
  maintenanceActions: string | null;
  removingPausing: string | null;
};

type WeeklyTask = {
  id: string;
  weekKey: string;
  taskText: string;
  isDone: boolean;
};

export default async function WeeklyPage() {
  const weekKey = getWeekKey();
  const supabase = await createClient();

  const [{ data: planRow }, { data: taskRows }] = await Promise.all([
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle(),
    supabase
      .from("weekly_tasks")
      .select("*")
      .eq("week_key", weekKey)
      .order("created_at", { ascending: true }),
  ]);

  const plan = planRow ? fromDb<WeeklyPlan>(planRow) : null;
  const tasks = (taskRows || []).map((r) => fromDb<WeeklyTask>(r));

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          {weekKey}
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Weekly Planning
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          Plan once. Execute all week.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* 3 Strategic Questions */}
      <div className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        <WeeklyForm
          weekKey={weekKey}
          initialAnswers={{
            leadPriority: plan?.leadPriority ?? "",
            maintenanceActions: plan?.maintenanceActions ?? "",
            removingPausing: plan?.removingPausing ?? "",
          }}
        />
      </div>

      {/* Weekly Task Checklist */}
      <div className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <TaskList weekKey={weekKey} initialTasks={tasks} />
      </div>
    </div>
  );
}
