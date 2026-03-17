import {
  pgTable, uuid, text, boolean, integer, date,
  timestamp, primaryKey, jsonb, numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────
// MASTER TASKS
// ─────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskName: text("task_name").notNull(),
  status: text("status").$type<"To Do" | "In Progress" | "Done">()
    .default("To Do").notNull(),
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
  frequency: text("frequency").$type<"Daily" | "Weekly" | "Monthly" | "Custom">(),
  repeatEveryDays: integer("repeat_every_days"),
  sortOrder: integer("sort_order").default(0),
  lastGenerated: date("last_generated"),
  parentProjectId: uuid("parent_project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
    taskId: uuid("task_id").notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id").notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }) })
);

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
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
}));

// ─────────────────────────────────────────
// DAILY HABIT TRACKER
// ─────────────────────────────────────────
export type HabitChecks = {
  quickAction: boolean; exercise: boolean; clothes: boolean;
  actionLog: boolean; readAM: boolean; readPM: boolean;
  skillStudy: boolean; bike: boolean; needDesire: boolean;
  cashRecall: boolean; leftBy9: boolean; tafseer: boolean;
  phoneOutBy10: boolean; weekendPlan: boolean;
};

export const habitEntries = pgTable("habit_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  day: text("day").notNull(),
  date: date("date").notNull().unique(),
  habits: jsonb("habits").notNull().$type<HabitChecks>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────
// BOOK ACTION ITEMS
// ─────────────────────────────────────────
export const bookActionItems = pgTable("book_action_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionItem: text("action_item").notNull(),
  bookName: text("book_name").notNull(),
  status: text("status")
    .$type<"To Do" | "Blocked" | "In Progress" | "Done" | "Abandoned">()
    .default("To Do").notNull(),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: text("phase_name").$type<
    | "Phase 1 - Foundation" | "Phase 2 - Deep Practice"
    | "Phase 3 - Integration" | "Phase 4 - Mastery" | "Phase 5 - Teaching"
  >().notNull(),
  itemType: text("item_type").$type<
    "📋 Action" | "🔁 Habit" | "📝 Reflection" | "🎯 Milestone"
  >().notNull(),
  order: integer("order").notNull(),
  lifeArea: text("life_area").$type<
    "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life"
  >(),
  inputNeeded: boolean("input_needed").default(false).notNull(),
  dependsOn: text("depends_on"),
  pageContent: text("page_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────
// JOURNAL ENTRIES
// ─────────────────────────────────────────
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  entry: text("entry").notNull(),
  mood: text("mood").$type<
    "😊 Good" | "😐 Neutral" | "😔 Low" | "🔥 Fired Up" | "😤 Frustrated"
  >().notNull(),
  category: text("category").$type<
    "General" | "Dopamine Reset" | "Financial" | "Work" | "Mindset"
  >().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────
// DAILY EXPENSES
// ─────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  item: text("item").notNull(),
  amountPkr: numeric("amount_pkr", { precision: 10, scale: 2 }).notNull(),
  category: text("category").$type<
    | "Food & Drinks" | "Transport" | "Bills & Utilities" | "Shopping"
    | "Health" | "Business" | "Entertainment" | "Other"
  >().notNull(),
  date: date("date").notNull(),
  type: text("type").$type<"Need" | "Desire">().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Type exports
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type HabitEntry = typeof habitEntries.$inferSelect;
export type BookActionItem = typeof bookActionItems.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type EngineLog = typeof engineLogs.$inferSelect;
