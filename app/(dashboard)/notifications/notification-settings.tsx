"use client";

import { useState, useCallback } from "react";
import {
  Bell,
  BellOff,
  Clock,
  CheckSquare,
  Calendar,
  AlertTriangle,
  BookOpen,
  Smartphone,
  Loader2,
} from "lucide-react";
import { useNotifications } from "@/lib/push/use-notifications";

type Prefs = {
  task_due_enabled: boolean;
  task_due_minutes_before: number;
  habit_reminder_enabled: boolean;
  habit_reminder_time: string;
  daily_checkin_enabled: boolean;
  daily_checkin_time: string;
  weekly_review_enabled: boolean;
  weekly_review_day: number;
  weekly_review_time: string;
  overdue_digest_enabled: boolean;
  overdue_digest_time: string;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function NotificationSettings({
  initialPrefs,
  deviceCount,
}: {
  initialPrefs: Prefs;
  deviceCount: number;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const {
    supported,
    permission,
    subscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = useNotifications();

  // Save preferences to server
  const savePrefs = useCallback(
    async (updates: Partial<Prefs>) => {
      const newPrefs = { ...prefs, ...updates };
      setPrefs(newPrefs);
      setSaving(true);
      setSaved(false);

      try {
        await fetch("/api/push/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // Revert on error
        setPrefs(prefs);
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  // Send test notification
  const sendTest = useCallback(async () => {
    setTestSending(true);
    try {
      if ("serviceWorker" in navigator && "Notification" in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("🧪 Test Notification", {
          body: "Notifications are working! You'll get reminders at the times you set.",
          icon: "/icon-192.png",
          tag: "test",
        });
      }
    } catch (err) {
      console.error("Test notification failed:", err);
    } finally {
      setTestSending(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Device Registration ── */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-serif text-[#FFF8F0]/80 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#FF6B6B]" />
              This Device
            </h2>
            <p className="text-xs text-[#FFF8F0]/30 mt-1">
              {deviceCount > 0
                ? `${deviceCount} device${deviceCount > 1 ? "s" : ""} registered`
                : "No devices registered yet"}
            </p>
          </div>

          {saved && (
            <span className="text-[10px] font-mono text-emerald-400/70 bg-emerald-500/10 px-2 py-1 rounded">
              Saved ✓
            </span>
          )}
        </div>

        {!supported ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06]">
            <BellOff className="w-5 h-5 text-[#FFF8F0]/30" />
            <div>
              <p className="text-sm text-[#FFF8F0]/60">
                Push notifications are not supported in this browser.
              </p>
              <p className="text-xs text-[#FFF8F0]/30 mt-1">
                Try Chrome, Edge, or Firefox for the best experience.
              </p>
            </div>
          </div>
        ) : permission === "denied" ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
            <BellOff className="w-5 h-5 text-red-400/60" />
            <div>
              <p className="text-sm text-[#FFF8F0]/60">
                Notifications are blocked for this site.
              </p>
              <p className="text-xs text-[#FFF8F0]/30 mt-1">
                Open your browser settings → Site Settings → Notifications → Allow for this site.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono transition-all ${
                subscribed
                  ? "bg-[#FFF8F0]/[0.06] text-[#FFF8F0]/60 hover:bg-red-500/10 hover:text-red-400"
                  : "bg-[#FF6B6B]/20 text-[#FF6B6B] hover:bg-[#FF6B6B]/30"
              }`}
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : subscribed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {subscribed ? "Disable Notifications" : "Enable Notifications"}
            </button>

            {subscribed && (
              <button
                onClick={sendTest}
                disabled={testSending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-mono text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[0.04] transition-all"
              >
                {testSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                Test
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Notification Types ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-mono text-[#FFF8F0]/30 tracking-widest uppercase px-1">
          What to notify
        </h2>

        {/* Task Due */}
        <NotifToggle
          icon={<CheckSquare className="w-4 h-4" />}
          title="Tasks Due Today"
          description="Morning notification with today's due tasks"
          enabled={prefs.task_due_enabled}
          onToggle={(v) => savePrefs({ task_due_enabled: v })}
          saving={saving}
        >
          <TimeSelect
            label="Remind me"
            value={`${prefs.task_due_minutes_before}`}
            options={[
              { value: "15", label: "15 min before" },
              { value: "30", label: "30 min before" },
              { value: "60", label: "1 hour before" },
              { value: "120", label: "2 hours before" },
            ]}
            onChange={(v) =>
              savePrefs({ task_due_minutes_before: parseInt(v) })
            }
          />
        </NotifToggle>

        {/* Overdue Digest */}
        <NotifToggle
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Overdue Task Alert"
          description="Morning digest of tasks past their due date"
          enabled={prefs.overdue_digest_enabled}
          onToggle={(v) => savePrefs({ overdue_digest_enabled: v })}
          saving={saving}
        >
          <TimeInput
            label="Send at"
            value={prefs.overdue_digest_time}
            onChange={(v) => savePrefs({ overdue_digest_time: v })}
          />
        </NotifToggle>

        {/* Habit Reminder */}
        <NotifToggle
          icon={<BookOpen className="w-4 h-4" />}
          title="Habit Tracker Reminder"
          description="Daily reminder to check off your habits"
          enabled={prefs.habit_reminder_enabled}
          onToggle={(v) => savePrefs({ habit_reminder_enabled: v })}
          saving={saving}
        >
          <TimeInput
            label="Send at"
            value={prefs.habit_reminder_time}
            onChange={(v) => savePrefs({ habit_reminder_time: v })}
          />
        </NotifToggle>

        {/* Daily Check-in */}
        <NotifToggle
          icon={<Clock className="w-4 h-4" />}
          title="Daily Check-in"
          description="Evening reminder to reflect on your day"
          enabled={prefs.daily_checkin_enabled}
          onToggle={(v) => savePrefs({ daily_checkin_enabled: v })}
          saving={saving}
        >
          <TimeInput
            label="Send at"
            value={prefs.daily_checkin_time}
            onChange={(v) => savePrefs({ daily_checkin_time: v })}
          />
        </NotifToggle>

        {/* Weekly Review */}
        <NotifToggle
          icon={<Calendar className="w-4 h-4" />}
          title="Weekly Review"
          description="Reminder to plan your week ahead"
          enabled={prefs.weekly_review_enabled}
          onToggle={(v) => savePrefs({ weekly_review_enabled: v })}
          saving={saving}
        >
          <div className="flex items-center gap-3">
            <TimeSelect
              label="Day"
              value={`${prefs.weekly_review_day}`}
              options={DAY_NAMES.map((name, i) => ({
                value: `${i}`,
                label: name,
              }))}
              onChange={(v) =>
                savePrefs({ weekly_review_day: parseInt(v) })
              }
            />
            <TimeInput
              label="Time"
              value={prefs.weekly_review_time}
              onChange={(v) => savePrefs({ weekly_review_time: v })}
            />
          </div>
        </NotifToggle>
      </section>

      {/* Info footer */}
      <div className="pt-4 border-t border-[#FFF8F0]/[0.04]">
        <p className="text-[10px] font-mono text-[#FFF8F0]/20 text-center leading-relaxed">
          All times are in Pakistan Standard Time (PKT).
          <br />
          Notifications are checked every minute for precise delivery.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────

function NotifToggle({
  icon,
  title,
  description,
  enabled,
  onToggle,
  saving,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  saving: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`glass-card rounded-xl p-5 transition-all ${
        enabled ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 ${enabled ? "text-[#FF6B6B]" : "text-[#FFF8F0]/30"}`}>
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-serif text-[#FFF8F0]/80">{title}</h3>
            <p className="text-xs text-[#FFF8F0]/30 mt-0.5">{description}</p>
          </div>
        </div>

        <button
          onClick={() => onToggle(!enabled)}
          disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? "bg-[#FF6B6B]/80" : "bg-[#FFF8F0]/10"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && children && <div className="mt-4 pl-7">{children}</div>}
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#FFF8F0]/[0.04] border border-[#FFF8F0]/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-[#FFF8F0]/70 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30"
      />
    </div>
  );
}

function TimeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#FFF8F0]/[0.04] border border-[#FFF8F0]/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-[#FFF8F0]/70 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
