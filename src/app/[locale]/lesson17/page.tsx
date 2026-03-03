import { InfiniteCharge } from '@/components/InfiniteCharge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function Lesson17Page({ params: { locale } }: { params: { locale: string } }) {
  const tNav = await getTranslations('nav');
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b-4 border-kids-green">
        <Link href={`/${locale}`} className="btn-chunky bg-kids-green text-white text-base py-2 px-4">
          ← {tNav('home')}
        </Link>
        <LanguageSwitcher />
      </nav>

      <InfiniteCharge />
    </main>
  );
}
