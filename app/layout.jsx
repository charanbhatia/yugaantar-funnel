import { Mona_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

// Same type as the Minarva staff console: Mona Sans for everything, Geist Mono for numbers.
const mona = Mona_Sans({ subsets: ['latin'], variable: '--font-mona' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata = {
  title: 'Fest Pass Funnel · Yugaantar 2026',
  description: 'Live Fest Pass funnel for Yugaantar 2026: where people drop off and what to fix.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${mona.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
