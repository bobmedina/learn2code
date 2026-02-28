import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t   = useTranslations('home');
  const ta  = useTranslations('auth');
  const tL1 = useTranslations('lesson1');
  const tL2 = useTranslations('lesson2');
  const tL3 = useTranslations('lesson3');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Top bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
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
          <Link href={`/${locale}/lesson1`}>
            <button className="btn-chunky bg-kids-yellow text-kids-purple text-2xl">
              {t('startButton')} 🚀
            </button>
          </Link>
        </SignedIn>
      </div>

      {/* Lesson cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">

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
        </SignedOut>
      </div>

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
