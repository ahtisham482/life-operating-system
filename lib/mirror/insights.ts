import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";

type Interaction = {
  interactionType: string;
  context: Record<string, unknown>;
  createdAt: string;
};

/**
 * Generate a single daily insight from the last 30 days of interaction data.
 * Returns a human-readable insight string, or null if insufficient data.
 */
export async function generateDailyInsight(): Promise<string | null> {
  const supabase = await createClient();
  const today = getTodayKarachi();

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString();

  const { data: rows } = await supabase
    .from("interactions")
    .select("*")
    .gte("created_at", fromDate)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!rows || rows.length < 5) return null;

  const interactions = rows.map((r) => fromDb<Interaction>(r));

  // Analyze check-in patterns
  const checkins = interactions.filter((i) => i.interactionType === "checkin");
  if (checkins.length >= 7) {
    // Find most productive day of week
    const dayScores: Record<string, { total: number; count: number }> = {};
    for (const c of checkins) {
      const ctx = c.context as Record<string, unknown>;
      const day = ctx.day_of_week as string;
      const score = ctx.lead_score as number;
      if (day && score) {
        if (!dayScores[day]) dayScores[day] = { total: 0, count: 0 };
        dayScores[day].total += score;
        dayScores[day].count += 1;
      }
    }
    const bestDay = Object.entries(dayScores)
      .map(([day, { total, count }]) => ({ day, avg: total / count }))
      .sort((a, b) => b.avg - a.avg)[0];

    if (bestDay && bestDay.avg >= 3.5) {
      return `You're most productive on ${bestDay.day}s (avg lead score: ${bestDay.avg.toFixed(1)})`;
    }
  }

  // Analyze habit patterns
  const habits = interactions.filter((i) => i.interactionType === "habit");
  if (habits.length >= 7) {
    const ctx = habits[0]?.context as Record<string, unknown>;
    const rate = ctx.completion_rate as number;
    if (rate && rate >= 80) {
      return `You've completed ${Math.round(rate)}% of your habits recently \u2014 strong consistency`;
    }
  }

  // Analyze expense patterns
  const expenses = interactions.filter((i) => i.interactionType === "expense");
  if (expenses.length >= 5) {
    const categories: Record<string, number> = {};
    for (const e of expenses) {
      const ctx = e.context as Record<string, unknown>;
      const cat = ctx.category as string;
      const amount = ctx.amount as number;
      if (cat && amount) {
        categories[cat] = (categories[cat] || 0) + amount;
      }
    }
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      return `Your top spending category this month: ${topCategory[0]} (PKR ${Math.round(topCategory[1]).toLocaleString()})`;
    }
  }

  // Default: activity summary
  const uniqueTypes = new Set(interactions.map((i) => i.interactionType));
  return `Mirror has observed ${interactions.length} interactions across ${uniqueTypes.size} features in the last 30 days`;
}
