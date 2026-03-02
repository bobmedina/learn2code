import { GateKeeper } from '@/components/GateKeeper';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Link from 'next/link';

export default function Lesson13Page({ params: { locale } }: { params: { locale: string } }) {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b-4 border-kids-orange">
        <Link href={`/${locale}`} className="btn-chunky bg-kids-orange text-white text-base py-2 px-4">
          ← Home
        </Link>
        <LanguageSwitcher />
      </nav>

      <GateKeeper />
    </main>
  );
}
