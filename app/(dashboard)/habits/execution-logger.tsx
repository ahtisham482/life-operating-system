"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Blueprint, HabitChain } from "@/lib/architect";
import { getBlueprints, getChains } from "./architect-actions";
import {
  getTodayExecutions,
  logBlueprintExecution,
  logChainExecution,
  type BlueprintExecution,
} from "./execution-actions";
import { ExecutionCard, type ExpandedState } from "./execution-card";

interface ChainWithBlueprints extends HabitChain {
  blueprints: Blueprint[];
}

export function ExecutionLogger() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [chains, setChains] = useState<ChainWithBlueprints[]>([]);
  const [executions, setExecutions] = useState<BlueprintExecution[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({});
  const [chainFlow, setChainFlow] = useState<Record<string, { rating: number; auto: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const [bp, ch, ex] = await Promise.all([
      getBlueprints(),
      getChains(),
      getTodayExecutions(),
    ]);
    setBlueprints(bp);
    setChains(ch as ChainWithBlueprints[]);
    setExecutions(ex);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const executionMap = new Map(executions.map((e) => [e.blueprintId, e]));
  const chainBpIds = new Set(chains.flatMap((c) => c.blueprints.map((b) => b.id)));
  const standaloneBps = blueprints.filter((bp) => !chainBpIds.has(bp.id));

  function getStatus(bpId: string): "pending" | "completed" | "skipped" {
    const ex = executionMap.get(bpId);
    if (!ex) return "pending";
    return ex.status === "skipped" ? "skipped" : "completed";
  }

  function clearExpanded(bpId: string) {
    setExpanded((prev) => { const n = { ...prev }; delete n[bpId]; return n; });
  }

  function handleTwoMin(bp: Blueprint) {
    startTransition(async () => {
      await logBlueprintExecution({
        blueprintId: bp.id,
        chainId: bp.chainId || undefined,
        status: "two_minute",
        plannedTime: bp.intentionTime || undefined,
      });
      clearExpanded(bp.id);
      await loadData();
    });
  }

  function submitDone(bp: Blueprint) {
    const state = expanded[bp.id];
    if (!state) return;
    startTransition(async () => {
      await logBlueprintExecution({
        blueprintId: bp.id,
        chainId: bp.chainId || undefined,
        status: "completed",
        plannedTime: bp.intentionTime || undefined,
        actualTime: state.actualTime || undefined,
        difficulty: state.difficulty || undefined,
        satisfaction: state.satisfaction || undefined,
        note: state.note || undefined,
        anchorCompleted: bp.stackAnchorBlueprintId
          ? executionMap.has(bp.stackAnchorBlueprintId)
          : undefined,
      });
      clearExpanded(bp.id);
      await loadData();
    });
  }

  function submitSkip(bp: Blueprint) {
    const state = expanded[bp.id];
    if (!state || !state.skipReason) return;
    startTransition(async () => {
      await logBlueprintExecution({
        blueprintId: bp.id,
        chainId: bp.chainId || undefined,
        status: "skipped",
        skipReason: state.skipReason,
      });
      clearExpanded(bp.id);
      await loadData();
    });
  }

  function submitChainComplete(chainId: string) {
    const flow = chainFlow[chainId];
    if (!flow) return;
    startTransition(async () => {
      await logChainExecution({ chainId, flowRating: flow.rating, feltAutomatic: flow.auto });
      setChainFlow((prev) => { const n = { ...prev }; delete n[chainId]; return n; });
    });
  }

  function updateExpanded(bpId: string, patch: Partial<ExpandedState>) {
    setExpanded((prev) => ({
      ...prev,
      [bpId]: { ...prev[bpId], ...patch } as ExpandedState,
    }));
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (blueprints.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">📋</p>
        <p className="text-[12px] font-mono text-[#FFF8F0]/40">
          Create blueprints first, then execute them here
        </p>
      </div>
    );
  }

  function renderCard(bp: Blueprint) {
    const anchorDone = bp.stackAnchorBlueprintId
      ? executionMap.has(bp.stackAnchorBlueprintId) : null;
    return (
      <ExecutionCard
        key={bp.id}
        bp={bp}
        status={getStatus(bp.id)}
        expanded={expanded[bp.id]}
        anchorDone={anchorDone}
        isPending={isPending}
        onDone={() => setExpanded((p) => ({ ...p, [bp.id]: { type: "done" } }))}
        onTwoMin={() => handleTwoMin(bp)}
        onSkip={() => setExpanded((p) => ({ ...p, [bp.id]: { type: "skip" } }))}
        onSubmitDone={() => submitDone(bp)}
        onSubmitSkip={() => submitSkip(bp)}
        onCancel={() => clearExpanded(bp.id)}
        onUpdate={(patch) => updateExpanded(bp.id, patch)}
      />
    );
  }

  const completedCount = executions.filter((e) => e.status !== "skipped").length;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
            Today&apos;s progress
          </p>
          <p className="text-[12px] font-mono text-[#FFF8F0]/60">
            {completedCount} / {blueprints.length}
          </p>
        </div>
        <div className="h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#34D399]/60 rounded-full transition-all duration-500"
            style={{ width: `${blueprints.length > 0 ? (completedCount / blueprints.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Chains */}
      {chains.filter((c) => c.blueprints.length > 0).map((chain) => {
        const allDone = chain.blueprints.every((bp) => getStatus(bp.id) !== "pending");
        const doneCount = chain.blueprints.filter((bp) => getStatus(bp.id) !== "pending").length;
        const flow = chainFlow[chain.id];

        return (
          <div key={chain.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm">{chain.chainIcon}</span>
              <p className="text-[12px] font-serif text-[#FFF8F0]/70 flex-1">{chain.chainName}</p>
              {chain.chainTrigger && (
                <p className="text-[10px] font-mono text-[#FFF8F0]/30">{chain.chainTrigger}</p>
              )}
            </div>
            <div className="h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden mx-1 mb-1">
              <div
                className="h-full bg-[#FF6B6B]/50 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / chain.blueprints.length) * 100}%` }}
              />
            </div>
            <div className="relative pl-4 space-y-2">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#FFF8F0]/[0.08]" />
              {chain.blueprints.map((bp, i) => {
                const st = getStatus(bp.id);
                const isNext = st === "pending" && (i === 0 || getStatus(chain.blueprints[i - 1].id) !== "pending");
                return (
                  <div key={bp.id} className="relative">
                    <div className={`absolute left-[-13px] top-4 w-2 h-2 rounded-full border ${
                      st === "completed" ? "bg-[#34D399] border-[#34D399]/50" :
                      st === "skipped" ? "bg-[#F87171] border-[#F87171]/50" :
                      isNext ? "bg-[#FF6B6B] border-[#FF6B6B]/50 animate-pulse" :
                      "bg-[#FFF8F0]/10 border-[#FFF8F0]/20"
                    }`} />
                    {isNext && (
                      <span className="absolute left-[-37px] top-3 text-[9px] font-mono text-[#FF6B6B]/60 uppercase">
                        next
                      </span>
                    )}
                    {renderCard(bp)}
                  </div>
                );
              })}
            </div>
            {allDone && !flow && (
              <ChainCompletePanel
                chainId={chain.id}
                flow={chainFlow[chain.id]}
                isPending={isPending}
                onFlowChange={(rating) => setChainFlow((p) => ({ ...p, [chain.id]: { rating, auto: p[chain.id]?.auto ?? false } }))}
                onAutoToggle={() => setChainFlow((p) => ({ ...p, [chain.id]: { ...p[chain.id], auto: !p[chain.id]?.auto } }))}
                onSubmit={() => submitChainComplete(chain.id)}
              />
            )}
          </div>
        );
      })}

      {/* Standalone blueprints */}
      {standaloneBps.length > 0 && (
        <div className="space-y-2">
          {chains.some((c) => c.blueprints.length > 0) && (
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider px-1">
              Standalone habits
            </p>
          )}
          {standaloneBps.map((bp) => renderCard(bp))}
        </div>
      )}
    </div>
  );
}

function ChainCompletePanel({ chainId, flow, isPending, onFlowChange, onAutoToggle, onSubmit }: {
  chainId: string;
  flow: { rating: number; auto: boolean } | undefined;
  isPending: boolean;
  onFlowChange: (n: number) => void;
  onAutoToggle: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-[#34D399]/10 border border-[#34D399]/20 rounded-2xl p-4 space-y-3">
      <p className="text-[12px] font-mono text-[#34D399]">Chain complete! Rate your flow:</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onFlowChange(n)} className={`w-8 h-8 rounded-lg text-[12px] font-mono ${flow?.rating === n ? "bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08]"}`}>
            {n}
          </button>
        ))}
      </div>
      <button onClick={onAutoToggle} className={`px-3 py-1.5 rounded-xl text-[11px] font-mono transition-colors ${flow?.auto ? "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08]"}`}>
        {flow?.auto ? "Felt automatic" : "Felt automatic?"}
      </button>
      <button onClick={onSubmit} disabled={!flow?.rating || isPending} className="w-full px-3 py-2 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25 rounded-xl text-[11px] font-mono hover:bg-[#34D399]/25 transition-colors disabled:opacity-40">
        {isPending ? "Saving..." : "Save chain rating"}
      </button>
    </div>
  );
}
