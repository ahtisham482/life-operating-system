export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NotificationSettings } from "./notification-settings";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch existing preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .single();

  // Fetch subscription count
  const { count } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

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
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-serif text-[#FFF8F0]/90 mb-2">
          Notifications
        </h1>
        <p className="text-sm font-serif text-[#FFF8F0]/40 italic">
          Get reminded at the right time, every time
        </p>
      </div>

      <NotificationSettings
        initialPrefs={prefs || defaultPrefs}
        deviceCount={count ?? 0}
      />
    </div>
  );
}
