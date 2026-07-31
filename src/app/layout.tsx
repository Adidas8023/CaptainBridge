import type { Metadata } from 'next';
import { Figtree, Press_Start_2P, Silkscreen } from 'next/font/google';
import Script from 'next/script';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Captain's Bridge | Cross-Chain USDC Transfer",
    description: 'Bridge USDC across chains instantly with Circle CCTP V2. Zero extra fees.',
    url: 'https://bridge.abelai.app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Captain's Bridge | Cross-Chain USDC Transfer",
    description: 'Bridge USDC across chains instantly with Circle CCTP V2. Zero extra fees.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${pressStart.variable} ${silkscreen.variable} font-sans antialiased`}>
        {/* Microsoft Clarity Analytics */}
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "uv0dq1fboj");
            `,
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
