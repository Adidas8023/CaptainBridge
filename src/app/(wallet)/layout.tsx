import { DocumentLayout } from '@/components/layout/DocumentLayout';
import { WalletProviders } from '@/components/providers/WalletProviders';
export { metadata } from '@/components/layout/DocumentLayout';

// Root layout for the wallet routes (/bridge, /history). Only these pages load
// Reown AppKit, wagmi and the Solana adapters.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocumentLayout language="en">
      <WalletProviders>{children}</WalletProviders>
    </DocumentLayout>
  );
}
