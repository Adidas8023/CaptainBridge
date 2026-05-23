'use client';

import { useMemo } from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';
import type { BridgeStep } from '@/lib/hooks/useBridge';
import { useTranslation } from '@/lib/i18n';

interface BridgeProgressProps {
  step: BridgeStep;
}

export function BridgeProgress({ step }: BridgeProgressProps) {
  const { t } = useTranslation();
  
  const STEPS = useMemo(() => [
    { id: 'approving', label: t.bridgeProgress.approveUsdc },
    { id: 'burning', label: t.bridgeProgress.burnUsdc },
    { id: 'waiting-attestation', label: t.bridgeProgress.getAttestation },
    { id: 'claiming', label: t.bridgeProgress.claimUsdc },
  ], [t]);
  const getCurrentStepIndex = () => {
    switch (step) {
      case 'checking-allowance':
      case 'approving':
        return 0;
      case 'burning':
        return 1;
      case 'waiting-attestation':
        return 2;
      case 'claiming':
        return 3;
      case 'completed':
        return 4;
      default:
        return -1;
    }
  };

  const currentIndex = getCurrentStepIndex();

  if (currentIndex < 0) return null;

  return (
    <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index < currentIndex || (step === 'completed' && index === STEPS.length - 1)
                    ? 'bg-green-500 text-white'
                    : index === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentIndex || (step === 'completed' && index === STEPS.length - 1) ? (
                  <Check className="w-4 h-4" />
                ) : index === currentIndex ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-1 text-center max-w-[60px] transition-colors ${
                  index <= currentIndex
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            
            {index < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                  index < currentIndex || step === 'completed'
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Status Message */}
      <div className="mt-3 text-center">
        <p className="text-sm text-muted-foreground">
          {getStatusMessage(step, t)}
        </p>
      </div>
    </div>
  );
}

function getStatusMessage(step: BridgeStep, t: ReturnType<typeof useTranslation>['t']): string {
  switch (step) {
    case 'checking-allowance':
      return t.bridgeProgress.checkingAllowance;
    case 'approving':
      return t.bridgeProgress.confirmApproval;
    case 'burning':
      return t.bridgeProgress.confirmBridge;
    case 'waiting-attestation':
      return t.bridgeProgress.waitingCircle;
    case 'claiming':
      return t.bridgeProgress.claimingDest;
    case 'completed':
      return t.bridgeProgress.bridgeComplete;
    case 'error':
      return t.bridgeProgress.errorOccurred;
    default:
      return '';
  }
}
