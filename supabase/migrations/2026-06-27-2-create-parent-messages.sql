
create table public.parent_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  audio_data text not null,
  mime_type text default 'audio/webm',
  played boolean default false,
  created_at timestamptz default now()
);

alter table public.parent_messages enable row level security;

create policy "Users manage own messages"
  on public.parent_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index parent_messages_user_unplayed
  on public.parent_messages (user_id, played, created_at desc);
