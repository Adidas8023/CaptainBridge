"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles, Shield, ExternalLink, ShieldCheck, Rocket, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n";
import { CHAINS } from "@/lib/cctp/constants";

interface HeroCardProps {
  onStartTransfer: () => void;
}

const HeroCard: React.FC<HeroCardProps> = ({ onStartTransfer }) => {
  const { t, language } = useTranslation();
  const sparkleVariants: Variants = {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 180, 360],
      transition: {
        duration: 3,
        ease: "linear" as const,
        repeat: Number.POSITIVE_INFINITY
      }
    }
  };

  const breathingVariants: Variants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 4,
        ease: "easeInOut" as const,
        repeat: Number.POSITIVE_INFINITY
      }
    }
  };

  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          variants={breathingVariants}
          animate="animate"
          className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-chart-2/20"
        />
      </div>

      {/* Content Area Overlay for Better Text Contrast */}
      <div className="absolute inset-0 z-15 bg-gradient-to-b from-background/10 via-background/5 to-background/15"></div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 z-10">
        <div className="absolute top-4 right-4">
          <motion.div variants={sparkleVariants} animate="animate">
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
        <div className="absolute bottom-6 left-6">
          <motion.div
            variants={sparkleVariants}
            animate="animate"
            style={{ animationDelay: "1s" }}
          >
            <Shield className="h-6 w-6 text-chart-2" />
          </motion.div>
        </div>
      </div>

      <CardContent className="p-8 lg:p-12 h-full flex flex-col justify-center text-center relative z-20">
        {/* Enhanced Text Readability Backdrop */}
        <div className="absolute inset-4 lg:inset-8 bg-background/20 backdrop-blur-sm rounded-2xl border border-primary/20"></div>
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 glass-card rounded-full text-sm font-medium text-primary border border-primary/30 mx-auto relative z-30"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <Sparkles className="h-4 w-4" />
          Powered by Circle CCTP Protocol
        </motion.div>

        {/* Main Title */}
        <motion.h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 relative z-30"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <span className="block drop-shadow-sm">{language === 'zh' ? '简单安全的' : 'Simple & Secure'}</span>
          <span className="block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent drop-shadow-sm">
            {language === 'zh' ? '跨链转账' : 'Cross-Chain Transfers'}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed relative z-30"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {language === 'zh' 
            ? '基于 Circle 官方 CCTP V2 协议的原生 USDC 跨链转账 - 快速、安全、去信任化'
            : 'Native USDC cross-chain transfers powered by Circle\'s official CCTP V2 protocol – Fast, secure, and trustless'}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          className="flex justify-center mb-8 relative z-30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Button
            onClick={onStartTransfer}
            size="lg"
            className="group relative overflow-hidden bg-primary hover:bg-chart-2 text-primary-foreground px-6 py-3 text-base font-semibold shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:-translate-y-1"
          >
            <span className="relative z-20 flex items-center gap-2">
              <Image
                src="/logos/usd-coin-usdc-logo.png"
                alt="USDC"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
              {t.home.startBridging}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </Button>
        </motion.div>

        {/* Mini Stats - Enhanced with Background */}
        <motion.div
          className="grid grid-cols-4 gap-3 max-w-lg mx-auto relative z-30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="text-center p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
            <div className="text-lg font-bold text-primary drop-shadow-sm">{CHAINS.length}</div>
            <div className="text-xs text-primary/80 font-medium">{language === 'zh' ? '条链' : 'Chains'}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-chart-2/10 backdrop-blur-sm border border-chart-2/20">
            <div className="text-lg font-bold text-chart-2 drop-shadow-sm">~13m</div>
            <div className="text-xs text-chart-2/80 font-medium">{language === 'zh' ? '标准' : 'Standard'}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-chart-1/10 backdrop-blur-sm border border-chart-1/20">
            <div className="text-lg font-bold text-chart-1 drop-shadow-sm">~30s</div>
            <div className="text-xs text-chart-1/80 font-medium">{language === 'zh' ? '快速' : 'Fast'}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
            <div className="text-lg font-bold text-primary drop-shadow-sm">V2</div>
            <div className="text-xs text-primary/80 font-medium">CCTP</div>
          </div>
        </motion.div>

        {/* Author Info */}
        <motion.div
          className="mt-8 pt-6 border-t border-primary/20 relative z-30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-muted-foreground mb-3">{language === 'zh' ? '用 ❤️ 打造' : 'Built with ❤️ by'}</p>
          <a 
            href="https://x.com/intent/follow?screen_name=0xabel0x" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all group/author"
          >
            <Image
              src="/logos/abel-avatar.jpg"
              alt="Abel"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border-2 border-primary/30 group-hover/author:border-primary transition-colors"
            />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground group-hover/author:text-primary transition-colors">Abel船长</span>
                <svg className="w-4 h-4 text-muted-foreground group-hover/author:text-primary transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">{t.footer.authorDesc}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/author:text-primary transition-colors ml-1" />
          </a>

          {/* Bullet Points - Enhanced */}
          <div className="mt-4 space-y-2 max-w-md mx-auto">
            <motion.div 
              className="flex items-center gap-3 p-2.5 rounded-lg bg-chart-1/5 border border-chart-1/20 hover:bg-chart-1/10 transition-colors"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="p-1.5 bg-chart-1/10 rounded-md shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-chart-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'zh' 
                  ? '使用 Circle CCTP 官方合约，交互前请二次验证' 
                  : 'Uses official Circle CCTP contracts, please verify before interacting'}
              </p>
            </motion.div>
            <motion.div 
              className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                <Rocket className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'zh' 
                  ? '不收取任何额外费用，Build in Public' 
                  : 'No additional fees charged, Build in Public'}
              </p>
            </motion.div>
            <motion.div 
              className="flex items-center gap-3 p-2.5 rounded-lg bg-chart-2/5 border border-chart-2/20 hover:bg-chart-2/10 transition-colors"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="p-1.5 bg-chart-2/10 rounded-md shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-chart-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'zh' 
                  ? '可能存在 Bug，欢迎推特上反馈和交流' 
                  : 'May have bugs, feedback welcome on Twitter'}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default HeroCard;
