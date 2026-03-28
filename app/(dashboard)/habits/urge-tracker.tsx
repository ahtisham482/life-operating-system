"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { BadHabit, UrgeLog } from "@/lib/breaker";
import { logUrge, getTodayUrges } from "./breaker-actions";

type Mode = null | "resisted" | "slipped" | "urge-now";

const TRIGGER_TYPES = ["bored", "stressed", "procrastinating", "tired", "autopilot"];
const SLIP_DURATIONS = [
  { value: 5, label: "< 5 min" },
  { value: 10, label: "5-15 min" },
  { value: 22, label: "15-30 min" },
  { value: 45, label: "30-60 min" },
  { value: 90, label: "1hr+" },
];
const POST_FEELINGS = ["regretful", "neutral", "good"];

interface Props {
  habit: BadHabit;
  onRefresh: () => void;
}

export function UrgeTracker({ habit, onRefresh }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [todayLogs, setTodayLogs] = useState<UrgeLog[]>([]);
  const [pending, startTransition] = useTransition();

  // Form state
  const [trigger, setTrigger] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [usedReplacement, setUsedReplacement] = useState(false);
  const [note, setNote] = useState("");
  const [slipDuration, setSlipDuration] = useState(5);
  const [failedLayer, setFailedLayer] = useState(1);
  const [postFeeling, setPostFeeling] = useState("regretful");

  // Urge NOW state
  const [countdown, setCountdown] = useState(10);
  const [surfing, setSurfing] = useState(false);
  const [surfTimer, setSurfTimer] = useState(600);
  const [urgeResolved, setUrgeResolved] = useState(false);

  const loadToday = useCallback(() => {
    startTransition(async () => {
      const logs = await getTodayUrges(habit.id);
      setTodayLogs(logs);
    });
  }, [habit.id]);

  useEffect(() => { loadToday(); }, [loadToday]);

  // Countdown timer
  useEffect(() => {
    if (mode !== "urge-now" || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, countdown]);

  // Surf timer
  useEffect(() => {
    if (!surfing || surfTimer <= 0) return;
    const t = setTimeout(() => setSurfTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [surfing, surfTimer]);

  const resisted = todayLogs.filter((l) => l.result === "resisted" || l.result === "surfed").length;
  const slipped = todayLogs.filter((l) => l.result === "slipped").length;
  const total = todayLogs.length;
  const winRate = total > 0 ? Math.round((resisted / total) * 100) : 100;

  function resetForm() {
    setMode(null);
    setTrigger("");
    setIntensity(5);
    setUsedReplacement(false);
    setNote("");
    setSlipDuration(5);
    setFailedLayer(1);
    setPostFeeling("regretful");
    setCountdown(10);
    setSurfing(false);
    setSurfTimer(600);
    setUrgeResolved(false);
  }

  function submitLog(result: "resisted" | "slipped" | "surfed") {
    startTransition(async () => {
      await logUrge({
        badHabitId: habit.id,
        result,
        triggerType: trigger || undefined,
        urgeIntensity: intensity || undefined,
        usedReplacement,
        slipDurationMinutes: result === "slipped" ? slipDuration : undefined,
        failedDefenseLayer: result === "slipped" ? failedLayer : undefined,
        postFeeling: result === "slipped" ? postFeeling : undefined,
        note: note || undefined,
      });
      resetForm();
      loadToday();
      onRefresh();
    });
  }

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-[12px] transition-all cursor-pointer border ${
      active
        ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
        : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/60 border-[#FFF8F0]/[0.08] hover:border-[#FFF8F0]/20"
    }`;
  const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-[18px] font-serif text-[#FFF8F0]">{habit.habitName}</h3>
            {habit.antiIdentity && (
              <p className="text-[13px] text-[#FF6B6B]/80 italic mt-0.5">
                I am NOT the type who {habit.antiIdentity}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#34D399]">{habit.currentCleanStreak}</p>
              <p className={label}>streak</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-[#FEC89A]">{habit.resistanceRate}%</p>
              <p className={label}>resist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today Stats */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
        <p className={label}>Today&apos;s battle</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[14px] text-[#34D399]">{resisted} resisted</span>
          <span className="text-[14px] text-[#FF6B6B]">{slipped} slipped</span>
          <span className="text-[14px] text-[#FFF8F0]/50">{total} total</span>
          <span className={`text-[14px] font-semibold ${winRate >= 70 ? "text-[#34D399]" : winRate >= 40 ? "text-[#FEC89A]" : "text-[#FF6B6B]"}`}>
            {winRate}% win rate
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {mode === null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => setMode("resisted")} className="p-4 bg-[#34D399]/15 border border-[#34D399]/30 rounded-2xl text-[#34D399] text-[15px] font-medium hover:bg-[#34D399]/25 transition-all">
            {"🛡\uFE0F"} Resisted!
          </button>
          <button onClick={() => setMode("slipped")} className="p-4 bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 rounded-2xl text-[#FF6B6B] text-[15px] font-medium hover:bg-[#FF6B6B]/25 transition-all">
            {"😞"} I Slipped
          </button>
          <button onClick={() => setMode("urge-now")} className="p-5 bg-[#FEC89A]/15 border border-[#FEC89A]/30 rounded-2xl text-[#FEC89A] text-[17px] font-semibold hover:bg-[#FEC89A]/25 transition-all">
            {"🆘"} Having Urge NOW
          </button>
        </div>
      )}

      {/* Resisted Form */}
      {mode === "resisted" && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <h4 className="text-[15px] text-[#34D399] font-medium">Great job resisting!</h4>
          <div>
            <p className={label}>Trigger</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_TYPES.map((t) => (
                <button key={t} onClick={() => setTrigger(t)} className={chipClass(trigger === t)}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>Urge intensity: {intensity}/10</p>
            <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-[#FF6B6B]" />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#FFF8F0]/70 cursor-pointer">
            <input type="checkbox" checked={usedReplacement} onChange={(e) => setUsedReplacement(e.target.checked)} className="accent-[#34D399]" />
            Used replacement behavior
          </label>
          <input className="w-full bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] placeholder:text-[#FFF8F0]/20" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60">Cancel</button>
            <button onClick={() => submitLog("resisted")} disabled={pending} className="px-5 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px] font-medium disabled:opacity-30">
              {pending ? "Logging..." : "Log Resistance"}
            </button>
          </div>
        </div>
      )}

      {/* Slipped Form */}
      {mode === "slipped" && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <h4 className="text-[15px] text-[#FFF8F0]/80 font-medium">No shame. Every data point helps.</h4>
          <input className="w-full bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] placeholder:text-[#FFF8F0]/20" placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} />
          <div>
            <p className={label}>Duration</p>
            <div className="flex flex-wrap gap-2">
              {SLIP_DURATIONS.map((d) => (
                <button key={d.value} onClick={() => setSlipDuration(d.value)} className={chipClass(slipDuration === d.value)}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>Trigger</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_TYPES.map((t) => (
                <button key={t} onClick={() => setTrigger(t)} className={chipClass(trigger === t)}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>Which defense layer failed? (1-4)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((l) => (
                <button key={l} onClick={() => setFailedLayer(l)} className={chipClass(failedLayer === l)}>Layer {l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>How do you feel?</p>
            <div className="flex gap-2">
              {POST_FEELINGS.map((f) => (
                <button key={f} onClick={() => setPostFeeling(f)} className={chipClass(postFeeling === f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60">Cancel</button>
            <button onClick={() => submitLog("slipped")} disabled={pending} className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium disabled:opacity-30">
              {pending ? "Logging..." : "Log & Learn"}
            </button>
          </div>
        </div>
      )}

      {/* Urge NOW Intervention */}
      {mode === "urge-now" && !urgeResolved && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FEC89A]/20 rounded-2xl p-6 space-y-5 text-center">
          {countdown > 0 ? (
            <>
              <p className="text-[48px] font-serif text-[#FEC89A]">{countdown}</p>
              <p className="text-[15px] text-[#FFF8F0]/70">Breathe. This will pass.</p>
            </>
          ) : !surfing ? (
            <>
              <p className="text-[18px] font-serif text-[#FFF8F0]">The urge is a wave. It peaks and fades.</p>
              {habit.dailyHoursEstimate && habit.hourlyValue && (
                <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl p-3">
                  <p className="text-[13px] text-[#FF6B6B]">
                    Each slip costs ~${Math.round((habit.dailyHoursEstimate * habit.hourlyValue) / 3)} of your life
                  </p>
                </div>
              )}
              {habit.replacementDescription && (
                <div className="bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl p-3">
                  <p className="text-[13px] text-[#34D399]">Try instead: {habit.replacementDescription}</p>
                </div>
              )}
              <button
                onClick={() => setSurfing(true)}
                className="px-5 py-2 bg-[#FEC89A]/20 text-[#FEC89A] border border-[#FEC89A]/30 rounded-xl text-[13px] font-medium"
              >
                Start Urge Surfing (10 min)
              </button>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => { setUrgeResolved(true); submitLog("resisted"); }} className="px-4 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px]">
                  I resisted
                </button>
                <button onClick={() => { setUrgeResolved(true); submitLog("slipped"); }} className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px]">
                  I gave in
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[14px] text-[#FFF8F0]/50 font-mono">Urge Surfing</p>
              <p className="text-[36px] font-serif text-[#FEC89A]">
                {Math.floor(surfTimer / 60)}:{String(surfTimer % 60).padStart(2, "0")}
              </p>
              {/* Wave visual */}
              <div className="h-8 flex items-end justify-center gap-[2px]">
                {Array.from({ length: 30 }).map((_, i) => {
                  const progress = 1 - surfTimer / 600;
                  const waveHeight = Math.sin((i / 30) * Math.PI * 2 + Date.now() / 500) * (1 - progress) * 16 + 8;
                  return (
                    <div
                      key={i}
                      className="w-1 bg-[#FEC89A]/40 rounded-full transition-all"
                      style={{ height: `${Math.max(4, waveHeight)}px` }}
                    />
                  );
                })}
              </div>
              <p className="text-[13px] text-[#FFF8F0]/50">Ride the wave. It will crest and fall.</p>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => { setUrgeResolved(true); submitLog("surfed"); }} className="px-4 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px]">
                  I resisted
                </button>
                <button onClick={() => { setUrgeResolved(true); submitLog("slipped"); }} className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px]">
                  I gave in
                </button>
              </div>
            </>
          )}
          <button onClick={resetForm} className="text-[12px] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50">Cancel</button>
        </div>
      )}

      {/* Post-log encouragement */}
      {urgeResolved && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 text-center space-y-2">
          <p className="text-[16px] text-[#FFF8F0]">Logged. Every battle makes you stronger.</p>
          <p className="text-[13px] text-[#FFF8F0]/50">
            Today: {resisted} resisted, {slipped} slipped ({winRate}% win rate)
          </p>
          <button onClick={resetForm} className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] mt-2">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
