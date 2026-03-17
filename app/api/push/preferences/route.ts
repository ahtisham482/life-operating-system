import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/push/preferences — Get the current user's notification preferences
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if no preferences exist yet
  if (!data) {
    return NextResponse.json({
      task_due_enabled: true,
      task_due_minutes_before: 30,
      habit_reminder_enabled: true,
      habit_reminder_time: "08:00",
      daily_checkin_enabled: true,
      daily_checkin_time: "21:00",
      weekly_review_enabled: true,
      weekly_review_day: 0,
      weekly_review_time: "10:00",
      overdue_digest_enabled: true,
      overdue_digest_time: "09:00",
    });
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/push/preferences — Update the current user's notification preferences
 */
export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Only allow known fields
  const allowed = [
    "task_due_enabled",
    "task_due_minutes_before",
    "habit_reminder_enabled",
    "habit_reminder_time",
    "daily_checkin_enabled",
    "daily_checkin_time",
    "weekly_review_enabled",
    "weekly_review_day",
    "weekly_review_time",
    "overdue_digest_enabled",
    "overdue_digest_time",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
