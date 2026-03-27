import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must use YYYY-MM-DD format.",
});

const rawTimeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, {
  message: "Time must use HH:MM format.",
});

const normalizedTimeSchema = rawTimeSchema.transform((value) =>
  value.length === 5 ? `${value}:00` : value,
);

const optionalTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      return value.length > 0 ? value : null;
    });

export const scorecardRatingSchema = z.enum(["+", "-", "="], {
  message: "Rating must be +, -, or =.",
});

export const scorecardDayTypeSchema = z.enum([
  "normal",
  "weekend",
  "holiday",
  "travel",
  "sick",
]);

export const identityAlignmentSchema = z.enum([
  "supports",
  "opposes",
  "neutral",
]);

export const scorecardStatusSchema = z.enum(["in_progress", "completed"]);

export const energyLevelSchema = z.enum(["high", "medium", "low"]);

export const triggerTypeSchema = z.enum([
  "time",
  "location",
  "emotion",
  "preceding_action",
  "other_people",
  "other",
]);

export const startScorecardSchema = z.object({
  scorecardDate: dateStringSchema.optional(),
  dayType: scorecardDayTypeSchema.optional(),
  dayLabel: optionalTrimmedText(100),
  morningIntention: optionalTrimmedText(400),
});

export const saveMorningIntentionSchema = z.object({
  scorecardId: z.string().uuid("Scorecard ID must be a valid UUID."),
  morningIntention: optionalTrimmedText(400),
});

export const scorecardEntryInputSchema = z.object({
  timeOfAction: normalizedTimeSchema,
  endTime: normalizedTimeSchema.optional().nullable(),
  durationMinutes: z
    .number()
    .int()
    .min(0, "Duration must be 0 or greater.")
    .max(1440, "Duration must be within one day.")
    .optional()
    .nullable(),
  behaviorDescription: z
    .string()
    .trim()
    .min(1, "Behavior is required.")
    .max(500, "Behavior must be 500 characters or fewer."),
  behaviorCategory: optionalTrimmedText(50),
  rating: scorecardRatingSchema,
  ratingReason: optionalTrimmedText(500),
  linkedIdentityId: z
    .string()
    .uuid("Linked identity must be a valid UUID.")
    .optional()
    .nullable(),
  identityAlignment: identityAlignmentSchema.optional().nullable(),
  location: optionalTrimmedText(100),
  energyLevel: energyLevelSchema.optional().nullable(),
  emotionalState: optionalTrimmedText(30),
  wasAutomatic: z.boolean().optional(),
  triggeredByEntryId: z
    .string()
    .uuid("Trigger entry must be a valid UUID.")
    .optional()
    .nullable(),
  triggerType: triggerTypeSchema.optional().nullable(),
});

export const createScorecardEntrySchema = z.object({
  scorecardId: z.string().uuid("Scorecard ID must be a valid UUID."),
  entry: scorecardEntryInputSchema,
});

export const bulkCreateScorecardEntriesSchema = z.object({
  scorecardId: z.string().uuid("Scorecard ID must be a valid UUID."),
  entries: z
    .array(scorecardEntryInputSchema)
    .min(1, "Add at least one entry.")
    .max(96, "Too many entries for one scorecard."),
});

export const updateScorecardEntrySchema = z.object({
  entryId: z.string().uuid("Entry ID must be a valid UUID."),
  updates: scorecardEntryInputSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update.",
  ),
});

export const deleteScorecardEntrySchema = z.object({
  entryId: z.string().uuid("Entry ID must be a valid UUID."),
});

export const completeScorecardSchema = z.object({
  scorecardId: z.string().uuid("Scorecard ID must be a valid UUID."),
  eveningReflection: optionalTrimmedText(800),
  awarenessRating: z
    .number()
    .int()
    .min(1, "Awareness rating must be between 1 and 5.")
    .max(5, "Awareness rating must be between 1 and 5."),
});

export type StartScorecardInput = z.infer<typeof startScorecardSchema>;
export type SaveMorningIntentionInput = z.infer<
  typeof saveMorningIntentionSchema
>;
export type ScorecardEntryInput = z.infer<typeof scorecardEntryInputSchema>;
export type CreateScorecardEntryInput = z.infer<
  typeof createScorecardEntrySchema
>;
export type BulkCreateScorecardEntriesInput = z.infer<
  typeof bulkCreateScorecardEntriesSchema
>;
export type UpdateScorecardEntryInput = z.infer<
  typeof updateScorecardEntrySchema
>;
export type DeleteScorecardEntryInput = z.infer<
  typeof deleteScorecardEntrySchema
>;
export type CompleteScorecardInput = z.infer<typeof completeScorecardSchema>;
