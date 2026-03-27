import { describe, expect, it } from "vitest";
import {
  buildTimeBreakdown,
  calculateDayScore,
  computeScorecardRollup,
} from "@/lib/scorecard";
import type { ScorecardEntryRow } from "@/lib/db/schema";

function createEntry(overrides: Partial<ScorecardEntryRow>): ScorecardEntryRow {
  return {
    id: "entry-1",
    scorecardId: "scorecard-1",
    userId: "user-1",
    timeOfAction: "07:30:00",
    endTime: null,
    durationMinutes: null,
    behaviorDescription: "Checked phone",
    behaviorCategory: "phone",
    rating: "=",
    ratingReason: null,
    linkedIdentityId: null,
    identityAlignment: null,
    location: null,
    energyLevel: null,
    emotionalState: null,
    wasAutomatic: true,
    triggeredByEntryId: null,
    triggerType: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("scorecard helpers", () => {
  it("calculates the weighted day score from counts and time", () => {
    expect(calculateDayScore(4, 1, 1, 90, 15)).toBe(59);
    expect(calculateDayScore(1, 4, 1, 15, 90)).toBe(-59);
  });

  it("recomputes rollups from entry data", () => {
    const entries = [
      createEntry({
        id: "positive-entry",
        rating: "+",
        durationMinutes: 45,
        behaviorDescription: "Read a book",
        behaviorCategory: "learning",
      }),
      createEntry({
        id: "negative-entry",
        rating: "-",
        durationMinutes: 30,
        behaviorDescription: "Scrolled social media",
        behaviorCategory: "social_media",
      }),
      createEntry({
        id: "neutral-entry",
        rating: "=",
        durationMinutes: 15,
        behaviorDescription: "Commute",
        behaviorCategory: "commute",
      }),
    ];

    const rollup = computeScorecardRollup(entries);

    expect(rollup.totalEntries).toBe(3);
    expect(rollup.positiveCount).toBe(1);
    expect(rollup.negativeCount).toBe(1);
    expect(rollup.neutralCount).toBe(1);
    expect(rollup.totalPositiveMinutes).toBe(45);
    expect(rollup.totalNegativeMinutes).toBe(30);
    expect(rollup.totalNeutralMinutes).toBe(15);
    expect(rollup.positivePercentage).toBe("33.33");
    expect(rollup.negativePercentage).toBe("33.33");
    expect(rollup.dayScore).toBe(8);
  });

  it("builds category and time-of-day breakdowns", () => {
    const entries = [
      createEntry({
        id: "morning-positive",
        timeOfAction: "07:15:00",
        rating: "+",
        durationMinutes: 20,
        behaviorCategory: "exercise",
      }),
      createEntry({
        id: "afternoon-negative",
        timeOfAction: "15:10:00",
        rating: "-",
        durationMinutes: 40,
        behaviorCategory: "phone",
      }),
    ];

    const breakdown = buildTimeBreakdown(entries);

    expect(breakdown.totalTrackedMinutes).toBe(60);
    expect(breakdown.byCategory[0].category).toBe("phone");
    expect(
      breakdown.byTimeOfDay.find((slot) => slot.slot === "early_morning")?.positive,
    ).toBe(1);
    expect(
      breakdown.byTimeOfDay.find((slot) => slot.slot === "afternoon")?.negative,
    ).toBe(1);
  });
});
