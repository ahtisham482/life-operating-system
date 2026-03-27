"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScorecardEntryForm } from "./scorecard-entry-form";
import type { ScorecardIdentityOption, ScorecardTimelineItem } from "@/lib/scorecard";
import type { ScorecardEntryInput } from "@/lib/schemas/scorecard";

interface ScorecardEditDialogProps {
  entry: ScorecardTimelineItem | null;
  activeIdentities: ScorecardIdentityOption[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (entry: ScorecardEntryInput) => void;
}

export function ScorecardEditDialog({
  entry,
  activeIdentities,
  isPending,
  onClose,
  onSubmit,
}: ScorecardEditDialogProps) {
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl border-[#FFF8F0]/10 bg-[#0D0D1A] text-[#FFF8F0]">
        <DialogHeader>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FEC89A]/70">
            Edit Entry
          </p>
          <DialogTitle className="text-3xl font-serif font-light normal-case tracking-normal text-[#FFF8F0]">
            Adjust the record
          </DialogTitle>
          <DialogDescription className="text-sm text-[#FFF8F0]/45 leading-relaxed">
            Update the behavior, timing, or rating so the timeline reflects what actually
            happened.
          </DialogDescription>
        </DialogHeader>
        {entry ? (
          <ScorecardEntryForm
            activeIdentities={activeIdentities}
            isPending={isPending}
            initialValue={{
              timeOfAction: entry.rawTime,
              endTime: entry.rawEndTime,
              durationMinutes: entry.rawDurationMinutes,
              behaviorDescription: entry.behavior,
              behaviorCategory: entry.category,
              rating: entry.rating,
              ratingReason: entry.ratingReason,
              linkedIdentityId: entry.identityLink?.identityId ?? null,
              identityAlignment: entry.identityLink?.alignment ?? null,
              location: entry.location,
              energyLevel: entry.energyLevel as ScorecardEntryInput["energyLevel"],
              emotionalState: entry.emotionalState,
              wasAutomatic: entry.wasAutomatic,
              triggerType: null,
              triggeredByEntryId: null,
            }}
            submitLabel="Save changes"
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
