-- Lock down the subscriptions table so entitlements can only be granted
-- server-side (service role). Run in the Supabase SQL editor.
--
-- Before this migration the client created its own trial row with the anon
-- key, which meant any signed-in user could insert/extend their own
-- entitlement via the REST API. Trials are now provisioned by
-- /api/ensure-trial using the service key, and the client only ever reads.

alter table public.subscriptions enable row level security;

-- Drop any prior policies that allowed client writes.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
  loop
    execute format('drop policy %I on public.subscriptions', p.policyname);
  end loop;
end $$;

-- Users may read only their own subscription row.
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for anon/authenticated: all writes go
-- through the service role (api/ensure-trial.js, api/payfast-webhook.js,
-- api/payfast-cancel.js), which bypasses RLS.

-- One subscription row per user; the webhook and ensure-trial rely on this.
create unique index if not exists subscriptions_user_id_key
  on public.subscriptions (user_id);
