"use client";

import { useState, useTransition } from "react";
import type { BadHabit, DefenseAction } from "@/lib/breaker";
import {
  LAYER_NAMES,
  LAYER_ICONS,
  getLayerStrength,
  calculateDefenseStrength,
} from "@/lib/breaker";
import { updateDefenseAction, addDefenseAction } from "./breaker-actions";

interface Props {
  habit: BadHabit;
  onRefresh: () => void;
}

export function DefenseDashboard({ habit, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();
  const [newActions, setNewActions] = useState<Record<number, string>>({});

  const layers: DefenseAction[][] = [
    habit.defenseLayer1,
    habit.defenseLayer2,
    habit.defenseLayer3,
    habit.defenseLayer4,
  ];

  const overall = calculateDefenseStrength(layers);
  const layerStats = layers.map((l) => getLayerStrength(l));

  // Find weakest layer (non-empty)
  let weakestIdx = -1;
  let weakestStrength = 101;
  layerStats.forEach((s, i) => {
    if (layers[i].length > 0 && s.strength < weakestStrength) {
      weakestStrength = s.strength;
      weakestIdx = i;
    }
  });
  // Also count empty layers as weak
  if (weakestIdx === -1) {
    weakestIdx = layers.findIndex((l) => l.length === 0);
  }

  function handleToggle(layerIndex: number, actionIndex: number, completed: boolean) {
    const layerNumber = (layerIndex + 1) as 1 | 2 | 3 | 4;
    startTransition(async () => {
      await updateDefenseAction(habit.id, layerNumber, actionIndex, completed);
      onRefresh();
    });
  }

  function handleAdd(layerIndex: number) {
    const text = newActions[layerIndex]?.trim();
    if (!text) return;
    const layerNumber = (layerIndex + 1) as 1 | 2 | 3 | 4;
    startTransition(async () => {
      await addDefenseAction(habit.id, layerNumber, text);
      setNewActions((prev) => ({ ...prev, [layerIndex]: "" }));
      onRefresh();
    });
  }

  const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";

  return (
    <div className="space-y-4">
      {/* Overall strength */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className={label}>Overall defense strength</p>
          <span
            className="text-[14px] font-semibold"
            style={{
              color:
                overall >= 75 ? "#34D399" : overall >= 40 ? "#FEC89A" : "#F87171",
            }}
          >
            {overall}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overall}%`,
              backgroundColor:
                overall >= 75 ? "#34D399" : overall >= 40 ? "#FEC89A" : "#F87171",
            }}
          />
        </div>
      </div>

      {/* 4 Layers */}
      {layers.map((layer, i) => {
        const stat = layerStats[i];
        const isWeakest = i === weakestIdx;
        const completedCount = layer.filter((a) => a.completed).length;

        return (
          <div
            key={i}
            className={`bg-[#FFF8F0]/[0.03] border rounded-2xl p-5 space-y-3 ${
              isWeakest
                ? "border-[#F87171]/30"
                : "border-[#FFF8F0]/[0.06]"
            }`}
          >
            {/* Layer header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{LAYER_ICONS[i]}</span>
                <h4 className="text-[15px] font-medium text-[#FFF8F0]">
                  {LAYER_NAMES[i]}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-lg text-[11px] font-mono"
                  style={{
                    backgroundColor: stat.color + "20",
                    color: stat.color,
                  }}
                >
                  {stat.label}
                </span>
                <span className="text-[12px] text-[#FFF8F0]/40">
                  {completedCount}/{layer.length}
                </span>
              </div>
            </div>

            {/* Weakest warning */}
            {isWeakest && (
              <div className="bg-[#F87171]/10 border border-[#F87171]/20 rounded-xl px-3 py-2">
                <p className="text-[12px] text-[#F87171]">
                  {"⚠\uFE0F"} This is your weakest layer. Consider strengthening it.
                </p>
              </div>
            )}

            {/* Actions checklist */}
            <div className="space-y-2">
              {layer.map((action, j) => (
                <label
                  key={j}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={action.completed}
                    onChange={(e) => handleToggle(i, j, e.target.checked)}
                    disabled={pending}
                    className="accent-[#34D399] w-4 h-4 rounded"
                  />
                  <span
                    className={`text-[13px] transition-all ${
                      action.completed
                        ? "text-[#FFF8F0]/40 line-through"
                        : "text-[#FFF8F0]/80 group-hover:text-[#FFF8F0]"
                    }`}
                  >
                    {action.action}
                  </span>
                </label>
              ))}
            </div>

            {/* Add action */}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-1.5 text-[13px] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
                placeholder="Add action..."
                value={newActions[i] || ""}
                onChange={(e) =>
                  setNewActions((prev) => ({ ...prev, [i]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd(i);
                }}
              />
              <button
                onClick={() => handleAdd(i)}
                disabled={pending || !newActions[i]?.trim()}
                className="px-3 py-1.5 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-medium disabled:opacity-30 transition-all hover:bg-[#FF6B6B]/30"
              >
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
