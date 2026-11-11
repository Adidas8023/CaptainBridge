import { headers } from 'next/headers';
import { DocumentLayout } from '@/components/layout/DocumentLayout';
import { WalletProviders } from '@/components/providers/WalletProviders';
export { metadata } from '@/components/layout/DocumentLayout';

// Root layout for the wallet routes (/bridge, /history). Only these pages load
// Reown AppKit, wagmi and the Solana adapters. The language comes from
// middleware (?lang, saved choice, browser language), so these pages render
// per request; the marketing pages stay static.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const language = (await headers()).get('x-site-language') === 'zh' ? 'zh' : 'en';
  return (
    <DocumentLayout language={language}>
      <WalletProviders>{children}</WalletProviders>
    </DocumentLayout>
  );
}
