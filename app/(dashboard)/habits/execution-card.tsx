"use client";

import type { Blueprint } from "@/lib/architect";
import { formatTime, getCategoryIcon } from "@/lib/architect";

type Difficulty = "easy" | "moderate" | "hard" | "struggled";
type SkipReason = "forgot" | "no_time" | "no_motivation" | "broken_chain" | "environment_not_ready";

export interface ExpandedState {
  type: "done" | "skip";
  difficulty?: Difficulty;
  satisfaction?: number;
  actualTime?: string;
  note?: string;
  skipReason?: SkipReason;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "struggled", label: "Struggled" },
];

const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: "forgot", label: "Forgot" },
  { value: "no_time", label: "No time" },
  { value: "no_motivation", label: "No motivation" },
  { value: "broken_chain", label: "Broken chain" },
  { value: "environment_not_ready", label: "Environment not ready" },
];

interface ExecutionCardProps {
  bp: Blueprint;
  status: "pending" | "completed" | "skipped";
  expanded: ExpandedState | undefined;
  anchorDone: boolean | null;
  isPending: boolean;
  onDone: () => void;
  onTwoMin: () => void;
  onSkip: () => void;
  onSubmitDone: () => void;
  onSubmitSkip: () => void;
  onCancel: () => void;
  onUpdate: (patch: Partial<ExpandedState>) => void;
}

export function ExecutionCard({
  bp, status, expanded: exp, anchorDone, isPending,
  onDone, onTwoMin, onSkip, onSubmitDone, onSubmitSkip, onCancel, onUpdate,
}: ExecutionCardProps) {
  const icon = bp.habitIcon || getCategoryIcon(bp.habitCategory);

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-serif text-[#FFF8F0]/90 truncate">{bp.habitName}</p>
          {bp.intentionTime && (
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
              {formatTime(bp.intentionTime)}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {bp.stackAnchorDescription && (
        <p className="text-[11px] font-mono text-[#FFF8F0]/40 flex items-center gap-1.5">
          <span>After {bp.stackAnchorDescription}</span>
          {anchorDone !== null && (
            <span className={anchorDone ? "text-[#34D399]" : "text-[#FFF8F0]/20"}>
              {anchorDone ? "done" : "pending"}
            </span>
          )}
        </p>
      )}

      {bp.environmentCue && (
        <p className="text-[11px] font-mono text-[#FEC89A]/60">Cue: {bp.environmentCue}</p>
      )}

      {status === "pending" && !exp && (
        <div className="flex gap-2 pt-1">
          <button onClick={onDone} disabled={isPending} className="flex-1 px-3 py-1.5 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25 rounded-xl text-[11px] font-mono hover:bg-[#34D399]/25 transition-colors">
            Done
          </button>
          <button onClick={onTwoMin} disabled={isPending} className="flex-1 px-3 py-1.5 bg-[#FEC89A]/15 text-[#FEC89A] border border-[#FEC89A]/25 rounded-xl text-[11px] font-mono hover:bg-[#FEC89A]/25 transition-colors">
            2-min
          </button>
          <button onClick={onSkip} disabled={isPending} className="flex-1 px-3 py-1.5 bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08] rounded-xl text-[11px] font-mono hover:text-[#FFF8F0]/60 transition-colors">
            Skip
          </button>
        </div>
      )}

      {exp?.type === "done" && (
        <div className="space-y-3 pt-1 border-t border-[#FFF8F0]/[0.06]">
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Actual time</label>
            <input type="time" value={exp.actualTime || ""} onChange={(e) => onUpdate({ actualTime: e.target.value || undefined })} className="w-full mt-1 px-3 py-1.5 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-[12px] font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Difficulty</label>
            <div className="flex gap-1.5 mt-1">
              {DIFFICULTY_OPTIONS.map((d) => (
                <button key={d.value} onClick={() => onUpdate({ difficulty: d.value })} className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${exp.difficulty === d.value ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08]"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Satisfaction</label>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => onUpdate({ satisfaction: n })} className={`w-8 h-8 rounded-lg text-[12px] font-mono transition-colors ${exp.satisfaction === n ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08]"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <input placeholder="Optional note..." value={exp.note || ""} onChange={(e) => onUpdate({ note: e.target.value || undefined })} className="w-full px-3 py-1.5 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-[12px] font-mono placeholder:text-[#FFF8F0]/20" />
          <div className="flex gap-2">
            <button onClick={onSubmitDone} disabled={isPending} className="flex-1 px-3 py-1.5 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25 rounded-xl text-[11px] font-mono hover:bg-[#34D399]/25 transition-colors">
              {isPending ? "Saving..." : "Log completion"}
            </button>
            <button onClick={onCancel} className="px-3 py-1.5 bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08] rounded-xl text-[11px] font-mono">
              Cancel
            </button>
          </div>
        </div>
      )}

      {exp?.type === "skip" && (
        <div className="space-y-3 pt-1 border-t border-[#FFF8F0]/[0.06]">
          <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Why are you skipping?</label>
          <div className="flex flex-wrap gap-1.5">
            {SKIP_REASONS.map((r) => (
              <button key={r.value} onClick={() => onUpdate({ skipReason: r.value })} className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-colors ${exp.skipReason === r.value ? "bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08]"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onSubmitSkip} disabled={isPending || !exp.skipReason} className="flex-1 px-3 py-1.5 bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/25 rounded-xl text-[11px] font-mono hover:bg-[#F87171]/25 transition-colors disabled:opacity-40">
              {isPending ? "Saving..." : "Log skip"}
            </button>
            <button onClick={onCancel} className="px-3 py-1.5 bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08] rounded-xl text-[11px] font-mono">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "completed" | "skipped" }) {
  const styles = {
    pending: "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40",
    completed: "bg-[#34D399]/15 text-[#34D399]",
    skipped: "bg-[#F87171]/15 text-[#F87171]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}
