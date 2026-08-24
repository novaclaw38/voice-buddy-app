-- Sunday Storybook: one generated weekly recap per child, delivered as a
-- WhatsApp link to `/storybook/:token`. The link is opened from WhatsApp,
-- often on a device with no Supabase session, so the storybook page can't
-- rely on `auth.uid()` — it reads via the `get_recap_by_token` function
-- below instead of a client query. Run in the Supabase SQL editor.

create table if not exists public.weekly_recaps (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  child_id           uuid not null references public.children(id) on delete cascade,
  week_start         date not null,
  token              uuid not null default gen_random_uuid(),
  narrative          text,
  lessons_summary    jsonb not null default '[]'::jsonb,
  xp_earned          integer not null default 0,
  whatsapp_message_id text,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, child_id, week_start),
  unique (token)
);

alter table public.weekly_recaps enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'weekly_recaps'
  loop
    execute format('drop policy %I on public.weekly_recaps', p.policyname);
  end loop;
end $$;

-- Parent dashboard can list its own past recaps. No insert/update/delete
-- policy: the weekly-digest cron writes via the service-role key, same as
-- subscriptions/payments — never client-writable.
create policy "weekly_recaps_select_own" on public.weekly_recaps
  for select using (auth.uid() = user_id);

-- Public, token-gated read for the storybook page — deliberately callable
-- by `anon` (unlike bump_child_xp/child_ranks, which are authenticated-only)
-- since the link is opened from WhatsApp on an unauthenticated device.
-- Returns only the fields the page needs, never user_id/child_id, so having
-- the token can't be used to enumerate or link back to an account.
create or replace function public.get_recap_by_token(p_token uuid)
returns table (
  narrative       text,
  lessons_summary jsonb,
  xp_earned       integer,
  week_start      date
)
language sql
security definer
set search_path = public
as $$
  select narrative, lessons_summary, xp_earned, week_start
  from public.weekly_recaps
  where token = p_token;
$$;

revoke all on function public.get_recap_by_token(uuid) from public;
grant execute on function public.get_recap_by_token(uuid) to anon, authenticated;

create index if not exists weekly_recaps_child_week_idx
  on public.weekly_recaps (child_id, week_start desc);
