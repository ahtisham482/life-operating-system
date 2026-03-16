export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, getDateLabelKarachi } from "@/lib/utils";
import Link from "next/link";
import type { Task } from "@/lib/db/schema";
import { classifyTask } from "@/lib/classify";
import { getLeadLifeAreas } from "@/lib/domains";
import { computePulseScore, getPulseLabel } from "@/lib/pulse";
import { TaskCompleteButton } from "./task-complete-button";

export default async function DashboardPage() {
  const today = getTodayKarachi();
  const dateLabel = getDateLabelKarachi();

  const supabase = await createClient();

  const [
    { data: rows },
    { data: seasonRow },
    { data: checkinRows },
    { data: habitRows },
    { data: journalRows },
    { data: expenseRows },
    { data: engineLogRows },
  ] = await Promise.all([
    supabase.from("tasks").select("*").neq("status", "Done"),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
    supabase.from("daily_checkins").select("*").order("date", { ascending: false }).limit(60),
    supabase.from("habit_entries").select("*").eq("date", today).limit(1),
    supabase.from("journal_entries").select("id").eq("date", today).limit(1),
    supabase.from("expenses").select("id").eq("date", today).limit(1),
    supabase.from("engine_logs").select("*").order("run_at", { ascending: false }).limit(5),
  ]);

  // Season + lead domain
  const season = seasonRow
    ? fromDb<{ goal: string; startDate: string; endDate: string; leadDomain: string }>(seasonRow)
    : null;
  const leadLifeAreas = season ? getLeadLifeAreas(season.leadDomain) : undefined;
  const daysLeft = season?.endDate
    ? Math.max(0, Math.ceil((new Date(season.endDate).getTime() - new Date().getTime()) / 86400000))
    : null;

  // Checkins & streak
  const checkins = (checkinRows || []).map((r) =>
    fromDb<{ date: string; leadDone: boolean | number | null }>(r)
  );
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

  // Tasks classification with season awareness
  const allActive = (rows || []).map((r) => fromDb<Task>(r));
  const todayFocus = allActive.filter((t) => classifyTask(t, today, leadLifeAreas) === "Q1");
  const q1Count = allActive.filter((t) => classifyTask(t, today, leadLifeAreas) === "Q1").length;

  // Tasks done today (for pulse)
  const { data: doneTodayRows } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "Done")
    .gte("updated_at", today + "T00:00:00")
    .lte("updated_at", today + "T23:59:59");
  const tasksDoneToday = doneTodayRows?.length ?? 0;

  // Habits
  const habitEntry = habitRows && habitRows.length > 0
    ? fromDb<{ habits: Record<string, boolean> }>(habitRows[0])
    : null;
  const habitsCompleted = habitEntry
    ? Object.values(habitEntry.habits).filter(Boolean).length
    : 0;
  const habitsTotal = 14;

  // Journal & Expenses
  const journalWritten = (journalRows?.length ?? 0) > 0;
  const expenseTracked = (expenseRows?.length ?? 0) > 0;

  // Lead score from today's checkin
  const todayLeadDone = checkinMap.get(today);
  let leadScore = 0;
  if (todayLeadDone === true) leadScore = 5;
  else if (todayLeadDone === false) leadScore = 1;
  else if (typeof todayLeadDone === "number") leadScore = todayLeadDone;

  // Pulse Score
  const pulseScore = computePulseScore({
    habitsCompleted,
    habitsTotal,
    leadScore,
    tasksDoneToday,
    totalQ1Tasks: q1Count,
    expenseTracked,
    journalWritten,
  });
  const pulseLabel = getPulseLabel(pulseScore);

  // Time-of-day greeting (Asia/Karachi)
  const hourStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourStr, 10);
  let greeting: string;
  if (hour < 12) {
    greeting = "Good morning, Muhammad";
  } else if (hour < 18) {
    greeting = "Good afternoon, Muhammad";
  } else {
    greeting = "Good evening, Muhammad";
  }

  // Day of week for adaptive quick actions
  const dayOfWeek = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
  });

  // Adaptive quick actions — determine which is primary
  let primaryAction = "checkin";
  if (!todayCheckedIn) {
    primaryAction = "checkin";
  } else if (!habitEntry || habitsCompleted < habitsTotal) {
    primaryAction = "habits";
  } else if (dayOfWeek === "Sunday") {
    primaryAction = "weekly";
  } else if (daysLeft !== null && daysLeft <= 7) {
    primaryAction = "season";
  } else {
    primaryAction = "checkin";
  }

  const quickActions = [
    { href: "/checkin", label: "Check-In", key: "checkin" },
    { href: "/habits", label: "Track Habits", key: "habits" },
    { href: "/weekly", label: "Weekly Plan", key: "weekly" },
    { href: "/season", label: "Review Season", key: "season" },
  ];

  // Engine error banner
  const engineLogs = (engineLogRows || []).map((r) =>
    fromDb<{ engineName: string; status: string; summary: string | null }>(r)
  );
  const lastEngine = engineLogs.length > 0 ? engineLogs[0] : null;
  const hasEngineError = lastEngine?.status === "error";

  // Checkin score for quick stats
  const todayCheckin = checkins.find((c) => c.date === today);
  let checkinScore: string;
  if (!todayCheckin) {
    checkinScore = "Not yet";
  } else if (typeof todayCheckin.leadDone === "number") {
    checkinScore = `${todayCheckin.leadDone}/5`;
  } else if (todayCheckin.leadDone === true) {
    checkinScore = "5/5";
  } else {
    checkinScore = "1/5";
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* ── Engine Error Banner ─────────────────── */}
      {hasEngineError && (
        <div className="border border-red-500/30 bg-red-500/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <p className="text-[11px] font-mono text-red-400/80 tracking-wider">
            Warning: Automation issue with {lastEngine.engineName}
            {lastEngine.summary ? ` — ${lastEngine.summary}` : ""}
          </p>
          <Link
            href="/engines"
            className="text-[10px] font-mono uppercase tracking-wider text-red-400/60 hover:text-red-400 transition-colors"
          >
            View details
          </Link>
        </div>
      )}

      {/* ── Greeting + Date ─────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-serif tracking-wide text-gradient-primary">
          {greeting}
        </h1>
        <p className="font-mono text-[11px] tracking-widest text-white/30">
          {dateLabel}
        </p>
      </div>

      {/* ── 2x2 Quadrant Grid ───────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {/* ── Top-Left: Pulse Score ─────────────── */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-4">
            Pulse Score
          </p>
          <p
            className="text-6xl font-serif"
            style={{
              background: "linear-gradient(135deg, #C49E45 0%, #E8C868 50%, #C49E45 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {pulseScore}
          </p>
          <p className="font-mono text-[10px] tracking-[0.25em] text-white/30 uppercase mt-3">
            {pulseLabel}
          </p>
        </div>

        {/* ── Top-Right: Today's Focus ──────────── */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
              Today&apos;s Focus
            </p>
            <Link
              href="/matrix"
              className="text-[10px] font-mono uppercase tracking-wider text-white/30 hover:text-[#C49E45] transition-colors"
            >
              Matrix
            </Link>
          </div>
          {todayFocus.length === 0 ? (
            <p className="text-sm font-serif text-white/30 text-center py-8">
              All clear today
            </p>
          ) : (
            <div className="space-y-0">
              {todayFocus.slice(0, 3).map((task, i) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 py-3 ${
                    i > 0 ? "border-t border-white/[0.05]" : ""
                  }`}
                >
                  <TaskCompleteButton taskId={task.id} />
                  <span className="flex-1 text-sm font-serif text-white/80 truncate">
                    {task.taskName}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/30 shrink-0 uppercase">
                    {task.lifeArea}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom-Left: Quick Stats ──────────── */}
        <div className="glass-card rounded-2xl p-6">
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-4">
            Quick Stats
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-serif text-white/60">Streak</span>
              <span className="font-mono text-sm text-white/80">
                {streak > 0 ? `🔥 ${streak} days` : "🔥 0 days"}
              </span>
            </div>
            <div className="border-t border-white/[0.05]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-serif text-white/60">Habits</span>
              <span className="font-mono text-sm text-white/80">
                {habitsCompleted}/{habitsTotal} done
              </span>
            </div>
            <div className="border-t border-white/[0.05]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-serif text-white/60">Check-in</span>
              <span className="font-mono text-sm text-white/80">
                Score: {checkinScore}
              </span>
            </div>
            <div className="border-t border-white/[0.05]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-serif text-white/60">Journal</span>
              <span className="font-mono text-sm text-white/80">
                {journalWritten ? "✓ Written" : "✗ Not yet"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Bottom-Right: Quick Actions ───────── */}
        <div className="glass-card rounded-2xl p-6">
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-4">
            Quick Actions
          </p>
          <div className="flex flex-col gap-3">
            {quickActions.map(({ href, label, key }) => {
              const primary = key === primaryAction;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-center py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
                    primary
                      ? "border border-[#C49E45]/20 bg-[#C49E45]/[0.06] text-[#C49E45] hover:bg-[#C49E45]/[0.12] hover:border-[#C49E45]/30"
                      : "border border-white/[0.05] bg-white/[0.02] text-white/40 hover:text-white/70 hover:border-white/[0.08]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
