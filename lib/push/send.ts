import { createClient } from "@/lib/supabase/server";
import { getConfiguredWebPush } from "./vapid";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
};

/**
 * Send a push notification to all devices of a specific user.
 * Automatically cleans up expired/invalid subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const supabase = await createClient();
  const webpush = getConfiguredWebPush();

  // Get all push subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys_p256dh, keys_auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  for (const sub of subscriptions as StoredSubscription[]) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth,
      },
    };

    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
        { TTL: 3600, urgency: "high" }
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      const statusCode = (err as { statusCode?: number }).statusCode;
      // 404 or 410 = subscription expired/invalid, remove it
      if (statusCode === 404 || statusCode === 410) {
        expiredIds.push(sub.id);
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredIds);
  }

  return { sent, failed };
}

/**
 * Send a push notification to ALL users who have subscriptions.
 * Useful for broadcast-style notifications.
 */
export async function sendPushBroadcast(
  payload: PushPayload
): Promise<{ totalSent: number; totalFailed: number }> {
  const supabase = await createClient();

  // Get all unique user IDs with subscriptions
  const { data: users } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .limit(1000);

  if (!users || users.length === 0) {
    return { totalSent: 0, totalFailed: 0 };
  }

  const uniqueUserIds = [...new Set(users.map((u) => u.user_id))];
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of uniqueUserIds) {
    const result = await sendPushToUser(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { totalSent, totalFailed };
}
