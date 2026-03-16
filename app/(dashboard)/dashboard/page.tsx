export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, getDateLabelKarachi } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/db/schema";

function classifyTask(task: Task, today: string): "Q1" | "Q2" | "Q3" | "Q4" | "PROJECT" {
  if (task.type === "🏗️ Project") return "PROJECT";
  const urgent =
    (task.dueDate != null && task.dueDate <= today) ||
    (task.type === "🔁 Habit" && task.recurring && task.frequency === "Daily");
  const important =
    task.priority === "🔴 High" ||
    (task.lifeArea != null &&
      ["💼 Job", "🚀 Business Building"].includes(task.lifeArea) &&
      task.priority !== "🟢 Low") ||
    task.type === "🔁 Habit";
  if (urgent && important) return "Q1";
  if (important) return "Q2";
  if (urgent) return "Q3";
  return "Q4";
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_EMOJI: Record<string, string> = {
  "To Do": "☐",
  "In Progress": "◉",
};

export default async function DashboardPage() {
  const today = getTodayKarachi();
  const weekEnd = addDays(today, 7);
  const dateLabel = getDateLabelKarachi();

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "Done");

  const allActive = (rows || []).map((r) => fromDb<Task>(r));

  const todayFocus = allActive.filter((t) => classifyTask(t, today) === "Q1");
  const thisWeek = allActive.filter(
    (t) => t.dueDate != null && t.dueDate > today && t.dueDate <= weekEnd
  );

  const q1Count = allActive.filter((t) => classifyTask(t, today) === "Q1").length;
  const q2Count = allActive.filter((t) => classifyTask(t, today) === "Q2").length;
  const q3Count = allActive.filter((t) => classifyTask(t, today) === "Q3").length;
  const q4Count = allActive.filter((t) => classifyTask(t, today) === "Q4").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          🎯 Command Center
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">{dateLabel}</p>
        <p className="text-xs font-mono text-muted-foreground/60 tracking-wide italic mt-1">
          Open every morning. Check Today&apos;s Focus → write top 3 on paper → execute → update at end of day.
        </p>
      </div>

      {/* Today's Focus */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary">
            🔴 Today&apos;s Focus — Q1 ({todayFocus.length})
          </h2>
          <Link
            href="/matrix"
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Full Matrix →
          </Link>
        </div>

        {todayFocus.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono py-6 text-center border border-border/30 rounded-lg">
            No urgent + important tasks today
          </p>
        ) : (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            {todayFocus.map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t border-border/30" : ""}`}
              >
                <span className="text-sm font-mono text-muted-foreground w-5 shrink-0">
                  {STATUS_EMOJI[task.status] ?? "☐"}
                </span>
                <span className="flex-1 text-sm font-serif">
                  {task.type === "🔁 Habit" && <span className="mr-1">🔁</span>}
                  {task.taskName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{task.lifeArea}</span>
                {task.priority && (
                  <Badge variant={task.priority === "🔴 High" ? "default" : "secondary"}>
                    {task.priority}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* This Week */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-yellow-400/80">
          📅 This Week — Due in 7 days ({thisWeek.length})
        </h2>
        {thisWeek.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono py-6 text-center border border-border/30 rounded-lg">
            No tasks due this week
          </p>
        ) : (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            {thisWeek.slice(0, 10).map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t border-border/30" : ""}`}
              >
                <span className="flex-1 text-sm font-serif">{task.taskName}</span>
                <span className="text-xs font-mono text-muted-foreground">{task.dueDate}</span>
                <span className="text-xs text-muted-foreground">{task.lifeArea}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Matrix Summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            🟦 Eisenhower Matrix — Overview
          </h2>
          <Link
            href="/matrix"
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Open Full View →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Q1 — Do Now", count: q1Count, color: "border-red-500/30 bg-red-500/5" },
            { label: "Q2 — Schedule", count: q2Count, color: "border-yellow-500/30 bg-yellow-500/5" },
            { label: "Q3 — Delegate", count: q3Count, color: "border-blue-500/30 bg-blue-500/5" },
            { label: "Q4 — Eliminate", count: q4Count, color: "border-border/50 bg-secondary/30" },
          ].map(({ label, count, color }) => (
            <div key={label} className={`border rounded-lg p-4 ${color}`}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-2xl font-serif text-foreground mt-1">{count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex gap-3">
          <Link
            href="/tasks"
            className="flex-1 text-center py-2.5 border border-border rounded-md text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            + Add Task
          </Link>
          <Link
            href="/matrix"
            className="flex-1 text-center py-2.5 border border-primary/30 bg-primary/5 rounded-md text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
          >
            View Matrix
          </Link>
        </div>
      </section>
    </div>
  );
}
