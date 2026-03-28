"use client";

import { useState, useTransition } from "react";
import type { FrictionMap, FrictionStep } from "@/lib/friction";
import {
  autoDetectSteps,
  calculateFrictionScore,
} from "@/lib/friction";
import {
  createFrictionMap,
  deleteFrictionMap,
  applyFrictionChange,
} from "./friction-actions";

interface FrictionMapSectionProps {
  maps: FrictionMap[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

const FRICTION_LEVEL_COLORS: Record<string, string> = {
  high: "#FF6B6B",
  medium: "#FEC89A",
  low: "#34D399",
};

export function FrictionMapSection({ maps, onRefresh }: FrictionMapSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [habitName, setHabitName] = useState("");
  const [habitType, setHabitType] = useState<"good_habit" | "bad_habit">("good_habit");
  const [steps, setSteps] = useState<FrictionStep[]>([]);

  function handleHabitNameChange(value: string) {
    setHabitName(value);
    if (value.trim().length > 2) {
      setSteps(autoDetectSteps(value.trim(), habitType));
    }
  }

  function handleTypeToggle(type: "good_habit" | "bad_habit") {
    setHabitType(type);
    if (habitName.trim().length > 2) {
      setSteps(autoDetectSteps(habitName.trim(), type));
    }
  }

  function handleCreate() {
    if (!habitName.trim()) return;
    startTransition(async () => {
      await createFrictionMap({
        habitName: habitName.trim(),
        habitType,
        steps,
      });
      setHabitName("");
      setSteps([]);
      setShowCreate(false);
      onRefresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFrictionMap(id);
      onRefresh();
    });
  }

  if (maps.length === 0 && !showCreate) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-[32px]">🔧</p>
        <p className="text-sm text-[#FFF8F0]/50">
          Map the friction. Every step between you and a habit matters.
        </p>
        <button onClick={() => setShowCreate(true)} className={BTN}>
          + New Friction Map
        </button>
      </div>
    );
  }

  const liveScore = calculateFrictionScore(steps, [], []);

