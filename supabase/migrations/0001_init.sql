-- ============================================================================
-- Habit Tracker — schéma initial
-- ----------------------------------------------------------------------------
-- Modèle : deux tables applicatives (habits, habit_logs). Les utilisateurs sont
-- gérés par Supabase Auth (auth.users). Les streaks et statistiques ne sont PAS
-- stockés : ils sont calculés à la volée côté client à partir de habit_logs
-- (source de vérité unique — voir src/lib/streaks.ts).
--
-- À exécuter dans : Supabase Dashboard > SQL Editor (ou `supabase db push`).
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================================
-- Table: habits
-- ============================================================================
-- frequency_type :
--   'daily'         -> à faire tous les jours
--   'weekly_count'  -> N fois par semaine (weekly_target), jours au choix
--   'specific_days' -> jours précis de la semaine (days_of_week)
--
-- days_of_week : entiers 0..6 où 0 = dimanche ... 6 = samedi (ISO côté app).
-- color : token de palette ('emerald', 'sky', ...) résolu côté client.
create table if not exists public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  emoji          text not null default '✅',
  color          text not null default 'emerald',
  frequency_type text not null default 'daily'
                   check (frequency_type in ('daily', 'weekly_count', 'specific_days')),
  weekly_target  int  not null default 1 check (weekly_target between 1 and 7),
  days_of_week   int[] not null default '{}',
  sort_order     int  not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists habits_user_idx
  on public.habits (user_id, archived, sort_order);

-- ============================================================================
-- Table: habit_logs
-- ============================================================================
-- Une ligne = l'habitude a été complétée ce jour-là (frontière de journée dans
-- le fuseau local de l'utilisateur ; `date` est la date locale au format JJ).
-- Décocher = suppression de la ligne (garde la heatmap propre : présence = fait).
-- La colonne `completed` reste dans le schéma pour un usage futur (ex: marquer
-- explicitement "raté") mais l'app se base aujourd'hui sur la présence de ligne.
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  completed  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create index if not exists habit_logs_habit_date_idx
  on public.habit_logs (habit_id, date);

create index if not exists habit_logs_user_date_idx
  on public.habit_logs (user_id, date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;

-- habits ---------------------------------------------------------------------
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- habit_logs -----------------------------------------------------------------
drop policy if exists "habit_logs_select_own" on public.habit_logs;
create policy "habit_logs_select_own" on public.habit_logs
  for select using (auth.uid() = user_id);

drop policy if exists "habit_logs_insert_own" on public.habit_logs;
create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "habit_logs_update_own" on public.habit_logs;
create policy "habit_logs_update_own" on public.habit_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habit_logs_delete_own" on public.habit_logs;
create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- Realtime
-- ============================================================================
-- Publie les deux tables pour la synchro temps réel entre appareils.
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_logs;
