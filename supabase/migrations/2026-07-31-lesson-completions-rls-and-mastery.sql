-- Two bugs found live in the dubz-buddy project via Supabase MCP, fixed
-- directly there and mirrored here for tracking:
--
-- 1. lesson_completions has row level security ENABLED but zero policies
--    defined — meaning every read/write from the client (anon/authenticated
--    roles, e.g. useProgress.js's select and markComplete's upsert) was
--    silently denied for every user, always. This broke completion
--    checkmarks and mastery scores app-wide with no visible error beyond a
--    console.error the UI never surfaces.
-- 2. The 2026-07-30-lesson-progress-mastery.sql migration (mastery_score
--    column) was apparently never actually applied — the live table had no
--    mastery_score column at all, so markComplete's upsert would have
--    failed outright once RLS was fixed, since the app already sends a
--    mastery_score value in that upsert. Re-applying it here (idempotent).

alter table public.lesson_completions
  add column if not exists mastery_score smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lesson_completions'::regclass
      and conname = 'lesson_completions_mastery_score_range'
  ) then
    alter table public.lesson_completions
      add constraint lesson_completions_mastery_score_range
      check (mastery_score is null or (mastery_score >= 0 and mastery_score <= 100));
  end if;
end $$;

alter table public.lesson_completions enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'lesson_completions'
  loop
    execute format('drop policy %I on public.lesson_completions', p.policyname);
  end loop;
end $$;

create policy "lesson_completions_select_own" on public.lesson_completions
  for select using (auth.uid() = user_id);

create policy "lesson_completions_insert_own" on public.lesson_completions
  for insert with check (auth.uid() = user_id);

create policy "lesson_completions_update_own" on public.lesson_completions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
