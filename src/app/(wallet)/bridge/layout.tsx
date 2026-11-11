import type { Metadata } from 'next';
import { ogImage } from '@/lib/seo';

const title = "Bridge USDC with Circle CCTP V2 | Captain's Bridge";
const description = 'Connect an EVM or Solana wallet, choose supported source and destination networks, and transfer native USDC with Circle CCTP V2.';
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: '/bridge' },
  openGraph: { title, description, url: '/bridge', type: 'website', images: [ogImage] },
  twitter: { card: 'summary_large_image', title, description, images: [ogImage.url] },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
