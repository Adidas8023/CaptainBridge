import { notFound } from 'next/navigation';
import LandingPage from '@/components/home/LandingPage';
import { landingMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'zh') notFound();
  return landingMetadata(locale, `/${locale}`);
}

export default function Page() {
  return <LandingPage />;
}
