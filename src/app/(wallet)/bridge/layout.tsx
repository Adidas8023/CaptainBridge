import type { Metadata } from 'next';

const title = "Bridge USDC with Circle CCTP V2 | Captain's Bridge";
const description = 'Connect an EVM or Solana wallet, choose supported source and destination networks, and transfer native USDC with Circle CCTP V2.';
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: '/bridge' },
  openGraph: { title, description, url: '/bridge', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
