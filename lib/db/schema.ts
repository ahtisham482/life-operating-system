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
  logs: many(habitLogs),
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
