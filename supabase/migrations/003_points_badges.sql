-- Gamification columns: points and badge gallery
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Or via CLI: supabase db push

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS points  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges  TEXT[]  NOT NULL DEFAULT '{}';

-- Back-fill existing rows so they have 0 points and empty badges
-- (the DEFAULT clause above handles new rows; this covers existing ones)
UPDATE profiles SET points = 0  WHERE points IS NULL;
UPDATE profiles SET badges = '{}' WHERE badges IS NULL;
