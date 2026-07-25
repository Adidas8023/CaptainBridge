"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Clock, Zap, Shield, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { CHAINS } from "@/lib/cctp/constants";

const ImpactStatsCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-card/50 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-gradient-to-br from-chart-2/40 to-primary/40 opacity-20 blur-xl" />
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
          <div
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <span
                className="text-2xl font-bold text-primary"
              >
                {CHAINS.length}
              </span>
              <span className="text-sm text-muted-foreground block">{t.stats.supportedChains}</span>
            </div>
          </div>

          {/* Transfer Modes */}
          <div
            className="p-3 rounded-xl bg-muted/30 border border-border/50"
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
          </div>

          {/* Protocol Version */}
          <div
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Shield className="h-4 w-4 text-chart-3" />
            </div>
            <div className="flex-1">
              <span
                className="text-2xl font-bold text-chart-3"
              >
                CCTP V2
              </span>
              <span className="text-sm text-muted-foreground block">{t.stats.protocolVersion}</span>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div
          className="pt-4 border-t border-border/30"
        >
          <p className="text-xs text-muted-foreground text-center">
            {t.stats.growingDaily}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImpactStatsCard;
