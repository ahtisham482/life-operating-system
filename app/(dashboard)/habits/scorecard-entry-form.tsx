"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ScorecardEntryInput } from "@/lib/schemas/scorecard";
import type { ScorecardIdentityOption } from "@/lib/scorecard";
import {
  ScorecardFormSelect,
  ScorecardInputField,
} from "./scorecard-entry-form-controls";
import {
  EMPTY_SCORECARD_ENTRY_DRAFT,
  type ScorecardEntryDraft,
} from "./scorecard-entry-form-state";

interface ScorecardEntryFormProps {
  activeIdentities: ScorecardIdentityOption[];
  isPending: boolean;
  initialValue?: Partial<ScorecardEntryInput>;
  resetToken?: number;
  submitLabel: string;
  onSubmit: (value: ScorecardEntryInput) => void;
  onCancel?: () => void;
}

export function ScorecardEntryForm({
  activeIdentities,
  isPending,
  initialValue,
  resetToken = 0,
  submitLabel,
  onSubmit,
  onCancel,
}: ScorecardEntryFormProps) {
  const [draft, setDraft] = useState<ScorecardEntryDraft>(EMPTY_SCORECARD_ENTRY_DRAFT);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialValue));

  useEffect(() => {
    setDraft({
      timeOfAction: initialValue?.timeOfAction?.slice(0, 5) ?? "",
      endTime: initialValue?.endTime?.slice(0, 5) ?? "",
      durationMinutes:
        initialValue?.durationMinutes !== undefined &&
        initialValue?.durationMinutes !== null
          ? String(initialValue.durationMinutes)
          : "",
      behaviorDescription: initialValue?.behaviorDescription ?? "",
      behaviorCategory: initialValue?.behaviorCategory ?? "",
      rating: initialValue?.rating ?? "=",
      ratingReason: initialValue?.ratingReason ?? "",
      linkedIdentityId: initialValue?.linkedIdentityId ?? "",
      identityAlignment: initialValue?.identityAlignment ?? "",
      location: initialValue?.location ?? "",
      energyLevel: initialValue?.energyLevel ?? "",
      emotionalState: initialValue?.emotionalState ?? "",
      wasAutomatic: initialValue?.wasAutomatic ?? true,
      triggerType: initialValue?.triggerType ?? "",
    });
    setShowAdvanced(Boolean(initialValue));
  }, [initialValue, resetToken]);

  function updateField<K extends keyof ScorecardEntryDraft>(
    key: K,
    value: ScorecardEntryDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!draft.timeOfAction || !draft.behaviorDescription.trim()) return;

    onSubmit({
      timeOfAction: draft.timeOfAction,
      endTime: draft.endTime || null,
      durationMinutes: draft.durationMinutes ? Number.parseInt(draft.durationMinutes, 10) : null,
      behaviorDescription: draft.behaviorDescription.trim(),
      behaviorCategory: draft.behaviorCategory || null,
      rating: draft.rating,
      ratingReason: draft.ratingReason || null,
      linkedIdentityId: draft.linkedIdentityId || null,
      identityAlignment: draft.identityAlignment || null,
      location: draft.location || null,
      energyLevel: draft.energyLevel || null,
      emotionalState: draft.emotionalState || null,
      wasAutomatic: draft.wasAutomatic,
      triggerType: draft.triggerType || null,
      triggeredByEntryId: null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
            Time
          </label>
          <Input
            type="time"
            aria-label="Time of action"
            value={draft.timeOfAction}
            onChange={(event) => updateField("timeOfAction", event.target.value)}
            className="border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
            Behavior
          </label>
          <Input
            aria-label="Behavior description"
            value={draft.behaviorDescription}
            onChange={(event) => updateField("behaviorDescription", event.target.value)}
            className="border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85"
            placeholder="Checked Instagram after finishing a task"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
          Rate the vote
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { rating: "+" as const, label: "Builds me", className: "text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10" },
            { rating: "=" as const, label: "Neutral", className: "text-[#FEC89A] border-[#FEC89A]/25 bg-[#FEC89A]/10" },
            { rating: "-" as const, label: "Against me", className: "text-[#FF6B6B] border-[#FF6B6B]/30 bg-[#FF6B6B]/10" },
          ].map((option) => (
            <button
              key={option.rating}
              type="button"
              onClick={() => updateField("rating", option.rating)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                draft.rating === option.rating
                  ? option.className
                  : "border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/55 hover:text-[#FFF8F0]"
              }`}
            >
              <p className="text-lg font-serif">{option.rating}</p>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] mt-2">
                {option.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
          Why this rating?
        </label>
        <Textarea
          aria-label="Rating reason"
          value={draft.ratingReason}
          onChange={(event) => updateField("ratingReason", event.target.value)}
          className="min-h-[90px] border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85"
          placeholder="Optional. Explain the vote in your own words."
        />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((value) => !value)}
        className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FEC89A] hover:text-[#FFF8F0]"
      >
        {showAdvanced ? "Hide advanced context" : "Add context"}
      </button>

      {showAdvanced && (
        <div className="grid gap-4 rounded-[22px] border border-[#FFF8F0]/[0.08] bg-[#0D0D1A]/60 p-4 sm:grid-cols-2">
          <ScorecardFormSelect
            label="Category"
            value={draft.behaviorCategory}
            onChange={(value) => updateField("behaviorCategory", value)}
            options={["phone", "food", "exercise", "work", "learning", "social", "sleep", "entertainment", "household"]}
          />
          <ScorecardFormSelect
            label="Identity link"
            value={draft.linkedIdentityId}
            onChange={(value) => updateField("linkedIdentityId", value)}
            options={activeIdentities.map((identity) => ({
              value: identity.id,
              label: identity.identityStatement,
            }))}
            includeEmpty="No linked identity"
          />
          <ScorecardFormSelect
            label="Identity alignment"
            value={draft.identityAlignment}
            onChange={(value) => updateField("identityAlignment", value as ScorecardEntryDraft["identityAlignment"])}
            options={["supports", "opposes", "neutral"]}
            includeEmpty="Choose alignment"
          />
          <ScorecardFormSelect
            label="Energy"
            value={draft.energyLevel}
            onChange={(value) => updateField("energyLevel", value as ScorecardEntryDraft["energyLevel"])}
            options={["high", "medium", "low"]}
            includeEmpty="Choose energy"
          />
          <ScorecardFormSelect
            label="Trigger type"
            value={draft.triggerType}
            onChange={(value) => updateField("triggerType", value as ScorecardEntryDraft["triggerType"])}
            options={["time", "location", "emotion", "preceding_action", "other_people", "other"]}
            includeEmpty="Choose trigger"
          />
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
              Automatic?
            </label>
            <button
              type="button"
              onClick={() => updateField("wasAutomatic", !draft.wasAutomatic)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                draft.wasAutomatic
                  ? "border-[#FF6B6B]/25 bg-[#FF6B6B]/10 text-[#FF6B6B]"
                  : "border-[#34D399]/25 bg-[#34D399]/10 text-[#34D399]"
              }`}
            >
              {draft.wasAutomatic ? "Yes, this was on autopilot" : "No, this was deliberate"}
            </button>
          </div>
          <ScorecardInputField
            label="End time"
            type="time"
            value={draft.endTime}
            onChange={(value) => updateField("endTime", value)}
          />
          <ScorecardInputField
            label="Duration (minutes)"
            type="number"
            value={draft.durationMinutes}
            onChange={(value) => updateField("durationMinutes", value)}
          />
          <ScorecardInputField
            label="Location"
            value={draft.location}
            onChange={(value) => updateField("location", value)}
          />
          <ScorecardInputField
            label="Emotion"
            value={draft.emotionalState}
            onChange={(value) => updateField("emotionalState", value)}
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          className="bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
          disabled={isPending || !draft.timeOfAction || !draft.behaviorDescription.trim()}
          onClick={handleSubmit}
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
