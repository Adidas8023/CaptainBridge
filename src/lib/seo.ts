import type { Metadata } from 'next';
import type { Language } from '@/lib/i18n';

export function landingMetadata(language: Language): Metadata {
  const title = language === 'zh' ? "Captain's Bridge｜USDC 跨链转账" : "Captain's Bridge | Cross-Chain USDC Transfer";
  const description = language === 'zh'
    ? '使用 Circle CCTP V2 在以太坊、Arbitrum、Base、Solana 等网络间转移原生 USDC。了解支持的链、跨链流程与费用，无额外平台手续费。'
    : 'Transfer native USDC across Ethereum, Arbitrum, Base, Solana and more with Circle CCTP V2. Explore supported chains, transfer steps and fees, with no extra platform fee.';
  // "/" and "/en" render the same English page; "/" is the canonical English URL
  // so the two do not compete as duplicates.
  const canonical = language === 'zh' ? '/zh' : '/';
  return {
    title,
    description,
    alternates: { canonical, languages: { en: '/', 'zh-CN': '/zh', 'x-default': '/' } },
    openGraph: { title, description, url: canonical, type: 'website', locale: language === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: language === 'zh' ? 'en_US' : 'zh_CN' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
