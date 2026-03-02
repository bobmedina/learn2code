import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserStats } from '@/components/UserStats';
import { Phase2Section } from '@/components/Phase2Section';
import { getUserProfileData } from '@/lib/actions';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  // async server components must use getTranslations, not the useTranslations hook
  const [t, ta, tL1, tL2, tL3, tL4, tL5, tL6, tL7, tL8, tL9, tL10, tL11, tL12, tL13, tL14, tL15, tL16, stats] = await Promise.all([
    getTranslations('home'),
    getTranslations('auth'),
    getTranslations('lesson1'),
    getTranslations('lesson2'),
    getTranslations('lesson3'),
    getTranslations('lesson4'),
    getTranslations('lesson5'),
    getTranslations('lesson6'),
    getTranslations('lesson7'),
    getTranslations('lesson8'),
    getTranslations('lesson9'),
    getTranslations('lesson10'),
    getTranslations('lesson11'),
    getTranslations('lesson12'),
    getTranslations('lesson13'),
    getTranslations('lesson14'),
    getTranslations('lesson15'),
    getTranslations('lesson16'),
    getUserProfileData(),
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Top bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {/* Points + level widget (only shown when signed in and profile exists) */}
        {stats && (
          <UserStats
            points={stats.points}
            currentLesson={stats.current_lesson}
            locale={locale}
          />
        )}
        <SignedIn>
          <UserButton
            afterSignOutUrl={`/${locale}`}
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10 border-2 border-kids-purple rounded-full',
              },
            }}
          />
        </SignedIn>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div className="text-center max-w-2xl">
        <div className="text-9xl mb-6 animate-bounce">🤖</div>

        <h1 className="text-5xl md:text-7xl font-black text-kids-purple drop-shadow-md mb-4">
          {t('heading')}
        </h1>
        <p className="text-2xl text-gray-600 font-bold mb-10">
          {t('subheading')}
        </p>

        {/* CTA — different for signed-in vs signed-out */}
        <SignedOut>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={`/${locale}/sign-up`}>
              <button className="btn-chunky bg-kids-yellow text-kids-purple text-xl">
                {ta('signUp')} 🚀
              </button>
            </Link>
            <Link href={`/${locale}/sign-in`}>
              <button className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-xl">
                {ta('signIn')}
              </button>
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={`/${locale}/lesson1`}>
              <button className="btn-chunky bg-kids-yellow text-kids-purple text-2xl">
                {t('startButton')} 🚀
              </button>
            </Link>
            <Link href={`/${locale}/sticker-book`}>
              <button className="btn-chunky bg-white text-kids-purple border-4 border-kids-purple text-xl">
                🏅 {t('myBadges')}
              </button>
            </Link>
          </div>
        </SignedIn>
      </div>

      {/* Phase 1 header */}
      <div className="mt-16 w-full max-w-3xl flex items-center gap-4">
        <div className="h-1 flex-1 bg-kids-purple/20 rounded-full" />
        <span className="font-black text-kids-purple text-sm uppercase tracking-widest whitespace-nowrap">
          🎮 {t('phase1_label')}
        </span>
        <div className="h-1 flex-1 bg-kids-purple/20 rounded-full" />
      </div>

      {/* Lesson cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">

        <SignedIn>
          {/* Logged-in: clickable cards */}
          <Link href={`/${locale}/lesson1`} className="card-kids border-kids-blue hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">🍞</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 1</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL1('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson2`} className="card-kids border-kids-yellow hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">☀️</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 2</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL2('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson3`} className="card-kids border-kids-green hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">🕺</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 3</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL3('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson4`} className="card-kids border-kids-orange hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">📦</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 4</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL4('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson5`} className="card-kids border-kids-blue hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">🎒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 5</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL5('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson6`} className="card-kids border-kids-purple hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 6</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL6('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson7`} className="card-kids border-kids-red hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">👆</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 7</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL7('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson8`} className="card-kids border-kids-yellow hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">🔍</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 8</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL8('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson9`} className="card-kids border-kids-green hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">🗺️</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 9</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL9('title')}</p>
          </Link>
          <Link href={`/${locale}/lesson10`} className="card-kids border-kids-purple hover:scale-105 transition-transform block">
            <div className="text-5xl mb-3">⭐</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 10</h2>
            <p className="text-gray-500 font-bold text-sm mt-1">{tL10('title')}</p>
          </Link>
        </SignedIn>

        <SignedOut>
          {/* Logged-out: locked cards with sign-in prompt */}
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-blue hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 1</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL1('title')}</p>
            <p className="text-kids-blue font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-yellow hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 2</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL2('title')}</p>
            <p className="text-kids-yellow font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-green hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 3</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL3('title')}</p>
            <p className="text-kids-green font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-orange hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 4</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL4('title')}</p>
            <p className="text-kids-orange font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-blue hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 5</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL5('title')}</p>
            <p className="text-kids-blue font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-purple hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 6</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL6('title')}</p>
            <p className="text-kids-purple font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-red hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 7</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL7('title')}</p>
            <p className="text-kids-red font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-yellow hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 8</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL8('title')}</p>
            <p className="text-kids-yellow font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-green hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 9</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL9('title')}</p>
            <p className="text-kids-green font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
          <Link href={`/${locale}/sign-in`} className="card-kids border-kids-purple hover:scale-105 transition-transform block group">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-kids-purple">Lesson 10</h2>
            <p className="text-gray-400 font-bold text-sm mt-1">{tL10('title')}</p>
            <p className="text-kids-purple font-black text-xs mt-2 group-hover:underline">{ta('signIn')} →</p>
          </Link>
        </SignedOut>
      </div>

      {/* Phase 2 — locked until lesson 10 complete, then dynamically unlocks */}
      <Phase2Section
        unlocked={stats ? stats.current_lesson > 10 : false}
        lesson11Title={tL11('title')}
        lesson12Title={tL12('title')}
        lesson13Title={tL13('title')}
        lesson14Title={tL14('title')}
        lesson15Title={tL15('title')}
        lesson16Title={tL16('title')}
        phase2Label={t('phase2_label')}
        phase2Sub={t('phase2_sub')}
        phase2UnlockedLabel={t('phase2_unlocked')}
        phase2LockHint={t('phase2_lock_hint')}
        locale={locale}
      />

      {/* Sign-in nudge banner — only for logged-out users */}
      <SignedOut>
        <div className="mt-8 card-kids border-kids-purple max-w-md w-full text-center">
          <p className="text-2xl mb-2">🎮</p>
          <p className="font-black text-kids-purple text-lg">{ta('lockedTitle')}</p>
          <p className="font-bold text-gray-500 text-sm mt-1">{ta('lockedSub')}</p>
        </div>
      </SignedOut>
    </main>
  );
}
