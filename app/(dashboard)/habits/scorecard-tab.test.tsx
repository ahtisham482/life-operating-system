import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScorecardTab } from "./scorecard-tab";
import type { ScorecardDay } from "@/lib/db/schema";
import type { ScorecardScreenData } from "@/lib/scorecard";

const SCORECARD_ID = "11111111-1111-4111-8111-111111111111";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";
const IDENTITY_ID = "33333333-3333-4333-8333-333333333333";

function createScorecardDay(overrides: Partial<ScorecardDay> = {}): ScorecardDay {
  return {
    id: SCORECARD_ID,
    userId: "user-1",
    scorecardDate: "2026-03-27",
    dayType: "normal",
    dayLabel: null,
    morningIntention: null,
    eveningReflection: null,
    awarenessRating: null,
    totalEntries: 1,
    positiveCount: 1,
    negativeCount: 0,
    neutralCount: 0,
    positivePercentage: "100.00",
    negativePercentage: "0.00",
    totalPositiveMinutes: 20,
    totalNegativeMinutes: 0,
    totalNeutralMinutes: 0,
    dayScore: 60,
    status: "in_progress",
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createScreenData(
  overrides: Partial<ScorecardScreenData> = {},
): ScorecardScreenData {
  return {
    scorecard: createScorecardDay(),
    timeline: [
      {
        id: ENTRY_ID,
        rawTime: "07:30:00",
        time: "7:30 AM",
        rawEndTime: null,
        endTime: null,
        rawDurationMinutes: 20,
        duration: "20 min",
        behavior: "Read a book",
        category: "learning",
        categoryIcon: "📚",
        rating: "+",
        ratingLabel: "Builds the person you want to become",
        ratingTone: "positive",
        ratingReason: "It supports my reader identity.",
        emotionalState: "calm",
        energyLevel: "high",
        wasAutomatic: false,
        location: "home",
        chainedFromId: null,
        identityLink: {
          identityId: IDENTITY_ID,
          alignment: "supports",
        },
      },
    ],
    liveStats: {
      totalEntries: 1,
      positive: 1,
      negative: 0,
      neutral: 0,
      positivePercentage: 100,
      negativePercentage: 0,
      currentDayScore: 60,
      dayScoreTone: "positive",
    },
    timeBreakdown: {
      byCategory: [
        {
          category: "learning",
          icon: "📚",
          totalMinutes: 20,
          formattedTime: "20 min",
          count: 1,
          dominantRating: "+",
        },
      ],
      byTimeOfDay: [
        {
          slot: "early_morning",
          slotLabel: "Early Morning",
          positive: 1,
          negative: 0,
          neutral: 0,
          dominant: "positive",
        },
      ],
      totalTrackedMinutes: 20,
    },
    activeIdentities: [
      {
        id: IDENTITY_ID,
        identityStatement: "I am a reader",
        color: "#FF6B6B",
        icon: "📚",
      },
    ],
    onboardingState: {
      completed: true,
      needsOnboarding: false,
      starterDate: "2026-03-26",
      starterDateLabel: "Thursday, March 26, 2026",
    },
    dateLabel: "Friday, March 27, 2026",
    ...overrides,
  };
}

function createActions(overrides: Partial<Parameters<typeof ScorecardTab>[0]["actions"]> = {}) {
  const successData = createScreenData();
  return {
    startScorecard: vi.fn().mockResolvedValue({ success: true, data: successData }),
    saveMorningIntention: vi.fn().mockResolvedValue({ success: true, data: successData }),
    createScorecardEntry: vi.fn().mockResolvedValue({ success: true, data: successData }),
    bulkCreateScorecardEntries: vi
      .fn()
      .mockResolvedValue({ success: true, data: successData }),
    updateScorecardEntry: vi.fn().mockResolvedValue({ success: true, data: successData }),
    deleteScorecardEntry: vi.fn().mockResolvedValue({ success: true, data: successData }),
    completeScorecard: vi.fn().mockResolvedValue({ success: true, data: successData }),
    ...overrides,
  };
}

describe("ScorecardTab", () => {
  it("shows onboarding and starts the guided yesterday flow", async () => {
    const actions = createActions();
    render(
      <ScorecardTab
        initialData={createScreenData({
          scorecard: null,
          timeline: [],
          onboardingState: {
            completed: false,
            needsOnboarding: true,
            starterDate: "2026-03-26",
            starterDateLabel: "Thursday, March 26, 2026",
          },
          dateLabel: null,
        })}
        actions={actions}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "I want to see clearly" }));
    fireEvent.click(
      screen.getByRole("button", { name: /I.?ll observe without judgment/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Show me how it works" }));
    fireEvent.click(screen.getByRole("button", { name: "Start mapping yesterday" }));

    await waitFor(() =>
      expect(actions.startScorecard).toHaveBeenCalledWith({
        scorecardDate: "2026-03-26",
        dayLabel: "First guided scorecard",
      }),
    );
  });

  it("shows the empty state after onboarding and starts today on request", async () => {
    const actions = createActions();
    render(
      <ScorecardTab
        initialData={createScreenData({
          scorecard: null,
          timeline: [],
          onboardingState: {
            completed: true,
            needsOnboarding: false,
            starterDate: "2026-03-26",
            starterDateLabel: "Thursday, March 26, 2026",
          },
          dateLabel: null,
        })}
        actions={actions}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start today" }));

    await waitFor(() => expect(actions.startScorecard).toHaveBeenCalledWith({}));
  });

  it("adds a new entry from the main form", async () => {
    const actions = createActions();
    render(<ScorecardTab initialData={createScreenData()} actions={actions} />);

    fireEvent.change(screen.getByLabelText("Time of action"), {
      target: { value: "08:45" },
    });
    fireEvent.change(screen.getByLabelText("Behavior description"), {
      target: { value: "Deep work session" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() =>
      expect(actions.createScorecardEntry).toHaveBeenCalledWith({
        scorecardId: SCORECARD_ID,
        entry: expect.objectContaining({
          timeOfAction: "08:45",
          behaviorDescription: "Deep work session",
        }),
      }),
    );
  });

  it("opens edit mode and deletes existing entries", async () => {
    const actions = createActions();
    render(<ScorecardTab initialData={createScreenData()} actions={actions} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Behavior description"), {
      target: { value: "Edited reading block" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(actions.updateScorecardEntry).toHaveBeenCalledWith({
        entryId: ENTRY_ID,
        updates: expect.objectContaining({
          behaviorDescription: "Edited reading block",
        }),
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(actions.deleteScorecardEntry).toHaveBeenCalledWith({ entryId: ENTRY_ID }),
    );
  });

  it("supports guided bulk add and day completion", async () => {
    const actions = createActions();
    render(<ScorecardTab initialData={createScreenData()} actions={actions} />);

    fireEvent.click(screen.getByRole("button", { name: "Map a stretch of the day" }));
    fireEvent.click(screen.getByText("Check phone immediately"));
    fireEvent.click(screen.getByRole("button", { name: "Add selected entries" }));

    await waitFor(() =>
      expect(actions.bulkCreateScorecardEntries).toHaveBeenCalledWith({
        scorecardId: SCORECARD_ID,
        entries: [
          expect.objectContaining({
            behaviorDescription: "Check phone immediately",
            timeOfAction: "06:35",
            rating: "-",
          }),
        ],
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Complete scorecard" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Complete scorecard" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(
      within(dialog).getByPlaceholderText(
        "Example: I noticed I checked my phone after almost every focused task. The behavior felt automatic, especially when my energy dipped.",
      ),
      {
        target: { value: "I noticed my energy drop triggered my phone use." },
      },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /5\s+Sharp/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Complete scorecard" }));

    await waitFor(() =>
      expect(actions.completeScorecard).toHaveBeenCalledWith({
        scorecardId: SCORECARD_ID,
        eveningReflection: "I noticed my energy drop triggered my phone use.",
        awarenessRating: 5,
      }),
    );
  });

  it("shows the completed state clearly", () => {
    render(
      <ScorecardTab
        initialData={createScreenData({
          scorecard: createScorecardDay({ status: "completed", awarenessRating: 4 }),
        })}
        actions={createActions()}
      />,
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update completion" })).toBeInTheDocument();
  });
});
