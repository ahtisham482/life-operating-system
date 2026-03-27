import { describe, expect, it } from "vitest";
import {
  completeScorecardSchema,
  createScorecardEntrySchema,
} from "@/lib/schemas/scorecard";

const VALID_ID = "11111111-1111-4111-8111-111111111111";

describe("scorecard schemas", () => {
  it("rejects invalid ratings and malformed times", () => {
    const result = createScorecardEntrySchema.safeParse({
      scorecardId: VALID_ID,
      entry: {
        timeOfAction: "7:30",
        behaviorDescription: "Checked Instagram",
        rating: "bad",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects behavior descriptions that exceed the max length", () => {
    const result = createScorecardEntrySchema.safeParse({
      scorecardId: VALID_ID,
      entry: {
        timeOfAction: "07:30",
        behaviorDescription: "x".repeat(501),
        rating: "+",
      },
    });

    expect(result.success).toBe(false);
  });

  it("normalizes valid times and accepts valid payloads", () => {
    const result = createScorecardEntrySchema.safeParse({
      scorecardId: VALID_ID,
      entry: {
        timeOfAction: "07:30",
        endTime: "08:00",
        behaviorDescription: "Deep work session",
        rating: "+",
        durationMinutes: 30,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entry.timeOfAction).toBe("07:30:00");
      expect(result.data.entry.endTime).toBe("08:00:00");
    }
  });

  it("requires an awareness rating between 1 and 5", () => {
    const result = completeScorecardSchema.safeParse({
      scorecardId: VALID_ID,
      eveningReflection: "I noticed my energy dip after lunch.",
      awarenessRating: 6,
    });

    expect(result.success).toBe(false);
  });
});
