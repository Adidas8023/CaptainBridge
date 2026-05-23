'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSwitchChain, useConfig } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import { type Hash, type EIP1193Provider } from 'viem';
import { toast } from 'sonner';
import { showWarning, formatUserFriendlyError } from '@/lib/toast-utils';
import { useTranslation } from '@/lib/i18n';
import type { Chain, BridgeTransaction } from '@/types';
import { useHistoryStore } from '@/store/history-store';
import { useBridgeStore } from '@/store/bridge-store';
import { useAppKitAccount } from '@reown/appkit/react';
import { buildClaimTransaction } from '@/lib/cctp/evm';
import { createReceiveMessageInstruction, SOLANA_USDC_MINT, extractMintRecipientFromMessage } from '@/lib/cctp/solana';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction 
} from '@solana/spl-token';
import { createSolanaConnection, withSolanaRpcFallback } from '@/config/wallet';
import { createEvmPublicClient } from '@/config/rpc';
import { logger } from '@/lib/logger';
import {
  createBridgeKit,
  createEvmBridgeAdapter,
  createSolanaBridgeAdapter,
  extractBridgeEventHash,
  extractBridgeHashes,
  getBridgeFailureMessage,
  getTransferSpeed,
  inferBridgeStep,
  isDestinationBridgeEvent,
  supportsFastTransfer,
  toBridgeKitChain,
  type BridgeAdapter,
  type SolanaBridgeProvider,
} from '@/lib/cctp/bridge-kit';

export type BridgeStep = 
  | 'idle'
  | 'checking-allowance'
  | 'approving'
  | 'burning'
  | 'waiting-attestation'
  | 'claiming'
  | 'completed'
  | 'error';

interface UseBridgeReturn {
  step: BridgeStep;
  isLoading: boolean;
  error: string | null;
  currentTx: BridgeTransaction | null;
  executeBridge: () => Promise<void>;
  claim: (txId: string) => Promise<void>;
  manualClaimWithAttestation: (params: {
    destChain: Chain;
    message: string;
    attestation: string;
  }) => Promise<Hash | null>;
  reset: () => void;
}

// Generate unique transaction ID
function generateTxId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const SOLANA_MIN_CCTP_LAMPORTS = 3_000_000; // 0.003 SOL, covers CCTP tx fees and possible account rent.

type SolanaProvider = SolanaBridgeProvider;

type BridgeBrowserWindow = Window & {
  ethereum?: EIP1193Provider;
  phantom?: {
    solana?: SolanaTransactionProvider;
  };
  solana?: SolanaTransactionProvider;
};

type SolanaTransactionProvider = SolanaProvider & {
  isConnected?: boolean;
  connect?: () => Promise<unknown>;
  isPhantom?: boolean;
  isSolflare?: boolean;
  sendTransaction?: (
    transaction: Transaction,
    connection: Connection,
    options?: { maxRetries?: number }
  ) => Promise<string>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
};

function getBrowserSolanaProvider(): SolanaTransactionProvider | null {
  if (typeof window === 'undefined') return null;
  const browserWindow = window as BridgeBrowserWindow;
  return browserWindow.phantom?.solana ?? browserWindow.solana ?? null;
}

async function assertSolanaFeeBalance(
  chain: Chain,
  payerAddress: string,
  options: { recipientAddress?: string } = {}
): Promise<void> {
  const payer = new PublicKey(payerAddress);

  await withSolanaRpcFallback(async (connection) => {
    let minLamports = SOLANA_MIN_CCTP_LAMPORTS;

    if (options.recipientAddress) {
      const recipient = new PublicKey(options.recipientAddress);
      const recipientUsdcAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, recipient);
      const ataInfo = await connection.getAccountInfo(recipientUsdcAta);
      if (!ataInfo) {
        minLamports = SOLANA_MIN_CCTP_LAMPORTS;
      }
    }

    const lamports = await connection.getBalance(payer);
    if (lamports < minLamports) {
      throw new Error('SOL_FEE_BALANCE_LOW');
    }
  }, { primaryRpcUrl: chain.rpcUrl });
}

