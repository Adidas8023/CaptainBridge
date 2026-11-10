import { DocumentLayout } from '@/components/layout/DocumentLayout';
export { metadata } from '@/components/layout/DocumentLayout';

// Root layout for "/" (English). Static: no request headers are read.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocumentLayout language="en">{children}</DocumentLayout>;
}
