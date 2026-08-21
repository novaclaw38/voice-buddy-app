-- Payments ledger: one row per PayFast ITN, independent of the
-- subscriptions table's current-state row. Populated by
-- api/payfast-webhook.js; read by api/admin/index.js for financial
-- reporting. Only the service role ever touches this table.

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  pf_payment_id  text not null unique,
  amount         numeric(10,2) not null,
  status         text not null,           -- 'complete' | 'failed' | 'cancelled'
  payment_type   text not null,           -- 'trial_setup' | 'recurring'
  created_at     timestamptz not null default now()
);

alter table public.payments enable row level security;
-- No policies: RLS-enabled + zero policies blocks anon/authenticated
-- entirely, matching the subscriptions table. Only the service role
-- (webhook, admin API) reads or writes this table.

create index payments_user_id_idx on public.payments (user_id);
create index payments_created_at_idx on public.payments (created_at desc);
