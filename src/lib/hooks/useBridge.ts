'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain, useConfig } from 'wagmi';
import { getWalletClient } from '@wagmi/core';
import { parseUnits, type Hash, createPublicClient, http } from 'viem';
import { toast } from 'sonner';
import { showWarning, formatUserFriendlyError } from '@/lib/toast-utils';
import { useTranslation } from '@/lib/i18n';
import type { Chain, BridgeTransaction, TransactionStatus } from '@/types';
import { useHistoryStore } from '@/store/history-store';
import { useBridgeStore } from '@/store/bridge-store';
import { useAppKitAccount } from '@reown/appkit/react';
import { 
  buildApproveTransaction, 
  buildBridgeTransaction, 
  buildClaimTransaction,
  calculateMaxFee,
  getDepositForBurnData,
  ERC20_ABI,
} from '@/lib/cctp/evm';
import { getTransferFee, pollForAttestation } from '@/lib/cctp/iris-api';
import { USDC_DECIMALS } from '@/lib/cctp/constants';
import { evmAddressToBytes32, solanaAddressToBytes32, solanaWalletToAtaBytes32 } from '@/lib/cctp/address-utils';
import { createReceiveMessageInstruction, SOLANA_USDC_MINT, extractMintRecipientFromMessage } from '@/lib/cctp/solana';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction 
} from '@solana/spl-token';
// 使用 Circle 官方 SDK
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createSolanaAdapterFromProvider } from '@circle-fin/adapter-solana';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { solanaConfig } from '@/config/wallet';

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

