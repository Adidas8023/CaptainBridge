"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import HeroCard from "./HeroCard";
import SupportedChainsCard from "./SupportedChainsCard";
import ImpactStatsCard from "./ImpactStatsCard";
import FixedFeeCard from "./FixedFeeCard";
import HowItWorksCard from "./HowItWorksCard";

interface BentoGridProps {
  onStartTransfer: () => void;
}

const BentoGrid: React.FC<BentoGridProps> = ({ onStartTransfer }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section className="pb-4 pt-1 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Enhanced Bento Grid with Hero Integration */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 auto-rows-fr"
          style={{
            gridTemplateRows: 'repeat(3, minmax(200px, auto))'
          }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Hero Card - Large central piece */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-3 lg:col-span-4 md:row-span-2 order-1"
            style={{ minHeight: '400px' }}
          >
            <HeroCard onStartTransfer={onStartTransfer} />
          </motion.div>

          {/* Impact Stats Card - Top right */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-1 lg:col-span-2 order-2"
          >
            <ImpactStatsCard />
          </motion.div>

          {/* Security Card - Below stats */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-1 lg:col-span-2 order-3"
          >
            <FixedFeeCard />
          </motion.div>

          {/* Supported Chains Card - Bottom, spans 2 columns */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 lg:col-span-3 order-4"
          >
            <SupportedChainsCard />
          </motion.div>

          {/* How It Works Card - Bottom right, spans remaining space */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 lg:col-span-3 order-5"
          >
            <HowItWorksCard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default BentoGrid;

