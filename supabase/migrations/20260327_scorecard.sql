-- ─────────────────────────────────────────
-- Habits Scorecard Migration
-- Additive — no breaking changes to existing tables
-- ─────────────────────────────────────────

-- ─────────────────────────────────────────
-- 1. scorecard_days — one row per user per day
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scorecard_days (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scorecard_date        date NOT NULL DEFAULT CURRENT_DATE,
  day_type              text NOT NULL DEFAULT 'normal'
    CHECK (day_type IN ('normal','weekend','holiday','travel','sick')),
  day_label             text,
  morning_intention     text,
  evening_reflection    text,
  awareness_rating      integer CHECK (awareness_rating BETWEEN 1 AND 5),
  total_entries         integer NOT NULL DEFAULT 0,
  positive_count        integer NOT NULL DEFAULT 0,
  negative_count        integer NOT NULL DEFAULT 0,
  neutral_count         integer NOT NULL DEFAULT 0,
  total_positive_minutes integer NOT NULL DEFAULT 0,
  total_negative_minutes integer NOT NULL DEFAULT 0,
  total_neutral_minutes  integer NOT NULL DEFAULT 0,
  day_score             integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed')),
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, scorecard_date)
);

-- ─────────────────────────────────────────
-- 2. scorecard_entries — each behavior logged
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scorecard_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id          uuid NOT NULL REFERENCES scorecard_days(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_action        time NOT NULL,
  end_time              time,
  duration_minutes      integer,
  behavior_description  text NOT NULL,
  behavior_category     text,
  rating                text NOT NULL CHECK (rating IN ('+','-','=')),
  rating_reason         text,
  linked_identity_id    uuid REFERENCES user_identities(id) ON DELETE SET NULL,
  identity_alignment    text CHECK (identity_alignment IN ('supports','opposes','neutral')),
  location              text,
  energy_level          text CHECK (energy_level IN ('high','medium','low')),
  emotional_state       text,
  was_automatic         boolean NOT NULL DEFAULT true,
  triggered_by_entry_id uuid REFERENCES scorecard_entries(id) ON DELETE SET NULL,
  trigger_type          text,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 3. behavior_library — auto-built from entries
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS behavior_library (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  behavior_name         text NOT NULL,
  normalized_name       text NOT NULL,
  behavior_category     text,
  default_rating        text,
  times_logged          integer NOT NULL DEFAULT 1,
  avg_duration_minutes  numeric(6,1) DEFAULT 0,
  total_minutes_spent   integer NOT NULL DEFAULT 0,
  positive_count        integer NOT NULL DEFAULT 0,
  negative_count        integer NOT NULL DEFAULT 0,
  neutral_count         integer NOT NULL DEFAULT 0,
  most_common_time      time,
  is_favorite           boolean NOT NULL DEFAULT false,
  last_logged_at        timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, normalized_name)
);

-- ─────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scorecard_days_user_date
  ON scorecard_days(user_id, scorecard_date DESC);

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_scorecard
  ON scorecard_entries(scorecard_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_user
  ON scorecard_entries(user_id, time_of_action);

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_rating
  ON scorecard_entries(scorecard_id, rating);

CREATE INDEX IF NOT EXISTS idx_behavior_library_user
  ON behavior_library(user_id, normalized_name);

-- ─────────────────────────────────────────
-- 5. RLS Policies
-- ─────────────────────────────────────────
ALTER TABLE scorecard_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_library   ENABLE ROW LEVEL SECURITY;

-- scorecard_days
CREATE POLICY "Users can read own scorecard_days"   ON scorecard_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scorecard_days" ON scorecard_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scorecard_days" ON scorecard_days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scorecard_days" ON scorecard_days FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access scorecard_days" ON scorecard_days FOR ALL USING (auth.role() = 'service_role');

-- scorecard_entries
CREATE POLICY "Users can read own scorecard_entries"   ON scorecard_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scorecard_entries" ON scorecard_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scorecard_entries" ON scorecard_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scorecard_entries" ON scorecard_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access scorecard_entries" ON scorecard_entries FOR ALL USING (auth.role() = 'service_role');

-- behavior_library
CREATE POLICY "Users can read own behavior_library"   ON behavior_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own behavior_library" ON behavior_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own behavior_library" ON behavior_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own behavior_library" ON behavior_library FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access behavior_library" ON behavior_library FOR ALL USING (auth.role() = 'service_role');
