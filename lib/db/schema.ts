import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  date,
  timestamp,
  primaryKey,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────
// MASTER TASKS
// ─────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskName: text("task_name").notNull(),
  status: text("status")
    .$type<"To Do" | "In Progress" | "Done">()
    .default("To Do")
    .notNull(),
  priority: text("priority").$type<"🔴 High" | "🟡 Medium" | "🟢 Low">(),
  lifeArea: text("life_area").$type<
    "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life"
  >(),
  type: text("type").$type<
    "🏗️ Project" | "✅ Task" | "🔧 Subtask" | "🔁 Habit"
  >(),
  dueDate: date("due_date"),
  notes: text("notes"),
  pageContent: text("page_content"),
  recurring: boolean("recurring").default(false).notNull(),
  frequency: text("frequency").$type<
    "Daily" | "Weekly" | "Monthly" | "Custom"
  >(),
  repeatEveryDays: integer("repeat_every_days"),
  sortOrder: integer("sort_order").default(0),
  lastGenerated: date("last_generated"),
  parentProjectId: uuid("parent_project_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  parentProject: one(tasks, {
    fields: [tasks.parentProjectId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  dependsOn: many(taskDependencies, { relationName: "dependentTask" }),
  dependedOnBy: many(taskDependencies, { relationName: "prerequisiteTask" }),
}));

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }) }),
);

export const taskDependenciesRelations = relations(
  taskDependencies,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskDependencies.taskId],
      references: [tasks.id],
      relationName: "dependentTask",
    }),
    dependsOn: one(tasks, {
      fields: [taskDependencies.dependsOnTaskId],
      references: [tasks.id],
      relationName: "prerequisiteTask",
    }),
  }),
);

// ─────────────────────────────────────────
// DAILY HABIT TRACKER (legacy — deprecated, kept for backfill reference)
// ─────────────────────────────────────────
export type HabitChecks = {
  quickAction: boolean;
  exercise: boolean;
  clothes: boolean;
  actionLog: boolean;
  readAM: boolean;
  readPM: boolean;
  skillStudy: boolean;
  bike: boolean;
  needDesire: boolean;
  cashRecall: boolean;
  leftBy9: boolean;
  tafseer: boolean;
  phoneOutBy10: boolean;
  weekendPlan: boolean;
};

