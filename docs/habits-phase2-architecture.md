# Phase 2: Habits Architecture & Migration Plan

## Context

The Habits system currently uses 14 hardcoded boolean habits stored as a JSONB blob in a single `habit_entries` table. Users cannot add, edit, delete, schedule, or group habits. Phase 1 research (UX patterns from 12 apps + behavioral science from 5 books) identified 6 P0 features that require a normalized schema. This plan delivers the database architecture, migration strategy, integration compatibility layer, and UI specifications to support those features — without breaking Pulse Score or Mirror AI.

---

## Deliverable 1: SQL Schema (New Tables)

### Files to create/modify:
- `lib/db/schema.ts` — Add Drizzle ORM definitions for 3 new tables
- `SUPABASE_SETUP.sql` — Add raw SQL equivalents for reference

### Table: `habit_groups`

```sql
CREATE TABLE habit_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                          -- e.g. "Morning Ritual"
  emoji       text,                                   -- optional group emoji
  time_of_day text NOT NULL DEFAULT 'anytime'
              CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_habit_groups_sort ON habit_groups(sort_order);
```

### Table: `habits`

```sql
CREATE TABLE habits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                      -- e.g. "Exercise"
  emoji           text,                               -- e.g. "🏋️"
  description     text,                               -- tiny version hint (Atomic Habits "2-min rule")
  group_id        uuid REFERENCES habit_groups(id) ON DELETE SET NULL,
  schedule_type   text NOT NULL DEFAULT 'daily'
                  CHECK (schedule_type IN ('daily','weekdays','weekends','custom')),
  schedule_days   integer[] DEFAULT '{}'::integer[],  -- 0=Sun..6=Sat, used when schedule_type='custom'
  sort_order      integer NOT NULL DEFAULT 0,
  current_streak  integer NOT NULL DEFAULT 0,
  best_streak     integer NOT NULL DEFAULT 0,
  archived_at     timestamptz,                        -- NULL = active, set = soft-deleted
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_habits_group ON habits(group_id);
CREATE INDEX idx_habits_active ON habits(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_habits_sort ON habits(group_id, sort_order);
```

### Table: `habit_logs`

```sql
CREATE TABLE habit_logs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id  uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date      date NOT NULL,
  status    text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('completed','skipped','missed','pending')),
  note      text,                                     -- "why I skipped" (P1 but schema-ready)
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (habit_id, date)
);

CREATE INDEX idx_habit_logs_date ON habit_logs(date);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, date DESC);
CREATE INDEX idx_habit_logs_status ON habit_logs(date, status);
```

### Design decisions:
- **No user_id** — single-user app (consistent with every other table)
- **UUIDs** — consistent with `tasks`, `expenses`, `journal_entries`, etc.
- **`schedule_days` as int[]** — `daily` = all days, `weekdays` = [1,2,3,4,5], `weekends` = [0,6], `custom` = user picks
- **`pending` status** — default for today's unacted habits; end-of-day job or next-day load marks pending → missed
- **Streak on `habits` row** — denormalized for fast reads; updated by server action on toggle
- **`archived_at`** — soft delete preserves all `habit_logs` history

---

## Deliverable 2: Migration SQL with Backfill

### Step 1: Create tables (DDL above)

### Step 2: Seed default groups from current hardcoded grouping

```sql
-- Matches current habit-form.tsx grouping
INSERT INTO habit_groups (id, name, emoji, time_of_day, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Morning Ritual',    '🌅', 'morning',   0),
  ('22222222-2222-2222-2222-222222222222', 'Daytime Focus',     '☀️', 'afternoon',  1),
  ('33333333-3333-3333-3333-333333333333', 'Evening Wind-Down', '🌙', 'evening',    2);
```

### Step 3: Backfill habits table from the 14 hardcoded habits

