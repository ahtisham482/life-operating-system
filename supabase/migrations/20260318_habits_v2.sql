-- ============================================================
-- Migration: Habits System v2 (normalized tables)
-- Creates normalized habit tracking tables with RLS
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Step 1: Create tables (idempotent — uses IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habit_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  emoji       text,
  time_of_day text NOT NULL DEFAULT 'anytime'
              CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  emoji           text DEFAULT '✅',
  description     text,
  group_id        uuid REFERENCES habit_groups(id) ON DELETE SET NULL,
  schedule_type   text NOT NULL DEFAULT 'daily'
                  CHECK (schedule_type IN ('daily','weekdays','weekends','custom')),
  schedule_days   integer[] DEFAULT '{}'::integer[],
  sort_order      integer NOT NULL DEFAULT 0,
  current_streak  integer NOT NULL DEFAULT 0,
  best_streak     integer NOT NULL DEFAULT 0,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id   uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('completed','skipped','missed','pending')),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habit_groups_sort ON habit_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_habits_group ON habits(group_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habits_sort ON habits(group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_status ON habit_logs(date, status);

-- ─────────────────────────────────────────────────────────────
-- Step 2: RLS Policies
-- ─────────────────────────────────────────────────────────────

ALTER TABLE habit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- habit_groups policies
CREATE POLICY "Users can read own habit_groups" ON habit_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_groups" ON habit_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_groups" ON habit_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_groups" ON habit_groups FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_groups" ON habit_groups FOR ALL USING (auth.role() = 'service_role');

-- habits policies
CREATE POLICY "Users can read own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habits" ON habits FOR ALL USING (auth.role() = 'service_role');

-- habit_logs policies
CREATE POLICY "Users can read own habit_logs" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_logs" ON habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_logs" ON habit_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_logs" ON habit_logs FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- Step 3: Compatibility view for Pulse Score + Mirror AI
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW habit_completion_summary AS
SELECT
  hl.user_id,
  hl.date,
  COUNT(*) FILTER (WHERE hl.status = 'completed') AS habits_completed,
  COUNT(*) AS habits_total,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE hl.status = 'completed')::numeric /
      COUNT(*)::numeric * 100
    )
    ELSE 0
  END AS completion_rate
FROM habit_logs hl
JOIN habits h ON h.id = hl.habit_id
WHERE h.archived_at IS NULL
  AND hl.status IN ('completed', 'missed', 'pending')
GROUP BY hl.user_id, hl.date;

COMMIT;
