'use client';

import { useTranslation } from '@/lib/i18n';

interface InfoTagsProps {
  fee: string;
  eta: string;
  amount?: string;
  feePercent?: number; // basis points, e.g. 1 = 0.01%, 0 = free
  isFastTransfer?: boolean;
}

export function InfoTags({ fee, eta, amount, feePercent = 1, isFastTransfer = false }: InfoTagsProps) {
  const { t } = useTranslation();
  // 费率为 0 表示免费
  const isFree = feePercent === 0;
  
  // 计算实际费用金额
  const calculateFeeAmount = () => {
    if (isFree || !isFastTransfer) return null;
    
    const numAmount = parseFloat(amount || '0');
    if (numAmount <= 0) return null;
    
    const feeAmount = (numAmount * feePercent) / 10000;
    return feeAmount > 0 ? feeAmount.toFixed(6).replace(/\.?0+$/, '') : null;
  };

  const feeAmount = calculateFeeAmount();
  const feePercentDisplay = isFree ? '0' : (feePercent / 100).toFixed(2);

  return (
    <div className="space-y-3">
      {/* 主要信息标签 */}
      <div className="flex flex-wrap items-center gap-2">
        <Tag label="ETA" value={eta} />
        <Tag label="" value="CCTP v2" />
      </div>

      {/* CCTP 协议费用说明 */}
      <div className="pt-3 border-t border-dashed border-border/60">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>{t.infoTags.cctpFee}</span>
            {!isFree && isFastTransfer && (
              <span className="text-xs opacity-70">({feePercentDisplay}%)</span>
            )}
          </div>
          {isFree || !isFastTransfer ? (
            <span className="font-medium text-success">{t.infoTags.free}</span>
          ) : (
            <span className="font-medium text-foreground">
              {feeAmount ? `${feeAmount} USDC` : `${feePercentDisplay}%`}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {isFastTransfer 
            ? (isFree 
                ? t.infoTags.fastTransferFree 
                : t.infoTags.fastTransferFee)
            : t.infoTags.standardTransfer
          }
        </p>
      </div>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-tag flex items-center gap-1">
      {label && <span className="opacity-70">{label}:</span>}
      <span className="font-medium">{value}</span>
    </div>
  );
}
