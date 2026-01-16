'use client';

import { useTheme } from 'next-themes';
import { Header } from '@/components/layout/Header';
import { ChevronBackground } from '@/components/layout/ChevronBackground';
import { TransactionHistory } from '@/components/bridge/TransactionHistory';

export default function HistoryPage() {
  const { theme } = useTheme();

  return (
    <main
      className={`min-h-screen relative overflow-hidden ${
        theme === 'dark' ? 'bg-gradient-dark' : 'bg-gradient-light'
      }`}
    >
      {/* Background Decorations */}
      <ChevronBackground />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <TransactionHistory />
        </div>
      </div>
    </main>
  );
}

