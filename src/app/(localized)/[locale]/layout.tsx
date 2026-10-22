import { notFound } from 'next/navigation';

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'zh') notFound();
  return children;
}
