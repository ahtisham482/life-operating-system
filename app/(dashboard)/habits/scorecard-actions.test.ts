/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  buildScorecardScreenData: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("./scorecard-data", () => ({
  buildScorecardScreenData: mocks.buildScorecardScreenData,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  completeScorecard,
  saveMorningIntention,
  startScorecard,
} from "./scorecard-actions";

const SCORECARD_ID = "11111111-1111-4111-8111-111111111111";

function createSelectChain({
  data = null,
  maybeSingle = data,
}: {
  data?: unknown;
  maybeSingle?: unknown;
}) {
  const chain = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data: maybeSingle, error: null }),
    single: vi.fn().mockResolvedValue({ data: maybeSingle, error: null }),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };

  return chain;
}

function createMutationChain() {
  const chain = {
    eq: vi.fn(() => chain),
    then: (resolve: (value: { error: null }) => unknown) =>
      Promise.resolve({ error: null }).then(resolve),
  };

  return chain;
}

describe("scorecard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildScorecardScreenData.mockResolvedValue({
      scorecard: null,
      timeline: [],
      liveStats: {
        totalEntries: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        positivePercentage: 0,
        negativePercentage: 0,
        currentDayScore: 0,
        dayScoreTone: "neutral",
      },
      timeBreakdown: {
        byCategory: [],
        byTimeOfDay: [],
        totalTrackedMinutes: 0,
      },
      activeIdentities: [],
      onboardingState: {
        completed: false,
        needsOnboarding: true,
        starterDate: "2026-03-26",
        starterDateLabel: "Thursday, March 26, 2026",
      },
      dateLabel: null,
    });
  });

  it("fails cleanly when the user is unauthenticated", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    });

    const result = await startScorecard({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("AUTH_FAILED");
    }
  });

  it("blocks cross-user scorecard access by returning not found", async () => {
    const scorecardDaysSelect = createSelectChain({ maybeSingle: null });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "scorecard_days") {
          return {
            select: vi.fn(() => scorecardDaysSelect),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await saveMorningIntention({
      scorecardId: SCORECARD_ID,
      morningIntention: "Notice my phone checks.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("reuses an existing scorecard for the same day instead of inserting a duplicate", async () => {
    const existingQuery = createSelectChain({ maybeSingle: { id: SCORECARD_ID } });
    const insert = vi.fn();

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "scorecard_days") {
          return {
            select: vi.fn(() => existingQuery),
            insert,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await startScorecard({ scorecardDate: "2026-03-27" });

    expect(result.success).toBe(true);
    expect(insert).not.toHaveBeenCalled();
    expect(mocks.buildScorecardScreenData).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      { scorecardId: SCORECARD_ID },
    );
  });

  it("completes the scorecard, recomputes stats, and marks onboarding complete", async () => {
    const updateScorecardDay = vi.fn(() => createMutationChain());
    const updateRollup = vi.fn(() => createMutationChain());
    const preferenceUpsert = vi.fn().mockResolvedValue({ error: null });

    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "scorecard_days") {
          return {
            select: vi.fn(() =>
              createSelectChain({
                maybeSingle: {
                  id: SCORECARD_ID,
                  user_id: "user-1",
                  scorecard_date: "2026-03-27",
                  status: "in_progress",
                },
              }),
            ),
            update: vi
              .fn()
              .mockImplementationOnce(updateScorecardDay)
              .mockImplementationOnce(updateRollup),
          };
        }

        if (table === "scorecard_entries") {
          return {
            select: vi.fn(() =>
              createSelectChain({
                data: [
                  {
                    id: "22222222-2222-4222-8222-222222222222",
                    scorecard_id: SCORECARD_ID,
                    user_id: "user-1",
                    time_of_action: "07:30:00",
                    rating: "+",
                    behavior_description: "Read",
                    sort_order: 0,
                    was_automatic: true,
                    duration_minutes: 20,
                  },
                ],
              }),
            ),
          };
        }

        if (table === "scorecard_preferences") {
          return {
            select: vi.fn(() => createSelectChain({ maybeSingle: null })),
            upsert: preferenceUpsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await completeScorecard({
      scorecardId: SCORECARD_ID,
      eveningReflection: "I noticed my biggest phone spike after lunch.",
      awarenessRating: 4,
    });

    expect(result.success).toBe(true);
    expect(updateScorecardDay).toHaveBeenCalledWith(
      expect.objectContaining({
        evening_reflection: "I noticed my biggest phone spike after lunch.",
        awareness_rating: 4,
        status: "completed",
      }),
    );
    expect(preferenceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        onboarding_completed: true,
        first_scorecard_date: "2026-03-27",
      }),
      { onConflict: "user_id" },
    );
  });
});
