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

function getWeekDateRange(weekKey: string): string {
  const [year, weekNum] = weekKey.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const weekMonday = new Date(firstMonday);
  weekMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekMonday)} - ${fmt(weekSunday)}, ${year}`;
}

function getWeekBounds(weekKey: string): { monday: string; sunday: string } {
  const [year, weekNum] = weekKey.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const weekMonday = new Date(firstMonday);
  weekMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  const toIso = (d: Date) => d.toISOString().split("T")[0];
  return { monday: toIso(weekMonday), sunday: toIso(weekSunday) };
}

function getPrevWeekKey(weekKey: string): string {
  const [year, weekNum] = weekKey.split("-W").map(Number);
  if (weekNum <= 1) {
    // Go to the last week of the previous year
    const dec28 = new Date(year - 1, 11, 28);
    const jan1 = new Date(year - 1, 0, 1);
    const lastWeek = Math.ceil(
      ((dec28.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
    );
    return `${year - 1}-W${lastWeek}`;
  }
  return `${year}-W${weekNum - 1}`;
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

type MasterTask = {
  id: string;
  taskName: string;
  dueDate: string;
};

export default async function WeeklyPage() {
  const weekKey = getWeekKey();
  const prevWeekKey = getPrevWeekKey(weekKey);
  const dateRange = getWeekDateRange(weekKey);
  const { monday, sunday } = getWeekBounds(weekKey);
  const supabase = await createClient();

  const [
    { data: planRow },
    { data: taskRows },
    { data: prevPlanRow },
    { data: prevTaskRows },
    { data: masterTaskRows },
  ] = await Promise.all([
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
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("week_key", prevWeekKey)
      .maybeSingle(),
    supabase
      .from("weekly_tasks")
      .select("*")
      .eq("week_key", prevWeekKey)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, task_name, due_date")
      .neq("status", "Done")
      .gte("due_date", monday)
      .lte("due_date", sunday)
      .order("due_date", { ascending: true }),
  ]);

  const plan = planRow ? fromDb<WeeklyPlan>(planRow) : null;
  const tasks = (taskRows || []).map((r) => fromDb<WeeklyTask>(r));
  const prevPlan = prevPlanRow ? fromDb<WeeklyPlan>(prevPlanRow) : null;
  const prevTasks = (prevTaskRows || []).map((r) => fromDb<WeeklyTask>(r));

  const prevDoneCount = prevTasks.filter((t) => t.isDone).length;
  const prevIncompleteTasks = prevTasks.filter((t) => !t.isDone);
  const hasPrevData = prevPlan || prevTasks.length > 0;

  const masterSuggestions: MasterTask[] = (masterTaskRows || []).map((r) =>
    fromDb<MasterTask>(r)
  );

  // Current week progress
  const currentDoneCount = tasks.filter((t) => t.isDone).length;
  const currentTotal = tasks.length;
  const progressPercent =
    currentTotal > 0 ? Math.round((currentDoneCount / currentTotal) * 100) : 0;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div
        className="space-y-2 animate-slide-up"
        style={{ animationDelay: "0s", animationFillMode: "both" }}
      >
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          {weekKey}
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Weekly Planning
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          {dateRange}
        </p>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          Plan once. Execute all week.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Weekly Progress Bar */}
      {currentTotal > 0 && (
        <div
          className="glass-card rounded-2xl p-5 animate-slide-up"
          style={{ animationDelay: "0.04s", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
              Week Progress
            </p>
            <p className="text-[11px] font-mono text-white/50">
              {currentDoneCount} / {currentTotal} tasks done
            </p>
          </div>
          <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C49E45]/60 to-[#C49E45] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {currentDoneCount === currentTotal && (
            <p className="text-[10px] font-mono text-[#C49E45] mt-2 tracking-widest">
              WEEK EXECUTED
            </p>
          )}
        </div>
      )}

      {/* Last Week Recap */}
      {hasPrevData && (
        <div
          className="glass-card rounded-2xl p-6 animate-slide-up"
          style={{ animationDelay: "0.06s", animationFillMode: "both" }}
        >
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase mb-4">
            Last Week You Said...
          </p>

          <div className="space-y-3">
            {prevPlan?.leadPriority && (
              <div>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-0.5">
                  Lead Priority
                </p>
                <p className="text-sm font-serif text-white/30 italic">
                  &ldquo;{prevPlan.leadPriority}&rdquo;
                </p>
              </div>
            )}
            {prevPlan?.maintenanceActions && (
              <div>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-0.5">
                  Maintenance Actions
                </p>
                <p className="text-sm font-serif text-white/30 italic">
                  &ldquo;{prevPlan.maintenanceActions}&rdquo;
                </p>
              </div>
            )}
            {prevPlan?.removingPausing && (
              <div>
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-0.5">
                  Removing / Pausing
                </p>
                <p className="text-sm font-serif text-white/30 italic">
                  &ldquo;{prevPlan.removingPausing}&rdquo;
                </p>
              </div>
            )}
            {prevTasks.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-mono text-white/25">
                  {prevDoneCount} / {prevTasks.length} tasks completed last week
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3 Strategic Questions */}
      <div
        className="animate-slide-up"
        style={{ animationDelay: "0.08s", animationFillMode: "both" }}
      >
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
      <div
        className="animate-slide-up"
        style={{ animationDelay: "0.16s", animationFillMode: "both" }}
      >
        <TaskList
          weekKey={weekKey}
          initialTasks={tasks}
          suggestedTasks={prevIncompleteTasks.map((t) => ({
            id: t.id,
            taskText: t.taskText,
          }))}
          masterSuggestions={masterSuggestions.map((t) => ({
            id: t.id,
            taskName: t.taskName,
            dueDate: t.dueDate,
          }))}
        />
      </div>
    </div>
  );
}
