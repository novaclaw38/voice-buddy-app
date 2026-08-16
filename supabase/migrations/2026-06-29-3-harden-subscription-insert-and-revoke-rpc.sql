-- Clients may only ever create a trial/free row for themselves.
-- Paid 'active' status is written exclusively by the PayFast webhook (service role, bypasses RLS).
drop policy if exists "users insert own subscription" on public.subscriptions;
create policy "users insert own subscription"
  on public.subscriptions for insert to authenticated
  with check ( auth.uid() = user_id and status in ('trial','free') );

-- handle_new_user is a SECURITY DEFINER trigger fn; it must not be callable as an RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
