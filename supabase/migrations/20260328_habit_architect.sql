-- ─────────────────────────────────────────
-- Habit Architect Migration
-- Implementation Intentions + Habit Stacking + Environment Design
-- ─────────────────────────────────────────

-- 1. habit_chains (groups of stacked habits)
CREATE TABLE IF NOT EXISTS habit_chains (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_name            text NOT NULL,
  chain_description     text,
  chain_icon            text DEFAULT '⛓️',
  chain_color           text,
  time_of_day           text NOT NULL DEFAULT 'morning'
    CHECK (time_of_day IN ('morning','afternoon','evening','night')),
  start_time            time,
  estimated_duration    integer,
  chain_trigger         text,
  chain_trigger_type    text DEFAULT 'time'
    CHECK (chain_trigger_type IN ('time','event','location')),
  primary_location      text,
  is_active             boolean NOT NULL DEFAULT true,
  total_links           integer NOT NULL DEFAULT 0,
  current_streak        integer NOT NULL DEFAULT 0,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. habit_blueprints (the core — each habit's full architecture)
CREATE TABLE IF NOT EXISTS habit_blueprints (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_id               uuid REFERENCES user_identities(id) ON DELETE SET NULL,
  habit_name                text NOT NULL,
  habit_description         text,
  habit_category            text,
  habit_icon                text,
  habit_color               text DEFAULT '#FF6B6B',
  two_minute_version        text,
  full_version              text,
  intention_behavior        text NOT NULL,
  intention_time            time,
  intention_time_flexible   boolean NOT NULL DEFAULT false,
  intention_location        text,
  intention_location_details text,
  intention_statement       text,
  frequency                 text NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily','weekdays','weekends','specific_days')),
  specific_days             integer[],
  stack_type                text NOT NULL DEFAULT 'none'
    CHECK (stack_type IN ('none','after','before')),
  stack_anchor_blueprint_id uuid REFERENCES habit_blueprints(id) ON DELETE SET NULL,
  stack_anchor_description  text,
  stack_statement           text,
  chain_id                  uuid REFERENCES habit_chains(id) ON DELETE SET NULL,
  chain_position            integer,
  environment_cue           text,
  friction_removals         text[] DEFAULT '{}',
  friction_additions        text[] DEFAULT '{}',
  designated_space          text,
  space_rule                text,
  is_active                 boolean NOT NULL DEFAULT true,
  blueprint_completeness    integer NOT NULL DEFAULT 0,
  time_of_day               text,
  sort_order                integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- 3. environment_setups (reusable environment designs)
CREATE TABLE IF NOT EXISTS environment_setups (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  space_name            text NOT NULL,
  space_type            text,
  space_purpose         text,
  space_icon            text,
  primary_use           text,
  forbidden_uses        text[] DEFAULT '{}',
  visual_cues           text[] DEFAULT '{}',
  friction_removals     text[] DEFAULT '{}',
  friction_additions    text[] DEFAULT '{}',
  linked_blueprint_ids  uuid[] DEFAULT '{}',
  evening_prep_items    text[] DEFAULT '{}',
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_blueprints_user_active ON habit_blueprints(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_blueprints_chain ON habit_blueprints(chain_id, chain_position);
CREATE INDEX IF NOT EXISTS idx_chains_user ON habit_chains(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_env_setups_user ON environment_setups(user_id, is_active);

-- 5. RLS
ALTER TABLE habit_chains       ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_blueprints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own habit_chains"   ON habit_chains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_chains" ON habit_chains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_chains" ON habit_chains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_chains" ON habit_chains FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_chains" ON habit_chains FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own habit_blueprints"   ON habit_blueprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit_blueprints" ON habit_blueprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit_blueprints" ON habit_blueprints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit_blueprints" ON habit_blueprints FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access habit_blueprints" ON habit_blueprints FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own environment_setups"   ON environment_setups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own environment_setups" ON environment_setups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own environment_setups" ON environment_setups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own environment_setups" ON environment_setups FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access environment_setups" ON environment_setups FOR ALL USING (auth.role() = 'service_role');
