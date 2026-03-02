'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
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

  const clerkUser    = await currentUser();
  const displayName  = (
    clerkUser?.firstName ||
    clerkUser?.username ||
    clerkUser?.emailAddresses[0]?.emailAddress?.split('@')[0] ||
    'Coder'
  ).trim();
  const parentEmail  = ((formData.get('parentEmail')  as string) ?? '').trim();
  const locale       = (formData.get('locale')        as string) || 'en';
  const ageVerified  = formData.get('ageVerified') === 'true';

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

  if (existing?.is_approved || ageVerified) {
    // Already approved OR user self-declared 13+ — save nickname and go straight to lessons
    const { error } = existing
      ? await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
      : await supabase.from('profiles').insert({
          id: userId,
          display_name: displayName,
          parent_email: null,
          approval_token: null,
          is_approved: true,
        });

    if (error) {
      console.error('[createProfile] write error (age-verified):', error);
      return { error: `Could not save: ${error.message}` };
    }

    redirect(`/${locale}`);
  } else {
    // New user OR not yet approved — save/update and send parent email
    const token = crypto.randomUUID();

    const dbPayload = { display_name: displayName, parent_email: parentEmail, approval_token: token };

    const { error } = existing
      ? await supabase.from('profiles').update(dbPayload).eq('id', userId)
      : await supabase.from('profiles').insert({ id: userId, ...dbPayload });

    if (error) {
      console.error('[createProfile] write error:', error);
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
// Badge IDs earned on completion of each lesson
// ---------------------------------------------------------------------------
const LESSON_BADGES: Record<number, string> = {
  1:  'chef_logic',
  2:  'weather_wizard',
  3:  'loop_dancer',
  4:  'magic_box',
  5:  'backpack_pro',
  6:  'func_hero',
  7:  'click_master',
  8:  'bug_detective',
  9:  'map_explorer',
  10: 'game_master',
  11: 'secret_coder',
  12: 'data_librarian',
  13: 'castle_guard',
  14: 'moon_jumper',
  15: 'clone_commander',
  16: 'race_driver',
  17: 'ai_trainer',
  18: 'logic_path',
  19: 'world_builder',
  20: 'master_architect',
};

// ---------------------------------------------------------------------------
// completeLesson — awards +100 points and the lesson badge (first time only)
// ---------------------------------------------------------------------------
export async function completeLesson(lessonNumber: number, stickerId: string) {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_lesson, unlocked_stickers, points, badges')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return;

  // Stickers (used for lesson-completion animation)
  const newStickers = (profile.unlocked_stickers ?? []).includes(stickerId)
    ? (profile.unlocked_stickers ?? [])
    : [...(profile.unlocked_stickers ?? []), stickerId];

  // Only advance lesson number and award points the first time
  const alreadyCompleted = profile.current_lesson > lessonNumber;
  const newLesson  = Math.max(profile.current_lesson, lessonNumber + 1);
  const newPoints  = alreadyCompleted ? (profile.points ?? 0) : (profile.points ?? 0) + 100;

  // Badges — append if not already earned
  const badgeId       = LESSON_BADGES[lessonNumber];
  const existingBadges = profile.badges ?? [];
  const newBadges = badgeId && !existingBadges.includes(badgeId)
    ? [...existingBadges, badgeId]
    : existingBadges;

  await supabase
    .from('profiles')
    .update({
      current_lesson:    newLesson,
      unlocked_stickers: newStickers,
      points:            newPoints,
      badges:            newBadges,
    })
    .eq('id', userId);
}

// ---------------------------------------------------------------------------
// getUserProfileData — read-only stats fetch for UI components
// Returns null when not signed in or profile not found
// ---------------------------------------------------------------------------
export async function getUserProfileData(): Promise<{
  current_lesson: number;
  points: number;
  badges: string[];
} | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('profiles')
      .select('current_lesson, points, badges')
      .eq('id', userId)
      .maybeSingle();

    if (!data) return null;
    return {
      current_lesson: data.current_lesson ?? 1,
      points:         data.points         ?? 0,
      badges:         data.badges         ?? [],
    };
  } catch {
    return null;
  }
}
