-- Sunday Storybook: a parent opts in to a weekly WhatsApp recap by giving a
-- number and flipping the consent flag in Account settings. One row per
-- parent account (profiles predates multi-child and is account-scoped, not
-- per-child) — the recap itself is generated per child, but delivery goes
-- to the one account-level WhatsApp number. Run in the Supabase SQL editor.

alter table public.profiles
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_opt_in boolean not null default false;
