import { IRIS_API_URL, getChainByDomainId } from './constants';
import type { IrisMessagesResponse, IrisFeeResponse, IrisAllowanceResponse } from '@/types';
import { defineChain } from 'viem';
import { createEvmPublicClient } from '@/config/rpc';
import { logger } from '@/lib/logger';

const API_BASE = IRIS_API_URL;

// Blockscout API URLs for each chain
const BLOCKSCOUT_APIS: Record<number, string> = {
  0: 'https://eth.blockscout.com',        // Ethereum
  1: 'https://43114.blockscout.com',      // Avalanche
  2: 'https://optimism.blockscout.com',   // Optimism
  3: 'https://arbitrum.blockscout.com',   // Arbitrum
  6: 'https://base.blockscout.com',       // Base
  7: 'https://polygon.blockscout.com',    // Polygon
  10: 'https://unichain.blockscout.com',  // Unichain (may not exist)
  11: 'https://linea.blockscout.com',     // Linea
  // Add more as needed
};

// Rate limit: 35 requests/second
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get attestation for a transaction
 */
export async function getAttestation(
  sourceTxHash: string,
  sourceDomain: number
): Promise<IrisMessagesResponse | null> {
  try {
    // CCTP V2: GET /v2/messages/{sourceDomainId}?transactionHash={hash}
    // Ref: CCTP v1 -> v2 migration mapping
    const tx = encodeURIComponent(sourceTxHash);
    const response = await fetch(
      `${API_BASE}/v2/messages/${sourceDomain}?transactionHash=${tx}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.warn('Failed to get attestation:', error);
    return null;
  }
}

/**
 * Poll for attestation until it's ready or timeout
 */
export async function pollForAttestation(
  sourceTxHash: string,
  sourceDomain: number,
  maxRetries = 60,
  intervalMs = 5000
): Promise<{ message: string; attestation: string } | null> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await getAttestation(sourceTxHash, sourceDomain);
    
    if (response?.messages?.[0]?.attestation) {
      const msg = response.messages[0];
      if (msg.status === 'complete') {
        return {
          message: msg.message,
          attestation: msg.attestation,
        };
      }
    }
    
    await sleep(intervalMs);
  }
  
  return null;
}

/**
 * Get transfer fee for a route
 * API: GET /v2/burn/USDC/fees/{sourceDomainId}/{destDomainId}
 * Returns array of fee tiers:
 * - finalityThreshold: 1000 = Fast Transfer, 2000 = Standard Transfer
 * - minimumFee: fee in basis points (bps), e.g., 1 = 0.01%
 */
export async function getTransferFee(
  sourceDomain: number,
  destinationDomain: number
): Promise<IrisFeeResponse | null> {
  try {
    // Correct API format: path parameters, not query parameters
    const response = await fetch(
      `${API_BASE}/v2/burn/USDC/fees/${sourceDomain}/${destinationDomain}`
    );
    
    if (!response.ok) {
      logger.info('[Iris] Fee API error:', response.status);
      return null;
    }
    
    // API returns array: [{finalityThreshold: 1000, minimumFee: 1}, {finalityThreshold: 2000, minimumFee: 0}]
    const data = await response.json();
    
    // Find Fast Transfer fee (finalityThreshold <= 1000)
    const fastFee = data.find((item: { finalityThreshold: number; minimumFee: number }) => 
      item.finalityThreshold <= 1000
    );
    
    // Find Standard Transfer fee (finalityThreshold >= 2000)
    const standardFee = data.find((item: { finalityThreshold: number; minimumFee: number }) => 
      item.finalityThreshold >= 2000
    );
    
    return {
      feeInBps: fastFee?.minimumFee ?? 1, // Fast Transfer fee
      standardFeeInBps: standardFee?.minimumFee ?? 0, // Standard Transfer is usually free
    };
  } catch (error) {
    logger.warn('[Iris] Fee API failed:', error);
    return null;
  }
}

/**
 * Get Fast Transfer allowance
 */
export async function getFastTransferAllowance(): Promise<IrisAllowanceResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/v2/fastBurn/USDC/allowance`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.warn('Failed to get fast transfer allowance:', error);
    return null;
  }
}

/**
 * Reattest a message (for expired Fast Transfer)
 */
export async function reattestMessage(
  messageHash: string,
  sourceDomain: number
): Promise<IrisMessagesResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/v2/reattest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageHash,
        sourceDomain,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.warn('Failed to reattest message:', error);
    return null;
  }
}

/**
 * Get message by nonce
 */
