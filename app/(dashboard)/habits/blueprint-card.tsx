"use client";

import { useTransition } from "react";
import {
  Blueprint,
  getCategoryIcon,
  calculateCompleteness,
  buildIntentionStatement,
  buildStackStatement,
} from "@/lib/architect";
import { deleteBlueprint } from "./architect-actions";

interface BlueprintCardProps {
  blueprint: Blueprint;
  onDelete?: (id: string) => void;
}

export function BlueprintCard({ blueprint, onDelete }: BlueprintCardProps) {
  const [isPending, startTransition] = useTransition();
  const bp = blueprint;
  const completeness = calculateCompleteness(bp);
  const icon = getCategoryIcon(bp.habitCategory);

  const intentionStatement = buildIntentionStatement(
    bp.intentionBehavior,
    bp.intentionTime,
    bp.intentionLocation,
  );

  const stackStatement =
    bp.stackType !== "none" && bp.stackAnchorDescription
      ? buildStackStatement(bp.stackType, bp.stackAnchorDescription, bp.intentionBehavior)
      : null;

  function handleDelete() {
    startTransition(async () => {
      await deleteBlueprint(bp.id);
      onDelete?.(bp.id);
    });
  }

  const badgeColor = completeness >= 70 ? "#34D399" : completeness >= 40 ? "#FEC89A" : "#9CA3AF";

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3 hover:border-[#FFF8F0]/[0.1] transition-all group">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-serif text-[#FFF8F0]/90 flex-1 truncate">
          {bp.habitName}
        </h3>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0"
          style={{ background: `${badgeColor}20`, color: badgeColor }}
        >
          {completeness}/100
        </span>
      </div>

      {/* Pillars */}
      <div className="space-y-2">
        {bp.intentionBehavior && (
          <div className="flex items-start gap-1.5">
            <span className="text-xs shrink-0 mt-0.5">🎯</span>
            <p className="text-[11px] text-[#FFF8F0]/60 leading-relaxed">
              {intentionStatement}
            </p>
          </div>
        )}

        {stackStatement && (
          <div className="flex items-start gap-1.5">
            <span className="text-xs shrink-0 mt-0.5">⛓️</span>
            <p className="text-[11px] text-[#FFF8F0]/60 leading-relaxed">
              {stackStatement}
            </p>
          </div>
        )}

        {bp.environmentCue && (
          <div className="flex items-start gap-1.5">
            <span className="text-xs shrink-0 mt-0.5">🏠</span>
            <p className="text-[11px] text-[#FFF8F0]/60 leading-relaxed">
              {bp.environmentCue}
            </p>
          </div>
        )}

        {bp.twoMinuteVersion && (
          <div className="flex items-start gap-1.5">
            <span className="text-xs shrink-0 mt-0.5">🤏</span>
            <p className="text-[11px] text-[#FFF8F0]/50 leading-relaxed italic">
              {bp.twoMinuteVersion}
            </p>
          </div>
        )}
      </div>

      {/* Chain position badge */}
      {bp.chainId && bp.chainPosition !== null && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEC89A]/[0.08] border border-[#FEC89A]/[0.15] rounded-lg">
          <span className="text-[10px] font-mono text-[#FEC89A]/60">
            Chain #{bp.chainPosition}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#FFF8F0]/[0.05]">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/0 group-hover:text-[#FFF8F0]/30 hover:!text-[#F87171]/60 hover:!bg-[#F87171]/10 border border-transparent group-hover:border-[#FFF8F0]/[0.06] rounded-xl transition-all disabled:opacity-30"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
