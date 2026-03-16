export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, getDateLabelKarachi, daysBetween } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";
import { classifyTask } from "@/lib/classify";
import { getLeadLifeAreas } from "@/lib/domains";
import { TaskActions } from "./task-actions";
import { ScheduleToggle } from "./schedule-toggle";

// ── Schedule mode ─────────────────────────────────────────────────────────────
const IS_RAMADAN = process.env.SCHEDULE_MODE === "ramadan";
const OFFICE_HOURS = IS_RAMADAN ? "10:00 AM – 4:00 PM" : "9:00 AM – 5:00 PM";
const HOME_HOURS = IS_RAMADAN ? "4:00 PM – 10:00 PM" : "5:00 PM – 10:00 PM";

// ── Task table sub-component ──────────────────────────────────────────────────
function TaskTable({ tasks }: { tasks: Task[] }) {
  const statusMap: Record<string, string> = {
    "To Do": "☐",
    "In Progress": "◉",
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left bg-white/[0.02]">
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Task</th>
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Area</th>
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Priority</th>
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Status</th>
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Due</th>
          <th className="px-4 py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr
            key={task.id}
            className="group border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
          >
            <td className="px-4 py-2.5 font-serif text-white/90">
              {task.type === "🔁 Habit" && <span className="mr-1 text-primary">🔁</span>}
              {task.taskName}
            </td>
            <td className="px-4 py-2.5 text-xs text-white/40">{task.lifeArea ?? "—"}</td>
            <td className="px-4 py-2.5 text-xs">{task.priority ?? "—"}</td>
            <td className="px-4 py-2.5 font-mono text-xs">
              {statusMap[task.status] ?? "☐"}{" "}
              <span className="text-white/40">{task.status}</span>
            </td>
            <td className="px-4 py-2.5 text-xs text-white/40">{task.dueDate ?? "—"}</td>
            <td className="px-4 py-2.5">
              <TaskActions taskId={task.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
  const dateLabel = getDateLabelKarachi();

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
  const q1Office: Task[] = [];
  const q1Home: Task[] = [];
  const q2: Task[] = [];
  const q2Projects: Task[] = [];
  const q3: Task[] = [];
  const q4: Task[] = [];

  const OFFICE_AREAS = ["💼 Job", "🚀 Business Building"];
  const HOME_AREAS = ["📖 Personal Dev", "🏠 Home & Life"];

  for (const task of allActive) {
    const q = classifyTask(task, today, leadLifeAreas);

    if (q === "PROJECT") {
      q2Projects.push(task);
      continue;
    }

    if (q === "Q1") {
      const isStuck = task.dueDate != null && daysBetween(task.dueDate, today) >= 5;
      if (isStuck) {
        stuck.push(task);
      } else if (task.lifeArea != null && OFFICE_AREAS.includes(task.lifeArea)) {
        q1Office.push(task);
      } else if (task.lifeArea != null && HOME_AREAS.includes(task.lifeArea)) {
        q1Home.push(task);
      } else {
        // No life area: put in office block by default
        q1Office.push(task);
      }
    } else if (q === "Q2") {
      q2.push(task);
    } else if (q === "Q3") {
      q3.push(task);
    } else {
      q4.push(task);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Priority Framework
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Eisenhower Matrix
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-[11px] font-mono text-white/30 tracking-wider">{dateLabel}</p>
          <ScheduleToggle />
        </div>
        <p className="text-[10px] font-mono text-white/25 mt-0.5">
          Life Areas are NEVER mixed across blocks
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* ── Stuck Items ───────────────────────────────────────────────────── */}
      {stuck.length > 0 && (
        <section className="border border-destructive/50 bg-destructive/5 rounded-2xl p-6 space-y-3 animate-slide-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
          <h2 className="text-xs font-mono uppercase tracking-widest text-destructive">
            🚨 Stuck Items — Action Required (5+ Days Overdue)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Task</th>
                <th className="py-2 pr-4 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Days Overdue</th>
                <th className="py-2 pr-4 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Status</th>
                <th className="py-2 text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stuck.map((task) => {
                const days = daysBetween(task.dueDate!, today);
                return (
                  <tr key={task.id} className="group border-t border-white/[0.04]">
                    <td className="py-2 pr-4 font-serif text-white/90">{task.taskName}</td>
                    <td className="py-2 pr-4">
                      <span className={`font-mono text-xs font-bold ${days >= 6 ? "text-destructive" : "text-yellow-400"}`}>
                        {days >= 6 ? `🔴 CRITICAL — Day ${days}` : `Day ${days}`}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs font-mono text-white/40">{task.status}</td>
                    <td className="py-2">
                      <TaskActions taskId={task.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Q1 — Do Now ───────────────────────────────────────────────────── */}
      <section className="space-y-3 animate-slide-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-red-400">
          🔴 Q1 — Do Now
        </h2>

        {/* Office Block */}
        <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
          <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/[0.05]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">
              🏢 Office Block — 💼 Job + 🚀 Business · {OFFICE_HOURS}
            </p>
          </div>
          {q1Office.length === 0 ? (
            <EmptyBlock msg="No Q1 office tasks today" />
          ) : (
            <TaskTable tasks={q1Office} />
          )}
        </div>

        {/* Home Block */}
        <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
          <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/[0.05]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">
              🏠 Home Block — 📖 Personal Dev + 🏠 Home & Life · {HOME_HOURS}
            </p>
          </div>
          {q1Home.length === 0 ? (
            <EmptyBlock msg="No Q1 home tasks today" />
          ) : (
            <TaskTable tasks={q1Home} />
          )}
        </div>
      </section>

      {/* ── Q2 — Schedule ─────────────────────────────────────────────────── */}
      <section className="space-y-3 animate-slide-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-yellow-400">
          🟡 Q2 — Schedule (Important, Not Urgent)
        </h2>
        <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
          {q2Projects.length > 0 && (
            <div className="px-4 py-3 border-b border-white/[0.04]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mb-2">
                Projects — Progress Containers
              </p>
              {q2Projects.map((p) => (
                <div key={p.id} className="py-1 text-sm font-serif text-white/90">
                  🏗️ {p.taskName}
                </div>
              ))}
            </div>
          )}
          {q2.length === 0 && q2Projects.length === 0 ? (
            <EmptyBlock msg="No Q2 items" />
          ) : q2.length > 0 ? (
            <TaskTable tasks={q2} />
          ) : null}
        </div>
      </section>

      {/* ── Q3 — Delegate ─────────────────────────────────────────────────── */}
      <section className="space-y-3 animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-blue-400">
          🔵 Q3 — Delegate / Minimize (Urgent, Not Important)
        </h2>
        <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
          {q3.length === 0 ? <EmptyBlock msg="No Q3 items" /> : <TaskTable tasks={q3} />}
        </div>
      </section>

      {/* ── Q4 — Eliminate ────────────────────────────────────────────────── */}
      <section className="space-y-3 animate-slide-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
        <h2 className="text-xs font-mono uppercase tracking-widest text-white/40">
          ⚪ Q4 — Eliminate (Not Urgent, Not Important)
        </h2>
        <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
          {q4.length === 0 ? <EmptyBlock msg="No Q4 items" /> : <TaskTable tasks={q4} />}
        </div>
      </section>
    </div>
  );
}