export const habitEntries = pgTable("habit_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  day: text("day").notNull(),
  date: date("date").notNull().unique(),
  habits: jsonb("habits").notNull().$type<HabitChecks>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────
// HABITS SYSTEM (v2 — normalized tables)
// ─────────────────────────────────────────
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";
export type ScheduleType = "daily" | "weekdays" | "weekends" | "custom";
export type HabitLogStatus = "completed" | "skipped" | "missed" | "pending";
export type HabitType = "build" | "break";
export type DiagnosisType = "forgot" | "too_hard" | "no_motivation";

export const habitGroups = pgTable("habit_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  timeOfDay: text("time_of_day")
    .$type<TimeOfDay>()
    .default("anytime")
    .notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  description: text("description"),
  groupId: uuid("group_id").references(() => habitGroups.id, {
    onDelete: "set null",
  }),
  scheduleType: text("schedule_type")
    .$type<ScheduleType>()
    .default("daily")
    .notNull(),
  scheduleDays: integer("schedule_days").array().default([]),
  sortOrder: integer("sort_order").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  bestStreak: integer("best_streak").default(0).notNull(),
  // Identity Engine link
  identityId: uuid("identity_id"),
  // Advanced behavioral fields
  purpose: text("purpose"),
  identity: text("identity"),
  tinyVersion: text("tiny_version"),
  anchorText: text("anchor_text"),
  habitType: text("habit_type").$type<HabitType>().default("build").notNull(),
  breakTarget: integer("break_target"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const habitLogs = pgTable("habit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  status: text("status").$type<HabitLogStatus>().default("pending").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const habitGroupsRelations = relations(habitGroups, ({ many }) => ({
  habits: many(habits),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  group: one(habitGroups, {
    fields: [habits.groupId],
    references: [habitGroups.id],
  }),
  identity: one(userIdentities, {
    fields: [habits.identityId],
    references: [userIdentities.id],
  }),
  logs: many(habitLogs),
  votes: many(habitVotes),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
}));

// ─────────────────────────────────────────
// HABIT TEMPLATES (pre-built starter habits)
// ─────────────────────────────────────────
export const habitTemplates = pgTable("habit_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  category: text("category").notNull(),
  defaultSchedule: text("default_schedule").default("daily").notNull(),
  purpose: text("purpose"),
  tinyVersion: text("tiny_version"),
  anchorText: text("anchor_text"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// ─────────────────────────────────────────
// HABIT DIAGNOSES (B=MAP failure analysis)
// ─────────────────────────────────────────
export const habitDiagnoses = pgTable("habit_diagnoses", {
  id: uuid("id").defaultRandom().primaryKey(),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  diagnosis: text("diagnosis").$type<DiagnosisType>().notNull(),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
});

export const habitDiagnosesRelations = relations(habitDiagnoses, ({ one }) => ({
  habit: one(habits, {
    fields: [habitDiagnoses.habitId],
    references: [habits.id],
  }),
}));

// ─────────────────────────────────────────
// BOOK ACTION ITEMS
// ─────────────────────────────────────────
export const bookActionItems = pgTable("book_action_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionItem: text("action_item").notNull(),
  bookName: text("book_name").notNull(),
  status: text("status")
    .$type<"To Do" | "Blocked" | "In Progress" | "Done" | "Abandoned">()
    .default("To Do")
    .notNull(),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: text("phase_name")
    .$type<
      | "Phase 1 - Foundation"
      | "Phase 2 - Deep Practice"
      | "Phase 3 - Integration"
      | "Phase 4 - Mastery"
      | "Phase 5 - Teaching"
    >()
    .notNull(),
  itemType: text("item_type")
    .$type<"📋 Action" | "🔁 Habit" | "📝 Reflection" | "🎯 Milestone">()
    .notNull(),
  order: integer("order").notNull(),
  lifeArea: text("life_area").$type<
    "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life"
  >(),
  inputNeeded: boolean("input_needed").default(false).notNull(),
  dependsOn: text("depends_on"),
  pageContent: text("page_content"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────
// JOURNAL ENTRIES
// ─────────────────────────────────────────
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  entry: text("entry").notNull(),
  mood: text("mood")
    .$type<
      "😊 Good" | "😐 Neutral" | "😔 Low" | "🔥 Fired Up" | "😤 Frustrated"
    >()
    .notNull(),
  category: text("category")
    .$type<"General" | "Dopamine Reset" | "Financial" | "Work" | "Mindset">()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────
// DAILY EXPENSES
// ─────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  item: text("item").notNull(),
  amountPkr: numeric("amount_pkr", { precision: 10, scale: 2 }).notNull(),
  category: text("category")
    .$type<
      | "Food & Drinks"
      | "Transport"
      | "Bills & Utilities"
      | "Shopping"
      | "Health"
      | "Business"
      | "Entertainment"
      | "Other"
    >()
    .notNull(),
  date: date("date").notNull(),
  type: text("type").$type<"Need" | "Desire">().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────
// ENGINE LOGS
// ─────────────────────────────────────────
export const engineLogs = pgTable("engine_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  engineName: text("engine_name").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").$type<"success" | "warning" | "error">().notNull(),
  summary: text("summary"),
  details: jsonb("details"),
});

// ─────────────────────────────────────────
// WORKSPACE EXCLUSIONS
// ─────────────────────────────────────────
export const workspaceExclusions = pgTable("workspace_exclusions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────
// IDENTITY ENGINE
// ─────────────────────────────────────────
export type IdentityCategory =
  | "health"
  | "learning"
  | "productivity"
  | "relationships"
  | "finance"
  | "creativity"
  | "spirituality"
  | "personal";

export type IdentityStatus = "active" | "paused" | "archived";
export type MilestoneType = "streak" | "votes" | "confidence";
export type ConfidenceTrigger = "vote_cast" | "reflection_saved" | "manual";

export const userIdentities = pgTable("user_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  identityStatement: text("identity_statement").notNull(),
  identityCategory: text("identity_category")
    .$type<IdentityCategory>()
    .default("personal")
    .notNull(),
  icon: text("icon"),
  color: text("color").default("#FF6B6B").notNull(),
  whyStatement: text("why_statement"),
  status: text("status").$type<IdentityStatus>().default("active").notNull(),
  confidenceLevel: integer("confidence_level").default(0).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const habitVotes = pgTable("habit_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  identityId: uuid("identity_id")
    .notNull()
    .references(() => userIdentities.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  voteDate: date("vote_date").notNull(),
  difficultyFelt: integer("difficulty_felt"),
  satisfactionRating: integer("satisfaction_rating"),
  reflectionNote: text("reflection_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const identityConfidenceLog = pgTable("identity_confidence_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  identityId: uuid("identity_id")
    .notNull()
    .references(() => userIdentities.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  confidenceLevel: integer("confidence_level").notNull(),
  loggedDate: date("logged_date").defaultNow().notNull(),
  triggerType: text("trigger_type")
    .$type<ConfidenceTrigger>()
    .default("vote_cast")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const identityReflections = pgTable("identity_reflections", {
  id: uuid("id").defaultRandom().primaryKey(),
  identityId: uuid("identity_id")
    .notNull()
    .references(() => userIdentities.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  reflectionWeek: text("reflection_week").notNull(),
  wins: text("wins"),
  challenges: text("challenges"),
  learning: text("learning"),
  nextWeekIntention: text("next_week_intention"),
  confidenceStart: integer("confidence_start"),
  confidenceEnd: integer("confidence_end"),
  totalVotes: integer("total_votes").default(0).notNull(),
  positiveVotes: integer("positive_votes").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const identityMilestones = pgTable("identity_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  identityId: uuid("identity_id")
    .notNull()
    .references(() => userIdentities.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  milestoneType: text("milestone_type").$type<MilestoneType>().notNull(),
  milestoneValue: integer("milestone_value").notNull(),
  milestoneTitle: text("milestone_title").notNull(),
  milestoneMessage: text("milestone_message").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  celebrated: boolean("celebrated").default(false).notNull(),
});

export const userIdentitiesRelations = relations(
  userIdentities,
  ({ many }) => ({
    habits: many(habits),
    votes: many(habitVotes),
    confidenceLog: many(identityConfidenceLog),
    reflections: many(identityReflections),
    milestones: many(identityMilestones),
  }),
);

export const habitVotesRelations = relations(habitVotes, ({ one }) => ({
  habit: one(habits, { fields: [habitVotes.habitId], references: [habits.id] }),
  identity: one(userIdentities, {
    fields: [habitVotes.identityId],
    references: [userIdentities.id],
  }),
}));

export const identityConfidenceLogRelations = relations(
  identityConfidenceLog,
  ({ one }) => ({
    identity: one(userIdentities, {
      fields: [identityConfidenceLog.identityId],
      references: [userIdentities.id],
    }),
  }),
);

export const identityReflectionsRelations = relations(
  identityReflections,
  ({ one }) => ({
    identity: one(userIdentities, {
      fields: [identityReflections.identityId],
      references: [userIdentities.id],
    }),
  }),
);

export const identityMilestonesRelations = relations(
  identityMilestones,
  ({ one }) => ({
    identity: one(userIdentities, {
      fields: [identityMilestones.identityId],
      references: [userIdentities.id],
    }),
  }),
);

// ─────────────────────────────────────────
// HABITS SCORECARD
// ─────────────────────────────────────────
export type ScorecardDayType =
  | "normal"
  | "weekend"
  | "holiday"
  | "travel"
  | "sick";
export type ScorecardStatusType = "in_progress" | "completed";

export const scorecardDays = pgTable("scorecard_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  scorecardDate: date("scorecard_date").notNull(),
  dayType: text("day_type")
    .$type<ScorecardDayType>()
    .default("normal")
    .notNull(),
  dayLabel: text("day_label"),
  morningIntention: text("morning_intention"),
  eveningReflection: text("evening_reflection"),
  awarenessRating: integer("awareness_rating"),
  totalEntries: integer("total_entries").default(0).notNull(),
  positiveCount: integer("positive_count").default(0).notNull(),
  negativeCount: integer("negative_count").default(0).notNull(),
  neutralCount: integer("neutral_count").default(0).notNull(),
  totalPositiveMinutes: integer("total_positive_minutes").default(0).notNull(),
  totalNegativeMinutes: integer("total_negative_minutes").default(0).notNull(),
  totalNeutralMinutes: integer("total_neutral_minutes").default(0).notNull(),
  dayScore: integer("day_score").default(0).notNull(),
  status: text("status")
    .$type<ScorecardStatusType>()
    .default("in_progress")
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scorecardEntries = pgTable("scorecard_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  scorecardId: uuid("scorecard_id")
    .notNull()
    .references(() => scorecardDays.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  timeOfAction: text("time_of_action").notNull(),
  endTime: text("end_time"),
  durationMinutes: integer("duration_minutes"),
  behaviorDescription: text("behavior_description").notNull(),
  behaviorCategory: text("behavior_category"),
  rating: text("rating").notNull(),
  ratingReason: text("rating_reason"),
  linkedIdentityId: uuid("linked_identity_id"),
  identityAlignment: text("identity_alignment"),
  location: text("location"),
  energyLevel: text("energy_level"),
  emotionalState: text("emotional_state"),
  wasAutomatic: boolean("was_automatic").default(true).notNull(),
  triggeredByEntryId: uuid("triggered_by_entry_id"),
  triggerType: text("trigger_type"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const behaviorLibrary = pgTable("behavior_library", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  behaviorName: text("behavior_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  behaviorCategory: text("behavior_category"),
  defaultRating: text("default_rating"),
  timesLogged: integer("times_logged").default(1).notNull(),
  avgDurationMinutes: numeric("avg_duration_minutes", {
    precision: 6,
    scale: 1,
  }).default("0"),
  totalMinutesSpent: integer("total_minutes_spent").default(0).notNull(),
  positiveCount: integer("positive_count").default(0).notNull(),
  negativeCount: integer("negative_count").default(0).notNull(),
  neutralCount: integer("neutral_count").default(0).notNull(),
  mostCommonTime: text("most_common_time"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  lastLoggedAt: timestamp("last_logged_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scorecardDaysRelations = relations(scorecardDays, ({ many }) => ({
  entries: many(scorecardEntries),
}));

export const scorecardEntriesRelations = relations(
  scorecardEntries,
  ({ one }) => ({
    scorecard: one(scorecardDays, {
      fields: [scorecardEntries.scorecardId],
      references: [scorecardDays.id],
    }),
  }),
);

export type ScorecardDayRecord = typeof scorecardDays.$inferSelect;
export type ScorecardEntryRecord = typeof scorecardEntries.$inferSelect;
export type BehaviorLibraryRecord = typeof behaviorLibrary.$inferSelect;

// ─────────────────────────────────────────
// INBOX TYPES (audit trail uses engine_logs)
// ─────────────────────────────────────────
export type ParsedRoute = {
  module:
    | "tasks"
    | "expenses"
    | "journal"
    | "books"
    | "weekly"
    | "season"
    | "checkin"
    | "habits";
  confidence: number;
  summary: string;
  data: Record<string, unknown>;
};

// Type exports
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type HabitEntry = typeof habitEntries.$inferSelect;
export type HabitGroup = typeof habitGroups.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type HabitTemplate = typeof habitTemplates.$inferSelect;
export type HabitDiagnosis = typeof habitDiagnoses.$inferSelect;
export type BookActionItem = typeof bookActionItems.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type EngineLog = typeof engineLogs.$inferSelect;
export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;
export type HabitVote = typeof habitVotes.$inferSelect;
export type NewHabitVote = typeof habitVotes.$inferInsert;
export type IdentityConfidenceLog = typeof identityConfidenceLog.$inferSelect;
export type IdentityReflection = typeof identityReflections.$inferSelect;
export type IdentityMilestone = typeof identityMilestones.$inferSelect;
