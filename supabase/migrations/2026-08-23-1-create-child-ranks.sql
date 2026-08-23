-- Per-child rank/XP tracking for the Promotion Center parent dashboard.
-- Run in the Supabase SQL editor. See
-- docs/superpowers/specs/2026-08-23-promotion-center-design.md.
--
-- One row per child (not per user — a Pro account can have several
-- children, each ranking independently). Never client-writable directly:
-- all XP increments go through bump_child_xp below, a security definer
-- function that does its own ownership check, so a compromised or buggy
-- client can never set another child's XP or set XP to an arbitrary value.

create table if not exists public.child_ranks (
  child_id    uuid primary key references public.children(id) on delete cascade,
  total_xp    integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.child_ranks enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'child_ranks'
  loop
    execute format('drop policy %I on public.child_ranks', p.policyname);
  end loop;
end $$;

-- Read-only for the client — the owning parent account can see its
-- children's rank rows. No insert/update/delete policies: writes only
-- happen through bump_child_xp.
create policy "child_ranks_select_own" on public.child_ranks
  for select using (
    exists (
      select 1 from public.children c
      where c.id = child_ranks.child_id and c.user_id = auth.uid()
    )
  );

create or replace function public.bump_child_xp(
  p_child_id  uuid,
  p_xp_delta  integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_delta integer := greatest(p_xp_delta, 0);
  new_xp integer;
begin
  if not exists (
    select 1 from public.children where id = p_child_id and user_id = auth.uid()
  ) then
    raise exception 'not authorized for this child';
  end if;

  insert into public.child_ranks (child_id, total_xp, updated_at)
  values (p_child_id, safe_delta, now())
  on conflict (child_id)
  do update set total_xp = child_ranks.total_xp + safe_delta, updated_at = now()
  returning total_xp into new_xp;

  return new_xp;
end $$;

revoke all on function public.bump_child_xp(uuid, integer) from public, anon;
grant execute on function public.bump_child_xp(uuid, integer) to authenticated;
