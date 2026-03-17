"use client";

import { useState, useTransition } from "react";
import { upsertWeeklyPlan } from "./actions";

const QUESTIONS = [
  { key: "lead", label: "Lead Priority", question: "What is my ONE lead priority this week?" },
  { key: "maintenance", label: "Maintenance", question: "Minimum actions to keep other domains alive?" },
  { key: "remove", label: "Removing / Pausing", question: "What am I removing or pausing this week?" },
];

type WeeklyFormProps = {
  weekKey: string;
  initialAnswers: {
    leadPriority: string;
    maintenanceActions: string;
    removingPausing: string;
  };
};

export function WeeklyForm({ weekKey, initialAnswers }: WeeklyFormProps) {
  const [answers, setAnswers] = useState([
    initialAnswers.leadPriority,
    initialAnswers.maintenanceActions,
    initialAnswers.removingPausing,
  ]);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await upsertWeeklyPlan(weekKey, answers[0], answers[1], answers[2]);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {QUESTIONS.map((q, i) => (
        <div key={q.key} className="space-y-2">
          <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-[#FFF8F0]/30">
            {q.label}
          </p>
          <p className="text-xs font-serif text-[#FFF8F0]/60">{q.question}</p>
          <textarea
            value={answers[i]}
            onChange={(e) => {
              const a = [...answers];
              a[i] = e.target.value;
              setAnswers(a);
            }}
            placeholder="Write your honest answer..."
            className="w-full bg-black/20 border border-[#FFF8F0]/[0.06] text-[#FFF8F0]/80 p-3 text-sm font-serif rounded-lg resize-y min-h-[70px] focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/15"
            rows={2}
          />
          {i < QUESTIONS.length - 1 && (
            <div className="h-px bg-[#FFF8F0]/[0.04] mt-2" />
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border border-[#FF6B6B]/30 text-[#FF6B6B]/70 hover:bg-[#FF6B6B]/10 rounded-lg transition-colors disabled:opacity-30"
      >
        {isPending ? "Saving..." : "Save Plan"}
      </button>
    </div>
  );
}
