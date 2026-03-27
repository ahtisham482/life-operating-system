"use client";

import { useEffect, useState, useTransition } from "react";
import {
  bulkCreateScorecardEntries,
  completeScorecard,
  createScorecardEntry,
  deleteScorecardEntry,
  saveMorningIntention,
  startScorecard,
  type ScorecardActionResult,
  updateScorecardEntry,
} from "./scorecard-actions";
import { ScorecardBulkComposer } from "./scorecard-bulk-composer";
import { ScorecardCompletePanel } from "./scorecard-complete-panel";
import { ScorecardEditDialog } from "./scorecard-edit-dialog";
import { ScorecardEmptyState } from "./scorecard-empty-state";
import { ScorecardEntryForm } from "./scorecard-entry-form";
import { ScorecardOnboarding } from "./scorecard-onboarding";
import { ScorecardSidePanel } from "./scorecard-side-panel";
import { ScorecardTimeline } from "./scorecard-timeline";
import type { ScorecardScreenData, ScorecardTimelineItem } from "@/lib/scorecard";

type ScorecardActions = {
  startScorecard: typeof startScorecard;
  saveMorningIntention: typeof saveMorningIntention;
  createScorecardEntry: typeof createScorecardEntry;
  bulkCreateScorecardEntries: typeof bulkCreateScorecardEntries;
  updateScorecardEntry: typeof updateScorecardEntry;
  deleteScorecardEntry: typeof deleteScorecardEntry;
  completeScorecard: typeof completeScorecard;
};

const defaultActions: ScorecardActions = {
  startScorecard,
  saveMorningIntention,
  createScorecardEntry,
  bulkCreateScorecardEntries,
  updateScorecardEntry,
  deleteScorecardEntry,
  completeScorecard,
};

interface ScorecardTabProps {
  initialData: ScorecardScreenData;
  actions?: ScorecardActions;
}

export function ScorecardTab({
  initialData,
  actions = defaultActions,
}: ScorecardTabProps) {
  const [screenData, setScreenData] = useState(initialData);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [showBulkComposer, setShowBulkComposer] = useState(
    Boolean(
      initialData.scorecard &&
        initialData.onboardingState.needsOnboarding &&
        initialData.scorecard.scorecardDate === initialData.onboardingState.starterDate,
    ),
  );
  const [showCompletePanel, setShowCompletePanel] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScorecardTimelineItem | null>(null);
  const [formResetToken, setFormResetToken] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  function runAction(
    execute: () => Promise<ScorecardActionResult<ScorecardScreenData>>,
    options?: {
      successMessage?: string;
      onSuccess?: (data: ScorecardScreenData) => void;
    },
  ) {
    startTransition(async () => {
      const result = await execute();
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error.message });
        return;
      }

      setScreenData(result.data);
      if (options?.successMessage) {
        setFeedback({ tone: "success", message: options.successMessage });
      }
      options?.onSuccess?.(result.data);
    });
  }

  const scorecard = screenData.scorecard;

  if (!scorecard && screenData.onboardingState.needsOnboarding) {
    return (
      <ScorecardOnboarding
        starterDateLabel={screenData.onboardingState.starterDateLabel}
        isPending={isPending}
        onStart={() =>
          runAction(
            () =>
              actions.startScorecard({
                scorecardDate: screenData.onboardingState.starterDate,
                dayLabel: "First guided scorecard",
              }),
            {
              successMessage: "Yesterday's scorecard is ready.",
              onSuccess: () => setShowBulkComposer(true),
            },
          )
        }
      />
    );
  }

  if (!scorecard) {
    return (
      <ScorecardEmptyState
        isPending={isPending}
        onStart={() =>
          runAction(() => actions.startScorecard({}), {
            successMessage: "Today's scorecard is ready.",
          })
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-[#34D399]/25 bg-[#34D399]/10 text-[#34D399]"
              : "border-[#FF6B6B]/25 bg-[#FF6B6B]/10 text-[#FF6B6B]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <ScorecardTimeline
            timeline={screenData.timeline}
            isPending={isPending}
            onEdit={setEditingEntry}
            onDelete={(entryId) =>
              runAction(() => actions.deleteScorecardEntry({ entryId }), {
                successMessage: "Entry removed from the scorecard.",
              })
            }
          />

          <div className="glass-card rounded-[28px] p-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FEC89A]/70">
              Log One Behavior
            </p>
            <h3 className="text-2xl font-serif italic text-[#FFF8F0] mt-2">
              Add what happened next
            </h3>
            <div className="mt-5">
              <ScorecardEntryForm
                activeIdentities={screenData.activeIdentities}
                isPending={isPending}
                resetToken={formResetToken}
                submitLabel="Add entry"
                onSubmit={(entry) =>
                  runAction(
                    () => actions.createScorecardEntry({ scorecardId: scorecard.id, entry }),
                    {
                      successMessage: "Behavior added to the scorecard.",
                      onSuccess: () => setFormResetToken((value) => value + 1),
                    },
                  )
                }
              />
            </div>
          </div>

          {showBulkComposer ? (
            <ScorecardBulkComposer
              guided={
                screenData.onboardingState.needsOnboarding &&
                scorecard.scorecardDate === screenData.onboardingState.starterDate
              }
              isPending={isPending}
              onClose={() => setShowBulkComposer(false)}
              onSubmit={(entries) =>
                runAction(
                  () =>
                    actions.bulkCreateScorecardEntries({
                      scorecardId: scorecard.id,
                      entries,
                    }),
                  {
                    successMessage: "Entries added to the scorecard.",
                    onSuccess: () => setShowBulkComposer(false),
                  },
                )
              }
            />
          ) : null}
        </div>

        <ScorecardSidePanel
          scorecard={scorecard}
          dateLabel={screenData.dateLabel ?? scorecard.scorecardDate}
          liveStats={screenData.liveStats}
          timeBreakdown={screenData.timeBreakdown}
          onboardingState={screenData.onboardingState}
          isPending={isPending}
          onSaveMorningIntention={(value) =>
            runAction(
              () =>
                actions.saveMorningIntention({
                  scorecardId: scorecard.id,
                  morningIntention: value,
                }),
              { successMessage: "Morning intention saved." },
            )
          }
          onOpenBulkComposer={() => setShowBulkComposer(true)}
          onOpenCompletePanel={() => setShowCompletePanel(true)}
          onJumpToToday={() =>
            runAction(() => actions.startScorecard({}), {
              successMessage: "Loaded today's scorecard.",
            })
          }
        />
      </div>

      <ScorecardEditDialog
        entry={editingEntry}
        activeIdentities={screenData.activeIdentities}
        isPending={isPending}
        onClose={() => setEditingEntry(null)}
        onSubmit={(entry) => {
          if (!editingEntry) return;
          runAction(
            () =>
              actions.updateScorecardEntry({
                entryId: editingEntry.id,
                updates: entry,
              }),
            {
              successMessage: "Entry updated.",
              onSuccess: () => setEditingEntry(null),
            },
          );
        }}
      />

      <ScorecardCompletePanel
        open={showCompletePanel}
        scorecard={scorecard}
        isPending={isPending}
        onClose={() => setShowCompletePanel(false)}
        onComplete={(value) =>
          runAction(() => actions.completeScorecard({ scorecardId: scorecard.id, ...value }), {
            successMessage: "Scorecard completed.",
            onSuccess: () => setShowCompletePanel(false),
          })
        }
      />
    </div>
  );
}