export function useBridge(): UseBridgeReturn {
  const [step, setStep] = useState<BridgeStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTx, setCurrentTx] = useState<BridgeTransaction | null>(null);
  const { t } = useTranslation();

  const { address, chain: connectedChain } = useAccount();
  
  // ✅ 显式按 namespace 获取 Solana 账户
  const solanaAppKitAccount = useAppKitAccount({ namespace: 'solana' });
  const solanaAddress = solanaAppKitAccount.address;
  
  const { switchChainAsync } = useSwitchChain();
  const config = useConfig();

  const { 
    sourceChain, 
    destChain, 
    amount, 
    recipient, 
    isFastTransfer,
    fee,
  } = useBridgeStore();

  const { addTransaction, updateTransaction, getTransactionById } = useHistoryStore();

  const isLoading = step !== 'idle' && step !== 'completed' && step !== 'error';

  /**
   * Ensure wallet is connected to the correct chain
   */
  const ensureCorrectChain = useCallback(async (targetChain: Chain): Promise<boolean> => {
    if (!connectedChain || !targetChain.chainId) return false;

    if (connectedChain.id !== targetChain.chainId) {
      try {
        await switchChainAsync({ chainId: targetChain.chainId });
        return true;
      } catch (err) {
        logger.warn('Failed to switch chain:', err);
        throw new Error(`Please switch to ${targetChain.name} network`);
      }
    }
    return true;
  }, [connectedChain, switchChainAsync]);

  const createAdapterForChain = useCallback(async (chain: Chain): Promise<BridgeAdapter> => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet is only available in the browser');
    }

    const browserWindow = window as BridgeBrowserWindow;

    if (chain.type === 'evm') {
      if (!browserWindow.ethereum) {
        throw new Error('请安装 MetaMask 或其他 EVM 钱包');
      }

      return createEvmBridgeAdapter(browserWindow.ethereum);
    }

    const solanaProvider = getBrowserSolanaProvider();
    if (!solanaProvider) {
      throw new Error('请安装 Phantom 或 Solflare 钱包');
    }

    if (solanaProvider.connect && !solanaProvider.isConnected) {
      await solanaProvider.connect();
    }

    return createSolanaBridgeAdapter(solanaProvider);
  }, []);

  const executeBridgeKit = useCallback(async () => {
    if (!sourceChain || !destChain || !amount || !recipient) {
      setError('Missing required parameters');
      return;
    }

    const sourceAddress = sourceChain.type === 'solana' ? solanaAddress : address;
    const destinationAddress = destChain.type === 'solana' ? solanaAddress : address;

    if (!sourceAddress) {
      const chainType = sourceChain.type === 'solana' ? 'Solana' : 'EVM';
      showWarning('请连接钱包', `需要连接 ${chainType} 钱包才能继续`);
      return;
    }

    if (!destinationAddress) {
      const chainType = destChain.type === 'solana' ? 'Solana' : 'EVM';
      showWarning('请连接钱包', `需要连接 ${chainType} 钱包才能完成自动领取`);
      return;
    }

    const effectiveFastTransfer = isFastTransfer && supportsFastTransfer(sourceChain);
    let observedSourceTxHash: string | undefined;
    let observedDestTxHash: string | undefined;

    setError(null);
    setCurrentTx(null);
    setStep('checking-allowance');

    try {
      const kit = await createBridgeKit();
      const handleBridgeEvent = (payload: unknown) => {
        const nextStep = inferBridgeStep(payload);
        const hash = extractBridgeEventHash(payload);

        if (nextStep && nextStep !== 'completed') {
          setStep(nextStep);
        }

        if (hash) {
          if (isDestinationBridgeEvent(payload)) {
            observedDestTxHash = hash;
          } else if (!observedSourceTxHash || nextStep === 'burning') {
            observedSourceTxHash = hash;
          }
        }
      };

      kit.on('*', handleBridgeEvent);

      if (sourceChain.type === 'solana') {
        await assertSolanaFeeBalance(sourceChain, sourceAddress);
      }

      if (destChain.type === 'solana') {
        await assertSolanaFeeBalance(destChain, destinationAddress, {
          recipientAddress: recipient,
        });
      }

      const sourceAdapter = await createAdapterForChain(sourceChain);
      const destAdapter = sourceChain.id === destChain.id
        ? sourceAdapter
        : await createAdapterForChain(destChain);

      const transferSpeed = getTransferSpeed(sourceChain, effectiveFastTransfer);

      toast.info(t.toast.initiatingBridge, {
        description: t.toast.usingSdk,
      });
      toast.info(t.toast.confirmInWallet);

      try {
        const bridgeParams = {
          from: {
            adapter: sourceAdapter,
            chain: toBridgeKitChain(sourceChain),
          },
          to: {
            adapter: destAdapter,
            chain: toBridgeKitChain(destChain),
            recipientAddress: recipient,
          },
          amount,
          token: 'USDC',
          config: {
            transferSpeed,
            batchTransactions: false,
          },
        };

        const result = await kit.bridge(bridgeParams as Parameters<typeof kit.bridge>[0]);

        if (result.state === 'error') {
          throw new Error(getBridgeFailureMessage(result) ?? 'Bridge failed');
        }

        const hashes = extractBridgeHashes(result);
        const sourceTxHash = hashes.sourceTxHash ?? observedSourceTxHash;
        const destTxHash = hashes.destTxHash ?? observedDestTxHash;

        if (!sourceTxHash) {
          throw new Error('Bridge completed but source transaction hash was not returned');
        }

        const txId = generateTxId();
        const transaction: BridgeTransaction = {
          id: txId,
          sourceChain,
          destChain,
          amount,
          recipient,
          sender: sourceAddress,
          sourceTxHash,
          destTxHash,
          status: 'completed',
          isFastTransfer: effectiveFastTransfer,
          fee,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        addTransaction(transaction);
        setCurrentTx(transaction);
        setStep('completed');

        toast.success(t.toast.bridgeComplete, {
          description: `${t.toast.usdcReceived} ${destChain.name}`,
        });
      } finally {
        kit.off('*', handleBridgeEvent);
      }
    } catch (err) {
      logger.warn('BridgeKit error:', err);

      const hashes = extractBridgeHashes(err);
      const sourceTxHash = hashes.sourceTxHash ?? observedSourceTxHash;
      const destTxHash = hashes.destTxHash ?? observedDestTxHash;

      if (sourceTxHash) {
        const txId = generateTxId();
        const transaction: BridgeTransaction = {
          id: txId,
          sourceChain,
          destChain,
          amount,
          recipient,
          sender: sourceAddress,
          sourceTxHash,
          destTxHash,
          status: destTxHash ? 'failed' : 'pending',
          isFastTransfer: effectiveFastTransfer,
          fee,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        addTransaction(transaction);
        setCurrentTx(transaction);
      }

      setStep('error');
      const bridgeMessage = getBridgeFailureMessage(err);
      setError(formatUserFriendlyError(bridgeMessage ?? err));
    }
  }, [
    sourceChain,
    destChain,
    amount,
    recipient,
    solanaAddress,
    address,
    isFastTransfer,
    fee,
    createAdapterForChain,
    addTransaction,
    t.toast.bridgeComplete,
    t.toast.confirmInWallet,
    t.toast.initiatingBridge,
    t.toast.usdcReceived,
    t.toast.usingSdk,
  ]);

  /**
   * Execute full bridge flow
   */
  const executeBridge = useCallback(async () => {
    // ✅ 根据源链类型检查相应的钱包地址
    const sourceAddress = sourceChain?.type === 'solana' ? solanaAddress : address;
    
    if (!sourceChain || !destChain || !amount || !recipient || !sourceAddress) {
      setError('Missing required parameters');
      logger.info('[Bridge] Missing params:', { sourceChain, destChain, amount, recipient, sourceAddress, sourceType: sourceChain?.type });
      
      // 给出更具体的错误提示
      if (!sourceAddress) {
        const chainType = sourceChain?.type === 'solana' ? 'Solana' : 'EVM';
        showWarning('请连接钱包', `需要连接 ${chainType} 钱包才能继续`);
      }
      return;
    }

    // 检查源链和目标链的 CCTP V2 合约地址是否有效（不是占位符 0x000...）
    const isInvalidAddress = (addr: string | undefined) => 
      !addr || addr === '0x0000000000000000000000000000000000000000';
    
    if (sourceChain.type === 'evm') {
      if (isInvalidAddress(sourceChain.tokenMessengerAddress) || 
          isInvalidAddress(sourceChain.messageTransmitterAddress)) {
        showWarning('暂不支持', `${sourceChain.name} 的 CCTP V2 合约地址待官方上线后补充`);
        return;
      }
    }

    if (destChain.type === 'evm') {
      if (isInvalidAddress(destChain.messageTransmitterAddress)) {
        showWarning('暂不支持', `${destChain.name} 的 CCTP V2 合约地址待官方上线后补充`);
        return;
      }
    }

    await executeBridgeKit();
  }, [
    sourceChain,
    destChain,
    amount,
    recipient,
    address,
    solanaAddress,
    executeBridgeKit,
  ]);

  /**
   * Manual claim for a pending transaction (supports EVM and Solana)
   */
  const claim = useCallback(async (txId: string) => {
    const tx = getTransactionById(txId);
    
    if (!tx || !tx.message || !tx.attestation) {
      showWarning('无法领取', '交易尚未准备好，请稍后重试');
      return;
    }

    // EVM 目标链
    if (tx.destChain.type === 'evm') {
      if (!address) {
        showWarning('请连接钱包', '需要连接 EVM 钱包才能领取');
        return;
      }

      try {
        setStep('claiming');
        updateTransaction(txId, { status: 'claiming', updatedAt: Date.now() });

        // Switch to destination chain and get fresh wallet client
        if (tx.destChain.chainId) {
          await ensureCorrectChain(tx.destChain);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const freshWalletClient = await getWalletClient(config, { chainId: tx.destChain.chainId });
        if (!freshWalletClient) {
          throw new Error('Failed to get wallet client after chain switch');
        }

        const claimTx = buildClaimTransaction(
          tx.destChain,
          tx.message as `0x${string}`,
          tx.attestation as `0x${string}`
        );

        const claimHash = await freshWalletClient.sendTransaction({
          to: claimTx.to,
          data: claimTx.data,
          value: claimTx.value,
          account: address,
        });

        {
          const rpcClient = createEvmPublicClient({
            id: tx.destChain.chainId ?? 0,
            name: tx.destChain.name,
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: { default: { http: [tx.destChain.rpcUrl] } },
          }, tx.destChain.rpcUrl);
          await rpcClient.waitForTransactionReceipt({ hash: claimHash });
        }

        updateTransaction(txId, {
          destTxHash: claimHash,
          status: 'completed',
          updatedAt: Date.now(),
        });

        toast.success(t.toast.claimSuccess);
        setStep('completed');
      } catch (err) {
        logger.warn('Claim error:', err);
        updateTransaction(txId, { status: 'ready', updatedAt: Date.now() });
        setError(formatUserFriendlyError(err));
        setStep('error');
      }
      return;
    }

    // Solana 目标链
    if (tx.destChain.type === 'solana') {
      if (!solanaAddress) {
        showWarning('请连接钱包', '需要连接 Solana 钱包才能领取');
        return;
      }

      try {
        setStep('claiming');
        updateTransaction(txId, { status: 'claiming', updatedAt: Date.now() });

        const connection = createSolanaConnection('confirmed', tx.destChain.rpcUrl);
        const userPubkey = new PublicKey(solanaAddress);

        // 获取用户的 USDC ATA
        const userUsdcAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, userPubkey);

        // ⚠️ 检查 message 中的 mintRecipient 是否与用户的 ATA 匹配
        const messageMintRecipient = extractMintRecipientFromMessage(tx.message);
        const isRecipientMatch = messageMintRecipient.equals(userUsdcAta);
        
        if (!isRecipientMatch) {
          // mintRecipient 不匹配，可能是地址格式错误（使用了钱包地址而非 ATA）
          const isWalletAddress = messageMintRecipient.equals(userPubkey);
          if (isWalletAddress) {
            // 特殊情况：message 中使用了钱包地址而非 ATA（旧 bug）
            showWarning('地址格式错误', 
              '该交易的接收地址使用了钱包地址而非 USDC Token Account (ATA)。' +
              '这是早期版本的 bug，请联系 Circle 支持寻求帮助。'
            );
          } else {
            // 普通情况：接收地址与当前钱包不匹配
            showWarning('接收地址不匹配', 
              `该交易的接收地址 (${messageMintRecipient.toBase58().slice(0, 8)}...) 与您当前钱包不符。` +
              '请使用正确的钱包进行领取。'
            );
          }
          updateTransaction(txId, { status: 'ready', updatedAt: Date.now() });
          setStep('error');
          return;
        }

        // 检查 ATA 是否存在
        const accountInfo = await connection.getAccountInfo(userUsdcAta);
        const ixs: TransactionInstruction[] = [];
        
        if (!accountInfo) {
          const createAtaIx = createAssociatedTokenAccountInstruction(
            userPubkey,
            userUsdcAta,
            userPubkey,
            SOLANA_USDC_MINT
          );
          ixs.push(createAtaIx);
          toast.info(t.toast.creatingTokenAccount);
        }

        // 创建 receive_message 指令
        const receiveIx = createReceiveMessageInstruction(
          userPubkey,
          userUsdcAta,
          tx.message,
          tx.attestation
        );
        ixs.push(receiveIx);

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const transaction = new Transaction().add(...ixs);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPubkey;

        // 获取 Solana 钱包
        const wallet = getBrowserSolanaProvider();
        if (!wallet) {
          throw new Error('未检测到 Solana 钱包');
        }

        // 模拟交易
        const simResult = await connection.simulateTransaction(transaction);

        if (simResult.value.err) {
          const errStr = JSON.stringify(simResult.value.err);
          
          // Custom:6 = NonceAlreadyUsed (CCTP program error)
          if (errStr.includes('"Custom":6') || errStr.includes('NonceAlreadyUsed')) {
            toast.warning(t.toast.nonceAlreadyUsed, {
              description: t.toast.nonceUsedHint,
              duration: 10000,
            });
            return;
          }
          
          throw new Error(`模拟失败: ${errStr}`);
        }

        // 发送交易
        let signature: string | undefined;
        if (wallet.sendTransaction) {
          signature = await wallet.sendTransaction(transaction, connection, { maxRetries: 3 });
        } else if (wallet.signAndSendTransaction) {
          const { signature: sig } = await wallet.signAndSendTransaction(transaction);
          signature = sig;
        } else {
          throw new Error('钱包不支持发送交易');
        }

        if (!signature) throw new Error('未获取到交易签名');

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        updateTransaction(txId, {
          destTxHash: signature,
          status: 'completed',
          updatedAt: Date.now(),
        });

        toast.success(t.toast.claimSuccessSolana);
        setStep('completed');
      } catch (err) {
        logger.warn('Solana claim error:', err);
        updateTransaction(txId, { status: 'ready', updatedAt: Date.now() });
        setError(formatUserFriendlyError(err));
        setStep('error');
      }
      return;
    }

    // 其他类型暂不支持
    showWarning('暂不支持', '该目标链暂不支持手动领取');
  }, [
    address,
    solanaAddress,
    config,
    ensureCorrectChain,
    getTransactionById,
    updateTransaction,
    t.toast.claimSuccess,
    t.toast.claimSuccessSolana,
    t.toast.creatingTokenAccount,
    t.toast.nonceAlreadyUsed,
    t.toast.nonceUsedHint,
  ]);

  /**
   * Manual claim without local history record (attestation + message already known)
   * Supports both EVM and Solana destinations
   */
  const manualClaimWithAttestation = useCallback(
    async (params: { destChain: Chain; message: string; attestation: string }): Promise<Hash | null> => {
      const { destChain, message, attestation } = params;
      
      // EVM 目标链
      if (destChain.type === 'evm') {
        if (!address) {
          showWarning('请连接钱包', '需要连接 EVM 钱包才能领取');
          return null;
        }

        try {
          if (destChain.chainId) {
            await ensureCorrectChain(destChain);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const freshWalletClient = await getWalletClient(config, { chainId: destChain.chainId });
          if (!freshWalletClient) {
            throw new Error('Failed to get wallet client after chain switch');
          }

          setStep('claiming');

          const claimTx = buildClaimTransaction(
            destChain,
            message as `0x${string}`,
            attestation as `0x${string}`
          );

          const claimHash = await freshWalletClient.sendTransaction({
            to: claimTx.to,
            data: claimTx.data,
            value: claimTx.value,
            account: address,
          });

          {
            const rpcClient = createEvmPublicClient({
              id: destChain.chainId ?? 0,
              name: destChain.name,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: { default: { http: [destChain.rpcUrl] } },
            }, destChain.rpcUrl);
            await rpcClient.waitForTransactionReceipt({ hash: claimHash });
          }

          toast.success(t.toast.claimSuccess);
          setStep('completed');
          return claimHash;
        } catch (err) {
          logger.warn('Manual claim error:', err);
          setError(formatUserFriendlyError(err));
          setStep('error');
          return null;
        }
      }
      
      // Solana 目标链
      if (destChain.type === 'solana') {
        if (!solanaAddress) {
          showWarning('请连接钱包', '需要连接 Solana 钱包才能领取');
          return null;
        }

        try {
          setStep('claiming');

          const connection = createSolanaConnection('confirmed', destChain.rpcUrl);
          const userPubkey = new PublicKey(solanaAddress);

          // 获取用户的 USDC ATA
          const userUsdcAta = await getAssociatedTokenAddress(SOLANA_USDC_MINT, userPubkey);

          // ⚠️ 检查 message 中的 mintRecipient 是否与用户的 ATA 匹配
          const messageMintRecipient = extractMintRecipientFromMessage(message);
          const isRecipientMatch = messageMintRecipient.equals(userUsdcAta);
          
          if (!isRecipientMatch) {
            const isWalletAddress = messageMintRecipient.equals(userPubkey);
            if (isWalletAddress) {
              showWarning('地址格式错误', 
                '该交易的接收地址使用了钱包地址而非 USDC Token Account。请联系 Circle 支持。'
              );
            } else {
              showWarning('接收地址不匹配', 
                `该交易的接收地址与您当前钱包不符。请使用正确的钱包进行领取。`
              );
            }
            setStep('error');
            return null;
          }

          // 检查 ATA 是否存在
          const accountInfo = await connection.getAccountInfo(userUsdcAta);
          const ixs: TransactionInstruction[] = [];
          
          if (!accountInfo) {
            const createAtaIx = createAssociatedTokenAccountInstruction(
              userPubkey,
              userUsdcAta,
              userPubkey,
              SOLANA_USDC_MINT
            );
            ixs.push(createAtaIx);
            toast.info(t.toast.creatingTokenAccount);
          }

          // 创建 receive_message 指令
          const receiveIx = createReceiveMessageInstruction(
            userPubkey,
            userUsdcAta,
            message,
            attestation
          );
          ixs.push(receiveIx);

          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          const transaction = new Transaction().add(...ixs);
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = userPubkey;

          // 获取 Solana 钱包
          const wallet = getBrowserSolanaProvider();
          if (!wallet) {
            throw new Error('未检测到 Solana 钱包');
          }

          // 模拟交易
          const simResult = await connection.simulateTransaction(transaction);
          if (simResult.value.err) {
            const errStr = JSON.stringify(simResult.value.err);
            if (errStr.includes('"Custom":6') || errStr.includes('NonceAlreadyUsed')) {
              toast.warning(t.toast.nonceAlreadyUsed, {
                description: t.toast.nonceUsedHint,
                duration: 10000,
              });
              setStep('error');
              return null;
            }
            throw new Error(`模拟失败: ${errStr}`);
          }

          // 发送交易
          let signature: string | undefined;
          if (wallet.sendTransaction) {
            signature = await wallet.sendTransaction(transaction, connection, { maxRetries: 3 });
          } else if (wallet.signAndSendTransaction) {
            const { signature: sig } = await wallet.signAndSendTransaction(transaction);
            signature = sig;
          } else {
            throw new Error('钱包不支持发送交易');
          }

          if (!signature) throw new Error('未获取到交易签名');

          await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

          toast.success(t.toast.claimSuccessSolana);
          setStep('completed');
          return signature as Hash;
        } catch (err) {
          logger.warn('Manual Solana claim error:', err);
          setError(formatUserFriendlyError(err));
          setStep('error');
          return null;
        }
      }

      // 其他类型暂不支持
      showWarning('暂不支持', '手动领取仅支持 EVM 和 Solana 目标链');
      return null;
    },
    [
      address,
      solanaAddress,
      config,
      ensureCorrectChain,
      t.toast.claimSuccess,
      t.toast.claimSuccessSolana,
      t.toast.creatingTokenAccount,
      t.toast.nonceAlreadyUsed,
      t.toast.nonceUsedHint,
    ]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setCurrentTx(null);
  }, []);

  return {
    step,
    isLoading,
    error,
    currentTx,
    executeBridge,
    claim,
    manualClaimWithAttestation,
    reset,
  };
}
