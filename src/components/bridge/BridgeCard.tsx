'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeftRight, CircleAlert, Loader2 } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChainSelector } from './ChainSelector';
import { AmountInput } from './AmountInput';
import { AddressInput } from './AddressInput';
import { InfoTags } from './InfoTags';
import { FastTransferToggle } from './FastTransferToggle';
import { ManualClaimModal } from './ManualClaimModal';
import { BridgeProgress } from './BridgeProgress';
import { useBridgeStore } from '@/store/bridge-store';
import { useBridge } from '@/lib/hooks/useBridge';
import { useWallet } from '@/lib/hooks/useWallet';
import { useUsdcBalance, formatBalance } from '@/lib/hooks/useBalance';
import { getTransferFee } from '@/lib/cctp/iris-api';
import { supportsFastTransfer } from '@/lib/cctp/bridge-kit';
import { toast } from 'sonner';
import { showTxError } from '@/lib/toast-utils';
import { useTranslation } from '@/lib/i18n';
import { logger } from '@/lib/logger';

export function BridgeCard() {
  const { open } = useAppKit();
  const { t } = useTranslation();
  
  // 使用统一钱包 hook
  const { 
    isConnected, 
    isEvmConnected,
    isSolanaConnected,
    getAddressForChain,
    switchNetwork,
    evmChainId,
  } = useWallet();
  
  const {
    sourceChain,
    destChain,
    amount,
    recipient,
    isFastTransfer,
    feeInBps,
    standardFeeInBps,
    eta,
    setSourceChain,
    setDestChain,
    swapChains,
    setAmount,
    setRecipient,
    setIsFastTransfer,
    setFeeInBps,
    setStandardFeeInBps,
  } = useBridgeStore();

  const recipientRef = useRef(recipient);
  useEffect(() => {
    recipientRef.current = recipient;
  }, [recipient]);

  const {
    step,
    isLoading,
    error,
    executeBridge,
    reset,
  } = useBridge();

  // Fetch real USDC balances
  const { balance: sourceBalance, rawBalance: sourceRawBalance, refetch: refetchSourceBalance, isLoading: isSourceBalanceLoading } = useUsdcBalance(sourceChain);
  const { balance: destBalance } = useUsdcBalance(destChain);
  const sourceSupportsFastTransfer = useMemo(
    () => supportsFastTransfer(sourceChain),
    [sourceChain]
  );

  // 获取真实的 API 费率（当源链/目标链变化时）
  const fetchFeeFromApi = useCallback(async () => {
    if (!sourceChain || !destChain) return;
    
    try {
      const feeResponse = await getTransferFee(sourceChain.domainId, destChain.domainId);
      if (feeResponse) {
        logger.info(`[Fee API] ${sourceChain.name} -> ${destChain.name}: Fast=${feeResponse.feeInBps}bps, Standard=${feeResponse.standardFeeInBps}bps`);
        setFeeInBps(feeResponse.feeInBps);
        setStandardFeeInBps(feeResponse.standardFeeInBps ?? 0);
      } else {
        // API 失败，使用本地配置作为回退
        logger.info(`[Fee API] Failed, using local config: ${sourceChain.fastTransferFee}bps`);
        setFeeInBps(sourceChain.fastTransferFee || 1);
        setStandardFeeInBps(0);
      }
    } catch (error) {
      logger.warn('[Fee API] Error:', error);
      setFeeInBps(sourceChain.fastTransferFee || 1);
      setStandardFeeInBps(0);
    }
  }, [sourceChain, destChain, setFeeInBps, setStandardFeeInBps]);

  // 当源链/目标链变化时获取费率
  useEffect(() => {
    fetchFeeFromApi();
  }, [fetchFeeFromApi]);

  useEffect(() => {
    if (!sourceSupportsFastTransfer && isFastTransfer) {
      setIsFastTransfer(false);
    }
  }, [sourceSupportsFastTransfer, isFastTransfer, setIsFastTransfer]);

  // 检查是否需要连接正确的钱包类型
  const needsWalletConnection = useMemo(() => {
    if (!sourceChain || !destChain) return false;
    if (!isConnected) return true;
    
    // 源链是 EVM，但没连接 EVM 钱包
    if (sourceChain.type === 'evm' && !isEvmConnected) return true;
    // 源链是 Solana，但没连接 Solana 钱包
    if (sourceChain.type === 'solana' && !isSolanaConnected) return true;
    
    return false;
  }, [sourceChain, destChain, isConnected, isEvmConnected, isSolanaConnected]);

  // ✅ 显式提示用户切换到源链（避免"链不对导致合约调用失败"的体验）
  const needsSwitchSourceNetwork = useMemo(() => {
    if (!sourceChain) return false;
    if (sourceChain.type !== 'evm') return false;
    if (!isEvmConnected) return false;
    if (!sourceChain.chainId) return false;
    return evmChainId !== sourceChain.chainId;
  }, [sourceChain, isEvmConnected, evmChainId]);

  // BridgeKit 自动领取需要目标链签名钱包；缺失时 CTA 会拉起对应钱包。
  const needsDestWalletConnection = useMemo(() => {
    if (!destChain) return false;
    
    // 目标链是 EVM，但没连接 EVM 钱包
    if (destChain.type === 'evm' && !isEvmConnected) return true;
    // 目标链是 Solana，但没连接 Solana 钱包
    if (destChain.type === 'solana' && !isSolanaConnected) return true;
    
    return false;
  }, [destChain, isEvmConnected, isSolanaConnected]);

  // 获取源链对应的钱包地址
  const sourceWalletAddress = useMemo(() => {
    return getAddressForChain(sourceChain);
  }, [sourceChain, getAddressForChain]);

  // 目标链改变时，更新接收地址
  useEffect(() => {
    if (destChain) {
      const destAddress = getAddressForChain(destChain);
      
      // 如果有对应链类型的钱包地址，自动填充
      if (destAddress) {
        setRecipient(destAddress);
      } else if (recipientRef.current) {
        // 检查当前地址是否与目标链兼容
        const isEvmFormat = recipientRef.current.startsWith('0x') && recipientRef.current.length === 42;
        const isSolanaFormat = !recipientRef.current.startsWith('0x') && recipientRef.current.length >= 32 && recipientRef.current.length <= 44;
        
        if (destChain.type === 'evm' && !isEvmFormat) {
          setRecipient(''); // 清空不兼容的地址
        } else if (destChain.type === 'solana' && !isSolanaFormat) {
          setRecipient(''); // 清空不兼容的地址
        }
      }
    }
  }, [destChain, getAddressForChain, setRecipient]);

  // Update fee and ETA when fast transfer changes
  useEffect(() => {
    if (isFastTransfer && sourceSupportsFastTransfer) {
      useBridgeStore.setState({
        fee: feeInBps > 0 ? `${(feeInBps / 100).toFixed(2)}%` : 'Free',
        eta: 'a few seconds',
      });
    } else {
      useBridgeStore.setState({
        fee: standardFeeInBps > 0 ? `${(standardFeeInBps / 100).toFixed(2)}%` : 'Free',
        eta: '15-20 minutes',
      });
    }
  }, [isFastTransfer, sourceSupportsFastTransfer, feeInBps, standardFeeInBps]);

  // Refetch balance after bridge completes
  useEffect(() => {
    if (step === 'completed') {
      refetchSourceBalance();
    }
  }, [step, refetchSourceBalance]);

  const handleConnect = () => {
    // ✅ Solana: 打开 AppKit 弹窗，显式指定 namespace
    if (sourceChain?.type === 'solana') {
      logger.info('[Bridge] Opening Solana connect');
      open({ view: 'Connect', namespace: 'solana' });
      return;
    }
    
    // EVM: 如果已连接，尝试切换网络；否则直接触发连接
    if (sourceChain?.type === 'evm') {
      if (isEvmConnected && sourceChain.chainId) {
        // ✅ 已连接，切换网络
        logger.info('[Bridge] EVM connected, switching to', sourceChain.name);
        void switchNetwork(sourceChain);
      } else {
        logger.info('[Bridge] Opening EVM connect');
        open({ view: 'Connect', namespace: 'eip155' });
      }
      return;
    }
    
    // 兜底：打开 AppKit
    open({ view: 'Connect' });
  };

  const handleDestConnect = () => {
    if (destChain?.type === 'solana') {
      logger.info('[Bridge] Opening destination Solana connect');
      open({ view: 'Connect', namespace: 'solana' });
      return;
    }

    if (destChain?.type === 'evm') {
      if (isEvmConnected && destChain.chainId) {
        logger.info('[Bridge] Switching destination EVM network to', destChain.name);
        void switchNetwork(destChain);
      } else {
        logger.info('[Bridge] Opening destination EVM connect');
        open({ view: 'Connect', namespace: 'eip155' });
      }
      return;
    }

    open({ view: 'Connect' });
  };

  const handleBridge = async () => {
    if (!sourceChain || !destChain || !amount || !recipient) {
      toast.error(t.bridge.fillAllFields);
      return;
    }

    // ✅ 检查目标链钱包是否已连接
    if (needsDestWalletConnection) {
      toast.error(destChain.type === 'evm' ? t.bridge.connectEvmToReceive : t.bridge.connectSolanaToReceive);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error(t.bridge.invalidAmount);
      return;
    }

    // Check if user has sufficient balance
    const sourceBalanceNum = parseFloat(sourceBalance);
    if (numAmount > sourceBalanceNum) {
      toast.error(t.bridge.insufficientBalance, {
        description: `${t.bridge.youHave} ${formatBalance(sourceBalance)} USDC ${t.bridge.on} ${sourceChain.name}`,
      });
      return;
    }

    await executeBridge();
  };

  const getButtonText = () => {
    // 未连接钱包
    if (!isConnected) {
      return t.wallet.connectWallet;
    }

    if (needsSwitchSourceNetwork && sourceChain?.type === 'evm') {
      return `${t.wallet.switchTo} ${sourceChain.name}`;
    }

    // 连接了钱包但类型不对
    if (needsWalletConnection && sourceChain) {
      if (sourceChain.type === 'solana') {
        return t.wallet.connectSolanaWallet;
      } else if (sourceChain.type === 'evm') {
        return t.wallet.connectEvmWallet;
      }
    }

    if (needsDestWalletConnection && destChain) {
      return destChain.type === 'solana'
        ? t.wallet.connectSolanaWallet
        : t.wallet.connectEvmWallet;
    }
    
    switch (step) {
      case 'checking-allowance':
        return t.bridge.checkingAllowance;
      case 'approving':
        return t.bridge.approvingUsdc;
      case 'burning':
        return t.bridge.bridging;
      case 'waiting-attestation':
        return t.bridge.waitingAttestation;
      case 'claiming':
        return t.bridge.claiming;
      case 'completed':
        return t.bridge.bridgeComplete;
      case 'error':
        return t.bridge.tryAgain;
      default:
        return t.bridge.bridgeButton;
    }
  };

  const isButtonDisabled = () => {
    if (!isConnected) return false;
    if (needsWalletConnection) return false; // 允许点击切换钱包
    if (needsSwitchSourceNetwork) return false; // ✅ 允许点击切换网络
    if (needsDestWalletConnection) return false; // 允许点击连接目标链钱包
    if (isLoading) return true;
    if (!amount || parseFloat(amount) <= 0) return true;
    if (!recipient) return true;
    // Check balance (only for EVM chains for now)
    if (sourceChain?.type === 'evm' && parseFloat(amount) > parseFloat(sourceBalance)) return true;
    return false;
  };

  const handleButtonClick = async () => {
    if (!isConnected || needsWalletConnection) {
      handleConnect();
    } else if (needsSwitchSourceNetwork && sourceChain?.type === 'evm') {
      // 切换网络
      try {
        toast.loading(`${t.bridge.switchingTo} ${sourceChain.name}...`, { id: 'switch-network' });
        await switchNetwork(sourceChain);
        toast.success(`${t.bridge.switchedTo} ${sourceChain.name}`, { id: 'switch-network' });
      } catch (err) {
        toast.dismiss('switch-network');
        showTxError(err, t.bridge.switchFailed);
      }
    } else if (needsDestWalletConnection) {
      handleDestConnect();
    } else if (step === 'error' || step === 'completed') {
      reset();
      setAmount('');
    } else {
      handleBridge();
    }
  };

  // 显示需要连接正确钱包的提示
  const renderWalletWarning = () => {
    const warnings = [];
    
    // 检查源链钱包
    if (needsWalletConnection && sourceChain) {
      warnings.push({
        type: 'source',
        message: sourceChain.type === 'solana' 
          ? `${t.bridge.connectSolanaToSend} ${sourceChain.name}`
          : `${t.bridge.connectEvmToSend} ${sourceChain.name}`
      });
    }
    
    // 检查目标链钱包
    if (needsDestWalletConnection && destChain && !needsWalletConnection) {
      warnings.push({
        type: 'dest',
        message: destChain.type === 'evm'
          ? `${t.bridge.connectEvmToReceive} ${destChain.name}`
          : `${t.bridge.connectSolanaToReceive} ${destChain.name}`
      });
    }
    
    if (warnings.length === 0) return null;
    
    return (
      <>
        {warnings.map((warning, idx) => (
          <div key={idx} className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <CircleAlert className="w-4 h-4 shrink-0" />
              <span className="text-sm">{warning.message}</span>
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <Card className="w-full max-w-lg glass-card bg-card/80 shadow-xl mx-auto">
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t.bridge.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t.bridge.subtitle}
            </p>
          </div>
          <ManualClaimModal />
        </div>

        {/* Wallet Warning */}
        {renderWalletWarning()}

        {/* Progress Indicator - 显示进行中和完成状态 */}
        {(isLoading || step === 'completed') && <BridgeProgress step={step} />}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Chain Selectors - 移动端垂直布局，桌面端水平布局 */}
        {/* 移动端 */}
        <div className="flex flex-col sm:hidden mb-4">
          <ChainSelector
            label={t.bridge.sourceChain}
            selectedChain={sourceChain}
            onSelect={setSourceChain}
            excludeChain={destChain}
            balance={sourceWalletAddress ? formatBalance(sourceBalance) : undefined}
          />
          
          {/* 交换按钮 - 在两个选择器正中间 */}
          <div className="w-full flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted bg-background border border-border/50 shadow-sm rotate-90"
              onClick={swapChains}
              disabled={isLoading}
            >
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          
          <ChainSelector
            label={t.bridge.destinationChain}
            selectedChain={destChain}
            onSelect={setDestChain}
            excludeChain={sourceChain}
            balance={getAddressForChain(destChain) ? formatBalance(destBalance) : undefined}
          />
        </div>

        {/* 桌面端 */}
        <div className="hidden sm:flex items-end gap-2 mb-6">
          <div className="flex-1">
            <ChainSelector
              label={t.bridge.sourceChain}
              selectedChain={sourceChain}
              onSelect={setSourceChain}
              excludeChain={destChain}
              balance={sourceWalletAddress ? formatBalance(sourceBalance) : undefined}
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="mb-1 rounded-full hover:bg-muted shrink-0"
            onClick={swapChains}
            disabled={isLoading}
          >
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          </Button>
          
          <div className="flex-1">
            <ChainSelector
              label={t.bridge.destinationChain}
              selectedChain={destChain}
              onSelect={setDestChain}
              excludeChain={sourceChain}
              balance={getAddressForChain(destChain) ? formatBalance(destBalance) : undefined}
            />
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <AmountInput
            amount={amount}
            onChange={setAmount}
            // 传入"原始精确字符串"，MAX/比较都用它，避免四舍五入导致超额
            balance={sourceWalletAddress ? sourceBalance : '0'}
            rawBalance={sourceWalletAddress ? sourceRawBalance : undefined}
            disabled={isLoading}
            onRefresh={sourceWalletAddress ? refetchSourceBalance : undefined}
            isRefreshing={isSourceBalanceLoading}
          />
        </div>

        {/* Address Input */}
        <div className="mb-6">
          <AddressInput
            address={recipient}
            onChange={setRecipient}
            chainType={destChain?.type || 'evm'}
            connectedAddress={getAddressForChain(destChain)}
            disabled={isLoading}
          />
        </div>

        {/* Fast Transfer Toggle */}
        {sourceSupportsFastTransfer && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">{t.bridge.fastTransfer}</span>
            <FastTransferToggle
              enabled={isFastTransfer}
              onChange={setIsFastTransfer}
              visible={!isLoading}
            />
          </div>
        )}

        {/* Info Tags */}
        <div className="mb-6">
          <InfoTags 
            eta={eta} 
            amount={amount}
            feePercent={feeInBps}
            isFastTransfer={isFastTransfer && sourceSupportsFastTransfer}
          />
        </div>

        {/* Bridge Button */}
        <Button
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-medium rounded-xl btn-primary"
          onClick={handleButtonClick}
          disabled={isButtonDisabled()}
        >
          {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />}
          {getButtonText()}
        </Button>

      </CardContent>
    </Card>
  );
}
