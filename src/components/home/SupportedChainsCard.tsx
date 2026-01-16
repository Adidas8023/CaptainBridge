"use client";

import React, { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";
import { CHAINS } from "@/lib/cctp/constants";

// 颜色映射 - 根据链的主色生成渐变
const getGradientColor = (color: string): string => {
  const colorMap: Record<string, string> = {
    '#627EEA': 'from-blue-400 to-blue-600',      // Ethereum
    '#9945FF': 'from-purple-400 to-indigo-500',  // Solana
    '#0052FF': 'from-blue-500 to-indigo-600',    // Base
    '#28A0F0': 'from-blue-400 to-cyan-500',      // Arbitrum
    '#FF0420': 'from-red-400 to-pink-500',       // Optimism
    '#8247E5': 'from-purple-400 to-violet-600',  // Polygon
    '#E84142': 'from-red-500 to-orange-500',     // Avalanche
    '#121212': 'from-gray-600 to-gray-800',      // Linea
    '#1DB954': 'from-green-400 to-emerald-500',  // Sonic
    '#00D4AA': 'from-teal-400 to-cyan-500',      // World Chain
    '#FF007A': 'from-pink-400 to-purple-500',    // Unichain
    '#9B1C1C': 'from-red-600 to-red-800',        // Sei
    '#836EF9': 'from-purple-500 to-indigo-500',  // Monad
    '#50E3C2': 'from-green-300 to-green-600',    // HyperEVM
    '#2B2F3B': 'from-gray-700 to-gray-900',      // XDC
    '#8B5CF6': 'from-violet-400 to-purple-600',  // Plume
    '#FF6B00': 'from-orange-400 to-orange-600',  // Ink
  };
  return colorMap[color] || 'from-gray-400 to-gray-600';
};

const SupportedChainsCard: React.FC = () => {
  const { language } = useTranslation();
  
  // 从 CHAINS 常量生成显示列表（排除 codex 等未上线的链）
  const supportedChains = useMemo(() => {
    const excludeIds = new Set(['codex']); // 暂时排除
    return CHAINS
      .filter(chain => !excludeIds.has(chain.id))
      .map(chain => ({
        name: chain.name,
        color: getGradientColor(chain.color),
        logo: chain.icon,
      }));
  }, []);

  const scrollVariants: Variants = {
    animate: {
      x: [0, -100 * supportedChains.length],
      transition: {
        x: {
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop" as const,
          duration: 30,
          ease: "linear" as const,
        },
      },
    },
  };

  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-card/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          {language === 'zh' ? '支持的链' : 'Supported Chains'}
          <div className="ml-auto">
            <span className="text-2xl font-bold text-primary">{supportedChains.length}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scrolling Chain Icons */}
        <div className="relative overflow-hidden rounded-lg bg-muted/20 p-4 pb-8">
          <motion.div
            className="flex gap-4 items-center"
            variants={scrollVariants}
            animate="animate"
            style={{ width: `${supportedChains.length * 100}px` }}
          >
            {/* Duplicate chains for seamless loop */}
            {[...supportedChains, ...supportedChains].map((chain, index) => (
              <motion.div
                key={`${chain.name}-${index}`}
                className="flex-shrink-0 w-16 h-16 relative group"
                whileHover={{ scale: 1.1, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div
                  className={`w-full h-full rounded-xl bg-gradient-to-br ${chain.color} flex items-center justify-center shadow-lg p-2`}
                >
                  <Image
                    src={chain.logo}
                    alt={`${chain.name} logo`}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                </div>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs font-medium text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 px-2 py-1 rounded backdrop-blur-sm">
                  {chain.name}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Chain Details */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {language === 'zh' ? '无缝连接所有主流区块链网络' : 'Connect seamlessly across all major blockchain networks'}
          </p>
          <a 
            href="https://developers.circle.com/cctp/evm-smart-contracts" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {language === 'zh' ? '由 Circle CCTP 提供支持' : 'Powered by Circle CCTP'}
          </a>
        </div>

        {/* Network Status Indicators */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-medium text-primary">{language === 'zh' ? '所有网络在线' : 'All Networks Online'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-chart-2/10 rounded-full">
            <span className="text-xs font-medium text-chart-2">{language === 'zh' ? '开源 & 免费' : 'Open Source & Free'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupportedChainsCard;
