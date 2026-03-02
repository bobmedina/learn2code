'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignUp } from '@clerk/nextjs';

interface AgeGateProps {
  locale: string;
}

export function AgeGate({ locale }: AgeGateProps) {
  const t = useTranslations('ageGate');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [proceeded, setProceed] = useState(false);

  const handleContinue = () => {
    sessionStorage.setItem('ageConfirmed', ageConfirmed ? 'true' : 'false');
    setProceed(true);
  };

  if (proceeded) {
    return (
      <SignUp
        path={`/${locale}/sign-up`}
        signInUrl={`/${locale}/sign-in`}
        fallbackRedirectUrl={`/${locale}/setup-profile`}
        appearance={{
          elements: {
            rootBox: 'w-full flex justify-center',
            card: 'shadow-xl rounded-2xl border-4 border-kids-yellow w-full max-w-md',
            headerTitle: 'font-black text-kids-purple text-2xl',
            headerSubtitle: 'font-bold text-gray-500',
            formButtonPrimary:
              'btn-chunky bg-kids-yellow text-kids-purple w-full normal-case text-base',
            footerActionLink: 'text-kids-purple font-black hover:underline',
            formFieldInput:
              'rounded-xl border-2 border-gray-200 focus:border-kids-yellow font-bold text-base px-4 py-3',
            formFieldLabel: 'font-black text-gray-600 text-sm',
            socialButtonsBlockButton:
              'rounded-xl border-2 border-gray-200 font-bold hover:border-kids-yellow transition-colors',
            // Hide Clerk's built-in legal consent checkbox — we collect consent via AgeGate
            formFieldRow__legalAccepted: { style: { display: 'none' } },
          },
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border-4 border-kids-purple p-6 space-y-5">
      {/* Heading */}
      <div className="flex items-center gap-2">
        <span className="text-3xl">🛡️</span>
        <h2 className="text-2xl font-black text-kids-purple">{t('heading')}</h2>
      </div>

      {/* Legal body text */}
      <p className="font-bold text-gray-600 text-sm leading-relaxed">{t('body')}</p>

      <hr className="border-gray-200" />

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-kids-purple cursor-pointer"
        />
        <span className="font-black text-gray-800 text-sm leading-relaxed">
          {t('checkboxLabel')}
        </span>
      </label>

      {/* Continue — always enabled; checkbox drives consent logic on next page */}
      <button
        onClick={handleContinue}
        className="btn-chunky bg-kids-yellow text-kids-purple w-full text-base"
      >
        {t('continueButton')} →
      </button>
    </div>
  );
}
