import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LangProvider } from '@/lib/i18n';
import { LANG_COOKIE, type Lang } from '@/lib/lang';
import './globals.css';

export const metadata: Metadata = {
  title: 'Padhaku Log: Chalo, baat karein',
  description: 'Meet students from different campuses. Talk about anything. Skip whenever you want.',
  // Setting `icons` here turns off Next's file-based icon, so every size is listed.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBFAF6',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === 'english' ? 'english' : 'hinglish';
  return (
    <html lang={lang === 'english' ? 'en' : 'hi-Latn'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Kalam:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-paper font-sans text-ink">
        <LangProvider initial={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
