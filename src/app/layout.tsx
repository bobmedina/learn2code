import type { ReactNode } from 'react';

// Minimal root layout required by Next.js App Router.
// All real layout work (html, body, ClerkProvider, NextIntlClientProvider)
// is done in src/app/[locale]/layout.tsx so that the `lang` attribute
// and locale-aware providers are applied on every page.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
