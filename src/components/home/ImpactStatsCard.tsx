"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Clock, Zap, Shield, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { CHAINS } from "@/lib/cctp/constants";

const ImpactStatsCard: React.FC = () => {
  const { t } = useTranslation();
  const breathingVariants: Variants = {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [0.6, 0.9, 0.6],
      transition: {
        duration: 5,
        ease: "easeInOut" as const,
        repeat: Number.POSITIVE_INFINITY
      }
    }
  };

  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-card/50 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          variants={breathingVariants}
          animate="animate"
          className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 bg-gradient-to-br from-chart-2/40 to-primary/40 rounded-full blur-2xl"
        />
      </div>

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="p-2 bg-chart-2/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-chart-2" />
          </div>
          {t.stats.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Stats List */}
        <div className="space-y-4">
          {/* Chains */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <motion.span
                className="text-2xl font-bold text-primary"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.4 }}
                viewport={{ once: true }}
              >
                {CHAINS.length}
              </motion.span>
              <span className="text-sm text-muted-foreground block">{t.stats.supportedChains}</span>
            </div>
          </motion.div>

          {/* Transfer Modes */}
          <motion.div
            className="p-3 rounded-xl bg-muted/30 border border-border/50"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium">{t.stats.transferSpeed}</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-chart-2/10 rounded-md">
                  <Clock className="h-3.5 w-3.5 text-chart-2" />
                </div>
                <div>
                  <span className="text-sm font-bold text-chart-2">~13 min</span>
                  <span className="text-xs text-muted-foreground block">{t.stats.standard}</span>
                </div>
              </div>
              <div className="text-muted-foreground text-xs">vs</div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-chart-1/10 rounded-md">
                  <Zap className="h-3.5 w-3.5 text-chart-1" />
                </div>
                <div>
                  <span className="text-sm font-bold text-chart-1">~30 sec</span>
                  <span className="text-xs text-muted-foreground block">{t.stats.fast}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Protocol Version */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Shield className="h-4 w-4 text-chart-3" />
            </div>
            <div className="flex-1">
              <motion.span
                className="text-2xl font-bold text-chart-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.6 }}
                viewport={{ once: true }}
              >
                CCTP V2
              </motion.span>
              <span className="text-sm text-muted-foreground block">{t.stats.protocolVersion}</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Info */}
        <motion.div
          className="pt-4 border-t border-border/30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-muted-foreground text-center">
            {t.stats.growingDaily}
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ImpactStatsCard;
