import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import Link from "next/link";
import type { Task } from "@/lib/db/schema";
import { classifyTask } from "@/lib/classify";
import { getLeadLifeAreas } from "@/lib/domains";
import { computePulseScore, getPulseLabel } from "@/lib/pulse";
import { TaskCompleteButton } from "./task-complete-button";

export async function DashboardContent() {
  const today = getTodayKarachi();
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
    supabase
      .from("daily_checkins")
      .select("*")
      .order("date", { ascending: false })
      .limit(60),
    supabase.from("habit_completion_summary").select("*").eq("date", today).limit(1),
    supabase.from("journal_entries").select("id").eq("date", today).limit(1),
    supabase.from("expenses").select("id").eq("date", today).limit(1),
    supabase
      .from("engine_logs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(5),
  ]);

  // Season + lead domain
  const season = seasonRow
    ? fromDb<{
        goal: string;
        startDate: string;
        endDate: string;
        leadDomain: string;
      }>(seasonRow)
    : null;
  const leadLifeAreas = season
    ? getLeadLifeAreas(season.leadDomain)
    : undefined;
  const daysLeft = season?.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(season.endDate).getTime() - new Date().getTime()) / 86400000
        )
      )
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
  const todayFocus = allActive.filter(
    (t) => classifyTask(t, today, leadLifeAreas) === "Q1"
  );
  const q1Count = todayFocus.length;

  // Tasks done today (for pulse)
  const { data: doneTodayRows } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "Done")
    .gte("updated_at", today + "T00:00:00")
    .lte("updated_at", today + "T23:59:59");
  const tasksDoneToday = doneTodayRows?.length ?? 0;

  // Habits (from compatibility view)
  const habitSummary =
    habitRows && habitRows.length > 0
      ? fromDb<{ habitsCompleted: number; habitsTotal: number; completionRate: number }>(habitRows[0])
      : null;
  const habitsCompleted = habitSummary?.habitsCompleted ?? 0;
  const habitsTotal = habitSummary?.habitsTotal ?? 0;

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

  // Emotional copy based on pulse score
  let emotionalCopy: string;
  if (pulseScore >= 70) {
    emotionalCopy = "you're thriving";
  } else if (pulseScore >= 50) {
    emotionalCopy = "building momentum";
  } else {
    emotionalCopy = "warming up";
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
  } else if (!habitSummary || habitsCompleted < habitsTotal) {
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
    fromDb<{
      engineName: string;
      status: string;
      summary: string | null;
    }>(r)
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
    <>
      {/* Engine Error Banner */}
      {hasEngineError && (
        <div className="border border-red-500/30 bg-red-500/[0.05] rounded-3xl p-4 flex items-center justify-between">
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

      {/* Pulse Score — Hero Card */}
      <div className="glass-card rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center">
        <p
          className="text-7xl font-serif text-[#FFF8F0]"
          style={{
            textShadow: "0 0 60px rgba(255,107,107,0.3)",
          }}
        >
          {pulseScore}
        </p>
        <p className="font-serif italic text-[#FFF8F0]/60 mt-2 text-lg">
          {emotionalCopy}
        </p>
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#FFF8F0]/30 uppercase mt-1">
          {pulseLabel}
        </p>
        {streak > 0 && (
          <p className="text-[#FFF8F0]/40 text-xs mt-3">
            {"\uD83D\uDD25"} {streak} days of momentum
          </p>
        )}
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-3 justify-center">
        <span className="bg-[#FFF8F0]/10 backdrop-blur rounded-full px-4 py-2 text-xs text-[#FFF8F0]/70">
          {"\uD83C\uDF31"} {habitsCompleted}/{habitsTotal} Habits
        </span>
        <span className="bg-[#FFF8F0]/10 backdrop-blur rounded-full px-4 py-2 text-xs text-[#FFF8F0]/70">
          {"\uD83D\uDCDD"} {checkinScore} Check-in
        </span>
        <span className="bg-[#FFF8F0]/10 backdrop-blur rounded-full px-4 py-2 text-xs text-[#FFF8F0]/70">
          {"\u2705"} Journal {journalWritten ? "Done" : "Pending"}
        </span>
        <span className="bg-[#FFF8F0]/10 backdrop-blur rounded-full px-4 py-2 text-xs text-[#FFF8F0]/70">
          {"\uD83D\uDCB0"} Expenses {expenseTracked ? "Tracked" : "Pending"}
        </span>
      </div>

      {/* Two-column grid: Focus + Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Focus */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
          {/* Coral-peach left accent */}
          <div
            className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, #FF6B6B, #FEC89A)",
            }}
          />
          <div className="pl-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-serif italic text-[#FFF8F0]/70">
                What matters today
              </p>
              <Link
                href="/matrix"
                className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 hover:text-[#FF6B6B] transition-colors"
              >
                Matrix
              </Link>
            </div>
            {todayFocus.length === 0 ? (
              <p className="text-sm font-serif text-[#FFF8F0]/30 text-center py-8">
                All clear today
              </p>
            ) : (
              <div className="space-y-0">
                {todayFocus.slice(0, 3).map((task, i) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 py-3 ${
                      i > 0 ? "border-t border-[#FFF8F0]/[0.05]" : ""
                    }`}
                  >
                    <TaskCompleteButton taskId={task.id} />
                    <span className="flex-1 text-sm font-serif text-[#FFF8F0]/70 truncate">
                      {task.taskName}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        task.priority?.includes("High")
                          ? "bg-[#FF6B6B]"
                          : task.priority?.includes("Medium")
                            ? "bg-amber-400"
                            : "bg-[#FFF8F0]/20"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-3xl p-6">
          <p className="text-lg font-serif italic text-[#FFF8F0]/70 mb-4">
            Quick actions
          </p>
          <div className="flex flex-col gap-3">
            {quickActions.map(({ href, label, key }) => {
              const primary = key === primaryAction;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-center py-3 text-[10px] font-mono uppercase tracking-[0.25em] transition-all ${
                    primary
                      ? "bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-2xl hover:opacity-90"
                      : "border border-[#FFF8F0]/[0.08] bg-[#FFF8F0]/[0.02] text-[#FFF8F0]/40 rounded-2xl hover:text-[#FFF8F0]/70 hover:border-[#FFF8F0]/[0.15]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom quote */}
      <p className="text-center font-serif italic text-[#FFF8F0]/15 text-sm pt-4 pb-8">
        small steps, big picture
      </p>
    </>
  );
}
