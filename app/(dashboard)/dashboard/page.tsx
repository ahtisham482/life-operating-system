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

  const [{ data: rows }, { data: seasonRow }, { data: checkinRows }] = await Promise.all([
    supabase.from("tasks").select("*").neq("status", "Done"),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
    supabase.from("daily_checkins").select("*").order("date", { ascending: false }).limit(60),
  ]);

  const allActive = (rows || []).map((r) => fromDb<Task>(r));

  const season = seasonRow ? fromDb<{ goal: string; startDate: string; endDate: string; leadDomain: string }>(seasonRow) : null;
  const daysLeft = season?.endDate ? Math.max(0, Math.ceil((new Date(season.endDate).getTime() - new Date().getTime()) / 86400000)) : null;

  const checkins = (checkinRows || []).map((r) => fromDb<{ date: string; leadDone: boolean }>(r));
  const checkinMap = new Map(checkins.map((c) => [c.date, c.leadDone]));
  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (checkinMap.get(k) === true) streak++;
    else break;
  }
  const todayCheckedIn = checkinMap.has(today);

  const todayFocus = allActive.filter((t) => classifyTask(t, today) === "Q1");
  const thisWeek = allActive.filter(
    (t) => t.dueDate != null && t.dueDate > today && t.dueDate <= weekEnd
  );

  const q1Count = allActive.filter((t) => classifyTask(t, today) === "Q1").length;
  const q2Count = allActive.filter((t) => classifyTask(t, today) === "Q2").length;
  const q3Count = allActive.filter((t) => classifyTask(t, today) === "Q3").length;
  const q4Count = allActive.filter((t) => classifyTask(t, today) === "Q4").length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="space-y-6 animate-slide-up"
        style={{ animationDelay: "0.05s", animationFillMode: "both" }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
              Life Operating System
            </p>
            <h1 className="text-3xl font-serif tracking-widest uppercase text-gradient-primary">
              Command Center
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-mono tracking-widest text-white/30">
              {dateLabel}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-3 flex-wrap">
          {season?.goal && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]">
              {season.goal.length > 40 ? season.goal.slice(0, 40) + "..." : season.goal}
            </span>
          )}
          {daysLeft !== null && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-white/[0.05] text-white/40">
              {daysLeft}d left
            </span>
          )}
          {streak > 0 && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]">
              {streak}-day streak
            </span>
          )}
          {todayCheckedIn && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]">
              checked in
            </span>
          )}
        </div>

        <div className="divider-gradient" />
      </div>

      {/* ── Today's Focus ───────────────────────────── */}
      <section
        className="space-y-5 animate-slide-up"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
              Priority
            </p>
            <h2 className="text-lg font-serif text-gradient-primary tracking-wide">
              Today&apos;s Focus &mdash; Q1 ({todayFocus.length})
            </h2>
          </div>
          <Link
            href="/matrix"
            className="text-[10px] font-mono uppercase tracking-wider text-white/30 hover:text-[#C49E45] transition-colors"
          >
            Full Matrix
          </Link>
        </div>

        {todayFocus.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center hover:border-white/[0.08] transition-all">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/20 uppercase">
              No urgent + important tasks today
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
            {todayFocus.map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-8 py-4 transition-colors hover:bg-white/[0.02] ${
                  i > 0 ? "border-t border-white/[0.05]" : ""
                }`}
              >
                <span className="text-sm font-mono text-white/20 w-5 shrink-0">
                  {STATUS_EMOJI[task.status] ?? "☐"}
                </span>
                <span className="flex-1 text-sm font-serif text-white/80">
                  {task.type === "🔁 Habit" && <span className="mr-1.5 text-xs">🔁</span>}
                  {task.taskName}
                </span>
                <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 shrink-0 uppercase">
                  {task.lifeArea}
                </span>
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

      {/* ── This Week ───────────────────────────────── */}
      <section
        className="space-y-5 animate-slide-up"
        style={{ animationDelay: "0.15s", animationFillMode: "both" }}
      >
        <div className="space-y-1">
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
            Upcoming
          </p>
          <h2 className="text-lg font-serif text-gradient-primary tracking-wide">
            This Week &mdash; Due in 7 days ({thisWeek.length})
          </h2>
        </div>

        {thisWeek.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center hover:border-white/[0.08] transition-all">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/20 uppercase">
              No tasks due this week
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden hover:border-white/[0.08] transition-all">
            {/* Table header */}
            <div className="flex items-center gap-4 px-8 py-3 border-b border-white/[0.05]">
              <span className="flex-1 text-[9px] font-mono uppercase tracking-[0.25em] text-white/30">
                Task
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/30 w-24 text-right">
                Due
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/30 w-32 text-right">
                Area
              </span>
            </div>
            {thisWeek.slice(0, 10).map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-8 py-4 transition-colors hover:bg-white/[0.02] ${
                  i > 0 ? "border-t border-white/[0.05]" : ""
                }`}
              >
                <span className="flex-1 text-sm font-serif text-white/80">{task.taskName}</span>
                <span className="font-mono text-[10px] text-white/30 tracking-wider w-24 text-right">{task.dueDate}</span>
                <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase w-32 text-right">{task.lifeArea}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Matrix Summary ──────────────────────────── */}
      <section
        className="space-y-5 animate-slide-up"
        style={{ animationDelay: "0.2s", animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
              Analysis
            </p>
            <h2 className="text-lg font-serif text-gradient-primary tracking-wide">
              Eisenhower Matrix
            </h2>
          </div>
          <Link
            href="/matrix"
            className="text-[10px] font-mono uppercase tracking-wider text-white/30 hover:text-[#C49E45] transition-colors"
          >
            Full View
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Q1 — Do Now", count: q1Count, accent: "rgba(239, 68, 68, 0.7)" },
            { label: "Q2 — Schedule", count: q2Count, accent: "rgba(234, 179, 8, 0.7)" },
            { label: "Q3 — Delegate", count: q3Count, accent: "rgba(59, 130, 246, 0.7)" },
            { label: "Q4 — Eliminate", count: q4Count, accent: "rgba(255, 255, 255, 0.25)" },
          ].map(({ label, count, accent }) => (
            <div
              key={label}
              className="glass-card rounded-2xl p-8 hover:border-white/[0.08] transition-all hover:scale-[1.01]"
            >
              <p
                className="font-mono text-[9px] tracking-[0.35em] uppercase"
                style={{ color: accent }}
              >
                {label}
              </p>
              <p className="text-4xl font-serif text-gradient-primary mt-3 stat-number">
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Actions ───────────────────────────── */}
      <section
        className="space-y-5 animate-slide-up"
        style={{ animationDelay: "0.25s", animationFillMode: "both" }}
      >
        <div className="space-y-1">
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
            Navigate
          </p>
          <h2 className="text-lg font-serif text-gradient-primary tracking-wide">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { href: "/checkin", label: "Check-In", primary: true },
            { href: "/weekly", label: "Weekly Plan", primary: false },
            { href: "/tasks", label: "Add Task", primary: false },
            { href: "/matrix", label: "Matrix", primary: false },
          ].map(({ href, label, primary }) => (
            <Link
              key={href}
              href={href}
              className={`text-center py-4 rounded-2xl text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
                primary
                  ? "glass-card border-[#C49E45]/20 bg-[#C49E45]/[0.06] text-[#C49E45] hover:bg-[#C49E45]/[0.12] hover:border-[#C49E45]/30"
                  : "glass-card text-white/40 hover:text-white/70 hover:border-white/[0.08]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
