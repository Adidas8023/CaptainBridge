'use client';

import { formatUnits } from 'viem';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';

interface AmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
  balance?: string;
  rawBalance?: bigint;
  disabled?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AmountInput({
  amount,
  onChange,
  balance = '0',
  rawBalance,
  disabled = false,
  onRefresh,
  isRefreshing = false,
}: AmountInputProps) {
  const { t } = useTranslation();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange(value);
    }
  };

  const handleMaxClick = () => {
    if (rawBalance !== undefined) {
      if (rawBalance > BigInt(0)) onChange(formatUnits(rawBalance, 6));
      return;
    }
    const balanceNum = parseFloat(balance);
    if (balanceNum > 0) onChange(balance);
  };

  const handleHalfClick = () => {
    if (rawBalance !== undefined) {
      const half = rawBalance / BigInt(2);
      if (half > BigInt(0)) onChange(formatUnits(half, 6));
      return;
    }
    const balanceNum = parseFloat(balance);
    if (balanceNum > 0) onChange((balanceNum / 2).toString());
  };

  const balanceNum = parseFloat(balance);
  const hasBalance = balanceNum > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Header: Amount label + Balance + Quick buttons */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">{t.amountInput.amount}</label>
        <div className="flex items-center gap-2">
          {/* Balance display with refresh */}
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            {t.amountInput.balance}:{' '}
            <span className={`font-mono ${hasBalance ? 'text-foreground' : ''}`}>
              {formatBalanceFloor(balance)}
            </span>
            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing || disabled}
                className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title={t.common.refreshBalance || 'Refresh balance'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </span>
          {/* Quick buttons */}
          {hasBalance && (
            <>
              <div className="w-px h-4 bg-border/50" />
              <button
                onClick={handleHalfClick}
                disabled={disabled}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {t.amountInput.half}
              </button>
              <button
                onClick={handleMaxClick}
                disabled={disabled}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {t.amountInput.max}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="relative flex items-center bg-background/50 border border-border rounded-xl p-4 hover:border-border/80 transition-colors group">
        {/* Left: Token Icon & Name */}
        <div className="flex items-center gap-3 shrink-0">
          {/* USDC Icon */}
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-2 ring-[#2775CA]/20">
            <Image
              src="/logos/usd-coin-usdc-logo.png"
              alt="USDC"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-lg font-semibold">USDC</span>
        </div>
        
        {/* Right: Amount Input */}
        <div className="flex-1 flex items-center justify-end ml-4">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={handleChange}
            disabled={disabled}
            className="w-full bg-transparent text-right text-3xl font-bold tracking-tight p-0 h-auto outline-none placeholder:text-muted-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:text-primary/90 tabular-nums"
          />
        </div>
      </div>

      {/* Insufficient Balance Warning */}
      {amount && parseFloat(amount) > balanceNum && balanceNum > 0 && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {t.amountInput.insufficientBalance}
        </p>
      )}
    </div>
  );
}

// UI 展示用：截断（floor）而不是四舍五入，避免出现"钱包 4.96 / 前端 4.97"导致 MAX 超额
function formatBalanceFloor(balance: string, decimals: number = 6): string {
  if (!balance) return '0';
  const normalized = balance.trim();
  if (normalized === '' || normalized === '0') return '0';

  const [intPartRaw, fracRaw = ''] = normalized.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';

  // 小额展示：保留你原先的 <0.01 逻辑（仍使用截断）
  if (decimals >= 2) {
    const frac2 = fracRaw.padEnd(2, '0').slice(0, 2);
    if (intPart === '0' && frac2 !== '' && frac2 !== '00') {
      // 0.0x 正常展示
    } else if (intPart === '0' && (frac2 === '' || frac2 === '00') && fracRaw.replace(/0/g, '') !== '') {
      return '<0.01';
    }
  }

  const frac = fracRaw.slice(0, decimals).replace(/0+$/, '');
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${intWithCommas}.${frac}` : intWithCommas;
}
