-- Emotional check-in nudge: one soft, dismissible parent-facing signal per
-- child per day. Client-owned (auth.uid() = user_id), same RLS shape as
-- `children` — no fraud/entitlement sensitivity here, unlike subscriptions.
-- Run in the Supabase SQL editor.

create table public.daily_signals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  child_id     uuid references public.children(id) on delete cascade,
  signal_date  date not null default current_date,
  blurb        text not null,
  dismissed    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, child_id, signal_date)
);

alter table public.daily_signals enable row level security;

create policy "daily_signals_select_own" on public.daily_signals
  for select using (auth.uid() = user_id);
create policy "daily_signals_insert_own" on public.daily_signals
  for insert with check (auth.uid() = user_id);
create policy "daily_signals_update_own" on public.daily_signals
  for update using (auth.uid() = user_id);

create index daily_signals_user_date_idx
  on public.daily_signals (user_id, signal_date desc);
