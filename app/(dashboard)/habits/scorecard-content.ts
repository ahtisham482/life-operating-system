import type { ScorecardRating } from "@/lib/db/schema";

export type ScorecardOnboardingStep = {
  step: number;
  title: string;
  icon: string;
  description: string;
  actionLabel: string;
};

export type ScorecardTemplateBehavior = {
  time: string;
  behavior: string;
  category: string;
  suggestedRating: ScorecardRating;
};

export type ScorecardTemplateSection = {
  label: string;
  timeRange: string;
  prompts: string[];
  behaviors: ScorecardTemplateBehavior[];
};

export const SCORECARD_ONBOARDING_STEPS: ScorecardOnboardingStep[] = [
  {
    step: 1,
    title: "You Can’t Change What You Can’t See",
    icon: "🔍",
    description:
      "Most daily behaviors run on autopilot. The scorecard turns them into visible data so awareness can do its work.",
    actionLabel: "I want to see clearly",
  },
  {
    step: 2,
    title: "No Judgment, Only Observation",
    icon: "🧘",
    description:
      "You’re acting like a scientist, not a critic. “I checked my phone for 40 minutes” is information, not failure.",
    actionLabel: "I’ll observe without judgment",
  },
  {
    step: 3,
    title: "Rate the Vote",
    icon: "📋",
    description:
      "Use + when a behavior supports who you want to become, - when it works against that identity, and = when it’s neutral.",
    actionLabel: "Show me how it works",
  },
  {
    step: 4,
    title: "Map Yesterday From Memory",
    icon: "✍️",
    description:
      "We’ll walk through yesterday with prompts and starter behaviors. It does not need to be perfect. Honest is enough.",
    actionLabel: "Start mapping yesterday",
  },
];

export const SCORECARD_TEMPLATE_SECTIONS: ScorecardTemplateSection[] = [
  {
    label: "Wake Up",
    timeRange: "06:00-08:00",
    prompts: [
      "What was the first thing you did after waking up?",
      "Did you reach for your phone before getting out of bed?",
    ],
    behaviors: [
      { time: "06:30", behavior: "Wake up", category: "routine", suggestedRating: "=" },
      {
        time: "06:35",
        behavior: "Check phone immediately",
        category: "phone",
        suggestedRating: "-",
      },
      {
        time: "06:40",
        behavior: "Drink water",
        category: "health",
        suggestedRating: "+",
      },
      {
        time: "06:45",
        behavior: "Brush teeth",
        category: "hygiene",
        suggestedRating: "+",
      },
    ],
  },
  {
    label: "Morning Routine",
    timeRange: "08:00-10:00",
    prompts: [
      "What did you do to get ready for the day?",
      "Was there movement, breakfast, or mindless scrolling?",
    ],
    behaviors: [
      {
        time: "08:00",
        behavior: "Eat breakfast",
        category: "food",
        suggestedRating: "+",
      },
      {
        time: "08:15",
        behavior: "Scroll social media",
        category: "social_media",
        suggestedRating: "-",
      },
      {
        time: "08:30",
        behavior: "Exercise or stretch",
        category: "exercise",
        suggestedRating: "+",
      },
    ],
  },
  {
    label: "Morning Work",
    timeRange: "10:00-12:00",
    prompts: [
      "What did you work on first?",
      "Did you focus, procrastinate, or bounce between tabs?",
    ],
    behaviors: [
      {
        time: "10:00",
        behavior: "Deep focused work",
        category: "work",
        suggestedRating: "+",
      },
      {
        time: "10:30",
        behavior: "Check email",
        category: "work",
        suggestedRating: "=",
      },
      {
        time: "11:00",
        behavior: "Browse internet aimlessly",
        category: "phone",
        suggestedRating: "-",
      },
    ],
  },
  {
    label: "Midday",
    timeRange: "12:00-14:00",
    prompts: [
      "What did you do for lunch or your break?",
      "Did you actually rest or default to a screen?",
    ],
    behaviors: [
      {
        time: "12:30",
        behavior: "Eat lunch",
        category: "food",
        suggestedRating: "=",
      },
      {
        time: "12:45",
        behavior: "Take a walk",
        category: "exercise",
        suggestedRating: "+",
      },
      {
        time: "13:00",
        behavior: "Scroll phone during lunch",
        category: "phone",
        suggestedRating: "-",
      },
    ],
  },
  {
    label: "Afternoon",
    timeRange: "14:00-18:00",
    prompts: [
      "How was your energy later in the day?",
      "What happened during the slump hours?",
    ],
    behaviors: [
      {
        time: "15:00",
        behavior: "Focused work session",
        category: "work",
        suggestedRating: "+",
      },
      {
        time: "15:30",
        behavior: "Social media break",
        category: "social_media",
        suggestedRating: "-",
      },
      {
        time: "16:00",
        behavior: "Snack mindlessly",
        category: "food",
        suggestedRating: "-",
      },
    ],
  },
  {
    label: "Evening",
    timeRange: "18:00-22:00",
    prompts: [
      "How did you transition out of work mode?",
      "Did your evening build you up or drain you?",
    ],
    behaviors: [
      {
        time: "18:30",
        behavior: "Cook dinner",
        category: "household",
        suggestedRating: "+",
      },
      {
        time: "19:30",
        behavior: "Spend time with family or friends",
        category: "social",
        suggestedRating: "+",
      },
      {
        time: "20:00",
        behavior: "Watch TV or Netflix",
        category: "entertainment",
        suggestedRating: "-",
      },
    ],
  },
  {
    label: "Night",
    timeRange: "22:00-23:59",
    prompts: [
      "What was the last thing you did before sleeping?",
      "Was your bedtime routine deliberate or automatic?",
    ],
    behaviors: [
      {
        time: "22:15",
        behavior: "Journal or reflect",
        category: "meditation",
        suggestedRating: "+",
      },
      {
        time: "22:30",
        behavior: "Scroll phone in bed",
        category: "phone",
        suggestedRating: "-",
      },
      {
        time: "22:45",
        behavior: "Go to sleep on time",
        category: "sleep",
        suggestedRating: "+",
      },
    ],
  },
];
