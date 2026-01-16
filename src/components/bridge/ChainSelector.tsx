'use client';

import { useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Chain } from '@/types';
import { CHAINS } from '@/lib/cctp/constants';
import { useUsdcBalance } from '@/lib/hooks/useBalance';
import { useTranslation } from '@/lib/i18n';

// 当前 AppKit/Wagmi 已配置支持的链，防止选择未配置导致无法连接/读余额
const SUPPORTED_CHAIN_IDS = new Set([
  'ethereum',
  'arbitrum',
  'optimism',
  'base',
  'polygon',
  'avalanche',
  'linea',
  'solana',
  'unichain',
  'sonic',
  'worldchain',
  'monad',
  'sei',
  'xdc',
  'hyperevm',
  'ink',
  'plume',
]);

interface ChainSelectorProps {
  label: string;
  selectedChain: Chain | null;
  onSelect: (chain: Chain) => void;
  excludeChain?: Chain | null;
  balance?: string;
}

export function ChainSelector({
  label,
  selectedChain,
  onSelect,
  excludeChain,
  balance,
}: ChainSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const availableChains = CHAINS.filter(
    (chain) => chain.id !== excludeChain?.id && SUPPORTED_CHAIN_IDS.has(chain.id)
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-14 px-4 bg-background/50 hover:bg-muted/50 border-border overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0 shrink">
              {selectedChain ? (
                <>
                  <ChainIcon chain={selectedChain} />
                  <span className="font-medium truncate">{selectedChain.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{t.chainSelector.selectChain}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {balance && selectedChain && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatBalanceCompact(balance)}
                </span>
              )}
              <IconChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t.chainSelector.searchChains} />
            <div
              className="max-h-[300px] overflow-y-auto overflow-x-hidden"
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <CommandList className="max-h-none">
                <CommandEmpty>{t.chainSelector.noChainFound}</CommandEmpty>
                <CommandGroup>
                  {availableChains.map((chain) => (
                    <CommandItem
                      key={chain.id}
                      value={chain.name}
                      onSelect={() => {
                        onSelect(chain);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between py-3 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ChainIcon chain={chain} />
                        <span className="font-medium">{chain.name}</span>
                      </div>
                      <ChainUsdcBalance chain={chain} enabled={open} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ChainIcon({ chain }: { chain: Chain }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm">
      <img
        src={chain.icon}
        alt={chain.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to colored circle with initial
          const target = e.currentTarget;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.style.backgroundColor = chain.color;
            parent.innerHTML = `<span class="text-white text-xs font-bold">${chain.name.charAt(0)}</span>`;
          }
        }}
      />
    </div>
  );
}

function ChainUsdcBalance({ chain, enabled }: { chain: Chain; enabled: boolean }) {
  // 只在弹窗打开时拉取列表余额，避免页面初始就并发请求所有链
  const { balance, isLoading } = useUsdcBalance(enabled ? chain : null);
  const text = enabled ? (isLoading ? '...' : formatBalanceFloor(balance)) : '—';
  return <span className="text-sm text-muted-foreground">{text} USDC</span>;
}

// 列表展示：截断（floor）避免四舍五入造成"显示比实际大"，最多2位小数
function formatBalanceFloor(balance: string, decimals: number = 2): string {
  if (!balance) return '0';
  const normalized = balance.trim();
  if (normalized === '' || normalized === '0') return '0';

  const num = parseFloat(normalized);
  if (isNaN(num) || num === 0) return '0';

  const [intPartRaw, fracRaw = ''] = normalized.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const frac = fracRaw.slice(0, decimals).replace(/0+$/, '');
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${intWithCommas}.${frac}` : intWithCommas;
}

// 紧凑显示余额（用于按钮内），最多2位小数
function formatBalanceCompact(balance: string): string {
  if (!balance) return '0';
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    // 最多显示2位小数，去掉尾部的0
    const formatted = num.toFixed(2);
    return formatted.replace(/\.?0+$/, '') || '0';
  }
}
