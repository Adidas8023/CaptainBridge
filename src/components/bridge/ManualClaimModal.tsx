'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChainSelector } from './ChainSelector';
import type { Chain } from '@/types';
import { CHAINS, getChainByDomainId } from '@/lib/cctp/constants';
import { getAttestation, checkCanClaim } from '@/lib/cctp/iris-api';
import { parseMessageHex, extractMintRecipientFromMessage, SOLANA_USDC_MINT } from '@/lib/cctp/solana';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { useAppKitAccount } from '@reown/appkit/react';
import { useHistoryStore } from '@/store/history-store';
import { useBridge } from '@/lib/hooks/useBridge';
import { toast } from 'sonner';
import { IconLoader2, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import { useTranslation } from '@/lib/i18n';

interface ManualClaimModalProps {
  trigger?: React.ReactNode;
}

type ClaimStatus = 'idle' | 'loading' | 'ready' | 'pending' | 'completed' | 'not_found' | 'address_mismatch';

export function ManualClaimModal({ trigger }: ManualClaimModalProps) {
  const { t } = useTranslation();
  const solanaAppKitAccount = useAppKitAccount({ namespace: 'solana' });
  const solanaAddress = solanaAppKitAccount.address;
  const [addressMismatchInfo, setAddressMismatchInfo] = useState<{ 
    expected: string; 
    isWalletAddress: boolean; 
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [sourceChain, setSourceChain] = useState<Chain | null>(CHAINS[0]);
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [attestationData, setAttestationData] = useState<{
    message: string;
    attestation: string;
    destChain: Chain;
  } | null>(null);
  const [claimTxId, setClaimTxId] = useState<string | null>(null);

  const transactions = useHistoryStore((state) => state.transactions);
  const updateTransaction = useHistoryStore((state) => state.updateTransaction);

  const { claim, manualClaimWithAttestation } = useBridge();
  const [isClaiming, setIsClaiming] = useState(false);

  // 验证 hash 格式
  const isValidHash = useMemo(() => {
    const value = txHash.trim();
    const isEvmTxHash = /^0x[a-fA-F0-9]{64}$/.test(value);
    const isSolanaSig = /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(value);

    if (sourceChain?.type === 'solana') return isSolanaSig;
    if (sourceChain?.type === 'evm') return isEvmTxHash;
    return isEvmTxHash || isSolanaSig;
  }, [txHash, sourceChain?.type]);

  // 查询交易状态
  const handleCheck = async () => {
    if (!sourceChain || !isValidHash) return;

    setStatus('loading');
    setAttestationData(null);
    setClaimTxId(null);

    try {
      const hash = txHash.trim();
      const response = await getAttestation(hash, sourceChain.domainId);
      
      if (!response?.messages?.[0]) {
        setStatus('not_found');
        return;
      }

      const msg = response.messages[0];
      
      // 从 message 解析 destination domain
      const { destinationDomain } = parseMessageHex(msg.message);
      const destChain = getChainByDomainId(destinationDomain);
      
      if (!destChain) {
        toast.error(`未知的目标链 (domain: ${destinationDomain})`);
        setStatus('not_found');
        return;
      }

      if (msg.status === 'pending') {
        setStatus('pending');
        return;
      }

      if (msg.attestation && msg.status === 'complete') {
        // ⚠️ 对于 Solana 目标链，优先检查 mintRecipient 是否与当前钱包匹配
        // 这个检查必须在本地记录检查之前，因为即使本地显示 completed，
        // 如果地址不匹配，实际上用户并没有收到资金
        if (destChain.type === 'solana') {
          if (!solanaAddress) {
            toast.error('请先连接 Solana 钱包');
            setStatus('not_found');
            return;
          }

          try {
            const messageMintRecipient = extractMintRecipientFromMessage(msg.message);
            const userPubkey = new PublicKey(solanaAddress);
            const userUsdcAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, userPubkey);
            const isRecipientMatch = messageMintRecipient.equals(userUsdcAta);

            if (!isRecipientMatch) {
              const isWalletAddress = messageMintRecipient.equals(userPubkey);
              setAddressMismatchInfo({
                expected: messageMintRecipient.toBase58(),
                isWalletAddress,
              });
              setStatus('address_mismatch');
              return;
            }
          } catch (err) {
            console.error('Failed to check Solana address:', err);
          }
        }

        // 检查本地记录
        const matched = transactions.find((tx) => {
          if (sourceChain.type === 'evm' || hash.startsWith('0x')) {
            return tx.sourceTxHash.toLowerCase() === hash.toLowerCase();
          }
          return tx.sourceTxHash === hash;
        });

        // 如果本地记录显示已完成，直接显示已领取
        // 注意：Solana 目标链已经在上面检查过地址匹配了，所以这里的 completed 是真的已领取
        if (matched?.status === 'completed') {
          setStatus('completed');
          return;
        }

        // 通过模拟交易检查是否可以领取（仅对 EVM 目标链有效）
        if (destChain.type === 'evm') {
          const claimCheck = await checkCanClaim(
            msg.message,
            msg.attestation,
            destChain
          );

          // 如果模拟失败，说明已领取或无效
          if (!claimCheck.canClaim) {
            setStatus('completed');
            return;
          }
        }

        // 可以领取，设置为可领取状态
        setAttestationData({
          message: msg.message,
          attestation: msg.attestation,
          destChain,
        });

        if (matched) {
          // 更新本地记录
          updateTransaction(matched.id, {
            message: msg.message,
            attestation: msg.attestation,
            status: 'ready',
          });
          setClaimTxId(matched.id);
        }

        setStatus('ready');
      }
    } catch (error) {
      console.error('Failed to check transaction:', error);
      setStatus('not_found');
    }
  };

  // 领取
  const handleClaim = async () => {
    if (!attestationData) return;

    setIsClaiming(true);
    try {
      if (claimTxId) {
        // 使用本地记录领取
        await claim(claimTxId);
      } else {
        // 直接使用 attestation 领取
        await manualClaimWithAttestation({
          destChain: attestationData.destChain,
          message: attestationData.message,
          attestation: attestationData.attestation,
        });
      }
      setStatus('completed');
      toast.success(t.manualClaim.claimSuccess);
    } catch (error) {
      console.error('Claim failed:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  // 重置状态
  const resetState = () => {
    setTxHash('');
    setStatus('idle');
    setAttestationData(null);
    setClaimTxId(null);
    setAddressMismatchInfo(null);
  };

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">{t.manualClaim.checking}</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <IconClock className="w-5 h-5 text-warning" />
            <span className="text-sm text-warning">{t.manualClaim.confirmingTx}</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <IconCheck className="w-5 h-5" style={{ color: '#22c55e' }} />
            <span className="text-sm font-medium" style={{ color: '#22c55e' }}>{t.manualClaim.alreadyClaimed}</span>
          </div>
        );
      case 'not_found':
        return (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <IconX className="w-5 h-5 text-destructive" />
            <span className="text-sm text-destructive">{t.manualClaim.notFound}</span>
          </div>
        );
      case 'address_mismatch':
        return (
          <div className="flex flex-col gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2">
              <IconX className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium text-warning">
                {addressMismatchInfo?.isWalletAddress 
                  ? '地址格式错误' 
                  : '接收地址不匹配'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {addressMismatchInfo?.isWalletAddress 
                ? '该交易的接收地址使用了钱包地址而非 USDC Token Account (ATA)。这是早期版本的 bug，资金仍在 Circle 托管中，请联系 Circle 支持寻求帮助。'
                : `该交易的接收地址 (${addressMismatchInfo?.expected?.slice(0, 12)}...) 与您当前钱包不符。请使用正确的钱包进行领取。`}
            </p>
            {addressMismatchInfo?.isWalletAddress && (
              <a 
                href="https://support.circle.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                联系 Circle 支持 →
              </a>
            )}
          </div>
        );
      case 'ready':
        return attestationData && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <IconCheck className="w-5 h-5" style={{ color: '#22c55e' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#22c55e' }}>{t.manualClaim.canClaim}</p>
              <p className="text-xs text-muted-foreground">
                {t.manualClaim.destChain}: {attestationData.destChain.name}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // 渲染按钮
  const renderButton = () => {
    if (status === 'ready' && attestationData) {
      return (
        <Button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full h-14 text-lg font-medium rounded-xl text-white"
          style={{ backgroundColor: '#22c55e' }}
        >
          {isClaiming ? (
            <>
              <IconLoader2 className="w-5 h-5 mr-2 animate-spin" />
              {t.manualClaim.claimingAction}
            </>
          ) : (
            t.manualClaim.switchAndClaim.replace('{chain}', attestationData.destChain.name)
          )}
        </Button>
      );
    }

    if (status === 'completed' || status === 'not_found' || status === 'pending' || status === 'address_mismatch') {
      return (
        <Button
          onClick={resetState}
          variant="outline"
          className="w-full h-14 text-lg font-medium rounded-xl"
        >
          {t.manualClaim.queryOther}
        </Button>
      );
    }

    return (
      <Button
        onClick={handleCheck}
        disabled={!isValidHash || status === 'loading'}
        className="w-full h-14 text-lg font-medium rounded-xl"
      >
        {status === 'loading' ? (
          <>
            <IconLoader2 className="w-5 h-5 mr-2 animate-spin" />
            {t.manualClaim.checking}
          </>
        ) : !txHash.trim() ? (
          t.manualClaim.enterTxHash
        ) : !isValidHash ? (
          t.manualClaim.invalidTxHash
        ) : (
          t.manualClaim.queryStatus
        )}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="rounded-full">
            {t.manualClaim.title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">{t.manualClaim.title}</DialogTitle>
          <DialogDescription>
            {t.manualClaim.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <ChainSelector
            label={t.bridge.sourceChain}
            selectedChain={sourceChain}
            onSelect={(c) => {
              setSourceChain(c);
              resetState();
            }}
          />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t.manualClaim.txHash}
            </label>
            <Input
              type="text"
              placeholder={sourceChain?.type === 'solana' ? 'Solana signature (base58)...' : '0x...'}
              value={txHash}
              onChange={(e) => {
                setTxHash(e.target.value);
                if (status !== 'idle' && status !== 'loading') {
                  setStatus('idle');
                  setAttestationData(null);
                  setClaimTxId(null);
                }
              }}
              className="font-mono text-sm"
              disabled={status === 'loading'}
            />
          </div>

          {renderStatusIndicator()}
          {renderButton()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
