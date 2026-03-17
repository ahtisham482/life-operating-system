# Habits Redesign — Full Context for Continuation

## Status: Phase 1 COMPLETE. Phase 2 awaiting execution.

---

## What Was Done

Phase 1 research is complete. Two deliverables were produced:
- **Table A: UX Pattern Matrix** (20 patterns from 12 apps, prioritized P0-P2)
- **Table B: Book Principles → Feature Translation** (12 principles mapped to UI features)

The user approved the direction. Phase 2 (schema + migration + UI spec) is next.

---

## Current Architecture (what exists today)

**Files:**
- `app/(dashboard)/habits/page.tsx` — Server component, fetches today's habit entry + 14-day history
- `app/(dashboard)/habits/habit-form.tsx` — Client component with checkboxes, debounced autosave
- `app/(dashboard)/habits/actions.ts` — `upsertHabitEntry(date, day, habits, notes)` server action
- `lib/db/schema.ts` — `HabitChecks` type (14 hardcoded booleans), `habitEntries` table
- `lib/pulse.ts` — Pulse Score reads `habitsCompleted / habitsTotal` for 30% weight
- `lib/mirror/signals.ts` — Mirror AI receives `{ type: "habit", context: { completion_rate, habits_done, total_habits } }`

**Database table: `habit_entries`**
- `id` (uuid PK), `day` (text), `date` (date, UNIQUE), `habits` (jsonb — HabitChecks), `notes` (text nullable), `created_at` (timestamptz)

**HabitChecks type (14 hardcoded habits):**
```typescript
type HabitChecks = {
  quickAction: boolean; exercise: boolean; clothes: boolean; actionLog: boolean;
  readAM: boolean; readPM: boolean; skillStudy: boolean; bike: boolean;
  needDesire: boolean; cashRecall: boolean; leftBy9: boolean; tafseer: boolean;
  phoneOutBy10: boolean; weekendPlan: boolean;
};
```

**Integration points that MUST survive:**
1. **Pulse Score** (`lib/pulse.ts`): `habitRatio = habitsCompleted / habitsTotal; habitScore = habitRatio * 30`
2. **Mirror AI** (`lib/mirror/signals.ts`): Logs `{ type: "habit", context: { completion_rate, habits_done, total_habits } }` to `interactions` table
3. **Dashboard** (`app/(dashboard)/dashboard/dashboard-content.tsx`): Displays today's habit completion count
4. **Check-in** (`app/(dashboard)/checkin/actions.ts`): Revalidates `/habits` cache

---

## Phase 1 Results: Key Decisions

### P0 Features (must have — makes it functional):
1. **User-created custom habits** — add/edit/delete (currently hardcoded)
2. **One-tap completion** with satisfying animation (48px+ touch target, Framer Motion)
3. **Flexible scheduling** — daily, weekdays, weekends, custom days
4. **Streak counter with best-ever record** — computed from habit_logs
5. **"Don't miss twice" grace period** — 1 miss = amber warning, 2 consecutive = reset
6. **Time-of-day grouping** — morning/afternoon/evening with user-defined groups

### P1 Features (makes it insightful):
7. Celebration animation on completion (confetti at milestones)
8. Monthly/90-day completion calendar (GitHub-style heatmap per habit)
9. Completion rate trends (7d/30d/90d stats)
10. Per-habit notes ("why I skipped")
11. Drag-to-reorder habits within groups
12. Habit archiving (hide without deleting)
13. Skip state (ternary: done/skipped/missed)

### P2 Features (future — nice to have):
14-20. Failure diagnosis, templates, negative habit tracking, adaptive notifications, etc.

### What NOT to do:
- No gamification/RPG (doesn't fit design language)
- No social/community features (single-user app)
- No guided journeys (heavy content burden)
- No native health API integration (PWA limitation)

---

## Phase 2: What Needs to Be Produced

### 1. New Table Schemas
- `habits` table — user's habit definitions (name, emoji, group_id, schedule_type, schedule_days, sort_order, archived_at, etc.)
- `habit_groups` table — user-defined groups (name, sort_order, time_of_day)
- `habit_logs` table — one row per habit per day per user (status: completed/skipped/missed, note, etc.)

### 2. Migration SQL
- Create new tables
- Backfill from existing `habit_entries.habits` JSONB → new `habit_logs` rows
- Create compatibility view (`habit_completion_summary`) for Pulse Score + Mirror AI
- Do NOT delete old `habits` JSONB column yet (deprecate, don't destroy)

### 3. Integration Adapter
- How Pulse Score's 30% calculation reads from new schema
- How Mirror AI's signal reads from new schema
- Compatibility path so nothing breaks

### 4. UI Specification (for each P0 feature)
- Trigger (user action)
- Visual behavior (animation, state change)
- Data flow (client → optimistic update → server action → Supabase → error rollback)
- Mobile interaction (375px, touch input)

---

## Tech Stack
- Next.js 15 App Router (server components + server actions)
- Supabase (PostgreSQL + RLS)
- Framer Motion (already installed)
- @dnd-kit (already installed for drag-and-drop)
- Tailwind CSS with glassmorphism dark theme (coral #FF6B6B, warm white #FFF8F0, dark backgrounds)
- TypeScript strict mode

---

## Prompt to Continue

Paste this into Claude.ai to continue:

```
You are redesigning the Habits system for a Life Operating System app. Phase 1 (competitive UX research + behavioral science research) is COMPLETE and approved.

Now execute Phase 2: Architecture & Migration Plan.

Read the file docs/habits-redesign-context.md in the repo for full context on what exists today, what was decided, and what Phase 2 must deliver.

Deliverables:
1. Complete SQL schema for new tables (habits, habit_groups, habit_logs)
2. Migration SQL with backfill from existing habit_entries JSONB
3. Compatibility view SQL for Pulse Score + Mirror AI
4. Integration adapter explanation
5. UI specification for each P0 feature (trigger, visual, data flow, mobile)

Present for approval. Do not write implementation code yet.
```
