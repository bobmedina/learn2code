-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- Or via Supabase CLI: supabase db push

CREATE TABLE IF NOT EXISTS profiles (
  -- Matches the Clerk userId string (e.g. "user_2abc...")
  id                TEXT        PRIMARY KEY,

  -- A safe nickname shown in the UI — never a real full name
  display_name      TEXT,

  -- Parent/guardian email for consent; not the child's login email
  parent_email      TEXT,

  -- Set to TRUE by a parent clicking the approval link (or manually in Supabase dashboard)
  is_approved       BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Tracks which lesson to show next (starts at 1)
  current_lesson    INT         NOT NULL DEFAULT 1,

  -- Sticker IDs earned, e.g. {"sticker-algorithm", "sticker-logic"}
  unlocked_stickers TEXT[]      NOT NULL DEFAULT '{}'
);

-- Lock down direct access — all reads/writes go through the service role
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed: we use the service role key server-side only,
-- which bypasses RLS entirely. The anon key has no access.
