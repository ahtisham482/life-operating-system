"use client";

import type { Gateway } from "@/lib/friction";
import {
  PHASE_LABELS,
  PHASE_COLORS,
  getPhaseDescription,
  getPhaseTargetDays,
  getPhaseDaysDone,
} from "@/lib/friction";

const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

export interface GatewayCardProps {
  gw: Gateway;
  isLogging: boolean;
  onStartLog: () => void;
  onLog: (status: "completed" | "two_min" | "skipped") => void;
  onCancelLog: () => void;
  feltEasy: boolean;
  feltAutomatic: boolean;
  wantedMore: boolean;
  resistance: number;
  onFeltEasy: (v: boolean) => void;
  onFeltAutomatic: (v: boolean) => void;
  onWantedMore: (v: boolean) => void;
  onResistance: (v: number) => void;
  onLevelUp: () => void;
  onLevelDown: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export function GatewayCard({
  gw, isLogging, onStartLog, onLog, onCancelLog,
  feltEasy, feltAutomatic, wantedMore, resistance,
  onFeltEasy, onFeltAutomatic, onWantedMore, onResistance,
  onLevelUp, onLevelDown, onDelete, isPending,
}: GatewayCardProps) {
  const phase = gw.currentPhase;
  const daysDone = getPhaseDaysDone(gw, phase);
  const targetDays = getPhaseTargetDays(gw, phase);
  const progress = targetDays > 0 ? Math.min(100, Math.round((daysDone / targetDays) * 100)) : 0;
  const canLevelUp = phase < 5 && daysDone >= Math.round(targetDays * 0.7);

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#FFF8F0]">{gw.ultimateHabit}</h3>
        <button onClick={onDelete} disabled={isPending} className="text-[10px] font-mono text-[#FFF8F0]/20 hover:text-[#FF6B6B] transition-colors">
          delete
        </button>
      </div>

      {/* 5-phase progression */}
      <div className="flex items-center gap-0">
        {[1, 2, 3, 4, 5].map((p) => (
          <div key={p} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono border-2 transition-all"
                style={{
                  borderColor: PHASE_COLORS[p],
                  backgroundColor: p <= phase ? PHASE_COLORS[p] + "33" : "transparent",
                  color: p <= phase ? PHASE_COLORS[p] : PHASE_COLORS[p] + "55",
                  boxShadow: p === phase ? `0 0 12px ${PHASE_COLORS[p]}44` : "none",
                }}
              >
                {p < phase ? "\u2713" : p}
              </div>
              <span className="text-[11px] font-mono mt-1" style={{ color: PHASE_COLORS[p] + (p === phase ? "cc" : "55") }}>
                {PHASE_LABELS[p]}
              </span>
            </div>
            {p < 5 && (
              <div className="h-0.5 w-full" style={{ backgroundColor: p < phase ? PHASE_COLORS[p] + "66" : "#FFF8F0" + "0a" }} />
            )}
          </div>
        ))}
      </div>

      {/* Current phase details */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl p-4 space-y-3" style={{ borderColor: PHASE_COLORS[phase] + "22" }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono" style={{ color: PHASE_COLORS[phase] }}>
            Phase {phase}: {PHASE_LABELS[phase]}
          </span>
          <span className="text-[10px] font-mono text-[#FFF8F0]/30">
            {daysDone} / {targetDays} days
          </span>
        </div>
        <p className="text-sm text-[#FFF8F0]/70">{getPhaseDescription(gw, phase)}</p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: PHASE_COLORS[phase] }}
          />
        </div>

        {/* Today buttons */}
        {!isLogging ? (
          <div className="flex gap-2 flex-wrap">
            <button onClick={onStartLog} className={BTN}>Today: Done</button>
            <button onClick={() => onLog("two_min")} disabled={isPending} className="px-3 py-2 bg-[#FEC89A]/15 text-[#FEC89A] border border-[#FEC89A]/25 rounded-xl text-[11px] font-mono hover:bg-[#FEC89A]/25 transition-colors">
              2-min version
            </button>
            <button onClick={() => onLog("skipped")} disabled={isPending} className="px-3 py-2 text-[#FFF8F0]/25 border border-[#FFF8F0]/[0.06] rounded-xl text-[11px] font-mono hover:text-[#FFF8F0]/40 transition-colors">
              Skip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={LABEL}>How did it feel?</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Felt easy", value: feltEasy, set: onFeltEasy },
                { label: "Felt automatic", value: feltAutomatic, set: onFeltAutomatic },
                { label: "Wanted to do more", value: wantedMore, set: onWantedMore },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => t.set(!t.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
                    t.value
                      ? "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30"
                      : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.06] hover:text-[#FFF8F0]/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <p className={LABEL}>Resistance (1-5)</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => onResistance(r)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-mono border transition-colors ${
                      resistance === r
                        ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
                        : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.06] hover:text-[#FFF8F0]/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onLog("completed")} disabled={isPending} className={BTN}>
                {isPending ? "Saving..." : "Log Done"}
              </button>
              <button onClick={onCancelLog} className="text-[11px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Level Up / Down + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {phase > 1 && (
            <button onClick={onLevelDown} disabled={isPending} className="px-3 py-1.5 text-[10px] font-mono text-[#FEC89A]/60 border border-[#FEC89A]/20 rounded-lg hover:bg-[#FEC89A]/10 transition-colors">
              Level Down
            </button>
          )}
          {canLevelUp && (
            <button onClick={onLevelUp} disabled={isPending} className="px-3 py-1.5 text-[10px] font-mono text-[#34D399] border border-[#34D399]/30 rounded-lg hover:bg-[#34D399]/10 transition-colors">
              Level Up
            </button>
          )}
        </div>
        <div className="flex gap-4 text-[10px] font-mono text-[#FFF8F0]/30">
          <span>{"\u2191"} {gw.totalLevelUps}</span>
          <span>{"\u2193"} {gw.totalLevelDowns}</span>
          <span>{daysDone}d in phase</span>
        </div>
      </div>
    </div>
  );
}
