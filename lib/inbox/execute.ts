import type { ParsedRoute } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";
import { getTodayKarachi } from "@/lib/utils";

type ExecResult = {
  module: string;
  success: boolean;
  error?: string;
};

export async function executeRoutes(
  routes: ParsedRoute[],
  captureContext?: string
): Promise<ExecResult[]> {
  const results: ExecResult[] = [];

  for (const route of routes) {
    try {
      switch (route.module) {
        case "tasks":
        case "habits":
          await executeTask(route, captureContext);
          break;
        case "expenses":
          await executeExpense(route, captureContext);
          break;
        case "journal":
          await executeJournal(route, captureContext);
          break;
        case "books":
          await executeBook(route, captureContext);
          break;
        case "weekly":
          await executeWeekly(route);
          break;
        case "season":
          await executeSeason(route);
          break;
        case "checkin":
          await executeCheckin(route);
          break;
        default:
          results.push({
            module: route.module,
            success: false,
            error: "Unknown module",
          });
          continue;
      }
      results.push({ module: route.module, success: true });
    } catch (err) {
      results.push({
        module: route.module,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

function buildNotes(
  route: ParsedRoute,
  captureContext?: string
): string {
  const parts: string[] = [];
  parts.push(`Created via Inbox: "${route.summary}"`);
  if (captureContext) {
    parts.push("");
    parts.push(captureContext);
  }
  return parts.join("\n");
}

async function executeTask(route: ParsedRoute, captureContext?: string) {
  const supabase = await createClient();
  const d = route.data;
  const isHabit = route.module === "habits" || d.type === "🔁 Habit";

  const { error } = await supabase.from("tasks").insert({
    task_name:
      (d.taskName as string) ||
      (d.habitDescription as string) ||
      route.summary,
    status: "To Do",
    priority: (d.priority as string) || null,
    life_area: (d.lifeArea as string) || null,
    type: isHabit ? "🔁 Habit" : (d.type as string) || "✅ Task",
    due_date: (d.dueDate as string) || null,
    notes: buildNotes(route, captureContext),
    recurring: isHabit ? true : false,
    frequency: isHabit ? (d.frequency as string) || "Daily" : null,
  });
  if (error) throw new Error(error.message);

  logMirrorSignal({ type: "task_complete", context: { source: "inbox" } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}

async function executeExpense(route: ParsedRoute, captureContext?: string) {
  const supabase = await createClient();
  const d = route.data;
  const { error } = await supabase.from("expenses").insert({
    item: (d.item as string) || route.summary,
    amount_pkr: Number(d.amountPkr) || 0,
    category: (d.category as string) || "Other",
    date: (d.date as string) || getTodayKarachi(),
    type: (d.type as string) || "Need",
    notes: buildNotes(route, captureContext),
  });
  if (error) throw new Error(error.message);

  logMirrorSignal({
    type: "expense",
    context: { amount: d.amountPkr, category: d.category, type: d.type },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

async function executeJournal(route: ParsedRoute, captureContext?: string) {
  const supabase = await createClient();
  const d = route.data;
  const { error } = await supabase.from("journal_entries").insert({
    title: (d.title as string) || "Inbox Entry",
    date: (d.date as string) || getTodayKarachi(),
    entry: captureContext
      ? `${(d.entry as string) || route.summary}\n\n${captureContext}`
      : (d.entry as string) || route.summary,
    mood: (d.mood as string) || "😐 Neutral",
    category: (d.category as string) || "General",
  });
  if (error) throw new Error(error.message);

  logMirrorSignal({
    type: "journal",
    context: { mood: d.mood, category: d.category, source: "inbox" },
  });
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

async function executeBook(route: ParsedRoute, captureContext?: string) {
  const supabase = await createClient();
  const d = route.data;
  const { error } = await supabase.from("custom_books").insert({
    title: (d.title as string) || route.summary,
    status: (d.status as string) || "Up Next",
    insight: captureContext
      ? `${(d.insight as string) || ""}\n${captureContext}`.trim()
      : (d.insight as string) || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/books");
}

async function executeWeekly(route: ParsedRoute) {
  const supabase = await createClient();
  const d = route.data;

  // Calculate the current week key (YYYY-WNN)
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((today.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  const weekKey = `${today.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

  const { error } = await supabase.from("weekly_plans").upsert(
    {
      week_key: weekKey,
      lead_priority: (d.leadPriority as string) || route.summary,
      maintenance_actions: (d.maintenanceActions as string) || "",
      removing_pausing: (d.removingPausing as string) || "",
    },
    { onConflict: "week_key" }
  );
  if (error) throw new Error(error.message);

  logMirrorSignal({
    type: "weekly_plan",
    context: { week_key: weekKey, source: "inbox" },
  });
  revalidatePath("/weekly");
}

async function executeSeason(route: ParsedRoute) {
  const supabase = await createClient();
  const d = route.data;

  // Check if there's an active season — update its goal instead of creating a new one
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  if (activeSeason) {
    // Append to existing season goal
    const { error } = await supabase
      .from("seasons")
      .update({
        goal: (d.goal as string) || route.summary,
      })
      .eq("id", activeSeason.id);
    if (error) throw new Error(error.message);
  } else {
    // Create new season with 90-day span
    const startDate = getTodayKarachi();
    const end = new Date();
    end.setDate(end.getDate() + 90);
    const endDate = end.toISOString().split("T")[0];

    const { error } = await supabase.from("seasons").insert({
      goal: (d.goal as string) || route.summary,
      start_date: startDate,
      end_date: endDate,
      lead_domain: (d.leadDomain as string) || "Learning & Growth",
      domains: {},
      is_active: true,
    });
    if (error) throw new Error(error.message);
  }

  logMirrorSignal({
    type: "season_update",
    context: { action: "inbox_update", goal: d.goal },
  });
  revalidatePath("/season");
  revalidatePath("/dashboard");
}

async function executeCheckin(route: ParsedRoute) {
  const supabase = await createClient();
  const d = route.data;
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      date: getTodayKarachi(),
      lead_done: Number(d.leadScore) || 3,
      mood: (d.mood as string) || null,
      reflection: (d.reflection as string) || route.summary,
      blockers: (d.blockers as string) || null,
    },
    { onConflict: "date" }
  );
  if (error) throw new Error(error.message);

  logMirrorSignal({
    type: "checkin",
    context: { lead_score: d.leadScore, mood: d.mood, source: "inbox" },
  });
  revalidatePath("/checkin");
  revalidatePath("/dashboard");
}
