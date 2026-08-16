
-- Profiles: one row per user, stores settings
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  child_name text default 'Dubz',
  avatar_color text default '#7c3aed',
  parent_pin text default '1234',
  speech_rate float default 0.9,
  speech_pitch float default 1.1,
  auto_listen boolean default false,
  robot_voice boolean default false,
  voice_name text default '',
  morning_routine jsonb default '["Wake up and stretch!","Brush your teeth","Wash your face","Get dressed","Eat breakfast","Pack your bag"]'::jsonb,
  bedtime_routine jsonb default '["Put on your pajamas","Brush your teeth","Use the bathroom","Get into bed","Take 3 deep breaths","Goodnight!"]'::jsonb,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- History: chat log
create table public.history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mode text not null,
  user_text text,
  buddy_text text,
  ts bigint not null,
  created_at timestamptz default now()
);

alter table public.history enable row level security;

create policy "Users manage own history"
  on public.history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index history_user_id_ts on public.history (user_id, ts desc);