```sql
-- Map each hardcoded habit key → name, emoji, group, schedule, sort_order
INSERT INTO habits (name, emoji, group_id, schedule_type, schedule_days, sort_order) VALUES
  -- Morning Ritual (group 111...)
  ('Left by 9',       '🚪', '11111111-1111-1111-1111-111111111111', 'weekdays', '{1,2,3,4,5}', 0),
  ('Exercise',        '🏋️', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          1),
  ('Clothes Ready',   '👔', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          2),
  ('Read AM',         '📖', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          3),
  ('Quick Action',    '⚡', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          4),
  -- Daytime Focus (group 222...)
  ('Action Log',      '📋', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          0),
  ('Skill Study',     '🎯', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          1),
  ('Bike',            '🚴', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          2),
  ('Need vs Desire',  '🧠', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          3),
  ('Cash Recall',     '💰', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          4),
  -- Evening Wind-Down (group 333...)
  ('Read PM',         '📚', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          0),
  ('Tafseer',         '📿', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          1),
  ('Phone Out by 10', '📵', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          2),
  ('Weekend Plan',    '📅', '33333333-3333-3333-3333-333333333333', 'weekends', '{0,6}',       3);
```

### Step 4: Backfill habit_logs from existing habit_entries JSONB

```sql
-- For each existing habit_entry row, create a habit_log for each completed habit
-- This uses a mapping CTE to connect JSONB keys to the new habits table rows

WITH habit_key_map AS (
  SELECT h.id AS habit_id, key
  FROM (VALUES
    ('quickAction', 'Quick Action'), ('exercise', 'Exercise'),
    ('clothes', 'Clothes Ready'),    ('actionLog', 'Action Log'),
    ('readAM', 'Read AM'),           ('readPM', 'Read PM'),
    ('skillStudy', 'Skill Study'),   ('bike', 'Bike'),
    ('needDesire', 'Need vs Desire'),('cashRecall', 'Cash Recall'),
    ('leftBy9', 'Left by 9'),        ('tafseer', 'Tafseer'),
    ('phoneOutBy10', 'Phone Out by 10'), ('weekendPlan', 'Weekend Plan')
  ) AS mapping(key, name)
  JOIN habits h ON h.name = mapping.name
)
INSERT INTO habit_logs (habit_id, date, status, created_at)
SELECT
  hkm.habit_id,
  he.date::date,
  CASE WHEN (he.habits ->> hkm.key)::boolean THEN 'completed' ELSE 'missed' END,
  he.created_at
FROM habit_entries he
CROSS JOIN habit_key_map hkm
ON CONFLICT (habit_id, date) DO NOTHING;
```

### Step 5: Compute initial streaks

```sql
-- After backfill, compute current_streak and best_streak for each habit
-- (Will be done by a server-side function after migration runs)
```

### Important: DO NOT drop `habit_entries` table. Mark as deprecated in schema comments.

---

## Deliverable 3: Compatibility View + Integration Adapter

### SQL View: `habit_completion_summary`

```sql
CREATE OR REPLACE VIEW habit_completion_summary AS
SELECT
  hl.date,
  COUNT(*) FILTER (WHERE hl.status = 'completed') AS habits_completed,
  COUNT(*) FILTER (WHERE hl.status IN ('completed', 'missed', 'pending')) AS habits_total,
  CASE
    WHEN COUNT(*) FILTER (WHERE hl.status IN ('completed', 'missed', 'pending')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE hl.status = 'completed')::numeric /
      COUNT(*) FILTER (WHERE hl.status IN ('completed', 'missed', 'pending'))::numeric * 100
    )
    ELSE 0
  END AS completion_rate
FROM habit_logs hl
JOIN habits h ON h.id = hl.habit_id
WHERE h.archived_at IS NULL
GROUP BY hl.date;
```

**Note:** `habits_total` excludes skipped days from the denominator — skips don't inflate or deflate the rate. Only completed + missed + pending count.

### Integration Changes (minimal, surgical):

#### 1. Pulse Score (`lib/pulse.ts`) — NO CHANGE to function signature
The function already takes `habitsCompleted` and `habitsTotal` as numbers. Only the **caller** changes.

#### 2. Dashboard (`app/(dashboard)/dashboard/dashboard-content.tsx`)
**Current (lines 92-100):**
```typescript
// Reads habit_entries JSONB, counts booleans, hardcodes total = 14
const habitEntry = habitRows?.[0] ? fromDb<{ habits: Record<string, boolean> }>(habitRows[0]) : null;
const habitsCompleted = habitEntry ? Object.values(habitEntry.habits).filter(Boolean).length : 0;
const habitsTotal = 14;
```

