'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from './supabase';
import { sendApprovalEmail } from './email';

export type ProfileFormState = { error: string | null };

// ---------------------------------------------------------------------------
// createProfile
// Returns { error } on failure so the form can display it.
// On success, calls redirect() which throws internally — that's intentional.
// Email is fire-and-forget: a Resend failure logs but never blocks saving.
// ---------------------------------------------------------------------------
export async function createProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not signed in. Please refresh and try again.' };

  const displayName = (formData.get('displayName') as string).trim();
  const parentEmail = (formData.get('parentEmail') as string).trim();
  const locale      = (formData.get('locale')      as string) || 'en';

  const supabase = createServerSupabaseClient();

  // Check for an existing profile
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    console.error('[createProfile] select error:', selectError);
    return { error: `Database error: ${selectError.message}` };
  }

  let token: string | null = null;

  if (existing?.is_approved) {
    // Already approved — nickname update only
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId);

    if (error) {
      console.error('[createProfile] update error:', error);
      return { error: `Could not save: ${error.message}` };
    }
  } else {
    // New user OR not yet approved — save/update and send email
    token = crypto.randomUUID();

    const dbPayload = { display_name: displayName, parent_email: parentEmail, approval_token: token };

    const { error } = existing
      ? await supabase.from('profiles').update(dbPayload).eq('id', userId)
      : await supabase.from('profiles').insert({ id: userId, ...dbPayload });

    if (error) {
      console.error('[createProfile] write error:', error);
      // Surface a helpful hint for the most common mistake
      const hint = error.message.includes('approval_token')
        ? ' (Have you run migration 002_approval_token.sql in Supabase?)'
        : '';
      return { error: `Database error: ${error.message}${hint}` };
    }

    // Send email in the background — never block or fail the user for this
    sendApprovalEmail({ parentEmail, childName: displayName, approvalToken: token, locale })
      .catch(err => console.error('[createProfile] email error:', err));
  }

  // redirect() throws a special Next.js error — must be outside try/catch
  redirect(`/${locale}/waiting-room`);
}

// ---------------------------------------------------------------------------
// completeLesson — unchanged
// ---------------------------------------------------------------------------
export async function completeLesson(lessonNumber: number, stickerId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_lesson, unlocked_stickers')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return;

  const newStickers = profile.unlocked_stickers.includes(stickerId)
    ? profile.unlocked_stickers
    : [...profile.unlocked_stickers, stickerId];

  const newLesson = Math.max(profile.current_lesson, lessonNumber + 1);

  await supabase
    .from('profiles')
    .update({ current_lesson: newLesson, unlocked_stickers: newStickers })
    .eq('id', userId);
}
