'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider, type Language } from '@/lib/i18n';

// Shared by every page: theme, language and toasts. No wallet code.
export function SiteProviders({ children, initialLanguage }: { children: ReactNode; initialLanguage: Language }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <I18nProvider initialLanguage={initialLanguage}>
        {children}
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
