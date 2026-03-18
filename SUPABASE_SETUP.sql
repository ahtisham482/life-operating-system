-- ============================================================
-- Life Operating System — Supabase Database Setup
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- MASTER TASKS
-- ─────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  task_name text not null,
  status text not null default 'To Do' check (status in ('To Do', 'In Progress', 'Done')),
  priority text check (priority in ('🔴 High', '🟡 Medium', '🟢 Low')),
  life_area text check (life_area in ('💼 Job', '🚀 Business Building', '📖 Personal Dev', '🏠 Home & Life')),
  type text check (type in ('🏗️ Project', '✅ Task', '🔧 Subtask', '🔁 Habit')),
  due_date date,
  notes text,
  page_content text,
  recurring boolean not null default false,
  frequency text check (frequency in ('Daily', 'Weekly', 'Monthly', 'Custom')),
  repeat_every_days integer,
  last_generated date,
  parent_project_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id)
);

-- ─────────────────────────────────────────────────────────────
-- DAILY HABIT TRACKER (legacy — deprecated, kept for data preservation)
-- ─────────────────────────────────────────────────────────────
create table if not exists habit_entries (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  date date not null unique,
  habits jsonb not null default '{
    "quickAction": false, "exercise": false, "clothes": false,
    "actionLog": false, "readAM": false, "readPM": false,
    "skillStudy": false, "bike": false, "needDesire": false,
    "cashRecall": false, "leftBy9": false, "tafseer": false,
    "phoneOutBy10": false, "weekendPlan": false
  }'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- HABITS SYSTEM v2 (normalized tables)
-- ─────────────────────────────────────────────────────────────
create table if not exists habit_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  time_of_day text not null default 'anytime'
    check (time_of_day in ('morning','afternoon','evening','anytime')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text,
  description text,
  group_id uuid references habit_groups(id) on delete set null,
  schedule_type text not null default 'daily'
    check (schedule_type in ('daily','weekdays','weekends','custom')),
  schedule_days integer[] default '{}'::integer[],
  sort_order integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  status text not null default 'pending'
    check (status in ('completed','skipped','missed','pending')),
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Compatibility view for Pulse Score + Mirror AI
create or replace view habit_completion_summary as
select
  hl.date,
  count(*) filter (where hl.status = 'completed') as habits_completed,
  count(*) filter (where hl.status in ('completed', 'missed', 'pending')) as habits_total,
  case
    when count(*) filter (where hl.status in ('completed', 'missed', 'pending')) > 0
    then round(
      count(*) filter (where hl.status = 'completed')::numeric /
      count(*) filter (where hl.status in ('completed', 'missed', 'pending'))::numeric * 100
    )
    else 0
  end as completion_rate
from habit_logs hl
join habits h on h.id = hl.habit_id
where h.archived_at is null
group by hl.date;

-- ─────────────────────────────────────────────────────────────
-- BOOK ACTION ITEMS
-- ─────────────────────────────────────────────────────────────
create table if not exists book_action_items (
  id uuid primary key default gen_random_uuid(),
  action_item text not null,
  book_name text not null,
  status text not null default 'To Do' check (status in ('To Do', 'Blocked', 'In Progress', 'Done', 'Abandoned')),
  phase_number integer not null,
  phase_name text not null check (phase_name in (
    'Phase 1 - Foundation', 'Phase 2 - Deep Practice',
    'Phase 3 - Integration', 'Phase 4 - Mastery', 'Phase 5 - Teaching'
  )),
  item_type text not null check (item_type in ('📋 Action', '🔁 Habit', '📝 Reflection', '🎯 Milestone')),
  "order" integer not null,
  life_area text check (life_area in ('💼 Job', '🚀 Business Building', '📖 Personal Dev', '🏠 Home & Life')),
  input_needed boolean not null default false,
  depends_on text,
  page_content text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- JOURNAL ENTRIES
-- ─────────────────────────────────────────────────────────────
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  entry text not null,
  mood text not null check (mood in ('😊 Good', '😐 Neutral', '😔 Low', '🔥 Fired Up', '😤 Frustrated')),
  category text not null check (category in ('General', 'Dopamine Reset', 'Financial', 'Work', 'Mindset')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- DAILY EXPENSES
-- ─────────────────────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  amount_pkr numeric(10,2) not null,
  category text not null check (category in (
    'Food & Drinks', 'Transport', 'Bills & Utilities', 'Shopping',
    'Health', 'Business', 'Entertainment', 'Other'
  )),
  date date not null,
  type text not null check (type in ('Need', 'Desire')),
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- ENGINE LOGS
-- ─────────────────────────────────────────────────────────────
create table if not exists engine_logs (
  id uuid primary key default gen_random_uuid(),
  engine_name text not null,
  run_at timestamptz not null default now(),
  status text not null check (status in ('success', 'warning', 'error')),
  summary text,
  details jsonb
);

-- ─────────────────────────────────────────────────────────────
-- WORKSPACE EXCLUSIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists workspace_exclusions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  reason text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_life_area on tasks(life_area);
create index if not exists idx_tasks_recurring on tasks(recurring);
create index if not exists idx_tasks_parent on tasks(parent_project_id);
create index if not exists idx_habit_entries_date on habit_entries(date);
create index if not exists idx_habit_groups_sort on habit_groups(sort_order);
create index if not exists idx_habits_group on habits(group_id);
create index if not exists idx_habits_active on habits(archived_at) where archived_at is null;
create index if not exists idx_habits_sort on habits(group_id, sort_order);
create index if not exists idx_habit_logs_date on habit_logs(date);
create index if not exists idx_habit_logs_habit_date on habit_logs(habit_id, date desc);
create index if not exists idx_habit_logs_status on habit_logs(date, status);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_journal_date on journal_entries(date);
create index if not exists idx_book_items_book on book_action_items(book_name, phase_number);
create index if not exists idx_engine_logs_name on engine_logs(engine_name, run_at);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Single-user app — disable RLS or use simple auth check
-- For now: disable RLS so the app user can read/write everything
-- ─────────────────────────────────────────────────────────────
alter table tasks disable row level security;
alter table task_dependencies disable row level security;
alter table habit_entries disable row level security;
alter table habit_groups disable row level security;
alter table habits disable row level security;
alter table habit_logs disable row level security;
alter table book_action_items disable row level security;
alter table journal_entries disable row level security;
alter table expenses disable row level security;
alter table engine_logs disable row level security;
alter table workspace_exclusions disable row level security;

-- ─────────────────────────────────────────────────────────────
-- Done! Run `npm run db:studio` to visually inspect the tables.
-- ─────────────────────────────────────────────────────────────
