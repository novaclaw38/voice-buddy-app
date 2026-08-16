-- Only the owning account may read/send broadcast on its own camera-<uid> topic.
-- Applies to private channels; public channels (e.g. postgres_changes) are unaffected.
create policy "camera owner can receive"
  on realtime.messages for select to authenticated
  using ( realtime.topic() = 'camera-' || auth.uid()::text );

create policy "camera owner can send"
  on realtime.messages for insert to authenticated
  with check ( realtime.topic() = 'camera-' || auth.uid()::text );
