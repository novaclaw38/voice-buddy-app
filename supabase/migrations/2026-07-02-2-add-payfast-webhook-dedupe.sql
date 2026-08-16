CREATE TABLE IF NOT EXISTS public.payfast_webhook_events (
  pf_payment_id text PRIMARY KEY,
  received_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payfast_webhook_events ENABLE ROW LEVEL SECURITY;
-- Only the service role (server) touches this table; no client policies needed.
