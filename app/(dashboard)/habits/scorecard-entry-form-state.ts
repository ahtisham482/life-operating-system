import type { ScorecardEntryInput } from "@/lib/schemas/scorecard";

export type ScorecardEntryDraft = {
  timeOfAction: string;
  endTime: string;
  durationMinutes: string;
  behaviorDescription: string;
  behaviorCategory: string;
  rating: ScorecardEntryInput["rating"];
  ratingReason: string;
  linkedIdentityId: string;
  identityAlignment: "" | "supports" | "opposes" | "neutral";
  location: string;
  energyLevel: "" | "high" | "medium" | "low";
  emotionalState: string;
  wasAutomatic: boolean;
  triggerType:
    | ""
    | "time"
    | "location"
    | "emotion"
    | "preceding_action"
    | "other_people"
    | "other";
};

export const EMPTY_SCORECARD_ENTRY_DRAFT: ScorecardEntryDraft = {
  timeOfAction: "",
  endTime: "",
  durationMinutes: "",
  behaviorDescription: "",
  behaviorCategory: "",
  rating: "=",
  ratingReason: "",
  linkedIdentityId: "",
  identityAlignment: "",
  location: "",
  energyLevel: "",
  emotionalState: "",
  wasAutomatic: true,
  triggerType: "",
};
