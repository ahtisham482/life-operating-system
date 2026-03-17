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
I've launched 3 research agents in parallel:

1. **Habit App UX Research** — Studying Streaks, Habitica, Habitify, Strides, Loop, Atoms, Way of Life, Productive, Fabulous, Tangerine, Done, HabitNow for specific interaction patterns
2. **Behavioral Science Research** — Extracting principles from Atomic Habits, Tiny Habits, The Power of Habit, Hooked, and Designing for Behavior Change that translate directly into UI features
3. **Current Code Audit** — Reading every line of the existing habits implementation to map exact integration points (Pulse Score, Mirror AI, schema)

I'll compile the two deliverable tables (Table A: UX Pattern Matrix + Table B: Book Principles → Features) once all three complete. This takes a few minutes.

Code audit is done. Waiting for the two research agents to finish before compiling the tables.

App research done. One more agent (book principles) still running — I'll compile everything once it finishes.

All three research agents are done. Here's the compiled Phase 1 deliverable:

---

# Phase 1 Deliverable: Behavioral Design Research

## Table A: UX Pattern Matrix

*15-20 patterns extracted from 12 habit apps, mapped to our stack. "Universal" = used in 3+ top apps.*

| # | Pattern | Apps That Use It | Behavioral Principle | Implementation in Our Stack | Priority |
|---|---------|-----------------|---------------------|---------------------------|----------|
| **1** | **One-tap completion (large touch target, satisfying animation)** | Streaks, Loop, Productive, Done, Tangerine, Atoms, Habitify, Way of Life | *Make it satisfying* (Atomic Habits) + *Reduce friction* (Hooked) — immediate reward signal reinforces the loop | 48px+ tap target on habit card. On tap: optimistic toggle → server action `toggleHabitLog()`. Framer Motion scale pulse + CSS glow. No confirmation dialog. Undo via 3s toast. | **P0** |
| **2** | **Flexible scheduling (daily / weekdays / X per week / custom days)** | Habitify, Strides, Loop, Productive, Done, HabitNow | *Reduce friction* — matching the habit to real life removes false failures. A "3x/week" habit shouldn't show 4 red days. | `schedule_type` enum: `daily`, `weekdays`, `weekends`, `custom`. `schedule_days` int[] (0-6). Page filters: only show habits scheduled for today. "Not today" habits grayed with toggle to view. | **P0** |
| **3** | **User-created custom habits (add/edit/delete)** | Every single app except our current one | Fundamental — a habit tracker where you can't define your own habits isn't a habit tracker. *Agency/ownership* drives engagement. | New `habits` table (per-user rows). CRUD via server actions. Inline "Add habit" input at bottom of each group. Tap name to edit. Swipe-left or context menu to delete (with confirmation). | **P0** |
| **4** | **Streak counter with best-ever record** | Streaks, Loop, Habitify, Atoms, Done, Way of Life, Productive | *Loss aversion* + *progress visibility* — seeing "Current: 12 / Best: 34" creates both pride and aspiration. | Computed from `habit_logs` (consecutive scheduled-day completions). Display on habit card: 🔥12 (best: 34). Stored on `habits` row: `current_streak`, `best_streak`, updated by server action. | **P0** |
| **5** | **"Don't miss twice" / grace period streak** | Atoms (explicit), Loop (gradual decay), Fabulous (campfire shrinks) | *Never miss twice* (Atomic Habits Ch.16) — a single miss shouldn't destroy weeks of progress. Strict streaks cause rage-quit. | Streak algo: missing one *scheduled* day doesn't break the streak if the next scheduled day is completed. Visual: missed day shows amber (not red). Streak only resets on 2 consecutive scheduled misses. | **P0** |
| **6** | **Time-of-day grouping (Morning / Afternoon / Evening)** | Productive, Done, HabitNow, Fabulous, our current app | *Habit stacking / anchor moments* (Tiny Habits) — presenting habits by routine context, not alphabet, matches real life. | `time_of_day` enum: `morning`, `afternoon`, `evening`, `anytime`. User-defined groups stored in `habit_groups` table with `sort_order`. Default 3 seeded on first use. Drag-to-reorder within groups. | **P0** |
| **7** | **Celebration animation on completion (confetti, haptic concept, sound)** | Atoms (confetti + vibration), Tangerine (confetti), Streaks (sound + haptic), Fabulous (campfire) | *Celebration* (Tiny Habits Ch.6) — "Emotions create habits." Immediate positive feedback wires the behavior faster than any other technique. | Framer Motion: on toggle `true`, card pulses with emerald glow + scale(1.05) spring animation. On streak milestones (7, 21, 30, 66), confetti burst via CSS particles. Navigator.vibrate(50) on mobile (progressive enhancement). | **P1** |
| **8** | **Monthly/90-day completion calendar (GitHub-style heatmap)** | Loop, Habitify, Atoms, Done, Way of Life | *Long-term progress visibility* — 7-day heatmap is too short to see trajectory. Monthly view reveals patterns ("I always skip Fridays"). | Per-habit calendar grid: 90 days × 1 habit. Green (done), red (missed-scheduled), gray (not-scheduled), empty (no data). Tap a day to see note. Accessible from habit detail view. | **P1** |
| **9** | **Completion rate trends (7/30/90-day stats)** | Habitify, Strides, Loop, Way of Life | *Trend > streak* — streaks are fragile binary metrics. Completion rate shows resilience: "85% over 30 days" is more meaningful than "streak: 3". | Aggregate query from `habit_logs`. Display as simple stat row on habit detail: 7d: 86% · 30d: 72% · 90d: 68%. Color-coded: green >75%, amber 50-75%, red <50%. | **P1** |
| **10** | **Per-habit notes ("why I skipped")** | Way of Life, Strides, Tangerine | *Self-awareness + pattern recognition* — "I skipped gym because [traveling/sick/lazy]" reveals whether misses are legitimate or drift. | `note` text field on `habit_logs` row. On marking incomplete (or tapping a completed habit), optional note input slides down. Quick-select reasons: "Traveling", "Sick", "Rest day", "Chose to skip", or free text. | **P1** |
| **11** | **Drag-to-reorder habits within groups** | Productive, Habitify, Loop, HabitNow | *Agency/ownership* — letting users arrange their own flow increases commitment. Also supports habit stacking order. | `sort_order` int on `habits` table. @dnd-kit sortable within each group container (already in our dependencies). Server action `reorderHabits(ids[])` on drag end. | **P1** |
| **12** | **Habit archiving (hide without deleting history)** | Habitify, Productive, Strides | *Prevents clutter while preserving data* — users' lives change. A habit that was relevant 3 months ago shouldn't pollute today's view. | `archived_at` timestamp on `habits` row (null = active). Archived habits filtered from daily view. "Manage Habits" screen shows all with unarchive option. Logs preserved for analytics. | **P1** |
| **13** | **Skip / Not Applicable state (ternary: done / skip / missed)** | Way of Life, Loop, Atoms | *Honest tracking* — binary done/missed doesn't account for legitimate skip days (travel, illness, rest). Skips should preserve streaks without inflating completion rate. | `status` enum on `habit_logs`: `completed`, `skipped`, `missed` (default if no log exists for a scheduled day). Skipped days don't break streaks and don't count toward completion rate (excluded from denominator). | **P1** |
| **14** | **Smart failure diagnosis ("What's blocking you?")** | Fabulous (journey coaching), Atoms (two-minute suggestion) | *B=MAP diagnosis* (Tiny Habits) — when a habit is repeatedly missed, the app should coach, not just count red days. | After 3+ misses in a week, show diagnostic card: "Forget?" → adjust notification time. "Too hard?" → suggest two-minute version. "Don't feel like it?" → show streak/value reminder. Appears once per week max. | **P2** |
| **15** | **Widget / lock-screen quick-complete** | Streaks (4 widget types), Loop (4 widgets), Done, HabitNow | *Environment design* (Atomic Habits Ch.6) — make the cue visible without opening the app. Reduces friction to zero. | Next.js PWA: no native widgets, but home-screen shortcut + notification action buttons ("Mark Done" on push notification). Future: Progressive Web App install prompt. | **P2** |
| **16** | **Habit templates / suggestions for new users** | Fabulous, Productive (100+), Strides (150+), Habitica, Atoms | *Reduces blank-page paralysis* — new users don't know what to track. Templates provide a starting point that can be customized. | Seed 15-20 templates in categories (Health, Productivity, Mindfulness, Finance, Learning). On first use, show "Quick Start" with top 5 suggestions. User adopts with one tap, then customizes. | **P2** |
| **17** | **Mood-habit correlation insights** | Tangerine (core feature), Habitify (analytics) | *Pattern recognition + investment* — connecting habits to emotional outcomes answers "why should I bother?" | Future scope. Requires mood tracking (not currently in app). Could correlate with Pulse Score as proxy: "On days you complete 80%+ habits, your Pulse Score averages 74 vs. 42." | **P2** |
| **18** | **Adaptive notification frequency** | Productive (smart reminders), Fabulous (journey-based) | *External → Internal triggers* (Hooked Ch.1) — reduce notifications as habits become automatic. | Track if user completes habit before notification fires. After 14 consecutive pre-notification completions, suggest: "This habit seems automatic. Reduce reminders?" Escalate back if completion drops. | **P2** |
| **19** | **Negative habit tracking (things to stop/limit)** | Streaks (negative type), Done (max count), Way of Life (red chains) | *Golden Rule of habit change* (Power of Habit Ch.3) — track abstinence or reduction, not just addition. | `habit_type` enum: `build` (default), `break`. Break habits track days NOT done. Counter variant: "Coffee: 1/2 max today". Streak = consecutive days under limit. | **P2** |
| **20** | **"Perfect day" tracking across all habits** | Productive (perfect day chains), Atoms (daily score) | *Compound effect* — completing ALL scheduled habits is qualitatively different from completing most. Incentivizes the full routine. | Computed: if all scheduled habits for today are completed, mark as "perfect day" in UI. Show perfect-day streak alongside individual streaks. Already partially exists via Pulse Score. | **P2** |

