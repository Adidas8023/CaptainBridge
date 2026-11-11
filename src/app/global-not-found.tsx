import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

// With one root layout per route group there is no shared app/layout.tsx, so
// unmatched URLs render this standalone 404 page.
// Next.js adds <meta name="robots" content="noindex"> to 404 responses itself.
export const metadata: Metadata = {
  title: "Page not found | Captain's Bridge",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex items-center justify-center px-4">
        <main className="max-w-md text-center space-y-4">
          <p className="text-sm font-medium text-primary">404</p>
          <h1 className="text-2xl font-semibold">This page could not be found</h1>
          <p className="text-muted-foreground">页面不存在或已移动。</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Home</Link>
            <Link href="/bridge" className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium">Start bridging</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
