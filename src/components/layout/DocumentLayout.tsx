import type { Metadata } from 'next';
import { Figtree, Press_Start_2P, Silkscreen } from 'next/font/google';
import Script from 'next/script';
import { SiteProviders } from '@/components/providers/SiteProviders';
import type { Language } from '@/lib/i18n';
import '@/app/globals.css';
import { ogImage } from '@/lib/seo';

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// 像素字体 - 用于品牌名称
const pressStart = Press_Start_2P({
  variable: '--font-pixel',
  subsets: ['latin'],
  weight: '400',
});

const silkscreen = Silkscreen({
  variable: '--font-silkscreen',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bridge.abelai.app'),
  title: "Captain's Bridge | Cross-Chain USDC Transfer",
  description: 'Bridge USDC across chains instantly with Circle CCTP V2. Zero extra fees. Support for Ethereum, Arbitrum, Base, Solana, and more.',
  keywords: ["Captain's Bridge", 'CCTP', 'USDC', 'bridge', 'cross-chain', 'Circle', 'crypto', 'Abel船长'],
  authors: [{ name: 'Abel船长' }],
  openGraph: {
    title: "Captain's Bridge | Cross-Chain USDC Transfer",
    description: 'Bridge USDC across chains instantly with Circle CCTP V2. Zero extra fees.',
    url: 'https://bridge.abelai.app',
    type: 'website',
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Captain's Bridge | Cross-Chain USDC Transfer",
    description: 'Bridge USDC across chains instantly with Circle CCTP V2. Zero extra fees.',
    images: [ogImage.url],
  },
};

export function DocumentLayout({
  children,
  language = 'en',
}: Readonly<{
  children: React.ReactNode;
  language?: Language;
}>) {
  return (
    <html lang={language === 'zh' ? 'zh-CN' : 'en'} suppressHydrationWarning>
      <body className={`${figtree.variable} ${pressStart.variable} ${silkscreen.variable} font-sans antialiased`}>
        {/* Shared AbelAI GA4 tracker; the same file ships on every abelai.app site. */}
        <Script id="abel-ga4" src="/abel-analytics.js" strategy="afterInteractive" />
        <SiteProviders initialLanguage={language}>{children}</SiteProviders>
      </body>
    </html>
  );
}
