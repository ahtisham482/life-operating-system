export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, daysBetween } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";
import { classifyTask } from "@/lib/classify";
import { getLeadLifeAreas } from "@/lib/domains";
import { TaskActions } from "./task-actions";
import { ScheduleToggle } from "./schedule-toggle";

// ── Task row sub-component ───────────────────────────────────────────────────
function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04] first:border-t-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-serif text-white/90 truncate block">
          {task.type === "🔁 Habit" && <span className="mr-1 text-xs">🔁</span>}
          {task.taskName}
        </span>
      </div>
      {task.lifeArea && (
        <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase shrink-0">
          {task.lifeArea}
        </span>
      )}
      <TaskActions taskId={task.id} />
    </div>
  );
}

function EmptyBlock({ msg }: { msg: string }) {
  return (
    <p className="px-4 py-6 text-center text-white/40 text-xs font-mono">{msg}</p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function MatrixPage() {
  const today = getTodayKarachi();

  const supabase = await createClient();

  const [{ data: rows }, { data: seasonRow }] = await Promise.all([
    supabase.from("tasks").select("*").neq("status", "Done"),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
  ]);

  // Season-aware classification
  const season = seasonRow
    ? fromDb<{ leadDomain: string }>(seasonRow)
    : null;
  const leadLifeAreas = season ? getLeadLifeAreas(season.leadDomain) : undefined;

  const allActive = (rows || []).map((r) => fromDb<Task>(r));

  const stuck: Task[] = [];
  const q1: Task[] = [];
  const q2: Task[] = [];
  const q3: Task[] = [];
  const q4: Task[] = [];

  for (const task of allActive) {
    const q = classifyTask(task, today, leadLifeAreas);

    if (q === "Q1") {
      const isStuck = task.dueDate != null && daysBetween(task.dueDate, today) >= 5;
      if (isStuck) {
        stuck.push(task);
      } else {
        q1.push(task);
      }
    } else if (q === "Q2" || q === "PROJECT") {
      q2.push(task);
    } else if (q === "Q3") {
      q3.push(task);
    } else {
      q4.push(task);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-gradient-primary">
            Priority Matrix
          </h1>
          <p className="text-[11px] font-mono text-white/30 tracking-wider">
            Focus on what matters most.
          </p>
        </div>
        <ScheduleToggle />
      </div>

      {/* ── Stuck Items Banner ─────────────────────────────────────────────── */}
      {stuck.length > 0 && (
        <div className="glass-card rounded-2xl border-t-2 border-red-500/50 bg-red-500/[0.03] p-5 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-red-400">
            Stuck Items — 5+ Days Overdue
          </h2>
          {stuck.map((task) => {
            const days = daysBetween(task.dueDate!, today);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2 border-t border-red-500/10 first:border-t-0"
              >
                <span className="flex-1 text-sm font-serif text-white/90">{task.taskName}</span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    days >= 6 ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  Day {days}
                </span>
                <TaskActions taskId={task.id} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── 2x2 Matrix Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* ── Top-Left: Do Now (Q1) ─────────────── */}
        <div className="glass-card rounded-2xl border-t-2 border-red-500/50 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-red-400">
              Do Now
            </h2>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              Urgent + Important ({q1.length})
            </p>
          </div>
          <div className="border-t border-white/[0.05]">
            {q1.length === 0 ? (
              <EmptyBlock msg="No urgent tasks" />
            ) : (
              q1.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* ── Top-Right: Schedule (Q2) ──────────── */}
        <div className="glass-card rounded-2xl border-t-2 border-blue-500/50 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-blue-400">
              Schedule
            </h2>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              Important, Not Urgent ({q2.length})
            </p>
          </div>
          <div className="border-t border-white/[0.05]">
            {q2.length === 0 ? (
              <EmptyBlock msg="No scheduled tasks" />
            ) : (
              q2.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* ── Bottom-Left: Delegate (Q3) ────────── */}
        <div className="glass-card rounded-2xl border-t-2 border-yellow-500/50 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-yellow-400">
              Delegate
            </h2>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              Urgent, Not Important ({q3.length})
            </p>
          </div>
          <div className="border-t border-white/[0.05]">
            {q3.length === 0 ? (
              <EmptyBlock msg="No tasks to delegate" />
            ) : (
              q3.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* ── Bottom-Right: Eliminate (Q4) ──────── */}
        <div className="glass-card rounded-2xl border-t-2 border-white/20 overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-white/40">
              Eliminate
            </h2>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              Not Urgent, Not Important ({q4.length})
            </p>
          </div>
          <div className="border-t border-white/[0.05]">
            {q4.length === 0 ? (
              <EmptyBlock msg="No tasks to eliminate" />
            ) : (
              q4.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
