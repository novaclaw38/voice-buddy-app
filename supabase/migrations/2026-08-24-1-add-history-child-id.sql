-- Sunday Storybook (weekly WhatsApp recap): `history` predates multi-child
-- profiles and has no way to attribute a chat turn to a specific child,
-- which the recap generator needs to build a per-child weekly narrative.
-- Existing rows stay null (unattributed) and are simply excluded from any
-- recap — same "legacy rows are null, that's fine" precedent already used
-- for `lesson_completions.child_id` and `daily_signals`. Run in the
-- Supabase SQL editor.

alter table public.history
  add column if not exists child_id uuid references public.children(id) on delete cascade;

create index if not exists history_user_child_ts_idx
  on public.history (user_id, child_id, ts desc);