export async function getMessageByNonce(
  nonce: string,
  sourceDomain: number
): Promise<IrisMessagesResponse | null> {
  try {
    const n = encodeURIComponent(nonce);
    const response = await fetch(
      `${API_BASE}/v2/messages/${sourceDomain}?nonce=${n}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.warn('Failed to get message by nonce:', error);
    return null;
  }
}

/**
 * Check if a message can be claimed by simulating the receiveMessage call
 * This is more reliable than checking usedNonces directly (CCTP V2 uses bitmap)
 * 
 * Returns: { canClaim: boolean, reason?: string }
 */
export async function checkCanClaim(
  message: string,
  attestation: string,
  destChain: { chainId?: number; rpcUrl: string; messageTransmitterAddress: string }
): Promise<{ canClaim: boolean; reason?: string }> {
  try {
    if (!destChain.chainId) {
      // Non-EVM chain, assume can claim (will fail at actual claim if not)
      logger.info(`[CheckClaim] Non-EVM chain, skipping simulation`);
      return { canClaim: true };
    }

    // Create a custom chain definition using the RPC URL
    const customChain = defineChain({
      id: destChain.chainId,
      name: 'Custom Chain',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [destChain.rpcUrl] },
      },
    });

    const client = createEvmPublicClient(customChain, destChain.rpcUrl);

    logger.info(`[CheckClaim] Simulating receiveMessage on chain ${destChain.chainId}`);

    // Simulate receiveMessage call
    // If it reverts, the message has already been received or is invalid
    await client.simulateContract({
      address: destChain.messageTransmitterAddress as `0x${string}`,
      abi: [{
        name: 'receiveMessage',
        type: 'function',
        inputs: [
          { name: 'message', type: 'bytes' },
          { name: 'attestation', type: 'bytes' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable',
      }],
      functionName: 'receiveMessage',
      args: [message as `0x${string}`, attestation as `0x${string}`],
      // Use a dummy account for simulation
      account: '0x0000000000000000000000000000000000000001',
    });

    logger.info(`[CheckClaim] Simulation successful - can claim`);
    return { canClaim: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.info(`[CheckClaim] Simulation failed:`, errorMessage);
    
    // Check if it's a "nonce already used" error
    if (errorMessage.includes('Nonce already used') || 
        errorMessage.includes('already used') ||
        errorMessage.includes('revert')) {
      return { canClaim: false, reason: '该交易已领取完成' };
    }
    
    // Other errors - assume can try to claim
    return { canClaim: true };
  }
}

/**
 * Check if a message has been received on the destination chain
 * by querying Blockscout API for USDC token minting (receiveMessage) transactions
 */
export async function checkDestinationTransaction(
  recipientAddress: string,
  amountInWei: string,
  destDomainId: number,
  sourceTxTimestamp: number,
): Promise<{ completed: boolean; destTxHash?: string }> {
  try {
    const destChain = getChainByDomainId(destDomainId);
    if (!destChain || destChain.type !== 'evm') {
      // 非 EVM 链暂不支持自动检测
      return { completed: false };
    }

    const blockscoutBase = BLOCKSCOUT_APIS[destDomainId];
    if (!blockscoutBase) {
      logger.info(`[CheckDest] No Blockscout API for domain ${destDomainId}`);
      return { completed: false };
    }

    // 查询接收者地址的 USDC token transfers（mint from 0x0）
    const url = `${blockscoutBase}/api/v2/addresses/${recipientAddress}/token-transfers?token=${destChain.usdcAddress}&type=ERC-20`;
    
    logger.info(`[CheckDest] Querying Blockscout: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(`[CheckDest] Blockscout API error: ${response.status}`);
      return { completed: false };
    }

    const data = await response.json();
    const items = data.items || [];

    // 查找匹配的 mint 交易：
    // 1. from 是 0x0（mint）
    // 2. method 是 receiveMessage
    // 3. 金额匹配
    // 4. 时间在源链交易之后
    for (const item of items) {
      const isFromZero = item.from?.hash?.toLowerCase() === '0x0000000000000000000000000000000000000000';
      const isReceiveMessage = item.method === 'receiveMessage';
      const amountMatch = item.total?.value === amountInWei;
      const itemTimestamp = new Date(item.timestamp).getTime();
      const isAfterSource = itemTimestamp >= sourceTxTimestamp - 60000; // 允许 1 分钟误差

      logger.info(`[CheckDest] Checking item:`, {
        txHash: item.transaction_hash,
        isFromZero,
        isReceiveMessage,
        amountMatch,
        itemAmount: item.total?.value,
        expectedAmount: amountInWei,
        isAfterSource,
      });

      if (isFromZero && isReceiveMessage && amountMatch && isAfterSource) {
        logger.info(`[CheckDest] Found matching transaction: ${item.transaction_hash}`);
        return {
          completed: true,
          destTxHash: item.transaction_hash,
        };
      }
    }

    logger.info(`[CheckDest] No matching transaction found`);
    return { completed: false };
  } catch (error) {
    logger.warn('[CheckDest] Failed to check destination transaction:', error);
    return { completed: false };
  }
}
