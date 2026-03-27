"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ScorecardDay } from "@/lib/db/schema";

interface ScorecardCompletePanelProps {
  open: boolean;
  scorecard: ScorecardDay;
  isPending: boolean;
  onClose: () => void;
  onComplete: (value: { eveningReflection: string; awarenessRating: number }) => void;
}

export function ScorecardCompletePanel({
  open,
  scorecard,
  isPending,
  onClose,
  onComplete,
}: ScorecardCompletePanelProps) {
  const [reflection, setReflection] = useState(scorecard.eveningReflection ?? "");
  const [awarenessRating, setAwarenessRating] = useState(scorecard.awarenessRating ?? 3);

  useEffect(() => {
    setReflection(scorecard.eveningReflection ?? "");
    setAwarenessRating(scorecard.awarenessRating ?? 3);
  }, [scorecard.id, scorecard.eveningReflection, scorecard.awarenessRating]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl border-[#FFF8F0]/10 bg-[#0D0D1A] text-[#FFF8F0]">
        <DialogHeader className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#34D399]/70">
            Complete The Day
          </p>
          <DialogTitle className="text-3xl font-serif font-light normal-case tracking-normal text-[#FFF8F0]">
            What became visible today?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#FFF8F0]/45 leading-relaxed">
            Finish the scorecard by reflecting on patterns you noticed. Awareness is the win.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FEC89A]/70">
              Awareness rating
            </p>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAwarenessRating(value)}
                  className={`rounded-2xl border px-3 py-4 text-center transition-all ${
                    awarenessRating === value
                      ? "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                      : "border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/45 hover:text-[#FFF8F0]"
                  }`}
                >
                  <p className="text-2xl font-serif">{value}</p>
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] mt-1">
                    {value <= 2 ? "Foggy" : value === 3 ? "Okay" : value === 4 ? "Aware" : "Sharp"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FEC89A]/70">
              Evening reflection
            </p>
            <Textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              className="min-h-[180px] mt-3 border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85"
              placeholder="Example: I noticed I checked my phone after almost every focused task. The behavior felt automatic, especially when my energy dipped."
            />
          </div>

          <div className="rounded-[22px] border border-[#FFF8F0]/[0.08] bg-[#FFF8F0]/[0.03] px-4 py-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/35">
              Reminder
            </p>
            <p className="text-sm text-[#FFF8F0]/55 leading-relaxed mt-2">
              This is not a performance review. It is a record of what actually happened so tomorrow’s choices can be more conscious.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 hover:bg-[#34D399]/30"
            disabled={isPending}
            onClick={() =>
              onComplete({
                eveningReflection: reflection,
                awarenessRating,
              })
            }
          >
            {isPending ? "Completing..." : scorecard.status === "completed" ? "Update completion" : "Complete scorecard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
