"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import {
  linkHabitToIdentity,
  unlinkHabitFromIdentity,
} from "./identity-actions";

interface LinkableHabit {
  id: string;
  name: string;
  emoji: string | null;
  identityId: string | null;
}

interface LinkHabitsModalProps {
  identityId: string;
  identityStatement: string;
  allHabits: LinkableHabit[];
  onClose: () => void;
}

export function LinkHabitsModal({
  identityId,
  identityStatement,
  allHabits,
  onClose,
}: LinkHabitsModalProps) {
  const [linkedIds, setLinkedIds] = useState<Set<string>>(
    new Set(
      allHabits.filter((h) => h.identityId === identityId).map((h) => h.id),
    ),
  );
  const [isPending, startTransition] = useTransition();

  // Habits that are free or already linked to THIS identity
  const available = allHabits.filter(
    (h) => !h.identityId || h.identityId === identityId,
  );
  // Habits linked to another identity
  const taken = allHabits.filter(
    (h) => h.identityId && h.identityId !== identityId,
  );

  function handleToggle(habitId: string) {
    const isLinked = linkedIds.has(habitId);
    setLinkedIds((prev) => {
      const next = new Set(prev);
      if (isLinked) next.delete(habitId);
      else next.add(habitId);
      return next;
    });

    startTransition(async () => {
      if (isLinked) {
        await unlinkHabitFromIdentity(habitId);
      } else {
        await linkHabitToIdentity(habitId, identityId);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0d0d1a] border border-[#FFF8F0]/[0.1] rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#FFF8F0]/30">
              Link habits to
            </p>
            <h2 className="text-sm font-serif italic text-[#FFF8F0]/90 mt-0.5 leading-snug">
              {identityStatement}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/60 transition-colors mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hint */}
        <p className="text-[10px] font-mono text-[#FFF8F0]/25 leading-relaxed">
          Each habit can only belong to one identity. Linked habits appear in
          your daily vote strip.
        </p>

        {/* Available habits */}
        {available.length === 0 && (
          <p className="text-[11px] font-mono text-[#FFF8F0]/30 italic">
            No habits available. Create habits first in the Tracker tab.
          </p>
        )}

        <div className="space-y-1.5">
          {available.map((habit) => {
            const linked = linkedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                onClick={() => handleToggle(habit.id)}
                disabled={isPending}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  linked
                    ? "bg-[#FF6B6B]/10 border-[#FF6B6B]/30"
                    : "bg-[#FFF8F0]/[0.03] border-[#FFF8F0]/[0.07] hover:border-[#FFF8F0]/[0.15]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center ${
                    linked
                      ? "bg-[#FF6B6B] border-[#FF6B6B]"
                      : "border-[#FFF8F0]/20"
                  }`}
                >
                  {linked && (
                    <Check size={10} color="white" strokeWidth={2.5} />
                  )}
                </div>
                <span className="text-xs font-serif text-[#FFF8F0]/80 truncate">
                  {habit.emoji && <span className="mr-1">{habit.emoji}</span>}
                  {habit.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Taken habits */}
        {taken.length > 0 && (
          <div className="pt-2 border-t border-[#FFF8F0]/[0.05]">
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#FFF8F0]/20 mb-2">
              Linked to another identity
            </p>
            {taken.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-40"
              >
                <div className="w-4 h-4 rounded-md border border-[#FFF8F0]/10 flex-shrink-0" />
                <span className="text-xs font-serif text-[#FFF8F0]/50 truncate">
                  {habit.emoji && <span className="mr-1">{habit.emoji}</span>}
                  {habit.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Done */}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-[10px] font-mono uppercase tracking-widest bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/50 border border-[#FFF8F0]/[0.1] rounded-xl hover:bg-[#FFF8F0]/[0.08] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