export function useBridge(): UseBridgeReturn {
  const [step, setStep] = useState<BridgeStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTx, setCurrentTx] = useState<BridgeTransaction | null>(null);
  const { t } = useTranslation();

  const { address, chain: connectedChain } = useAccount();
  
  // ✅ 显式按 namespace 分别获取 EVM 和 Solana 账户
  const evmAppKitAccount = useAppKitAccount({ namespace: 'eip155' });
  const solanaAppKitAccount = useAppKitAccount({ namespace: 'solana' });
  const solanaAddress = solanaAppKitAccount.address;
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
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
        console.error('Failed to switch chain:', err);
        throw new Error(`Please switch to ${targetChain.name} network`);
      }
    }
    return true;
  }, [connectedChain, switchChainAsync]);

  /**
   * Check if USDC allowance is sufficient
   */
  const checkAllowance = useCallback(async (): Promise<boolean> => {
    if (!address || !sourceChain) return false;

    try {
      // ✅ 不依赖 wagmi 的当前链（可能与钱包实际链不同步），直接用 sourceChain.rpcUrl 读链上数据
      const rpcClient = createPublicClient({ transport: http(sourceChain.rpcUrl) });

      const code = await rpcClient.getBytecode({
        address: sourceChain.usdcAddress as `0x${string}`,
      });
      if (!code) {
        throw new Error(
          `USDC 地址在 ${sourceChain.name} 上不是合约（很可能钱包网络没切到 ${sourceChain.name}）`
        );
      }

      const allowance = await rpcClient.readContract({
        address: sourceChain.usdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, sourceChain.tokenMessengerAddress as `0x${string}`],
      });

      const requiredAmount = parseUnits(amount, USDC_DECIMALS);
      return (allowance as bigint) >= requiredAmount;
    } catch (err) {
      console.error('Failed to check allowance:', err);
      return false;
    }
  }, [address, sourceChain, amount]);

  /**
   * Approve USDC spending
   */
  const approve = useCallback(async (): Promise<Hash | null> => {
    if (!walletClient || !sourceChain || !address) return null;

    try {
      // ✅ 强校验钱包当前链，避免 wagmi 状态和钱包网络不同步导致 ChainMismatch
      if (sourceChain.chainId) {
        await switchChainAsync({ chainId: sourceChain.chainId });
        const walletChainId = await walletClient.getChainId();
        if (walletChainId !== sourceChain.chainId) {
          throw new Error(`请在钱包中切换到 ${sourceChain.name}（chainId=${sourceChain.chainId}）`);
        }
      }

      const tx = buildApproveTransaction(sourceChain, amount);
      
      const hash = await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        account: address,
      });

      // Wait for confirmation
      // ✅ 用链自己的 RPC 等待回执，避免 publicClient 链不同步
      const rpcClient = createPublicClient({ transport: http(sourceChain.rpcUrl) });
      await rpcClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (err) {
      console.error('Approve failed:', err);
      throw err;
    }
  }, [walletClient, sourceChain, amount, address, switchChainAsync]);

  /**
   * Execute depositForBurn
   */
  const burn = useCallback(async (): Promise<Hash | null> => {
    if (!walletClient || !sourceChain || !destChain || !address) return null;

    try {
      // ✅ 强校验钱包当前链，避免 ChainMismatch / 读错链
      if (sourceChain.chainId) {
        await switchChainAsync({ chainId: sourceChain.chainId });
        const walletChainId = await walletClient.getChainId();
        if (walletChainId !== sourceChain.chainId) {
          throw new Error(`请在钱包中切换到 ${sourceChain.name}（chainId=${sourceChain.chainId}）`);
        }
      }

      // Convert recipient address based on destination chain type
      let recipientBytes32 = recipient;
      if (destChain.type === 'evm' && recipient.startsWith('0x') && recipient.length === 42) {
        recipientBytes32 = evmAddressToBytes32(recipient);
      } else if (destChain.type === 'solana') {
        // ⚠️ CRITICAL: For Solana destination, mintRecipient MUST be the USDC Token Account (ATA),
        // NOT the wallet address! The token account must exist before receiveMessage is called.
        // See: https://developers.circle.com/cctp/solana-programs#mint-recipient-for-solana-as-destination-chain-transfers
        recipientBytes32 = await solanaWalletToAtaBytes32(recipient);
      }

      // ✅ Fast Transfer 的 maxFee 必须 >= Iris 返回的动态费用，否则 TokenMessengerV2 会直接 revert
      // 这里优先用 Iris 的 feeInBps；如果请求失败再回退到常量（避免直接 0 导致失败）
      let maxFee = BigInt(0);
      if (isFastTransfer) {
        const feeResp = await getTransferFee(sourceChain.domainId, destChain.domainId);
        const bps =
          typeof feeResp?.feeInBps === 'number' ? feeResp.feeInBps : sourceChain.fastTransferFee;
        maxFee = calculateMaxFee(amount, bps);
      }

      const data = getDepositForBurnData(
        amount,
        destChain.domainId,
        recipientBytes32,
        sourceChain.usdcAddress as any,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        maxFee,
        isFastTransfer
      );

      const tx = {
        to: sourceChain.tokenMessengerAddress as any,
        data,
        value: BigInt(0),
      };

      const hash = await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        account: address,
      });

      return hash;
    } catch (err) {
      console.error('Burn failed:', err);
      throw err;
    }
  }, [walletClient, sourceChain, destChain, amount, recipient, isFastTransfer, address, switchChainAsync]);

  /**
   * Poll for attestation
   */
  const waitForAttestation = useCallback(async (
    sourceTxHash: Hash,
    transaction: BridgeTransaction
  ): Promise<{ message: string; attestation: string } | null> => {
    if (!sourceChain) return null;

    // Update status to attesting
    updateTransaction(transaction.id, { status: 'attesting', updatedAt: Date.now() });
    setStep('waiting-attestation');

    toast.info(t.toast.waitingAttestation, {
      description: isFastTransfer 
        ? t.toast.fastTransferHint 
        : t.toast.standardTransferHint,
    });

    // Poll for attestation
    const maxRetries = isFastTransfer ? 24 : 120; // 2 min for fast, 10 min for standard
    const intervalMs = isFastTransfer ? 5000 : 5000;

    const attestationResult = await pollForAttestation(
      sourceTxHash,
      sourceChain.domainId,
      maxRetries,
      intervalMs
    );

    if (!attestationResult) {
      // Update status to ready for manual claim
      updateTransaction(transaction.id, { 
        status: 'ready', 
        updatedAt: Date.now() 
      });
      
      toast.warning(t.toast.attestationTimeout, {
        description: t.toast.claimManuallyHint,
      });
      
      return null;
    }

    // Update transaction with attestation
    updateTransaction(transaction.id, {
      message: attestationResult.message,
      attestation: attestationResult.attestation,
      status: 'ready',
      updatedAt: Date.now(),
    });

    toast.success(t.toast.attestationReceived, {
      description: t.toast.readyToClaim,
    });

    return attestationResult;
  }, [sourceChain, isFastTransfer, updateTransaction]);

  /**
   * Claim on destination chain
   */
  const claimOnDestination = useCallback(async (
    transaction: BridgeTransaction,
    attestation: { message: string; attestation: string }
  ): Promise<Hash | null> => {
    if (!destChain) return null;

    // EVM 目的链
    if (destChain.type === 'evm') {
      if (!address) return null;
      try {
        if (destChain.chainId) {
          await ensureCorrectChain(destChain);
          // Wait a bit for the chain switch to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Get fresh wallet client after chain switch
        const freshWalletClient = await getWalletClient(config, { chainId: destChain.chainId });
        if (!freshWalletClient) {
          throw new Error('Failed to get wallet client after chain switch');
        }

        setStep('claiming');
        updateTransaction(transaction.id, { status: 'claiming', updatedAt: Date.now() });

        const claimTx = buildClaimTransaction(
          destChain,
          attestation.message as `0x${string}`,
          attestation.attestation as `0x${string}`
        );

        const claimHash = await freshWalletClient.sendTransaction({
          to: claimTx.to,
          data: claimTx.data,
          value: claimTx.value,
          account: address,
        });

        {
          const rpcClient = createPublicClient({ transport: http(destChain.rpcUrl) });
          await rpcClient.waitForTransactionReceipt({ hash: claimHash });
        }

        updateTransaction(transaction.id, {
          destTxHash: claimHash,
          status: 'completed',
          updatedAt: Date.now(),
        });

        toast.success(t.toast.bridgeComplete, {
          description: `${t.toast.usdcReceived} ${destChain.name}`,
        });

        return claimHash;
      } catch (err) {
        console.error('Claim failed:', err);
        updateTransaction(transaction.id, { status: 'ready', updatedAt: Date.now() });
        // 仅在 UI error 框中显示错误，不需要额外 toast
        return null;
      }
    }

    // Solana 目的链
    if (destChain.type === 'solana') {
      if (!solanaAddress) {
        showWarning('请连接钱包', '需要连接 Solana 钱包才能领取');
        return null;
      }

      try {
        setStep('claiming');
        updateTransaction(transaction.id, { status: 'claiming', updatedAt: Date.now() });

        const connection = new Connection(destChain.rpcUrl);
        const userPubkey = new PublicKey(solanaAddress);

        // 获取用户的 USDC ATA（mint recipient）
        const { SOLANA_USDC_MINT, getUsdcTokenAccount, extractMintRecipientFromMessage: extractMintRecipient } = await import('@/lib/cctp/solana');
        const userUsdcAta = await getUsdcTokenAccount(userPubkey);

        // ⚠️ 检查 message 中的 mintRecipient 是否与用户的 ATA 匹配
        const messageMintRecipient = extractMintRecipient(attestation.message);
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
          updateTransaction(transaction.id, { status: 'ready', updatedAt: Date.now() });
          return null;
        }

        // 检查 ATA 是否存在，不存在则创建
        const accountInfo = await connection.getAccountInfo(userUsdcAta);
        const ixs: TransactionInstruction[] = [];
        
        if (!accountInfo) {
          // 创建 ATA
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const createAtaIx = createAssociatedTokenAccountInstruction(
            userPubkey, // payer
            userUsdcAta, // ata
            userPubkey, // owner
            SOLANA_USDC_MINT // mint
          );
          ixs.push(createAtaIx);
          toast.info(t.toast.creatingTokenAccount);
        }

        // 创建 receive_message 指令（传入完整账户）
        const receiveIx = createReceiveMessageInstruction(
          userPubkey,
          userUsdcAta, // mint recipient ATA
          attestation.message,
          attestation.attestation
        );
        ixs.push(receiveIx);

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const tx = new Transaction().add(...ixs);
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;

        const wallet = (window as any).solana;
        if (!wallet) {
          throw new Error('未检测到 Solana 钱包');
        }

        const simResult = await connection.simulateTransaction(tx);
        if (simResult.value.err) {
          throw new Error(`模拟失败: ${JSON.stringify(simResult.value.err)}`);
        }

        let signature: string | undefined;
        if (wallet.sendTransaction) {
          signature = await wallet.sendTransaction(tx, connection, { maxRetries: 3 });
        } else if (wallet.signAndSendTransaction) {
          const { signature: sig } = await wallet.signAndSendTransaction(tx);
          signature = sig;
        } else {
          throw new Error('当前钱包不支持 sendTransaction/signAndSendTransaction');
        }

        if (!signature) throw new Error('未获取到交易签名');

        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        updateTransaction(transaction.id, {
          destTxHash: signature,
          status: 'completed',
          updatedAt: Date.now(),
        });

        toast.success(t.toast.claimSuccessSolana);
        return signature as Hash;
      } catch (err) {
        console.error('Solana claim failed:', err);
        updateTransaction(transaction.id, { status: 'ready', updatedAt: Date.now() });
        // 不再重复显示 toast，只返回 null
        return null;
      }
    }

    return null;
  }, [
    address,
    config,
    destChain,
    ensureCorrectChain,
    updateTransaction,
    solanaAddress,
  ]);

  /**
   * Execute full bridge flow
   */
  const executeBridge = useCallback(async () => {
    // ✅ 根据源链类型检查相应的钱包地址
    const sourceAddress = sourceChain?.type === 'solana' ? solanaAddress : address;
    
    if (!sourceChain || !destChain || !amount || !recipient || !sourceAddress) {
      setError('Missing required parameters');
      console.log('[Bridge] Missing params:', { sourceChain, destChain, amount, recipient, sourceAddress, sourceType: sourceChain?.type });
      
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

    // Solana 源链单独走 Solana 流程
    if (sourceChain.type === 'solana') {
      await executeSolanaBridge();
      return;
    }

    // 仅支持 EVM 源链
    if (sourceChain.type !== 'evm') {
      showWarning('暂不支持', '该源链暂不支持');
      return;
    }

    setError(null);
    setStep('checking-allowance');

    try {
      // Ensure we're on the correct chain
      if (sourceChain.chainId) {
        await ensureCorrectChain(sourceChain);
      }

      // Step 1: Check allowance
      toast.info(t.toast.checkingAllowance);
      const hasAllowance = await checkAllowance();

      // Step 2: Approve if needed
      if (!hasAllowance) {
        setStep('approving');
        toast.info(t.toast.approvingUsdc, {
          description: t.toast.confirmInWallet,
        });

        const approveHash = await approve();
        if (!approveHash) {
          throw new Error('Approval failed');
        }

        toast.success(t.toast.usdcApproved);
      }

      // Step 3: Execute burn
      setStep('burning');
      toast.info(t.toast.initiatingBridge, {
        description: t.toast.confirmInWallet,
      });

      const burnHash = await burn();
      if (!burnHash) {
        throw new Error('Bridge transaction failed');
      }

      // Create transaction record
      const txId = generateTxId();
      const transaction: BridgeTransaction = {
        id: txId,
        sourceChain,
        destChain,
        amount,
        recipient,
        sender: address || '',
        sourceTxHash: burnHash,
        status: 'burning',
        isFastTransfer,
        fee,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addTransaction(transaction);
      setCurrentTx(transaction);

      toast.success(t.toast.bridgeSubmitted, {
        description: `Tx: ${burnHash.slice(0, 10)}...${burnHash.slice(-8)}`,
      });

      // Wait for burn confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: burnHash });
      }

      // Step 4: Wait for attestation
      const attestationResult = await waitForAttestation(burnHash, transaction);

      // Step 5: Auto-claim on destination chain (EVM or Solana)
      if (attestationResult) {
        // 尝试自动 claim（支持 EVM 和 Solana）
        const claimHash = await claimOnDestination(transaction, attestationResult);
        if (claimHash) {
          setStep('completed');
          return;
        }
        
        // 如果自动 claim 失败，设为 ready 状态让用户手动领取
        toast.info(t.toast.autoClaimFailed, {
          description: t.toast.claimManuallyFromHistory,
        });
        setStep('completed');
      } else {
        // attestation 超时
        setStep('idle');
      }

    } catch (err) {
      console.error('Bridge error:', err);
      setStep('error');
      
      // 使用用户友好的错误信息，不再重复显示 toast
      setError(formatUserFriendlyError(err));

      // Update transaction status if exists
      if (currentTx) {
        updateTransaction(currentTx.id, { status: 'failed', updatedAt: Date.now() });
      }
    }
  }, [
    sourceChain, destChain, amount, recipient, address, isFastTransfer, fee,
    ensureCorrectChain, checkAllowance, approve, burn, waitForAttestation,
    claimOnDestination, addTransaction, updateTransaction, publicClient, currentTx
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
          const rpcClient = createPublicClient({ transport: http(tx.destChain.rpcUrl) });
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
        console.error('Claim error:', err);
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

        const { solanaConfig } = await import('@/config/wallet');
        const connection = new Connection(solanaConfig.mainnet.rpcUrl);
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
        const wallet = (window as any).phantom?.solana || (window as any).solana;
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
        console.error('Solana claim error:', err);
        updateTransaction(txId, { status: 'ready', updatedAt: Date.now() });
        setError(formatUserFriendlyError(err));
        setStep('error');
      }
      return;
    }

    // 其他类型暂不支持
    showWarning('暂不支持', '该目标链暂不支持手动领取');
  }, [address, solanaAddress, config, ensureCorrectChain, getTransactionById, updateTransaction]);

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
            const rpcClient = createPublicClient({ transport: http(destChain.rpcUrl) });
            await rpcClient.waitForTransactionReceipt({ hash: claimHash });
          }

          toast.success(t.toast.claimSuccess);
          setStep('completed');
          return claimHash;
        } catch (err) {
          console.error('Manual claim error:', err);
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

          const connection = new Connection(destChain.rpcUrl);
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
          const wallet = (window as any).phantom?.solana || (window as any).solana;
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
          console.error('Manual Solana claim error:', err);
          setError(formatUserFriendlyError(err));
          setStep('error');
          return null;
        }
      }

      // 其他类型暂不支持
      showWarning('暂不支持', '手动领取仅支持 EVM 和 Solana 目标链');
      return null;
    },
    [address, solanaAddress, config, ensureCorrectChain]
  );

  /**
   * Solana 源链桥接流程 - 使用 Circle 官方 SDK
   */
  const executeSolanaBridge = useCallback(async () => {
    if (!sourceChain || !destChain || !amount || !recipient) {
      setError('Missing required parameters');
      return;
    }

    if (sourceChain.type !== 'solana') return;

    // 从 allAccounts 获取 Solana 地址（支持同时连接 EVM + Solana）
    if (!solanaAddress) {
      showWarning('请连接钱包', '需要连接 Solana 钱包才能继续');
      return;
    }

    // 获取 Solana provider - 优先使用浏览器扩展（如 Phantom），因为 AppKit provider 可能不兼容 Circle SDK
    // AppKit 通过 WalletConnect 连接时，provider 格式与 Circle SDK 不兼容
    const phantomProvider = (window as any).phantom?.solana || (window as any).solana;
    
    if (!phantomProvider?.isPhantom && !phantomProvider?.isSolflare) {
      showWarning('需要钱包扩展', '请安装 Phantom 或 Solflare 钱包');
      console.error('[Solana Bridge] No compatible Solana wallet extension found');
      return;
    }
    
    // 确保钱包已连接
    if (!phantomProvider.isConnected) {
      try {
        await phantomProvider.connect();
      } catch (err) {
        setError(formatUserFriendlyError(err));
        return;
      }
    }
    
    // EVM 目标链需要 EVM 钱包（用于 Bridge Kit 目的链适配器）
    if (destChain.type === 'evm' && (!walletClient || !publicClient)) {
      showWarning('请连接钱包', '需要连接 EVM 钱包以接收资产');
      return;
    }

    try {
      setError(null);
      setStep('burning');
      toast.info(t.toast.solanaBridgeInit, {
        description: t.toast.usingSdk,
      });

      // ✅ 使用 Circle Bridge Kit（官方推荐的浏览器端桥接入口）
      // BridgeKit 会负责：参数校验、route 识别、burn + attestation + mint/claim 的完整流程
      const kit = new BridgeKit();

      // 创建 Solana adapter，使用钱包扩展 provider
      const solanaAdapter = await createSolanaAdapterFromProvider({
        provider: phantomProvider,
        connection: new Connection(solanaConfig.mainnet.rpcUrl),
      });

      // 目的链（EVM）使用 Viem adapter；Solana->Solana 仍可复用 solanaAdapter
      let destAdapter;
      if (destChain.type === 'evm') {
        // ✅ Circle SDK 的 createViemAdapterFromProvider 需要 EIP-1193 provider
        // 从 window.ethereum 获取 provider (MetaMask 等钱包注入的)
        const evmProvider = (window as any).ethereum;
        
        if (!evmProvider) {
          showWarning('需要钱包扩展', '请安装 MetaMask 或其他 EVM 钱包');
          return;
        }
        
        if (!publicClient || !walletClient) {
          showWarning('钱包未连接', '请重新连接 EVM 钱包');
          return;
        }
        
        try {
          // 使用 EIP-1193 provider 创建 adapter
          destAdapter = await createViemAdapterFromProvider({
            provider: evmProvider,
            getPublicClient: () => publicClient as any,
            getWalletClient: () => walletClient as any,
          } as any);
        } catch (err) {
          console.error('[Solana Bridge] Failed to create Viem adapter:', err);
          setError(formatUserFriendlyError(err));
          return;
        }
      } else {
        destAdapter = solanaAdapter;
      }

      // ✅ BridgeKit 需要的 chain 标识必须是它支持的枚举字符串（非常严格）
      // 例如：Optimism（不是 OP Mainnet）、Polygon（不是 Polygon PoS）、World_Chain（不是 World Chain）
      const toBridgeKitChain = (chain: Chain): string => {
        const mapByDomainId: Record<number, string> = {
          0: 'Ethereum',
          1: 'Avalanche',
          2: 'Optimism',
          3: 'Arbitrum',
          5: 'Solana',
          6: 'Base',
          7: 'Polygon',
          10: 'Unichain',
          11: 'Linea',
          13: 'Sonic',
          14: 'World_Chain',
          16: 'Sei',
          18: 'XDC',
          19: 'HyperEVM',
          21: 'Ink',
          22: 'Plume',
          12: 'Codex',
        };
        return mapByDomainId[chain.domainId] || chain.name;
      };

      // ✅ 执行完整桥接（burn + attestation + mint/claim）
      toast.info(t.toast.confirmInWallet);

      const result = await kit.bridge({
        from: {
          adapter: solanaAdapter as any,
          chain: toBridgeKitChain(sourceChain) as any,
        },
        to: {
          adapter: destAdapter as any,
          chain: toBridgeKitChain(destChain) as any,
          recipientAddress: recipient,
        },
        amount, // ✅ BridgeKit 使用人类可读的金额字符串（不是最小单位）
        token: 'USDC',
        config: {
          transferSpeed: isFastTransfer ? 'FAST' : 'SLOW',
        },
      } as any);

      if (!result || result.state !== 'success') {
        const msg =
          (result as any)?.steps?.find((s: any) => s?.error)?.error?.message ||
          'BridgeKit bridge failed';
        throw new Error(msg);
      }

      // 尝试从 steps 提取可展示的 tx（不同版本字段名可能不同，这里做兜底）
      const steps: any[] = (result as any).steps || [];
      const firstExplorerUrl = steps.find(s => typeof s?.explorerUrl === 'string')?.explorerUrl;
      const extractHashFromExplorerUrl = (url: string): string | undefined => {
        try {
          const u = new URL(url);
          const parts = u.pathname.split('/').filter(Boolean);
          // EVM explorers commonly: /tx/0x...
          const txIdx = parts.findIndex(p => p === 'tx' || p === 'transaction');
          if (txIdx >= 0 && parts[txIdx + 1]) return parts[txIdx + 1];
          return undefined;
        } catch {
          return undefined;
        }
      };

      const rawHash =
        steps.find(s => typeof s?.txHash === 'string')?.txHash ||
        steps.find(s => typeof s?.hash === 'string')?.hash ||
        (typeof firstExplorerUrl === 'string' ? extractHashFromExplorerUrl(firstExplorerUrl) : undefined) ||
        firstExplorerUrl ||
        'bridgekit_success';

      const burnTxHash = String(rawHash);

      // 记录交易
      const txId = generateTxId();
      const transaction: BridgeTransaction = {
        id: txId,
        sourceChain,
        destChain,
        amount,
        recipient,
        sender: solanaAddress,
        sourceTxHash: burnTxHash,
        status: 'completed',
        isFastTransfer,
        fee,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addTransaction(transaction);
      setCurrentTx(transaction);

      toast.success(t.toast.bridgeKitComplete, {
        description: typeof burnTxHash === 'string' ? `Tx: ${String(burnTxHash).slice(0, 12)}...` : 'Success',
      });

      setStep('completed');

    } catch (err) {
      console.error('Solana bridge error:', err);
      setStep('error');
      // 使用用户友好的错误信息，不再重复显示 toast
      setError(formatUserFriendlyError(err));

      if (currentTx) {
        updateTransaction(currentTx.id, { status: 'failed', updatedAt: Date.now() });
      }
    }
  }, [
    sourceChain,
    destChain,
    amount,
    recipient,
    isFastTransfer,
    fee,
    solanaAddress,
    walletClient,
    publicClient,
    waitForAttestation,
    claimOnDestination,
    addTransaction,
    currentTx,
    updateTransaction,
  ]);

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

