"use client";

import React, { memo } from "react";
import HeroCard from "./HeroCard";
import SupportedChainsCard from "./SupportedChainsCard";
import ImpactStatsCard from "./ImpactStatsCard";
import FixedFeeCard from "./FixedFeeCard";
import HowItWorksCard from "./HowItWorksCard";

interface BentoGridProps {
  onStartTransfer: () => void;
}

const BentoGrid: React.FC<BentoGridProps> = ({ onStartTransfer }) => {
  return (
    <section className="pb-4 pt-1 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Enhanced Bento Grid with Hero Integration */}
        <div
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 auto-rows-fr"
          style={{
            gridTemplateRows: 'repeat(3, minmax(200px, auto))'
          }}
        >
          {/* Hero Card - Large central piece */}
          <div
            className="md:col-span-3 lg:col-span-4 md:row-span-2 order-1"
            style={{ minHeight: '400px' }}
          >
            <HeroCard onStartTransfer={onStartTransfer} />
          </div>

          {/* Impact Stats Card - Top right */}
          <div
            className="md:col-span-1 lg:col-span-2 order-2"
          >
            <ImpactStatsCard />
          </div>

          {/* Security Card - Below stats */}
          <div
            className="md:col-span-1 lg:col-span-2 order-3"
          >
            <FixedFeeCard />
          </div>

          {/* Supported Chains Card - Bottom, spans 2 columns */}
          <div
            className="md:col-span-2 lg:col-span-3 order-4"
          >
            <SupportedChainsCard />
          </div>

          {/* How It Works Card - Bottom right, spans remaining space */}
          <div
            className="md:col-span-2 lg:col-span-3 order-5"
          >
            <HowItWorksCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(BentoGrid);
