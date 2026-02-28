import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// TypeScript shape of the profiles table
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  display_name: string | null;
  parent_email: string | null;
  is_approved: boolean;
  current_lesson: number;
  unlocked_stickers: string[];
  approval_token: string | null;
}

// ---------------------------------------------------------------------------
// Server-only Supabase client (service role — bypasses RLS)
// Import ONLY in Server Components, Server Actions, and middleware.
// Never import in 'use client' files.
// ---------------------------------------------------------------------------
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
