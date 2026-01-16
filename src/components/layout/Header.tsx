'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export function Header() {
  const pathname = usePathname();
  const { t, language } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border/50">
      {/* 左侧：品牌 Logo + 导航 */}
      <div className="flex items-center gap-4 sm:gap-8">
        {/* 品牌 Logo + 名称 */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <img 
            src="/logos/abel-avatar.jpg" 
            alt="Captain's Bridge" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-primary/30 group-hover:border-primary/60 transition-colors"
          />
          {language === 'zh' ? (
            <span 
              className="text-sm sm:text-base tracking-wide"
              style={{ fontFamily: 'var(--font-silkscreen), monospace' }}
            >
              <span className="text-primary">船长</span>
              <span className="text-foreground">の橋</span>
            </span>
          ) : (
            <span 
              className="text-[9px] sm:text-xs tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-pixel), monospace' }}
            >
              <span className="text-primary">Captain's</span>
              <span className="text-foreground"> Bridge</span>
            </span>
          )}
        </Link>

        {/* 桌面端导航链接 */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" active={pathname === '/'}>
            {t.header.home}
          </NavLink>
          <NavLink href="/bridge" active={pathname === '/bridge'}>
            {t.header.bridge}
          </NavLink>
          <NavLink href="/history" active={pathname === '/history'}>
            {t.header.history}
          </NavLink>
        </nav>
      </div>

      {/* 右侧：钱包连接器 + 语言切换 + 主题切换 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 桌面端工具栏 */}
        <div className="hidden sm:flex items-center gap-2">
          <WalletConnector />
          <LanguageToggle />
          <ThemeToggle />
        </div>
        
        {/* 移动端：只显示钱包和菜单按钮 */}
        <div className="flex sm:hidden items-center gap-1.5">
          <WalletConnector />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <IconX className="h-4 w-4" />
            ) : (
              <IconMenu2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border/50 p-4 sm:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-2 mb-4">
            <MobileNavLink 
              href="/" 
              active={pathname === '/'} 
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.home}
            </MobileNavLink>
            <MobileNavLink 
              href="/bridge" 
              active={pathname === '/bridge'} 
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.bridge}
            </MobileNavLink>
            <MobileNavLink 
              href="/history" 
              active={pathname === '/history'} 
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.history}
            </MobileNavLink>
          </nav>
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-border/50">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ 
  href, 
  active, 
  children, 
  onClick 
}: { 
  href: string; 
  active: boolean; 
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-3 text-base font-medium rounded-lg transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {children}
    </Link>
  );
}
