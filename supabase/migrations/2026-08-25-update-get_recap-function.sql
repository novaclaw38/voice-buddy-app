-- Update get_recap_by_token to include content_json for the tactical storybook page
-- Drops and recreates the function with the additional field

create or replace function public.get_recap_by_token(p_token uuid)
returns table (
  narrative       text,
  lessons_summary jsonb,
  xp_earned       integer,
  week_start      date,
  content_json    jsonb
)
language sql
security definer
set search_path = public
as $$
  select narrative, lessons_summary, xp_earned, week_start, content_json
  from public.weekly_recaps
  where token = p_token;
$$;

revoke all on function public.get_recap_by_token(uuid) from public;
grant execute on function public.get_recap_by_token(uuid) to anon, authenticated;
