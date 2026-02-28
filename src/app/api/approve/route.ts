import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/approve?token=<uuid>
// The parent clicks this link from the email.
// Looks up the token, sets is_approved = true, redirects to a success page.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/en/approved?status=invalid', req.url));
  }

  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .update({ is_approved: true })
    .eq('approval_token', token)
    .select('display_name')
    .maybeSingle();

  if (!profile) {
    // Token not found — already approved or link is stale
    return NextResponse.redirect(new URL('/en/approved?status=already', req.url));
  }

  const name = encodeURIComponent(profile.display_name ?? '');
  return NextResponse.redirect(new URL(`/en/approved?name=${name}`, req.url));
}
