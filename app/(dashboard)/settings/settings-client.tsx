"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Globe,
  ChevronRight,
  Mail,
  CalendarDays,
  Settings as SettingsIcon,
} from "lucide-react";
import { NotificationSettings } from "../notifications/notification-settings";
import { TimezoneSettings } from "./timezone-settings";

type Tab = "account" | "notifications" | "timezone";

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

const TABS: { id: Tab; label: string; icon: typeof User; description: string }[] = [
  { id: "account", label: "Account", icon: User, description: "Your profile & email" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Push alerts & reminders" },
  { id: "timezone", label: "Timezone", icon: Globe, description: "Date & time display" },
];

export function SettingsClient({
  userEmail,
  userCreatedAt,
  notifPrefs,
  deviceCount,
  timezone,
}: {
  userEmail: string;
  userCreatedAt: string;
  notifPrefs: Prefs;
  deviceCount: number;
  timezone: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("account");

  const joinedDate = new Date(userCreatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-5 h-5 text-[#FF6B6B]" />
          <h1 className="text-2xl font-serif text-[#FFF8F0]/90">Settings</h1>
        </div>
        <p className="text-sm font-serif text-[#FFF8F0]/40 italic">
          Configure your Life Operating System
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Tab Navigation (Left sidebar on desktop, top on mobile) ── */}
        <nav className="md:w-56 shrink-0">
          <div className="flex md:flex-col gap-2">
            {TABS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all w-full group ${
                  activeTab === id
                    ? "bg-[#FF6B6B]/[0.08] border border-[#FF6B6B]/[0.15]"
                    : "hover:bg-[#FFF8F0]/[0.03] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === id ? "text-[#FF6B6B]" : "text-[#FFF8F0]/30 group-hover:text-[#FFF8F0]/50"
                  }`}
                />
                <div className="hidden md:block flex-1 min-w-0">
                  <p
                    className={`text-xs font-mono uppercase tracking-wider ${
                      activeTab === id ? "text-[#FF6B6B]" : "text-[#FFF8F0]/60"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-[10px] text-[#FFF8F0]/25 mt-0.5 truncate">
                    {description}
                  </p>
                </div>
                {/* Mobile label */}
                <span
                  className={`md:hidden text-xs font-mono uppercase tracking-wider ${
                    activeTab === id ? "text-[#FF6B6B]" : "text-[#FFF8F0]/50"
                  }`}
                >
                  {label}
                </span>
                <ChevronRight
                  className={`w-3 h-3 hidden md:block ml-auto ${
                    activeTab === id ? "text-[#FF6B6B]/50" : "text-[#FFF8F0]/10"
                  }`}
                />
              </button>
            ))}
          </div>
        </nav>

        {/* ── Tab Content ── */}
        <div className="flex-1 min-w-0">
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-mono text-[#FFF8F0]/30 tracking-widest uppercase mb-4">
                  Account
                </h2>
              </div>

              {/* Email Card */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#FF6B6B]/[0.08] flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#FF6B6B]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-sm text-[#FFF8F0]/80 font-mono mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Member Since Card */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#FF6B6B]/[0.08] flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#FF6B6B]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
                      Member Since
                    </p>
                    <p className="text-sm text-[#FFF8F0]/80 font-mono mt-0.5">
                      {joinedDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <div className="pt-4">
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono text-red-400/70 hover:text-red-400 bg-red-500/[0.05] hover:bg-red-500/10 border border-red-500/10 transition-all"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <div className="mb-6">
                <h2 className="text-sm font-mono text-[#FFF8F0]/30 tracking-widest uppercase">
                  Notifications
                </h2>
              </div>
              <NotificationSettings
                initialPrefs={notifPrefs}
                deviceCount={deviceCount}
              />
            </div>
          )}

          {activeTab === "timezone" && (
            <TimezoneSettings initialTimezone={timezone} />
          )}
        </div>
      </div>
    </div>
  );
}
