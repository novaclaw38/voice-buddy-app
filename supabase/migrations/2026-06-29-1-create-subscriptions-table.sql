
CREATE TABLE IF NOT EXISTS subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users NOT NULL UNIQUE,
  status           text NOT NULL DEFAULT 'free',
  trial_start      timestamptz,
  trial_end        timestamptz,
  subscription_end timestamptz,
  payfast_token    text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own subscription"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
