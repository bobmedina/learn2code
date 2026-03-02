import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const locales = ['en', 'pt'] as const;

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Routes that need the user to be signed in (but not necessarily approved)
const isAuthRequired = createRouteMatcher([
  '/:locale/lesson(.*)',
  '/:locale/setup-profile',
  '/:locale/waiting-room',
  '/:locale/sticker-book',
]);

// Routes that also need is_approved = true
const isLessonRoute = createRouteMatcher(['/:locale/lesson(.*)']);

function detectLocale(req: NextRequest): string {
  const segment = req.nextUrl.pathname.split('/')[1];
  return (locales as readonly string[]).includes(segment) ? segment : 'en';
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isAuthRequired(req)) {
    const { userId } = await auth();

    // ── Gate 1: must be signed in ──────────────────────────────────────────
    if (!userId) {
      const locale = detectLocale(req);
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      signInUrl.searchParams.set('redirect_url', req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }

    // ── Gate 2 & 3: lesson routes also need a profile + parental approval ──
    if (isLessonRoute(req)) {
      const locale = detectLocale(req);

      try {
        const supabase = createServerSupabaseClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', userId)
          .maybeSingle();

        if (!profile) {
          // New user — no profile yet
          return NextResponse.redirect(new URL(`/${locale}/setup-profile`, req.url));
        }

        if (!profile.is_approved) {
          // Profile exists but parent hasn't approved yet
          return NextResponse.redirect(new URL(`/${locale}/waiting-room`, req.url));
        }
      } catch {
        // Supabase unreachable — fail open so kids aren't locked out
        // (log to your error tracker in production)
      }
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