---

## Table B: Book Principles → Feature Translation

| # | Principle | Source | How It Translates to UI | Implementation in Our Stack |
|---|-----------|--------|------------------------|---------------------------|
| **1** | **"Make it obvious" — Cue design** | Atomic Habits, Ch. 5-6 | Time-of-day grouping surfaces the right habits at the right moment. The app launch screen IS the cue — today's habits are the only thing visible. | Groups with `time_of_day` enum filter the view contextually. Morning habits show first before noon, evening habits rise to top after 6 PM. No navigation required to see today's habits. |
| **2** | **"Make it easy" — Two-minute rule** | Atomic Habits, Ch. 13 | During habit creation, if the name suggests a large commitment ("Run 5km"), suggest a gateway version ("Put on running shoes"). Track "days shown up" separately from "days fully completed." | `description` field on `habits` table for the "tiny version." Optional "Level up" prompt after 14 consecutive days: "Ready to increase to the full version?" |
| **3** | **"Make it satisfying" — Tracking as reward** | Atomic Habits, Ch. 15-16 | The act of checking off a habit IS the reward. The streak counter, the heatmap filling in, the progress bar — these are the satisfying signals. | Animated checkbox with Framer Motion spring. Streak badge on card. Daily progress bar in header. Completion percentage with color gradient. |
| **4** | **"Never miss twice" — Recovery over perfection** | Atomic Habits, Ch. 16 | After a missed day, the app shows encouragement ("Yesterday was tough. Today is what matters.") and makes recovery the default path, not shame. | Grace period in streak calculation: 1 missed scheduled day is amber (warning), streak survives. 2 consecutive misses = streak resets. Recovery prompt on the day after a miss: single large "I'm back" button. |
| **5** | **Anchor moments — Event-based prompts** | Tiny Habits, Ch. 4-5 | Habits linked to existing routines ("After I pour coffee, I will journal") feel organic. The anchor IS the notification trigger, not a clock time. | `anchor_text` optional field on `habits`: "After I ___". Displayed on habit card as context. Notification can reference: "Coffee's poured — time to journal." Groups can be named after anchor moments. |
| **6** | **Celebration — Immediate positive emotion** | Tiny Habits, Ch. 6 | Completion must FEEL good in the body, not just visually. Sub-200ms response. Multi-sensory: animation + haptic + optional sound. Escalating celebration at milestones. | `Navigator.vibrate(50)` on mobile. Framer Motion: scale spring + emerald glow on toggle. Milestone celebrations (7d, 21d, 30d, 66d, 100d): confetti CSS particles burst. These are instant — no server round-trip before the animation fires. |
| **7** | **B=MAP failure diagnosis** | Tiny Habits, Ch. 2 | When a habit is consistently missed, diagnose WHY: Motivation (don't want to), Ability (too hard), or Prompt (forgot). Offer the right fix for each. | After 3+ misses in 7 days, show a diagnostic card (once per week max). Three options map to three interventions: adjust reminder time, suggest tiny version, or show streak/value motivation. The card is dismissable and non-intrusive. |
| **8** | **Keystone habit identification** | Power of Habit, Ch. 4 | Some habits predict completion of others. Surfacing this correlation makes the user prioritize the right habits and understand their own behavior patterns. | Analytics query: for each habit, compute correlation with overall daily completion rate. After 30+ days of data: "On days you [exercise], you complete 81% of all habits vs. 43% on days you don't." Badge the keystone habit with a ⭐ indicator. |
| **9** | **Golden Rule — Habit swap for breaking bad habits** | Power of Habit, Ch. 3 | You can't delete a habit loop; you can only redirect it. The cue and reward stay; the routine changes. The app should guide this swap explicitly. | "Break" habit type includes fields: `cue_description` ("When I feel stressed"), `old_routine` ("I scroll social media"), `reward_sought` ("Mental break"). The new routine replaces the old one while keeping the same cue/reward visible on the card. |
| **10** | **Reducing action friction to near-zero** | Hooked Ch. 2 + Atomic Habits Ch. 12 | One tap to complete. No modals, no confirmations, no loading states for the primary action. Skipping should require MORE effort than completing. | Optimistic UI: toggle fires instantly (local state), server action runs in background, rollback with toast on error. Push notification includes "Mark Done" action button (complete without opening app). Skip requires deliberate swipe-left + reason selection = more friction than completing. |
| **11** | **Investment — App appreciates with use** | Hooked, Ch. 4 | Every day of tracking makes the app more valuable. Historical data generates insights unavailable on day 1. This creates natural retention and switching costs. | Milestone data unlocks: 7 days → weekly patterns. 30 days → monthly trends + completion rates. 90 days → seasonal insights + keystone correlation. 365 days → year-in-review. Each unlock is announced: "You've unlocked 30-day insights." Data export as backup. |
| **12** | **Cheating strategies — Easier to do than to skip** | Designing for Behavior Change, Ch. 11 | The app should make completing the path of least resistance. Opening the notification goes straight to the habit. "Done" is a big button. "Skip" is buried and requires a reason. | Notification tap → opens app to that specific habit, pre-scrolled. "Complete" button is 100% width, 56px tall, coral gradient. "Skip" is a small text link below requiring reason selection. The default interaction (tap anywhere on the card) = complete. |

---

## Key Decisions Emerging from Research

**What 3+ apps agree on (proven universal patterns we MUST have):**
1. One-tap completion with satisfying feedback (every app)
2. Custom user-defined habits (every app except ours)
3. Flexible scheduling beyond daily-only (Habitify, Strides, Loop, Productive, Done, HabitNow)
4. Streak counter with best-ever record (Streaks, Loop, Habitify, Atoms, Done, Way of Life, Productive)
5. Time-of-day grouping (Productive, Done, HabitNow, Fabulous, our current app)
6. Per-habit analytics/completion rates (Habitify, Strides, Loop, Way of Life)

**What the books converge on (principles that appear in 3+ sources):**
1. Reduce friction to absolute minimum (Atomic Habits + Hooked + Designing for Behavior Change)
2. Immediate positive feedback on completion (Atomic Habits + Tiny Habits + Hooked)
3. Start tiny, scale up (Atomic Habits + Tiny Habits)
4. Recovery > perfection after a miss (Atomic Habits + Tiny Habits + Fabulous implementation)
5. Make the cue obvious and contextual (Atomic Habits + Tiny Habits + Power of Habit)

**What we should NOT do (patterns that conflict with our use case):**
- Gamification/RPG mechanics (Habitica) — adds massive complexity, doesn't fit our minimal design language
- Social/community features (accountability pods) — single-user app, no social infrastructure
- Guided multi-day journeys (Fabulous) — heavy content creation burden, not our core value
- Apple Health / Fitbit auto-tracking — PWA can't access native health APIs

---

This is Phase 1 complete. Phase 2 (schema, migration, UI spec) is ready when you approve this direction.
