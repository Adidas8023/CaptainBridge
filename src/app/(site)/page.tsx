import LandingPage from '@/components/home/LandingPage';
import { landingMetadata } from '@/lib/seo';

export const metadata = landingMetadata('en', '/');

export default function Page() {
  return <LandingPage />;
}
