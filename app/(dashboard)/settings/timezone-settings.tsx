"use client";

import { useState, useCallback } from "react";
import { Globe, Loader2, Check } from "lucide-react";

// Common timezones grouped by region
const TIMEZONE_GROUPS = [
  {
    label: "Asia",
    zones: [
      { value: "Asia/Karachi", label: "Pakistan (PKT, UTC+5)" },
      { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
      { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
      { value: "Asia/Riyadh", label: "Saudi Arabia (AST, UTC+3)" },
      { value: "Asia/Shanghai", label: "China (CST, UTC+8)" },
      { value: "Asia/Tokyo", label: "Japan (JST, UTC+9)" },
      { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
      { value: "Asia/Dhaka", label: "Bangladesh (BST, UTC+6)" },
      { value: "Asia/Jakarta", label: "Indonesia (WIB, UTC+7)" },
      { value: "Asia/Tehran", label: "Iran (IRST, UTC+3:30)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/London", label: "London (GMT/BST, UTC+0/+1)" },
      { value: "Europe/Paris", label: "Paris (CET/CEST, UTC+1/+2)" },
      { value: "Europe/Berlin", label: "Berlin (CET/CEST, UTC+1/+2)" },
      { value: "Europe/Istanbul", label: "Istanbul (TRT, UTC+3)" },
      { value: "Europe/Moscow", label: "Moscow (MSK, UTC+3)" },
    ],
  },
  {
    label: "Americas",
    zones: [
      { value: "America/New_York", label: "New York (EST/EDT, UTC-5/-4)" },
      { value: "America/Chicago", label: "Chicago (CST/CDT, UTC-6/-5)" },
      { value: "America/Denver", label: "Denver (MST/MDT, UTC-7/-6)" },
      { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT, UTC-8/-7)" },
      { value: "America/Toronto", label: "Toronto (EST/EDT, UTC-5/-4)" },
      { value: "America/Sao_Paulo", label: "São Paulo (BRT, UTC-3)" },
    ],
  },
  {
    label: "Africa & Middle East",
    zones: [
      { value: "Africa/Cairo", label: "Cairo (EET, UTC+2)" },
      { value: "Africa/Lagos", label: "Lagos (WAT, UTC+1)" },
      { value: "Africa/Nairobi", label: "Nairobi (EAT, UTC+3)" },
    ],
  },
  {
    label: "Oceania",
    zones: [
      { value: "Australia/Sydney", label: "Sydney (AEST/AEDT, UTC+10/+11)" },
      { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT, UTC+12/+13)" },
    ],
  },
];

export function TimezoneSettings({
  initialTimezone,
}: {
  initialTimezone: string;
}) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Current time in selected timezone
  const currentTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const saveTimezone = useCallback(
    async (newTimezone: string) => {
      setTimezone(newTimezone);
      setSaving(true);
      setSaved(false);

      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: newTimezone }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setTimezone(timezone); // revert
      } finally {
        setSaving(false);
      }
    },
    [timezone]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono text-[#FFF8F0]/30 tracking-widest uppercase">
          Timezone
        </h2>
        {saving && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF8F0]/30" />
        )}
        {saved && (
          <span className="text-[10px] font-mono text-emerald-400/70 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>

      {/* Current Time Preview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-[#FF6B6B]/[0.08] flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-[#FF6B6B]" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
              Current Time
            </p>
            <p className="text-sm text-[#FFF8F0]/80 font-mono mt-1">
              {currentTime}
            </p>
            <p className="text-xs text-[#FFF8F0]/30 mt-1">
              {timezone.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      {/* Timezone Selector */}
      <div className="glass-card rounded-xl p-5">
        <label className="block">
          <span className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
            Select Timezone
          </span>
          <select
            value={timezone}
            onChange={(e) => saveTimezone(e.target.value)}
            disabled={saving}
            className="mt-2 w-full bg-[#FFF8F0]/[0.04] border border-[#FFF8F0]/[0.08] rounded-lg px-4 py-3 text-sm font-mono text-[#FFF8F0]/70 focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 appearance-none cursor-pointer"
          >
            {TIMEZONE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.zones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {/* Info */}
      <div className="pt-4 border-t border-[#FFF8F0]/[0.04]">
        <p className="text-[10px] font-mono text-[#FFF8F0]/20 leading-relaxed">
          This timezone is used for all date displays, notification scheduling,
          habit tracking, and daily check-ins across the app.
        </p>
      </div>
    </div>
  );
}
