"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { upsertReflection } from "./identity-actions";

interface ReflectionModalProps {
  identityId: string;
  identityStatement: string;
  weekStats: {
    totalVotes: number;
    positiveVotes: number;
    percentage: number;
  };
  onClose: () => void;
}

const PROMPTS = [
  {
    key: "wins" as const,
    question: (statement: string) =>
      `What evidence do you have this week that you ARE "${statement}"?`,
    hint: "Specific moments where you acted as this person.",
    required: true,
  },
  {
    key: "challenges" as const,
    question: () => "What made it challenging this week?",
    hint: "Specific triggers, environments, or situations.",
    required: true,
  },
  {
    key: "learning" as const,
    question: () => "What did you learn about yourself?",
    hint: "Patterns, best times of day, or what helps.",
    required: false,
  },
  {
    key: "nextWeekIntention" as const,
    question: () => "One thing you'll do differently next week?",
    hint: 'Be specific: "I will [habit] at [time] in [location]"',
    required: true,
  },
];

export function ReflectionModal({
  identityId,
  identityStatement,
  weekStats,
  onClose,
}: ReflectionModalProps) {
  const [values, setValues] = useState({
    wins: "",
    challenges: "",
    learning: "",
    nextWeekIntention: "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (
      !values.wins.trim() ||
      !values.challenges.trim() ||
      !values.nextWeekIntention.trim()
    ) {
      setError("Please fill in the required fields.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await upsertReflection(identityId, values);
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const pct = weekStats.percentage;
  const pctColor = pct >= 80 ? "#34D399" : pct >= 50 ? "#FEC89A" : "#FF6B6B";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0d0d1a] border border-[#FFF8F0]/[0.1] rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#FFF8F0]/30">
              Weekly reflection
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

        {/* Week stats pill */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{
            borderColor: `${pctColor}30`,
            backgroundColor: `${pctColor}10`,
          }}
        >
          <span
            className="text-lg font-mono font-bold"
            style={{ color: pctColor }}
          >
            {pct}%
          </span>
          <span className="text-[10px] font-mono text-[#FFF8F0]/40">
            {weekStats.positiveVotes} of {weekStats.totalVotes} votes cast this
            week
          </span>
        </div>

        {/* Prompts */}
        {PROMPTS.map((prompt) => (
          <div key={prompt.key} className="space-y-1.5">
            <label className="block text-[10px] font-mono text-[#FFF8F0]/50 leading-relaxed">
              {prompt.question(identityStatement)}
              {prompt.required && (
                <span className="text-[#FF6B6B] ml-0.5">*</span>
              )}
            </label>
            <textarea
              value={values[prompt.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [prompt.key]: e.target.value }))
              }
              rows={2}
              placeholder={prompt.hint}
              className="w-full bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2 text-xs font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/15 resize-none"
            />
          </div>
        ))}

        {error && (
          <p className="text-[10px] font-mono text-[#FF6B6B]">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border border-[#FFF8F0]/[0.1] text-[#FFF8F0]/40 rounded-xl hover:bg-[#FFF8F0]/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest bg-[#FEC89A]/10 text-[#FEC89A] border border-[#FEC89A]/30 rounded-xl hover:bg-[#FEC89A]/20 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}