**New:**
```typescript
// Query the compatibility view instead
const { data: summaryRows } = await supabase
  .from("habit_completion_summary")
  .select("*")
  .eq("date", today)
  .limit(1);
const summary = summaryRows?.[0];
const habitsCompleted = summary?.habits_completed ?? 0;
const habitsTotal = summary?.habits_total ?? 0;
```

#### 3. Mirror AI Signal (`app/(dashboard)/habits/actions.ts`)
**Current:** Counts booleans from HabitChecks JSONB.
**New:** The new `toggleHabitLog()` server action will query today's completion summary and fire the same signal shape:
```typescript
logMirrorSignal({
  type: "habit",
  context: {
    completion_rate: summary.completion_rate,
    habits_done: summary.habits_completed,
    total_habits: summary.habits_total,
  },
});
```
Signal shape is **identical** — Mirror AI sees no change.

#### 4. Check-in revalidation — NO CHANGE needed
`revalidatePath("/habits")` continues to work since the route path doesn't change.

---

## Deliverable 4: UI Specification (P0 Features)

### P0-1: User-Created Custom Habits (Add/Edit/Delete)

**Trigger:**
- **Add:** Tap "+" button at bottom of each group section
- **Edit:** Tap habit name (inline edit)
- **Delete:** Swipe left on habit card → "Delete" button with confirmation dialog

**Visual behavior:**
- Add: Inline input field slides down with Framer Motion `animate={{ height: "auto", opacity: 1 }}`. Fields: name (required), emoji (picker), schedule. Auto-focuses name input.
- Edit: Name text morphs into editable input on tap. Save on blur or Enter.
- Delete: Swipe reveals red zone. Confirmation dialog: "Delete [habit]? History will be preserved in analytics."

**Data flow:**
- `createHabit(name, emoji, groupId, scheduleType, scheduleDays)` → server action → INSERT into `habits` → revalidate `/habits`
- `updateHabit(id, fields)` → server action → UPDATE `habits` → revalidate `/habits`
- `deleteHabit(id)` → server action → sets `archived_at = now()` (soft delete) → revalidate `/habits`

**Mobile (375px):**
- Full-width input field, 48px height
- Emoji picker: horizontal scroll row of common emojis, or type custom
- Schedule selector: segmented control (Daily | Weekdays | Weekends | Custom)
- Custom days: 7 circle buttons (S M T W T F S) with toggle

---

### P0-2: One-Tap Completion with Satisfying Animation

**Trigger:** Tap anywhere on habit card (48px+ min height, full width)

