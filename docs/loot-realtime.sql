-- Run once in Loot's Supabase project (SQL editor), or add to Loot as migration 033.
-- Lets Northbound hear about deposits the moment they happen, instead of refreshing every minute.
-- Row-level security still applies: each user only receives changes to their own rows.

alter publication supabase_realtime add table public.savings_goals;
alter publication supabase_realtime add table public.goal_contributions;
