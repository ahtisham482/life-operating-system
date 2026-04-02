"use client";

import { useState, useTransition } from "react";
import type { Gateway } from "@/lib/friction";
import {
  PHASE_COLORS,
  generatePhases,
} from "@/lib/friction";
import type { PhaseDefinition } from "@/lib/friction";
import { GatewayCard } from "./gateway-card";
import {
  createGateway,
  deleteGateway,
  logGatewayExecution,
  levelUp,
  levelDown,
} from "./friction-actions";
import { EmptyState } from "./empty-state";

interface GatewaySectionProps {
  gateways: Gateway[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

export function GatewaySection({ gateways, onRefresh }: GatewaySectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ultimateHabit, setUltimateHabit] = useState("");
  const [phases, setPhases] = useState<PhaseDefinition[]>([]);
  const [logGatewayId, setLogGatewayId] = useState<string | null>(null);
  const [feltEasy, setFeltEasy] = useState(false);
  const [feltAutomatic, setFeltAutomatic] = useState(false);
  const [wantedMore, setWantedMore] = useState(false);
  const [resistance, setResistance] = useState(3);

  function handleHabitChange(value: string) {
    setUltimateHabit(value);
    if (value.trim().length > 2) {
      setPhases(generatePhases(value.trim()));
    } else {
      setPhases([]);
    }
  }

  function updatePhase(idx: number, field: keyof PhaseDefinition, value: string | number) {
    setPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function handleCreate() {
    if (!ultimateHabit.trim() || phases.length < 5) return;
    if (phases[0].durationValue > 2) return;
    startTransition(async () => {
      await createGateway({
        ultimateHabit: ultimateHabit.trim(),
        phases,
      });
      setUltimateHabit("");
      setPhases([]);
      setShowCreate(false);
      onRefresh();
    });
  }

  function handleLog(gw: Gateway, action: "completed" | "two_min" | "skipped") {
    startTransition(async () => {
      await logGatewayExecution({
        gatewayId: gw.id,
        completed: action === "completed" || action === "two_min",
        feltEasy: action === "completed" ? feltEasy || undefined : undefined,
        feltAutomatic: action === "completed" ? feltAutomatic || undefined : undefined,
        wantedToDoMore: action === "completed" ? wantedMore || undefined : undefined,
        resistanceLevel: action === "completed" ? resistance || undefined : undefined,
      });
      setLogGatewayId(null);
      setFeltEasy(false);
      setFeltAutomatic(false);
      setWantedMore(false);
      setResistance(3);
      onRefresh();
    });
  }

  function handleLevelUp(id: string) {
    startTransition(async () => {
      await levelUp(id);
      onRefresh();
    });
  }

  function handleLevelDown(id: string) {
    startTransition(async () => {
      await levelDown(id);
      onRefresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteGateway(id);
      onRefresh();
    });
  }

  if (gateways.length === 0 && !showCreate) {
    return (
      <EmptyState
        icon="🚪"
        title="Start impossibly small"
        description="Every big habit starts with a 2-minute gateway. Scale up only when it feels automatic. This prevents the #1 reason people quit: starting too big."
        principle="A habit must be established before it can be improved."
        actionLabel="Create first gateway"
        onAction={() => setShowCreate(true)}
        compact
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Create toggle */}
      {!showCreate && (
        <button onClick={() => setShowCreate(true)} className={BTN}>
          + New Gateway
        </button>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <label className={LABEL}>What&apos;s the full habit you want to build?</label>
          <input
            className={INPUT}
            placeholder="e.g. Run 5km every morning"
            value={ultimateHabit}
            onChange={(e) => handleHabitChange(e.target.value)}
          />
          {phases.length === 5 && (
            <div className="space-y-3">
              <p className={LABEL}>5-Phase Progression</p>
              <p className="text-[10px] text-[#FFF8F0]/25 mb-2">
                Start with a 2-minute version (Phase 1) and gradually increase. Each phase should feel only slightly harder.
              </p>
              {phases.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0"
                    style={{ backgroundColor: PHASE_COLORS[i + 1] + "33", color: PHASE_COLORS[i + 1] }}
                  >
                    {i + 1}
                  </span>
                  <input
                    className={INPUT + " !mt-0"}
                    value={p.description}
                    onChange={(e) => updatePhase(i, "description", e.target.value)}
                  />
                  <input
                    className={INPUT + " !mt-0 !w-20"}
                    type="number"
                    value={p.targetDays}
                    onChange={(e) => updatePhase(i, "targetDays", parseInt(e.target.value) || 14)}
                    title="Target days"
                  />
                  <span className="text-[10px] font-mono text-[#FFF8F0]/30 shrink-0">days</span>
                </div>
              ))}
              {phases[0].durationValue > 2 && (
                <p className="text-[11px] text-[#FF6B6B]">Phase 1 must be 2 minutes or less</p>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreate} disabled={isPending || phases[0].durationValue > 2} className={BTN}>
                  {isPending ? "Creating..." : "Create Gateway"}
                </button>
                <button onClick={() => { setShowCreate(false); setPhases([]); setUltimateHabit(""); }} className="px-4 py-2 text-[11px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gateway cards */}
      {gateways.map((gw) => (
        <GatewayCard
          key={gw.id}
          gw={gw}
          isLogging={logGatewayId === gw.id}
          onStartLog={() => setLogGatewayId(gw.id)}
          onLog={(status) => handleLog(gw, status)}
          onCancelLog={() => setLogGatewayId(null)}
          feltEasy={feltEasy}
          feltAutomatic={feltAutomatic}
          wantedMore={wantedMore}
          resistance={resistance}
          onFeltEasy={setFeltEasy}
          onFeltAutomatic={setFeltAutomatic}
          onWantedMore={setWantedMore}
          onResistance={setResistance}
          onLevelUp={() => handleLevelUp(gw.id)}
          onLevelDown={() => handleLevelDown(gw.id)}
          onDelete={() => handleDelete(gw.id)}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

