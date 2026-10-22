import type { Metadata } from 'next';

const title = "Your Transfer History | Captain's Bridge";
const description = 'View and manage the USDC transfers saved in this browser.';

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, url: '/history', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
  alternates: { canonical: '/history' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
