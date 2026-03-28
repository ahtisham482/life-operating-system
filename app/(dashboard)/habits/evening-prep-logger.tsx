"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { EnvironmentSetup } from "@/lib/architect";
import { getEnvironmentSetups } from "./architect-actions";
import { logEnvironmentPrep } from "./execution-actions";

interface PrepState {
  [setupId: string]: Set<string>;
}

export function EveningPrepLogger() {
  const [setups, setSetups] = useState<EnvironmentSetup[]>([]);
  const [checked, setChecked] = useState<PrepState>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Mock prep history for last 7 days (would come from a query in production)
  const [prepHistory] = useState<Record<string, boolean[]>>({});

  const loadSetups = useCallback(async () => {
    const data = await getEnvironmentSetups();
    setSetups(data);
    // Initialize checked state
    const initial: PrepState = {};
    for (const s of data) {
      initial[s.id] = new Set();
    }
    setChecked(initial);
    setLoading(false);
  }, []);

  useEffect(() => { loadSetups(); }, [loadSetups]);

  const setupsWithPrep = setups.filter((s) => s.eveningPrepItems.length > 0);

  const totalItems = setupsWithPrep.reduce((acc, s) => acc + s.eveningPrepItems.length, 0);
  const checkedCount = Object.values(checked).reduce((acc, set) => acc + set.size, 0);

  function toggleItem(setupId: string, item: string) {
    setChecked((prev) => {
      const next = { ...prev };
      const set = new Set(prev[setupId] || []);
      if (set.has(item)) {
        set.delete(item);
      } else {
        set.add(item);
      }
      next[setupId] = set;
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const promises = setupsWithPrep
        .filter((s) => (checked[s.id]?.size ?? 0) > 0)
        .map((s) =>
          logEnvironmentPrep({
            setupId: s.id,
            completedItems: Array.from(checked[s.id] || []),
            totalItems: s.eveningPrepItems.length,
          })
        );
      await Promise.all(promises);
      setSaved(true);
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  if (setupsWithPrep.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">🌙</p>
        <p className="text-[13px] font-serif text-[#FFF8F0]/70">No evening prep items yet</p>
        <p className="text-[12px] font-mono text-[#FFF8F0]/40 max-w-sm mx-auto leading-relaxed">
          Add evening prep items to your environment setups to build a pre-sleep routine
          that primes tomorrow&apos;s habits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Motivational header */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3">
        <p className="text-[13px] font-serif text-[#FFF8F0]/70 text-center">
          Prepping tonight makes tomorrow&apos;s habits almost automatic
        </p>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
              Prep progress
            </p>
            <p className="text-[11px] font-mono text-[#FFF8F0]/50">
              {checkedCount} / {totalItems}
            </p>
          </div>
          <div className="h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#34D399]/60 rounded-full transition-all duration-500"
              style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prep checklists per setup */}
      {setupsWithPrep.map((setup) => {
        const setupChecked = checked[setup.id] || new Set();
        const history = prepHistory[setup.id] || [];

        return (
          <div
            key={setup.id}
            className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-4"
          >
            {/* Space header */}
            <div className="flex items-center gap-2">
              <span className="text-sm">{setup.spaceIcon || "📍"}</span>
              <h3 className="text-[13px] font-serif text-[#FFF8F0]/80 flex-1">{setup.spaceName}</h3>
              <span className="text-[10px] font-mono text-[#FFF8F0]/30">
                {setupChecked.size}/{setup.eveningPrepItems.length}
              </span>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              {setup.eveningPrepItems.map((item) => {
                const isChecked = setupChecked.has(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleItem(setup.id, item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                      isChecked
                        ? "bg-[#34D399]/10 border border-[#34D399]/20"
                        : "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/[0.12]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked
                          ? "bg-[#34D399] border-[#34D399]"
                          : "border-[#FFF8F0]/20"
                      }`}
                    >
                      {isChecked && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-[12px] font-mono transition-colors ${
                        isChecked ? "text-[#34D399]/80 line-through" : "text-[#FFF8F0]/60"
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Last 7 days mini dots */}
            {history.length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                <span className="text-[10px] font-mono text-[#FFF8F0]/30 mr-1">Last 7d</span>
                {history.map((prepped, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      prepped ? "bg-[#34D399]" : "bg-[#FFF8F0]/10"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isPending || checkedCount === 0}
        className={`w-full px-4 py-3 rounded-xl text-[12px] font-mono uppercase tracking-wider transition-all ${
          saved
            ? "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25"
            : "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
        } disabled:opacity-40`}
      >
        {isPending ? "Saving..." : saved ? "Prep saved" : "Save Prep"}
      </button>
    </div>
  );
}
