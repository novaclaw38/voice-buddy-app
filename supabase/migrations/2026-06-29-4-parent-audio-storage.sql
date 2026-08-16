-- Private bucket for parent voice messages (replaces base64-in-Postgres).
insert into storage.buckets (id, name, public)
values ('parent-audio', 'parent-audio', false)
on conflict (id) do nothing;

-- Owners (path prefixed with their uid) may manage their own audio objects.
create policy "parent audio: owner insert"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'parent-audio' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "parent audio: owner read"
  on storage.objects for select to authenticated
  using ( bucket_id = 'parent-audio' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "parent audio: owner delete"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'parent-audio' and (storage.foldername(name))[1] = auth.uid()::text );

-- Store the object path instead of inline base64; keep old column nullable for legacy rows.
alter table public.parent_messages add column if not exists audio_path text;
alter table public.parent_messages alter column audio_data drop not null;
