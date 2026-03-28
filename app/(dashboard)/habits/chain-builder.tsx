"use client";

import { useState, useTransition } from "react";
import {
  HabitChain,
  Blueprint,
  CHAIN_TEMPLATES,
  getCategoryIcon,
} from "@/lib/architect";
import { createChain, addBlueprintToChain } from "./architect-actions";

interface ChainBuilderProps {
  chains: HabitChain[];
  blueprints: Blueprint[];
  onRefresh: () => void;
}

export function ChainBuilder({ chains, blueprints, onRefresh }: ChainBuilderProps) {
  const [showCreate, setShowCreate] = useState(false);

  if (chains.length === 0 && !showCreate) {
    return (
      <div className="space-y-6">
        <div className="text-center py-10">
          <p className="text-3xl mb-3">⛓️</p>
          <h3 className="text-sm font-serif text-[#FFF8F0]/80 mb-1">
            Create your first chain
          </h3>
          <p className="text-[11px] text-[#FFF8F0]/40 font-mono max-w-xs mx-auto">
            Chain habits together so completing one triggers the next.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors"
          >
            New Chain
          </button>
        </div>

        {/* Templates */}
        <div>
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-3">
            Start from a template
          </p>
          <div className="grid gap-3">
            {CHAIN_TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.name} template={tpl} onSelect={() => setShowCreate(true)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          {chains.length} chain{chains.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[10px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors"
        >
          + New Chain
        </button>
      </div>

      {chains.map((chain) => (
        <ChainDisplay key={chain.id} chain={chain} blueprints={blueprints} onRefresh={onRefresh} />
      ))}

      {showCreate && (
        <CreateChainModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

/* ── Chain display ── */

function ChainDisplay({
  chain,
  blueprints,
  onRefresh,
}: {
  chain: HabitChain;
  blueprints: Blueprint[];
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddLink, setShowAddLink] = useState(false);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");

  const chainBlueprints = blueprints
    .filter((bp) => bp.chainId === chain.id)
    .sort((a, b) => (a.chainPosition ?? 0) - (b.chainPosition ?? 0));

  const unlinked = blueprints.filter((bp) => !bp.chainId);

  function handleAddLink() {
    if (!selectedBlueprintId) return;
    startTransition(async () => {
      await addBlueprintToChain(selectedBlueprintId, chain.id, chainBlueprints.length + 1);
      setSelectedBlueprintId("");
      setShowAddLink(false);
      onRefresh();
    });
  }

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-4">
      {/* Chain header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{chain.chainIcon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-serif text-[#FFF8F0]/90">{chain.chainName}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {chain.chainTrigger && (
              <span className="text-[10px] font-mono text-[#FFF8F0]/30">
                Trigger: {chain.chainTrigger}
              </span>
            )}
            {chain.primaryLocation && (
              <span className="text-[10px] font-mono text-[#FFF8F0]/20">
                {chain.primaryLocation}
              </span>
            )}
            {chain.startTime && (
              <span className="text-[10px] font-mono text-[#FFF8F0]/20">
                {chain.startTime}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#FFF8F0]/30 px-2 py-0.5 bg-[#FFF8F0]/[0.03] rounded-lg">
          {chainBlueprints.length} links
        </span>
      </div>

      {/* Visual chain links */}
      {chainBlueprints.length > 0 && (
        <div className="space-y-0">
          {chainBlueprints.map((bp, i) => (
            <div key={bp.id} className="flex gap-3">
              {/* Vertical connector */}
              <div className="flex flex-col items-center w-6 shrink-0">
                <div className="w-5 h-5 rounded-full bg-[#FF6B6B]/20 border border-[#FF6B6B]/30 flex items-center justify-center text-[9px] font-mono text-[#FF6B6B] shrink-0">
                  {i + 1}
                </div>
                {i < chainBlueprints.length - 1 && (
                  <div className="w-px flex-1 bg-[#FF6B6B]/15 my-0.5" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{getCategoryIcon(bp.habitCategory)}</span>
                  <span className="text-[12px] text-[#FFF8F0]/70 truncate">{bp.habitName}</span>
                </div>
                {bp.stackStatement && (
                  <p className="text-[10px] font-mono text-[#FFF8F0]/25 mt-0.5 italic">
                    {bp.stackStatement}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add link */}
      {showAddLink ? (
        <div className="flex gap-2">
          <select
            value={selectedBlueprintId}
            onChange={(e) => setSelectedBlueprintId(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] focus:outline-none focus:border-[#FF6B6B]/40"
          >
            <option value="">Select blueprint...</option>
            {unlinked.map((bp) => (
              <option key={bp.id} value={bp.id}>{bp.habitName}</option>
            ))}
          </select>
          <button
            onClick={handleAddLink}
            disabled={isPending || !selectedBlueprintId}
            className="px-3 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[11px] font-mono disabled:opacity-30"
          >
            {isPending ? "..." : "Add"}
          </button>
          <button
            onClick={() => setShowAddLink(false)}
            className="px-3 py-2 text-[#FFF8F0]/30 text-[11px] font-mono"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddLink(true)}
          className="w-full py-2 border border-dashed border-[#FFF8F0]/[0.08] rounded-xl text-[10px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 hover:border-[#FFF8F0]/[0.15] transition-colors"
        >
          + Add Link
        </button>
      )}
    </div>
  );
}

/* ── Template card ── */

function TemplateCard({
  template,
  onSelect,
}: {
  template: (typeof CHAIN_TEMPLATES)[number];
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl hover:border-[#FFF8F0]/[0.1] transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{template.icon}</span>
        <span className="text-sm font-serif text-[#FFF8F0]/80">{template.name}</span>
        <span className="ml-auto text-[10px] font-mono text-[#FFF8F0]/25">
          {template.timeOfDay}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {template.habits.map((h) => (
          <span
            key={h.name}
            className="px-2 py-0.5 text-[10px] font-mono text-[#FFF8F0]/40 bg-[#FFF8F0]/[0.03] rounded-lg"
          >
            {h.icon} {h.name}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ── Create chain modal ── */

function CreateChainModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [chainName, setChainName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [startTime, setStartTime] = useState("");
  const [primaryLocation, setPrimaryLocation] = useState("");

  function handleCreate() {
    if (!chainName) return;
    startTransition(async () => {
      await createChain({
        chainName,
        chainTrigger: trigger || undefined,
        timeOfDay,
        startTime: startTime || undefined,
        primaryLocation: primaryLocation || undefined,
      });
      onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#FFF8F0]/[0.08] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFF8F0]/[0.06]">
          <h2 className="text-sm font-serif text-[#FFF8F0]/90">New Chain</h2>
          <button onClick={onClose} className="text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 text-sm">✕</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Chain Name *</label>
            <input
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="e.g. Morning Power Chain"
              className="mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Trigger</label>
            <input
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g. My alarm goes off"
              className="mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Time of Day</label>
            <div className="flex gap-2 mt-1">
              {["morning", "afternoon", "evening", "night"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(t)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider border transition-all ${
                    timeOfDay === t
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.08] hover:text-[#FFF8F0]/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] focus:outline-none focus:border-[#FF6B6B]/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Location</label>
            <input
              value={primaryLocation}
              onChange={(e) => setPrimaryLocation(e.target.value)}
              placeholder="e.g. Home, Gym"
              className="mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#FFF8F0]/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] font-mono text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !chainName}
            className="px-5 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider disabled:opacity-30 hover:bg-[#34D399]/30 transition-colors"
          >
            {isPending ? "Creating..." : "Create Chain"}
          </button>
        </div>
      </div>
    </div>
  );
}
