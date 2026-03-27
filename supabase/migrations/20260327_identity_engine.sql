-- ─────────────────────────────────────────
-- Identity Engine Migration
-- Additive — no breaking changes to existing tables
-- ─────────────────────────────────────────

-- ─────────────────────────────────────────
-- Step 1: user_identities
-- The primary concept: "I am a reader"
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_identities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_statement text NOT NULL,
  identity_category  text NOT NULL DEFAULT 'personal'
    CHECK (identity_category IN (
      'health','learning','productivity','relationships',
      'finance','creativity','spirituality','personal'
    )),
  icon               text,
  color              text NOT NULL DEFAULT '#FF6B6B',
  why_statement      text,
  status             text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived')),
  confidence_level   integer NOT NULL DEFAULT 0
    CHECK (confidence_level BETWEEN 0 AND 100),
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- Step 2: Add identity_id FK to existing habits table
-- One habit belongs to at most one identity
-- ─────────────────────────────────────────
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS identity_id uuid REFERENCES user_identities(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- Step 3: habit_votes
-- Enrichment layer on top of habit_logs.
-- habit_logs remains authoritative for completion;
-- habit_votes adds difficulty/satisfaction/reflection metadata.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_votes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id            uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  identity_id         uuid NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_date           date NOT NULL,
  difficulty_felt     integer CHECK (difficulty_felt BETWEEN 1 AND 5),
  satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5),
  reflection_note     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, vote_date)
);

-- ─────────────────────────────────────────
-- Step 4: identity_confidence_log
-- Tracks how belief in an identity changes over time
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity_confidence_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id      uuid NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  confidence_level integer NOT NULL CHECK (confidence_level BETWEEN 0 AND 100),
  logged_date      date NOT NULL DEFAULT CURRENT_DATE,
  trigger_type     text NOT NULL DEFAULT 'vote_cast'
    CHECK (trigger_type IN ('vote_cast','reflection_saved','manual')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- Step 5: identity_reflections
-- Weekly reflection entries per identity
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity_reflections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id         uuid NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_week     text NOT NULL,  -- ISO week key e.g. "2026-W13"
  wins                text,
  challenges          text,
  learning            text,
  next_week_intention text,
  confidence_start    integer,
  confidence_end      integer,
  total_votes         integer NOT NULL DEFAULT 0,
  positive_votes      integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_id, reflection_week)
);

-- ─────────────────────────────────────────
-- Step 6: identity_milestones
-- Streak, vote count, and confidence milestones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity_milestones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id       uuid NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type    text NOT NULL
    CHECK (milestone_type IN ('streak','votes','confidence')),
  milestone_value   integer NOT NULL,
  milestone_title   text NOT NULL,
  milestone_message text NOT NULL,
  achieved_at       timestamptz NOT NULL DEFAULT now(),
  celebrated        boolean NOT NULL DEFAULT false,
  UNIQUE (identity_id, milestone_type, milestone_value)
);

-- ─────────────────────────────────────────
-- Step 7: Indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_identities_user
  ON user_identities(user_id);

CREATE INDEX IF NOT EXISTS idx_user_identities_status
  ON user_identities(user_id, status);

CREATE INDEX IF NOT EXISTS idx_habits_identity
  ON habits(identity_id) WHERE identity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habit_votes_identity
  ON habit_votes(identity_id, vote_date DESC);

CREATE INDEX IF NOT EXISTS idx_confidence_log_identity
  ON identity_confidence_log(identity_id, logged_date DESC);

CREATE INDEX IF NOT EXISTS idx_milestones_uncelebrated
  ON identity_milestones(user_id, celebrated) WHERE NOT celebrated;

-- ─────────────────────────────────────────
-- Step 8: RLS Policies (same pattern as habits migration)
-- ─────────────────────────────────────────

ALTER TABLE user_identities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_votes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_confidence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_reflections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_milestones     ENABLE ROW LEVEL SECURITY;

-- user_identities
CREATE POLICY "Users can read own user_identities"   ON user_identities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_identities" ON user_identities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_identities" ON user_identities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_identities" ON user_identities FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access user_identities" ON user_identities FOR ALL USING (auth.role() = 'service_role');

-- habit_votes
CREATE POLICY "Users can read own habit_votes"   ON habit_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_votes" ON habit_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_votes" ON habit_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_votes" ON habit_votes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_votes" ON habit_votes FOR ALL USING (auth.role() = 'service_role');

-- identity_confidence_log
CREATE POLICY "Users can read own identity_confidence_log"   ON identity_confidence_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own identity_confidence_log" ON identity_confidence_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity_confidence_log" ON identity_confidence_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own identity_confidence_log" ON identity_confidence_log FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access identity_confidence_log" ON identity_confidence_log FOR ALL USING (auth.role() = 'service_role');

-- identity_reflections
CREATE POLICY "Users can read own identity_reflections"   ON identity_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own identity_reflections" ON identity_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity_reflections" ON identity_reflections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own identity_reflections" ON identity_reflections FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access identity_reflections" ON identity_reflections FOR ALL USING (auth.role() = 'service_role');

-- identity_milestones
CREATE POLICY "Users can read own identity_milestones"   ON identity_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own identity_milestones" ON identity_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity_milestones" ON identity_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own identity_milestones" ON identity_milestones FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access identity_milestones" ON identity_milestones FOR ALL USING (auth.role() = 'service_role');
