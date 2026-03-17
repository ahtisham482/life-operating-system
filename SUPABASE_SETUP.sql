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
-- DAILY HABIT TRACKER
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
alter table book_action_items disable row level security;
alter table journal_entries disable row level security;
alter table expenses disable row level security;
alter table engine_logs disable row level security;
alter table workspace_exclusions disable row level security;

-- ─────────────────────────────────────────────────────────────
-- INBOX CAPTURES (Quick Capture audit trail)
-- ─────────────────────────────────────────────────────────────
create table if not exists inbox_captures (
  id uuid primary key default gen_random_uuid(),
  raw_input text not null,
  parsed_result jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'edited', 'discarded')),
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbox_captures_status on inbox_captures(status);
create index if not exists idx_inbox_captures_created on inbox_captures(created_at desc);

alter table inbox_captures disable row level security;

-- ─────────────────────────────────────────────────────────────
-- Done! Run `npm run db:studio` to visually inspect the tables.
-- ─────────────────────────────────────────────────────────────
