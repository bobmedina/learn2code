import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SetupProfileForm } from '@/components/SetupProfileForm';

export default function SetupProfilePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('profile');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="text-center mb-8">
        <div className="text-8xl mb-4">🎮</div>
        <h1 className="text-4xl font-black text-kids-purple mb-2">{t('setupHeading')}</h1>
        <p className="text-lg font-bold text-gray-500">{t('setupSub')}</p>
      </div>

      <div className="card-kids border-kids-purple w-full max-w-md">
        <SetupProfileForm locale={locale} />
      </div>
    </main>
  );
}
