import { notFound } from 'next/navigation';
import { DocumentLayout } from '@/components/layout/DocumentLayout';
export { metadata } from '@/components/layout/DocumentLayout';

// Root layout for /en and /zh. The locale comes from the URL, so both pages are
// prerendered and <html lang> is correct without middleware.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'zh') notFound();
  return <DocumentLayout language={locale}>{children}</DocumentLayout>;
}
