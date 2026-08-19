'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, LayoutGrid } from 'lucide-react';
import type { Language } from '@/lib/i18n';

type EcosystemMenuProps = {
  language: Language;
  mobile?: boolean;
  onNavigate?: () => void;
};

const projects = [
  {
    id: 'abel',
    name: { zh: 'Abel 主页', en: 'Abel Home' },
    description: { zh: '产品、文章与个人推荐', en: 'Products, writing, and personal picks' },
    href: { zh: 'https://abelai.app', en: 'https://abelai.app/en' },
    logo: 'https://abelai.app/images/abel-avatar-180.png',
  },
  {
    id: 'promptvault',
    name: { zh: 'PromptVault', en: 'PromptVault' },
    description: { zh: '保存、组织与复用 AI Prompt', en: 'Save, organize, and reuse AI prompts' },
    href: { zh: 'https://promptvault.abelai.app/zh', en: 'https://promptvault.abelai.app/en' },
    logo: 'https://abelai.app/images/products/promptvault.webp',
  },
  {
    id: 'ucard',
    name: { zh: '优卡指南', en: 'UCard Guide' },
    description: { zh: '全球卡片数据库与横向对比', en: 'Global card database and comparisons' },
    href: { zh: 'https://ucard.abelai.app', en: 'https://ucard.abelai.app/en' },
    logo: 'https://abelai.app/images/products/ucard-home.webp',
  },
] as const;

function projectUrl(project: (typeof projects)[number], language: Language) {
  const url = new URL(project.href[language]);
  url.searchParams.set('utm_source', 'bridge.abelai.app');
  url.searchParams.set('utm_medium', 'navigation');
  url.searchParams.set('utm_campaign', 'product-ecosystem');
  url.searchParams.set('utm_content', project.id);
  return url.toString();
}

export function EcosystemMenu({ language, mobile = false, onNavigate }: EcosystemMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = language === 'zh' ? '其他项目' : 'Other Projects';

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={mobile ? 'w-full' : 'relative'}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={mobile
          ? 'flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary'
          : 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary'}
      >
        <span className="flex items-center gap-2">
          {mobile ? <LayoutGrid className="h-4 w-4" aria-hidden="true" /> : null}
          {label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={mobile
            ? 'mt-1 grid gap-1 rounded-xl border border-primary/20 bg-primary/5 p-2'
            : 'absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-xl border border-primary/25 bg-background/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200'}
        >
          {!mobile ? (
            <div className="border-b border-border/60 px-3 pb-2.5 pt-1.5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-primary" style={{ fontFamily: 'var(--font-pixel), monospace' }}>
                ABEL // PROJECTS
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {language === 'zh' ? '前往 Abel 制作的其他产品' : 'Explore more products built by Abel'}
              </p>
            </div>
          ) : null}

          {projects.map((project, index) => (
            <a
              key={project.id}
              href={projectUrl(project, language)}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="group grid grid-cols-[18px_42px_minmax(0,1fr)] items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 transition-all hover:border-primary/25 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-[8px] text-primary/60" style={{ fontFamily: 'var(--font-pixel), monospace' }}>0{index + 1}</span>
              <span
                className="h-[42px] w-[42px] rounded-lg border border-border bg-white bg-contain bg-center bg-no-repeat shadow-sm transition-transform group-hover:-translate-y-0.5"
                style={{ backgroundImage: `url(${project.logo})` }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {project.name[language]}
                  <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{project.description[language]}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
