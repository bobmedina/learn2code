-- Run this in Supabase SQL Editor after 001_profiles.sql
-- Adds a unique one-time token column used in the parent approval email link

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE;
