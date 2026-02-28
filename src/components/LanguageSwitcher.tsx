'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: string) {
    // Pathname includes the current locale prefix, e.g. /en/lesson1
    // Replace the first segment with the new locale
    const segments = pathname.split('/');
    segments[1] = next;
    const newPath = segments.join('/');
    startTransition(() => router.push(newPath));
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        aria-label="Switch to English"
        className={`flex items-center gap-1 px-3 py-2 rounded-xl font-extrabold text-sm border-2 transition-all
          ${locale === 'en'
            ? 'bg-kids-blue text-white border-kids-blue shadow-chunky'
            : 'bg-white text-gray-600 border-gray-200 hover:border-kids-blue'
          }`}
      >
        {/* Inline SVG UK flag */}
        <FlagUK /> EN
      </button>
      <button
        onClick={() => switchLocale('pt')}
        disabled={isPending}
        aria-label="Mudar para Português"
        className={`flex items-center gap-1 px-3 py-2 rounded-xl font-extrabold text-sm border-2 transition-all
          ${locale === 'pt'
            ? 'bg-kids-green text-white border-kids-green shadow-chunky'
            : 'bg-white text-gray-600 border-gray-200 hover:border-kids-green'
          }`}
      >
        <FlagPT /> PT
      </button>
    </div>
  );
}

function FlagUK() {
  return (
    <svg width="24" height="16" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="5" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

function FlagPT() {
  return (
    <svg width="24" height="16" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="60" height="40" fill="#006600" />
      <rect x="20" width="40" height="40" fill="#FF0000" />
      <circle cx="20" cy="20" r="8" fill="#FFD700" stroke="#006600" strokeWidth="1.5" />
    </svg>
  );
}
