export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch notification preferences, push subscriptions, and user settings in parallel
  const [{ data: prefs }, { count }, { data: userSettings }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .single(),
    supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id ?? ""),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .single(),
  ]);

  const defaultPrefs = {
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
  };

  return (
    <SettingsClient
      userEmail={user?.email ?? ""}
      userCreatedAt={user?.created_at ?? ""}
      notifPrefs={prefs || defaultPrefs}
      deviceCount={count ?? 0}
      timezone={userSettings?.timezone ?? "Asia/Karachi"}
    />
  );
}