  return (
    <div className="space-y-6">
      {!showCreate && (
        <button onClick={() => setShowCreate(true)} className={BTN}>
          + New Friction Map
        </button>
      )}

      {showCreate && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <label className={LABEL}>Habit Name</label>
          <input className={INPUT} placeholder="e.g. Go to gym" value={habitName} onChange={(e) => handleHabitNameChange(e.target.value)} />
          <div>
            <p className={LABEL}>Type</p>
            <div className="flex gap-2 mt-1">
              {(["good_habit", "bad_habit"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeToggle(t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
                    habitType === t
                      ? t === "good_habit"
                        ? "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30"
                        : "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.06]"
                  }`}
                >
                  {t === "good_habit" ? "Good Habit (reduce)" : "Bad Habit (add)"}
                </button>
              ))}
            </div>
          </div>

          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className={LABEL}>Detected Steps</p>
                <span className="text-[11px] font-mono" style={{ color: liveScore < 40 ? "#34D399" : liveScore < 70 ? "#FEC89A" : "#FF6B6B" }}>
                  Score: {liveScore}
                </span>
              </div>
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#FFF8F0]/[0.02] rounded-lg">
                  <span className="text-[10px] font-mono text-[#FFF8F0]/30">{i + 1}.</span>
                  <span className="text-[12px] text-[#FFF8F0]/70 flex-1">{s.description}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: FRICTION_LEVEL_COLORS[s.frictionLevel], borderColor: FRICTION_LEVEL_COLORS[s.frictionLevel] + "44" }}>
                    {s.frictionLevel}
                  </span>
                  {s.canEliminate && <span className="text-[10px] text-[#34D399]/50">eliminable</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending || !habitName.trim()} className={BTN}>
              {isPending ? "Creating..." : "Create Map"}
            </button>
            <button onClick={() => { setShowCreate(false); setSteps([]); setHabitName(""); }} className="px-4 py-2 text-[11px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Map cards */}
      {maps.map((m) => (
        <FrictionMapCard key={m.id} map={m} onDelete={() => handleDelete(m.id)} onRefresh={onRefresh} isPending={isPending} />
      ))}
    </div>
  );
}

/* ── Friction Map Card ── */

function FrictionMapCard({ map, onDelete, onRefresh, isPending: parentPending }: {
  map: FrictionMap; onDelete: () => void; onRefresh: () => void; isPending: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddChange, setShowAddChange] = useState(false);
  const [changeAction, setChangeAction] = useState("");
  const [changeImpact, setChangeImpact] = useState<"low" | "medium" | "high">("medium");

  const isGood = map.habitType === "good_habit";
  const scoreColor = isGood
    ? map.frictionScore < 30 ? "#34D399" : map.frictionScore < 60 ? "#FEC89A" : "#FF6B6B"
    : map.frictionScore > 60 ? "#34D399" : map.frictionScore > 30 ? "#FEC89A" : "#FF6B6B";

  function handleApplyChange() {
    if (!changeAction.trim()) return;
    startTransition(async () => {
      await applyFrictionChange(map.id, {
        type: isGood ? "reduce" : "add",
        action: changeAction.trim(),
        impact: changeImpact,
      });
      setChangeAction("");
      setShowAddChange(false);
      onRefresh();
    });
  }

  const activeReducers = map.frictionReducers?.filter((r) => r.status === "active") || [];
  const activeAdders = map.frictionAdders?.filter((a) => a.status === "active") || [];

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#FFF8F0]">{map.habitName}</h3>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isGood ? "text-[#34D399] border-[#34D399]/30" : "text-[#FF6B6B] border-[#FF6B6B]/30"}`}>
            {isGood ? "reduce" : "add"}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ color: scoreColor, backgroundColor: scoreColor + "15" }}>
            {map.frictionScore}
          </span>
        </div>
        <button onClick={onDelete} disabled={parentPending} className="text-[10px] font-mono text-[#FFF8F0]/20 hover:text-[#FF6B6B] transition-colors">
          delete
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {map.stepsList.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.isEliminated ? "opacity-40" : ""}`}>
            <span className="text-[10px] font-mono text-[#FFF8F0]/30">{i + 1}.</span>
            <span className={`text-[12px] text-[#FFF8F0]/70 flex-1 ${s.isEliminated ? "line-through" : ""}`}>
              {s.description}
            </span>
            <span className="text-[10px] font-mono" style={{ color: FRICTION_LEVEL_COLORS[s.frictionLevel] }}>
              {s.frictionLevel}
            </span>
            {s.timeSeconds > 0 && (
              <span className="text-[10px] font-mono text-[#FFF8F0]/20">{Math.round(s.timeSeconds / 60)}m</span>
            )}
          </div>
        ))}
      </div>

      {/* Active changes */}
      {(activeReducers.length > 0 || activeAdders.length > 0) && (
        <div className="flex gap-1 flex-wrap">
          {activeReducers.map((r, i) => (
            <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-[#34D399]/10 text-[#34D399]/70 rounded-full">
              {r.action}
            </span>
          ))}
          {activeAdders.map((a, i) => (
            <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-[#FF6B6B]/10 text-[#FF6B6B]/70 rounded-full">
              +{a.action}
            </span>
          ))}
        </div>
      )}

      {/* Add change */}
      {!showAddChange ? (
        <button onClick={() => setShowAddChange(true)} className="text-[10px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 transition-colors">
          + {isGood ? "Remove friction" : "Add friction"}
        </button>
      ) : (
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className={LABEL}>Action</label>
            <input className={INPUT} placeholder={isGood ? "e.g. Lay out clothes night before" : "e.g. Delete app"} value={changeAction} onChange={(e) => setChangeAction(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Impact</label>
            <div className="flex gap-1 mt-1">
              {(["low", "medium", "high"] as const).map((imp) => (
                <button key={imp} onClick={() => setChangeImpact(imp)} className={`px-2 py-1.5 text-[10px] font-mono rounded-lg border transition-colors ${changeImpact === imp ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30" : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.06]"}`}>
                  {imp}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleApplyChange} disabled={isPending} className={BTN}>
            {isPending ? "..." : "Apply"}
          </button>
          <button onClick={() => setShowAddChange(false)} className="text-[11px] font-mono text-[#FFF8F0]/30 pb-2">cancel</button>
        </div>
      )}
    </div>
  );
}
