'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createProfile } from '@/lib/actions';
import { useFormState, useFormStatus } from 'react-dom';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-chunky bg-kids-yellow text-kids-purple w-full text-xl
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '⏳ ...' : label}
    </button>
  );
}

export function SetupProfileForm({ locale }: { locale: string }) {
  const t = useTranslations('profile');
  const tAge = useTranslations('ageGate');
  const [state, action] = useFormState(createProfile, { error: null });
  const [ageConfirmed, setAgeConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    const val = sessionStorage.getItem('ageConfirmed');
    setAgeConfirmed(val === 'true');
  }, []);

  return (
    <form action={action} className="w-full max-w-md space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {ageConfirmed && <input type="hidden" name="ageVerified" value="true" />}

      {/* Error banner */}
      {state.error && (
        <div className="bg-red-50 border-4 border-kids-red rounded-xl px-4 py-3">
          <p className="font-black text-red-700 text-sm">⚠️ {state.error}</p>
        </div>
      )}

      {/* Age-verified banner */}
      {ageConfirmed && (
        <div className="bg-green-50 border-4 border-green-400 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-xl">✅</span>
          <p className="font-black text-green-700 text-sm">{tAge('ageVerifiedNote')}</p>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="displayName" className="font-black text-gray-600 text-sm block">
          {t('displayNameLabel')}
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          minLength={2}
          maxLength={30}
          placeholder={t('displayNamePlaceholder')}
          className="w-full rounded-xl border-4 border-gray-200 focus:border-kids-purple
                     outline-none font-bold text-lg px-4 py-3 transition-colors"
        />
      </div>

      {/* Parent email — only shown when the user did NOT confirm they are 13+ */}
      {!ageConfirmed && (
        <div className="space-y-1">
          <label htmlFor="parentEmail" className="font-black text-gray-600 text-sm block">
            {t('parentEmailLabel')}
          </label>
          <input
            id="parentEmail"
            name="parentEmail"
            type="email"
            required
            placeholder={t('parentEmailPlaceholder')}
            className="w-full rounded-xl border-4 border-gray-200 focus:border-kids-yellow
                       outline-none font-bold text-lg px-4 py-3 transition-colors"
          />
          <p className="text-gray-400 font-bold text-xs mt-1">
            {t('parentEmailHelp')}
          </p>
        </div>
      )}

      <SubmitButton label={t('submitButton')} />
    </form>
  );
}
