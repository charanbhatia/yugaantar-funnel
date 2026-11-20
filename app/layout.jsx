import { Pixelify_Sans, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Pixelify_Sans({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-mono' });

export const metadata = {
  title: 'Fest Pass Funnel · Yugaantar 2026',
  description: 'Live Fest Pass funnel for Yugaantar 2026: where people drop off and what to fix.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
