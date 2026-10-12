import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

// PYQVault's pair: Inter for the interface, Source Serif for reading a candidate's own words.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CrackSSB — SSB preparation', template: '%s · CrackSSB' },
  description: 'Practise the SSB the way it is run: by day, against the real clock, with feedback drawn from your own words.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1430' },
  ],
};

// Sets the theme before first paint, so a dark-mode reader never sees a white flash. Static string; no input reaches it.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
