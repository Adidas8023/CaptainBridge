"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  ArrowRight, 
  Flame, 
  FileCheck, 
  Coins,
  PlayCircle,
  PauseCircle
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const HowItWorksCard: React.FC = () => {
  const { language } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(() => [
    {
      icon: CheckCircle,
      title: language === 'zh' ? "1. 连接并选择" : "1. Connect & Select",
      description: language === 'zh' ? "连接钱包，选择链和金额" : "Connect wallet, choose chains & amount",
      color: "text-primary",
      bgColor: "bg-primary/10",
      gradient: "from-primary to-chart-1",
    },
    {
      icon: FileCheck,
      title: language === 'zh' ? "2. 源链销毁" : "2. Burn on Source",
      description: language === 'zh' ? "USDC 通过 Circle 合约销毁" : "USDC is burned via Circle's contracts",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      gradient: "from-chart-2 to-chart-3",
    },
    {
      icon: Coins,
      title: language === 'zh' ? "3. 目标链铸造" : "3. Mint on Destination",
      description: language === 'zh' ? "在目标链铸造原生 USDC" : "Native USDC minted on target chain",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      gradient: "from-chart-3 to-chart-4",
    },
  ], [language]);

  React.useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isAnimating, steps.length]);

  return (
    <Card className="h-full glass-card hover-lift group border-border/50 bg-card/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4">
          <div>
            <Coins className="h-12 w-12 text-primary" />
          </div>
        </div>
      </div>

      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Flame className="h-5 w-5 text-chart-3" />
            </div>
            {language === 'zh' ? '使用流程' : 'How It Works'}
          </div>
          <button
            onClick={() => setIsAnimating(!isAnimating)}
            className="p-1.5 rounded-lg hover:bg-muted/20 transition-colors"
          >
            {isAnimating ? (
              <PauseCircle className="h-5 w-5 text-muted-foreground" />
            ) : (
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Steps Flow */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = isAnimating && currentStep > index;

            return (
              <motion.div
                key={index}
                className={`relative flex items-center gap-4 p-3 rounded-lg transition-all duration-500 ${
                  isActive
                    ? `${step.bgColor} border border-current/20 shadow-lg`
                    : 'hover:bg-muted/10'
                }`}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Step Icon */}
                <div className="relative">
                  <motion.div
                    className={`p-2 rounded-lg ${
                      isActive || isCompleted ? step.bgColor : 'bg-muted/20'
                    }`}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive || isCompleted ? step.color : 'text-muted-foreground'
                      }`}
                    />
                  </motion.div>

                  {/* Progress Ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border-2 border-current/30"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 0.35 }}
                      transition={{ duration: 0.25 }}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold text-sm ${
                      isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={`text-xs mt-1 ${
                      isActive || isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/70'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Arrow or Check */}
                <div className="flex-shrink-0">
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </motion.div>
                    ) : index < steps.length - 1 ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <ArrowRight
                          className={`h-4 w-4 ${
                            isActive ? step.color : 'text-muted-foreground/50'
                          }`}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-1.5 pt-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStep >= index 
                  ? 'bg-primary w-6' 
                  : 'bg-muted/30 w-1.5'
              }`}
              animate={{
                width: currentStep >= index ? 24 : 6,
              }}
            />
          ))}
        </div>

        {/* Bottom Info */}
        <div
          className="text-center pt-2 border-t border-border/20"
        >
          <p className="text-xs text-muted-foreground">
            Powered by Circle CCTP V2 Protocol
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HowItWorksCard;
