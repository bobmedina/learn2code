import { BugDetective } from '@/components/BugDetective';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Link from 'next/link';

export default function Lesson8Page({ params: { locale } }: { params: { locale: string } }) {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b-4 border-kids-yellow">
        <Link href={`/${locale}`} className="btn-chunky bg-kids-yellow text-kids-purple text-base py-2 px-4">
          ← Home
        </Link>
        <LanguageSwitcher />
      </nav>

      <BugDetective />
    </main>
  );
}
