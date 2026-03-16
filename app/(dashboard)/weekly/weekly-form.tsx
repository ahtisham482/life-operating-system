"use client";

import { useState, useTransition } from "react";
import { upsertWeeklyPlan } from "./actions";

const QUESTIONS = [
  "What is my ONE lead priority this week?",
  "What are the minimum actions to keep other domains alive?",
  "What am I removing or pausing this week?",
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
    <div className="space-y-4">
      <p className="text-xs font-mono text-muted-foreground/60 tracking-wide">
        Every Sunday — 20 minutes. Answer these 3 questions honestly.
      </p>

      {QUESTIONS.map((q, i) => (
        <div key={i} className="bg-card border border-border p-5 rounded-lg space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
            Question {i + 1}
          </p>
          <p className="text-sm font-serif text-primary">{q}</p>
          <textarea
            value={answers[i]}
            onChange={(e) => {
              const a = [...answers];
              a[i] = e.target.value;
              setAnswers(a);
            }}
            placeholder="Write your honest answer here..."
            className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="px-6 py-2.5 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
      >
        {isPending ? "Saving..." : "Save Weekly Plan"}
      </button>
    </div>
  );
}
