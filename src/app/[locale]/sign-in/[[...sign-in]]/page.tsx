import { SignIn } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Link from 'next/link';

export default function SignInPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Link
        href={`/${locale}`}
        className="absolute top-4 left-4 btn-chunky bg-kids-blue text-white text-base py-2 px-4"
      >
        ← Home
      </Link>

      <div className="text-center mb-8">
        <div className="text-8xl mb-4">🔐</div>
        <h1 className="text-4xl font-black text-kids-purple mb-2">{t('signInHeading')}</h1>
        <p className="text-lg font-bold text-gray-500">{t('signInSub')}</p>
      </div>

      <SignIn
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/sign-up`}
        fallbackRedirectUrl={`/${locale}`}
        appearance={{
          elements: {
            rootBox: 'w-full flex justify-center',
            card: 'shadow-xl rounded-2xl border-4 border-kids-blue w-full max-w-md',
            headerTitle: 'font-black text-kids-purple text-2xl',
            headerSubtitle: 'font-bold text-gray-500',
            formButtonPrimary:
              'btn-chunky bg-kids-purple text-white w-full normal-case text-base',
            footerActionLink: 'text-kids-purple font-black hover:underline',
            formFieldInput:
              'rounded-xl border-2 border-gray-200 focus:border-kids-purple font-bold text-base px-4 py-3',
            formFieldLabel: 'font-black text-gray-600 text-sm',
            identityPreviewText: 'font-bold',
            socialButtonsBlockButton:
              'rounded-xl border-2 border-gray-200 font-bold hover:border-kids-blue transition-colors',
          },
        }}
      />
    </main>
  );
}
