-- Fix: one signal per child per day was not actually enforced for the
-- legacy single-child path (child_id IS NULL).
--
-- Postgres treats NULLs as distinct in a UNIQUE constraint by default, so
-- `unique (user_id, child_id, signal_date)` happily accepted unlimited
-- duplicate rows whenever child_id was NULL — and upsert's ON CONFLICT
-- could never match one, so every concern-keyword message inserted a new
-- row instead of updating today's.
--
-- NULLS NOT DISTINCT (Postgres 15+) makes NULL compare equal to NULL for
-- uniqueness purposes, which is the semantics this table always intended.
-- Paired with the `.is('child_id', null)` fix in src/services/signalsService.js
-- (an `.eq()` filter can never match a NULL either).

alter table public.daily_signals
  drop constraint daily_signals_user_id_child_id_signal_date_key;

alter table public.daily_signals
  add constraint daily_signals_user_id_child_id_signal_date_key
  unique nulls not distinct (user_id, child_id, signal_date);
