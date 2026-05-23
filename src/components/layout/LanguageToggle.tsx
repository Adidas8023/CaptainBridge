'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative rounded-full hover:bg-muted/80"
      title={language === 'en' ? '切换到中文' : 'Switch to English'}
    >
      <Languages className="w-5 h-5" />
      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded px-1 leading-tight">
        {language === 'en' ? 'EN' : '中'}
      </span>
      <span className="sr-only">
        {language === 'en' ? 'Switch to Chinese' : 'Switch to English'}
      </span>
    </Button>
  );
}
