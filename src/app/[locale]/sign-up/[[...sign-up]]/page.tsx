import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AgeGate } from '@/components/AgeGate';
import Link from 'next/link';

export default function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('auth');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Link
        href={`/${locale}`}
        className="absolute top-4 left-4 btn-chunky bg-kids-yellow text-kids-purple text-base py-2 px-4"
      >
        ← Home
      </Link>

      <div className="text-center mb-8">
        <div className="text-8xl mb-4">🚀</div>
        <h1 className="text-4xl font-black text-kids-purple mb-2">{t('signUpHeading')}</h1>
        <p className="text-lg font-bold text-gray-500">{t('signUpSub')}</p>
      </div>

      <AgeGate locale={locale} />
    </main>
  );
}
