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
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          Weekly Planning — {weekKey}
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          Plan once. Execute all week.
        </p>
      </div>

      {/* 3 Strategic Questions */}
      <WeeklyForm
        weekKey={weekKey}
        initialAnswers={{
          leadPriority: plan?.leadPriority ?? "",
          maintenanceActions: plan?.maintenanceActions ?? "",
          removingPausing: plan?.removingPausing ?? "",
        }}
      />

      {/* Weekly Task Checklist */}
      <TaskList weekKey={weekKey} initialTasks={tasks} />
    </div>
  );
}
