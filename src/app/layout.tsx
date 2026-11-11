import { headers } from 'next/headers';
import { DocumentLayout } from '@/components/layout/DocumentLayout';
export { metadata } from '@/components/layout/DocumentLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const language = requestHeaders.get('x-site-language') === 'zh' ? 'zh' : 'en';
  return <DocumentLayout language={language}>{children}</DocumentLayout>;
}
