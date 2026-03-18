-- ============================================================
-- Migration: Habits System v2 (normalized tables)
-- Run AFTER the new tables are created via SUPABASE_SETUP.sql
-- This file handles: seed data + backfill from habit_entries JSONB
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Step 1: Create tables (idempotent — uses IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habit_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  name            text NOT NULL,
  emoji           text,
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

-- RLS disabled (single-user app)
ALTER TABLE habit_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Step 2: Seed default groups (skip if already exist)
-- ─────────────────────────────────────────────────────────────

INSERT INTO habit_groups (id, name, emoji, time_of_day, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Morning Ritual',    '🌅', 'morning',   0),
  ('22222222-2222-2222-2222-222222222222', 'Daytime Focus',     '☀️',  'afternoon', 1),
  ('33333333-3333-3333-3333-333333333333', 'Evening Wind-Down', '🌙', 'evening',   2)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Step 3: Backfill habits from the 14 hardcoded habits
-- Uses deterministic UUIDs so we can reference them in step 4
-- ─────────────────────────────────────────────────────────────

INSERT INTO habits (id, name, emoji, group_id, schedule_type, schedule_days, sort_order) VALUES
  -- Morning Ritual
  ('aaaaaaaa-0001-4000-8000-000000000001', 'Left by 9',       '🚪', '11111111-1111-1111-1111-111111111111', 'weekdays', '{1,2,3,4,5}', 0),
  ('aaaaaaaa-0002-4000-8000-000000000002', 'Exercise',        '🏋️', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          1),
  ('aaaaaaaa-0003-4000-8000-000000000003', 'Clothes Ready',   '👔', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          2),
  ('aaaaaaaa-0004-4000-8000-000000000004', 'Read AM',         '📖', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          3),
  ('aaaaaaaa-0005-4000-8000-000000000005', 'Quick Action',    '⚡', '11111111-1111-1111-1111-111111111111', 'daily',    '{}',          4),
  -- Daytime Focus
  ('aaaaaaaa-0006-4000-8000-000000000006', 'Action Log',      '📋', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          0),
  ('aaaaaaaa-0007-4000-8000-000000000007', 'Skill Study',     '🎯', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          1),
  ('aaaaaaaa-0008-4000-8000-000000000008', 'Bike',            '🚴', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          2),
  ('aaaaaaaa-0009-4000-8000-000000000009', 'Need vs Desire',  '🧠', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          3),
  ('aaaaaaaa-0010-4000-8000-000000000010', 'Cash Recall',     '💰', '22222222-2222-2222-2222-222222222222', 'daily',    '{}',          4),
  -- Evening Wind-Down
  ('aaaaaaaa-0011-4000-8000-000000000011', 'Read PM',         '📚', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          0),
  ('aaaaaaaa-0012-4000-8000-000000000012', 'Tafseer',         '📿', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          1),
  ('aaaaaaaa-0013-4000-8000-000000000013', 'Phone Out by 10', '📵', '33333333-3333-3333-3333-333333333333', 'daily',    '{}',          2),
  ('aaaaaaaa-0014-4000-8000-000000000014', 'Weekend Plan',    '📅', '33333333-3333-3333-3333-333333333333', 'weekends', '{0,6}',       3)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Step 4: Backfill habit_logs from existing habit_entries JSONB
-- ─────────────────────────────────────────────────────────────

WITH habit_key_map(json_key, habit_id) AS (
  VALUES
    ('leftBy9',       'aaaaaaaa-0001-4000-8000-000000000001'::uuid),
    ('exercise',      'aaaaaaaa-0002-4000-8000-000000000002'::uuid),
    ('clothes',       'aaaaaaaa-0003-4000-8000-000000000003'::uuid),
    ('readAM',        'aaaaaaaa-0004-4000-8000-000000000004'::uuid),
    ('quickAction',   'aaaaaaaa-0005-4000-8000-000000000005'::uuid),
    ('actionLog',     'aaaaaaaa-0006-4000-8000-000000000006'::uuid),
    ('skillStudy',    'aaaaaaaa-0007-4000-8000-000000000007'::uuid),
    ('bike',          'aaaaaaaa-0008-4000-8000-000000000008'::uuid),
    ('needDesire',    'aaaaaaaa-0009-4000-8000-000000000009'::uuid),
    ('cashRecall',    'aaaaaaaa-0010-4000-8000-000000000010'::uuid),
    ('readPM',        'aaaaaaaa-0011-4000-8000-000000000011'::uuid),
    ('tafseer',       'aaaaaaaa-0012-4000-8000-000000000012'::uuid),
    ('phoneOutBy10',  'aaaaaaaa-0013-4000-8000-000000000013'::uuid),
    ('weekendPlan',   'aaaaaaaa-0014-4000-8000-000000000014'::uuid)
)
INSERT INTO habit_logs (habit_id, date, status, created_at)
SELECT
  hkm.habit_id,
  he.date::date,
  CASE WHEN (he.habits ->> hkm.json_key)::boolean THEN 'completed' ELSE 'missed' END,
  he.created_at
FROM habit_entries he
CROSS JOIN habit_key_map hkm
ON CONFLICT (habit_id, date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Step 5: Compatibility view for Pulse Score + Mirror AI
-- ─────────────────────────────────────────────────────────────

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

COMMIT;
