export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, getDateLabelKarachi, daysBetween } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";

// ── Schedule mode ─────────────────────────────────────────────────────────────
const IS_RAMADAN = process.env.SCHEDULE_MODE === "ramadan";
const OFFICE_HOURS = IS_RAMADAN ? "10:00 AM – 4:00 PM" : "9:00 AM – 5:00 PM";
const HOME_HOURS = IS_RAMADAN ? "4:00 PM – 10:00 PM" : "5:00 PM – 10:00 PM";

// ── Classification ────────────────────────────────────────────────────────────
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

// ── Task table sub-component ──────────────────────────────────────────────────
function TaskTable({ tasks }: { tasks: Task[] }) {
  const statusMap: Record<string, string> = {
    "To Do": "☐",
    "In Progress": "◉",
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left bg-card/50">
          <th className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Task</th>
          <th className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Area</th>
          <th className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Priority</th>
          <th className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Due</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task, i) => (
          <tr
            key={task.id}
            className={`border-t border-border/30 ${i % 2 === 1 ? "bg-card/20" : ""}`}
          >
            <td className="px-4 py-2.5 font-serif">
              {task.type === "🔁 Habit" && <span className="mr-1 text-primary">🔁</span>}
              {task.taskName}
            </td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.lifeArea ?? "—"}</td>
            <td className="px-4 py-2.5 text-xs">{task.priority ?? "—"}</td>
            <td className="px-4 py-2.5 font-mono text-xs">
              {statusMap[task.status] ?? "☐"}{" "}
              <span className="text-muted-foreground">{task.status}</span>
            </td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground">{task.dueDate ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyBlock({ msg }: { msg: string }) {
  return (
    <p className="px-4 py-6 text-center text-muted-foreground text-xs font-mono">{msg}</p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function MatrixPage() {
  const today = getTodayKarachi();
  const dateLabel = getDateLabelKarachi();

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "Done");

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
    const q = classifyTask(task, today);

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
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          🎯 Eisenhower Matrix
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">{dateLabel}</p>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
          Life Areas are NEVER mixed across blocks • Office: Job + Business • Home: Personal Dev + Home
        </p>
      </div>

      {/* ── Stuck Items ───────────────────────────────────────────────────── */}
      {stuck.length > 0 && (
        <section className="border border-destructive/50 bg-destructive/5 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-destructive">
            🚨 Stuck Items — Action Required (5+ Days Overdue)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Task</th>
                <th className="py-2 pr-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Days Overdue</th>
                <th className="py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {stuck.map((task) => {
                const days = daysBetween(task.dueDate!, today);
                return (
                  <tr key={task.id} className="border-t border-border/20">
                    <td className="py-2 pr-4 font-serif">{task.taskName}</td>
                    <td className="py-2 pr-4">
                      <span className={`font-mono text-xs font-bold ${days >= 6 ? "text-destructive" : "text-yellow-400"}`}>
                        {days >= 6 ? `🔴 CRITICAL — Day ${days}` : `Day ${days}`}
                      </span>
                    </td>
                    <td className="py-2 text-xs font-mono text-muted-foreground">{task.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Q1 — Do Now ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-red-400">
          🔴 Q1 — Do Now
        </h2>

        {/* Office Block */}
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="bg-card px-4 py-2.5 border-b border-border/30">
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/60">
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
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="bg-card px-4 py-2.5 border-b border-border/30">
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/60">
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
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-yellow-400">
          🟡 Q2 — Schedule (Important, Not Urgent)
        </h2>
        <div className="border border-border/50 rounded-lg overflow-hidden">
          {q2Projects.length > 0 && (
            <div className="px-4 py-3 border-b border-border/20">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Projects — Progress Containers
              </p>
              {q2Projects.map((p) => (
                <div key={p.id} className="py-1 text-sm font-serif text-foreground/80">
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
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-blue-400">
          🔵 Q3 — Delegate / Minimize (Urgent, Not Important)
        </h2>
        <div className="border border-border/50 rounded-lg overflow-hidden">
          {q3.length === 0 ? <EmptyBlock msg="No Q3 items" /> : <TaskTable tasks={q3} />}
        </div>
      </section>

      {/* ── Q4 — Eliminate ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          ⚪ Q4 — Eliminate (Not Urgent, Not Important)
        </h2>
        <div className="border border-border/50 rounded-lg overflow-hidden">
          {q4.length === 0 ? <EmptyBlock msg="No Q4 items" /> : <TaskTable tasks={q4} />}
        </div>
      </section>
    </div>
  );
}
