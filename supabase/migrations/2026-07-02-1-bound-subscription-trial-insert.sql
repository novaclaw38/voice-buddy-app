DROP POLICY IF EXISTS "users insert own subscription" ON public.subscriptions;

CREATE POLICY "users insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    (status = 'free' AND trial_start IS NULL AND trial_end IS NULL AND subscription_end IS NULL)
    OR (
      status = 'trial'
      AND subscription_end IS NULL
      AND trial_start IS NOT NULL
      AND trial_end IS NOT NULL
      AND trial_start <= now() + interval '1 minute'
      AND trial_end <= trial_start + interval '10 days' + interval '1 minute'
    )
  )
);
