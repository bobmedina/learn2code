import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ptPT } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Coding Kids | PT & EN',
  description: 'Fun coding lessons for kids aged 6–12',
};

const locales = ['en', 'pt'];

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  // Clerk's built-in Portuguese (European) localization for its own UI strings
  const clerkLocalization = locale === 'pt' ? ptPT : undefined;

  return (
    <ClerkProvider localization={clerkLocalization}>
      <html lang={locale}>
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-gradient-to-b from-kids-blue/20 to-white min-h-screen font-kids">
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
