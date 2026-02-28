import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Link from 'next/link';

export default function WaitingRoomPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('waitingRoom');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="card-kids border-kids-blue w-full max-w-md text-center space-y-6">
        {/* Animated robot checking email */}
        <div className="text-8xl animate-bounce">📬</div>

        <h1 className="text-3xl font-black text-kids-purple">{t('title')}</h1>

        <p className="text-lg font-bold text-gray-600 leading-relaxed">
          {t('message')}
        </p>

        <div className="card-kids border-kids-yellow bg-kids-yellow/10 text-left">
          <p className="font-black text-kids-purple text-sm">💡 {t('subMessage')}</p>
        </div>

        <Link href={`/${locale}`}>
          <button className="btn-chunky bg-kids-blue text-white w-full">
            {t('homeButton')}
          </button>
        </Link>
      </div>
    </main>
  );
}
