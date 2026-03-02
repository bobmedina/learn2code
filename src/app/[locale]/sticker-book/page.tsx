import { StickerBook } from '@/components/StickerBook';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getUserProfileData } from '@/lib/actions';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function StickerBookPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t     = await getTranslations('stickerBook');
  const stats = await getUserProfileData();

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b-4 border-kids-yellow">
        <Link href={`/${locale}`} className="btn-chunky bg-kids-yellow text-kids-purple text-base py-2 px-4">
          {t('back_home')}
        </Link>
        <LanguageSwitcher />
      </nav>

      <StickerBook earnedBadges={stats?.badges ?? []} />
    </main>
  );
}
