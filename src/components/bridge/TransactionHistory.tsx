'use client';

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowLeftRight, Check, Clock, ExternalLink, History, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useHistoryStore } from '@/store/history-store';
import { useBridge } from '@/lib/hooks/useBridge';
import { formatAddress } from '@/lib/cctp/address-utils';
import { getChainById } from '@/lib/cctp/constants';
import { getAttestation, checkDestinationTransaction } from '@/lib/cctp/iris-api';
import { toast } from 'sonner';
import type { BridgeTransaction, TransactionStatus } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { logger } from '@/lib/logger';

/**
 * Hook to check if store has been hydrated from localStorage
 * Use this to prevent hydration mismatch in SSR
 */
function useHasHydrated() {
  return useSyncExternalStore(
    useHistoryStore.persist.onFinishHydration,
    useHistoryStore.persist.hasHydrated,
    () => false
  );
}

export function TransactionHistory() {
  const hasHydrated = useHasHydrated();
  const transactions = useHistoryStore((state) => state.transactions);
  const updateTransaction = useHistoryStore((state) => state.updateTransaction);
  const { claim } = useBridge();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useTranslation();

  // 刷新所有未完成交易的状态
  // showToast: 是否显示 toast 提示（手动刷新时显示，自动刷新时不显示）
  const refreshTransactionStatuses = useCallback(async (showToast: boolean = true) => {
    // 获取所有非 completed/failed 的交易
    const pendingTxs = transactions.filter(
      (tx) => tx.status !== 'completed' && tx.status !== 'failed'
    );

    if (pendingTxs.length === 0) {
      if (showToast) toast.info(t.history.allUpToDate);
      return;
    }

    setIsRefreshing(true);
    let updatedCount = 0;

    try {
      for (const tx of pendingTxs) {
        try {
          // 获取最新的链配置
          const sourceChain = getChainById(tx.sourceChain.id) || tx.sourceChain;
          const destChain = getChainById(tx.destChain.id) || tx.destChain;
          
          // Step 1: 获取 attestation 状态
          const response = await getAttestation(tx.sourceTxHash, sourceChain.domainId);
          
          if (!response?.messages?.[0]) {
            continue;
          }

          const msg = response.messages[0];
          
          if (msg.status !== 'complete' || !msg.attestation) {
            // 更新为 attesting 状态
            if (tx.status === 'pending' || tx.status === 'burning') {
              updateTransaction(tx.id, { status: 'attesting' });
              updatedCount++;
            }
            continue;
          }

          // Step 2: 使用 Blockscout API 检查目标链上的 mint 交易
          if (destChain.type === 'evm' && msg.decodedMessage?.decodedMessageBody) {
            const { mintRecipient, amount } = msg.decodedMessage.decodedMessageBody;
            
            // mintRecipient 是 bytes32 格式，需要转换为地址
            const recipientAddr = mintRecipient.length === 66 
              ? '0x' + mintRecipient.slice(-40) 
              : mintRecipient;
            
            const destResult = await checkDestinationTransaction(
              recipientAddr,
              amount,
              destChain.domainId,
              tx.createdAt
            );
            
            if (destResult.completed) {
              updateTransaction(tx.id, {
                status: 'completed',
                message: msg.message,
                attestation: msg.attestation,
                destTxHash: destResult.destTxHash,
              });
              updatedCount++;
              continue;
            }
          }

          // Step 3: 目标链未完成，根据类型更新状态
          const isFastTransfer = tx.isFastTransfer === true || 
            (msg.decodedMessage?.finalityThresholdExecuted && 
             parseInt(msg.decodedMessage.finalityThresholdExecuted) < 2000);
          
          if (destChain.type === 'solana') {
            // Solana 目标链：标记为 ready（需要手动/自动 claim）
            if (tx.status !== 'completed' && (!tx.message || !tx.attestation)) {
              updateTransaction(tx.id, {
                status: 'ready',
                message: msg.message,
                attestation: msg.attestation,
              });
              updatedCount++;
            }
          } else if (isFastTransfer && tx.status === 'ready') {
            // Fast Transfer + ready 状态：再等待一下，可能还在处理
          } else if (!isFastTransfer && (tx.status !== 'ready' || !tx.message || !tx.attestation)) {
            // 标准转账：需要手动 claim
            updateTransaction(tx.id, {
              status: 'ready',
              message: msg.message,
              attestation: msg.attestation,
            });
            updatedCount++;
          }
        } catch (error) {
          logger.warn(`[Refresh] Failed to refresh tx ${tx.id}:`, error);
        }
        
        // 避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (showToast) {
        if (updatedCount > 0) {
          toast.success(`${t.history.updated} ${updatedCount} ${t.history.transactions}`);
        } else {
          toast.info(t.history.noChanges);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    transactions,
    updateTransaction,
    t.history.allUpToDate,
    t.history.noChanges,
    t.history.transactions,
    t.history.updated,
  ]);

  // 页面加载时自动刷新（等待 hydration 完成后，静默执行不显示 toast）
  const hasAutoRefreshedRef = useRef(false);
  useEffect(() => {
    if (hasHydrated && transactions.length > 0 && !hasAutoRefreshedRef.current) {
      hasAutoRefreshedRef.current = true;
      refreshTransactionStatuses(false); // 自动刷新时不显示 toast
    }
  }, [hasHydrated, transactions.length, refreshTransactionStatuses]);

  // 等待 hydration 完成，避免 SSR/CSR 不匹配
  if (!hasHydrated) {
    return (
      <div className="w-full text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">{t.history.loadingHistory}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 sm:py-20">
        {/* 空状态插图 */}
        <div className="relative mb-6">
          {/* 背景装饰圆 */}
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl scale-150" />
          
          {/* 主图标容器 */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-full flex items-center justify-center border border-primary/20">
            {/* 交换箭头 */}
            <ArrowLeftRight className="w-10 h-10 sm:w-14 sm:h-14 text-primary/40" strokeWidth={1.2} />
            
            {/* 小装饰 */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-chart-2/20 rounded-full flex items-center justify-center">
              <History className="w-3 h-3 text-chart-2" />
            </div>
          </div>
        </div>
        
        {/* 标题 */}
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
          {t.history.noTransactions}
        </h3>
        
        {/* 描述 */}
        <p className="text-sm text-muted-foreground text-center max-w-xs px-4">
          {t.history.noTransactionsDesc || 'Your bridge transactions will appear here once you make your first transfer.'}
        </p>
        
        {/* CTA */}
        <a 
          href="/bridge" 
          className="mt-6 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-full transition-colors border border-primary/20 hover:border-primary/40"
        >
          {t.history.startBridging || 'Start Bridging'}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t.history.title}</h2>
          <p className="text-sm text-muted-foreground">
            {t.history.subtitle} ({transactions.length})
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshTransactionStatuses(true)}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t.history.refreshing : t.history.refresh}
        </Button>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {transactions.map((tx) => (
          <TransactionCard 
            key={tx.id} 
            transaction={tx} 
            onClaim={claim}
          />
        ))}
      </div>
    </div>
  );
}

interface TransactionCardProps {
  transaction: BridgeTransaction;
  onClaim: (txId: string) => Promise<void>;
}

function TransactionCard({ transaction, onClaim }: TransactionCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const { t } = useTranslation();
  const statusConfig = getStatusConfig(transaction.status, t);

  // 从最新的链配置中获取链信息（确保 icon 路径是最新的）
  const sourceChain = getChainById(transaction.sourceChain.id) || transaction.sourceChain;
  const destChain = getChainById(transaction.destChain.id) || transaction.destChain;

  const canClaim =
    transaction.status === 'ready' &&
    (destChain.type === 'evm' || destChain.type === 'solana') &&
    !!transaction.message &&
    !!transaction.attestation;

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(transaction.id);
    } finally {
      setIsClaiming(false);
    }
  }, [onClaim, transaction.id]);

  // 构建区块链浏览器链接
  const sourceTxUrl = `${sourceChain.explorerUrl}/tx/${transaction.sourceTxHash}`;
  const destTxUrl = transaction.destTxHash 
    ? `${destChain.explorerUrl}/tx/${transaction.destTxHash}` 
    : null;

  // 格式化时间
  const timeText = formatTime(transaction.createdAt);

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:shadow-md transition-shadow">
      {/* Top Row: Time + Status + Amount */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{timeText}</span>
          <div className="flex items-center gap-1.5">
            <statusConfig.icon 
              className={`w-4 h-4 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} 
            />
            <span className={`text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        <div className="text-lg font-semibold">
          {transaction.amount} <span className="text-sm text-muted-foreground">USDC</span>
        </div>
      </div>

      {/* Chain Flow */}
      <div className="flex items-center gap-3 mb-3">
        {/* Source Chain */}
        <div className="flex-1 bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ChainIcon icon={sourceChain.icon} color={sourceChain.color} name={sourceChain.name} />
            <span className="font-medium">{sourceChain.name}</span>
          </div>
          <a
            href={sourceTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
          >
            {formatAddress(transaction.sourceTxHash, 8)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Arrow */}
        <div className="text-muted-foreground">→</div>

        {/* Destination Chain */}
        <div className="flex-1 bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ChainIcon icon={destChain.icon} color={destChain.color} name={destChain.name} />
            <span className="font-medium">{destChain.name}</span>
          </div>
          {destTxUrl ? (
            <a
              href={destTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
            >
              {formatAddress(transaction.destTxHash!, 8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              {transaction.status === 'completed' ? t.history.completed : t.history.pendingDest}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {transaction.status === 'ready' && canClaim && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="rounded-full"
            onClick={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? t.history.claimingAction : t.history.claimUsdc}
          </Button>
        </div>
      )}
    </div>
  );
}

function ChainIcon({ icon, color, name }: { icon: string; color: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
        style={{ backgroundColor: color }}
      >
        <span className="text-white text-xs font-bold">{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm">
      <Image
        src={icon}
        alt={name}
        width={24}
        height={24}
        unoptimized
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function getStatusConfig(status: TransactionStatus, t: ReturnType<typeof useTranslation>['t']): {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  spin?: boolean;
} {
  switch (status) {
    case 'pending':
    case 'burning':
      return {
        label: t.history.pending,
        color: 'text-purple-600 dark:text-purple-400',
        icon: Loader2,
        spin: true,
      };
    case 'attesting':
      return {
        label: t.history.attesting,
        color: 'text-purple-600 dark:text-purple-400',
        icon: Clock,
      };
    case 'ready':
      return {
        label: t.history.readyToClaim,
        color: 'text-primary',
        icon: Check,
      };
    case 'claiming':
      return {
        label: t.history.claimingStatus,
        color: 'text-purple-600 dark:text-purple-400',
        icon: Loader2,
        spin: true,
      };
    case 'completed':
      return {
        label: t.history.completed,
        color: 'text-success',
        icon: Check,
      };
    case 'failed':
      return {
        label: t.history.failed,
        color: 'text-destructive',
        icon: Clock,
      };
    default:
      return {
        label: t.history.unknown,
        color: 'text-muted-foreground',
        icon: Clock,
      };
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}
