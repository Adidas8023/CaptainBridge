"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, Fingerprint } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const SecurityCard: React.FC = () => {
  const { t } = useTranslation();
  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut" as const,
      },
    },
  };

  const floatVariants: Variants = {
    animate: {
      y: [-5, 5, -5],
      transition: {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-card/50 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5" />
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          {t.security.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 relative">
        {/* Main Security Display */}
        <div className="text-center space-y-3">
          <motion.div
            className="relative inline-flex items-center"
            variants={floatVariants}
            animate="animate"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/20 to-chart-2/20 rounded-full blur-xl"
              variants={pulseVariants}
              animate="animate"
            />
            <div className="relative flex items-center gap-2 p-4 bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-2xl border border-primary/20">
              <Image src="/logos/usd-coin-usdc-logo.png" alt="USDC" width={32} height={32} className="h-8 w-8" />
              <span className="text-2xl font-bold text-primary">{t.security.nativeUsdc}</span>
            </div>
          </motion.div>
          
          <p className="text-sm text-muted-foreground">
            {t.security.burnMint}
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <motion.div
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="p-1.5 bg-chart-1/10 rounded-md">
              <CheckCircle className="h-3.5 w-3.5 text-chart-1" />
            </div>
            <span className="text-sm text-foreground">{t.security.noWrapped}</span>
          </motion.div>
          
          <motion.div
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="p-1.5 bg-chart-2/10 rounded-md">
              <Fingerprint className="h-3.5 w-3.5 text-chart-2" />
            </div>
            <span className="text-sm text-foreground">{t.security.cryptographic}</span>
          </motion.div>
          
          <motion.div
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="p-1.5 bg-primary/10 rounded-md">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm text-foreground">{t.security.trustless}</span>
          </motion.div>
        </div>

        {/* Bottom Badge */}
        <motion.div
          className="pt-4 border-t border-border/30"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-chart-2/10 rounded-full border border-primary/20">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary">{t.security.circleVerified}</span>
            </div>
          </div>
        </motion.div>

        {/* Decorative Element */}
        <div className="absolute top-1 right-1 opacity-10">
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Shield className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityCard;
