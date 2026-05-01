alter table public.users
  add column if not exists stripe_payment_intent_id text unique;