**Visual behavior:**
1. **Optimistic toggle** — card immediately transitions:
   - Uncompleted → Completed: emerald (#34D399) left border glow, scale spring `1.02` → `1.0` over 300ms, checkmark fades in
   - Completed → Uncompleted: glow fades, scale `0.98` → `1.0`, checkmark fades out
2. Framer Motion config: `transition={{ type: "spring", stiffness: 400, damping: 25 }}`
3. On streak milestones (7, 21, 30, 66 days): confetti CSS particles burst from card center

**Data flow:**
```
User tap → setState (optimistic) → animation fires immediately (no server wait)
         → server action toggleHabitLog(habitId, date, newStatus)
         → UPSERT habit_logs (habit_id, date, status)
         → UPDATE habits SET current_streak, best_streak (recomputed)
         → logMirrorSignal({ type: "habit", context: { completion_rate, habits_done, total_habits } })
         → revalidatePath("/habits", "/dashboard")
         → On error: rollback local state + show toast "Couldn't save, try again"
```

**Mobile (375px):**
- Card: full width, min-height 56px, padding 12px 16px
- Touch target: entire card surface
- Haptic: `navigator.vibrate?.(50)` on completion (progressive enhancement)
- Undo: 3-second toast at bottom with "Undo" action

---

### P0-3: Flexible Scheduling

**Trigger:** During habit creation or via edit (tap habit → edit schedule)

**Visual behavior:**
- Segmented control with 4 options: `Daily` | `Weekdays` | `Weekends` | `Custom`
- Active segment: coral fill (#FF6B6B), white text
- Inactive: transparent, muted text
- Custom: reveals 7 day-circle toggles (S M T W T F S). Selected = coral fill, unselected = glass border
- Transition: `AnimatePresence` for custom days row sliding in/out

**Data flow:**
- On schedule change → `updateHabit(id, { scheduleType, scheduleDays })` server action
- Daily view filters: only show habits where today's day-of-week is in schedule
- **Unscheduled habits:** Collapsed "Not Today" section at bottom of page, dimmed at 40% opacity. Tap to expand. Can still complete for "bonus" (creates a habit_log, doesn't affect streak).

**Mobile (375px):**
- Segmented control: full width, 40px height, rounded-lg
- Day circles: 36px each, evenly spaced, gap-2
- "Not Today" section: collapsed by default, tap header to expand

---

### P0-4: Streak Counter with Best-Ever Record

**Trigger:** Automatic — displayed on every habit card

**Visual behavior:**
- Streak badge on right side of habit card: `🔥 12` (current) with `best: 34` in smaller muted text below
- Streak ≥ 2: fire emoji visible
- Streak = 0: no badge shown (clean)
- On new best-ever: badge pulses gold (#FFD93D glow) for 1 second
- Milestone markers: at 7, 21, 30, 66, 100 — special confetti + "New milestone!" toast

**Data flow:**
- Streaks stored on `habits` row: `current_streak`, `best_streak`
- On each `toggleHabitLog()`:
  1. Query recent `habit_logs` for this habit, ordered by date DESC
  2. Walk backwards counting consecutive completed (or skipped) scheduled days
  3. Apply "don't miss twice" grace: 1 missed scheduled day is forgiven if next scheduled day is completed
  4. Update `current_streak` and `best_streak = MAX(current_streak, best_streak)`
- Streak recomputation is server-side only (no client guess)

**Mobile (375px):**
- Badge: right-aligned, 🔥 + number in semi-bold, 14px
- Best record: below streak, 10px muted text
- Milestone toast: bottom-center, auto-dismiss 3s

---

### P0-5: "Don't Miss Twice" Grace Period

**Trigger:** Automatic — part of streak calculation algorithm

**Streak Algorithm (pseudocode):**
```
function computeStreak(habitId, scheduledDays):
  logs = getLogsDescending(habitId)  // most recent first
  streak = 0
  gracePeriodUsed = false

  for each scheduledDay going backwards from today:
    log = findLog(logs, scheduledDay)

    if log.status == 'completed':
      streak++
      gracePeriodUsed = false  // reset grace on completion

    elif log.status == 'skipped':
      // Skip is SAFE — doesn't count as a miss, doesn't use grace
      // Don't increment streak, but don't break it either
      continue  // skip this day entirely in streak count

    elif log.status == 'missed' or no log exists:
      if not gracePeriodUsed:
        gracePeriodUsed = true  // one free miss
        continue
      else:
        break  // two consecutive misses = streak over

  return streak
```

**Visual behavior:**
- **Normal day (completed):** Emerald left border on habit card
- **Missed 1 (grace active):** Amber (#FEC89A) left border + subtle "get back on track" text
- **Missed 2 (streak reset):** Red-muted border + streak resets to 0
- **Skipped:** Neutral/blue-gray border, no warning, no penalty

**Data flow:**
- When loading habits page, server component queries recent logs
- `pending` status habits from previous days are marked `missed` (end-of-day job or on page load)
- Grace period state is computed on-the-fly, not stored

---

### P0-6: Time-of-Day Grouping

**Trigger:**
- Default: 3 groups seeded on first use (Morning, Daytime, Evening)
- Custom: "Manage Groups" accessible from habits page header (gear icon)

**Visual behavior:**
- Each group renders as a section with:
  - Header: emoji + group name + completion count (`3/5`) in muted text
  - Collapsible: tap header to collapse/expand (default: expanded)
  - Accent line: subtle gradient divider between groups
- **Smart ordering:** Before noon, Morning group is first. After 6pm, Evening group rises to top. (Contextual reorder based on `time_of_day` + current hour)
- **Group management modal:**
  - List of groups with drag handles (@dnd-kit)
  - Tap to rename, change emoji, change time_of_day
  - "Add Group" button at bottom
  - Swipe-left to delete (only if no habits in group, or offer to move habits)

**Data flow:**
- `createHabitGroup(name, emoji, timeOfDay)` → INSERT habit_groups → revalidate
- `updateHabitGroup(id, fields)` → UPDATE habit_groups → revalidate
- `reorderHabitGroups(orderedIds[])` → UPDATE sort_order for each → revalidate
- `deleteHabitGroup(id)` → DELETE habit_groups (only if empty) → revalidate
- Habits page server component: `SELECT * FROM habit_groups ORDER BY sort_order`, then for each group `SELECT * FROM habits WHERE group_id = ? AND archived_at IS NULL ORDER BY sort_order`

**Mobile (375px):**
- Group header: full width, 44px height, sticky within scroll
- Collapse animation: Framer Motion `AnimatePresence` with height transition
- Manage modal: full-screen sheet sliding up from bottom

---

## Files to Modify (Implementation Roadmap)

| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add `habitGroups`, `habits`, `habitLogs` Drizzle tables + types |
| `SUPABASE_SETUP.sql` | Add raw SQL for 3 tables + view + indexes |
| `app/(dashboard)/habits/page.tsx` | Rewrite: query new tables, group-based rendering, smart ordering |
| `app/(dashboard)/habits/habit-form.tsx` | Replace: individual habit cards with one-tap toggle, streak badges |
| `app/(dashboard)/habits/actions.ts` | Rewrite: `toggleHabitLog()`, `createHabit()`, `updateHabit()`, `deleteHabit()`, `reorderHabits()`, CRUD for groups |
| `app/(dashboard)/dashboard/dashboard-content.tsx` | Update lines 92-100: query `habit_completion_summary` view instead of `habit_entries` JSONB |
| `lib/pulse.ts` | NO CHANGE (already takes numbers) |
| `lib/mirror/signals.ts` | NO CHANGE (signal shape stays identical) |

---

## Streak Logic: Confirmed Design Decisions

1. **Skip is safe** — tapping "Skip" preserves streak AND doesn't use grace period (expert consensus from Atomic Habits, Tiny Habits, all top-rated apps)
2. **Completion rate excludes skips** — skips removed from denominator entirely (honest metric)
3. **Nudge only, no skip cap** — after 3+ skips of same habit in one week, gentle nudge: "Want to adjust schedule or archive?" (no hard limit)
4. **Grace period** — 1 missed scheduled day forgiven if user completes the next scheduled day; 2 consecutive misses = reset
5. **Unscheduled habits** — shown in collapsed "Not Today" section at bottom, dimmed, expandable, completable for bonus

---

## Verification Plan

1. **Migration test:** Run migration SQL against a Supabase test project. Verify all 3 tables created, indexes present, view returns correct data.
2. **Backfill test:** Insert sample `habit_entries` rows with known JSONB values. Run backfill SQL. Verify `habit_logs` rows match (correct habit_id, date, status).
3. **Compatibility view test:** Query `habit_completion_summary` for a date. Verify `habits_completed`, `habits_total`, `completion_rate` match manual count.
4. **Pulse Score test:** Feed view output into `computePulseScore()`. Compare result with old calculation for same day. Must match.
5. **Mirror AI test:** Toggle a habit. Verify `interactions` table receives signal with correct `completion_rate`, `habits_done`, `total_habits`.
6. **Streak test cases:**
   - 5 completed → streak = 5
   - 5 completed + 1 skip → streak = 5 (skip doesn't increment or break)
   - 5 completed + 1 miss + 1 completed → streak = 6 (grace period)
   - 5 completed + 2 misses → streak = 0 (reset)
   - 5 completed + 1 skip + 1 miss + 1 completed → streak = 6 (skip + grace)
7. **UI smoke test:** Create habit, toggle completion, verify animation, check streak display, test schedule change, reorder within group.
