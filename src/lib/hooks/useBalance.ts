'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { formatUnits, type Chain as ViemChain } from 'viem';
import { mainnet, arbitrum, optimism, base, polygon, avalanche, linea } from 'viem/chains';
import type { Chain } from '@/types';
import { USDC_DECIMALS } from '@/lib/cctp/constants';
import { createEvmPublicClient, getSolanaRpcUrls } from '@/config/rpc';

// ERC20 balanceOf ABI
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// Map chain IDs to viem chain objects
const VIEM_CHAINS: Record<number, ViemChain> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  8453: base,
  137: polygon,
  43114: avalanche,
  59144: linea,
};

// Solana USDC Mint Address (Mainnet only)
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Solana RPC - 从环境变量读取
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

// ===========================================
// 余额缓存 - 避免重复请求
// ===========================================
interface CachedBalance {
  balance: string;
  rawBalance: bigint;
  timestamp: number;
}

type SolanaBalanceRpcResponse = {
  error?: { message?: string };
  result?: {
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              tokenAmount?: { amount?: string };
            };
          };
        };
      };
    }>;
  };
};

const balanceCache = new Map<string, CachedBalance>();
const CACHE_TTL = 15000; // 15秒缓存有效期

function getCacheKey(chainId: string, address: string): string {
  return `${chainId}:${address}`;
}

function getCachedBalance(chainId: string, address: string): CachedBalance | null {
  const key = getCacheKey(chainId, address);
  const cached = balanceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }
  return null;
}

function setCachedBalance(chainId: string, address: string, balance: string, rawBalance: bigint): void {
  const key = getCacheKey(chainId, address);
  balanceCache.set(key, { balance, rawBalance, timestamp: Date.now() });
}

// 清除特定链的缓存（用于刷新后立即更新）
export function clearBalanceCache(chainId?: string, address?: string): void {
  if (chainId && address) {
    balanceCache.delete(getCacheKey(chainId, address));
  } else {
    balanceCache.clear();
  }
}

interface UseBalanceReturn {
  balance: string;
  rawBalance: bigint;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: number | null;
}

/**
 * Hook to fetch USDC balance for a specific chain
 * 带有智能缓存，避免重复请求
 */
export function useUsdcBalance(chain: Chain | null): UseBalanceReturn {
  const [balance, setBalance] = useState<string>('0');
  const [rawBalance, setRawBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  // 防止并发请求
  const fetchingRef = useRef(false);

  // EVM 地址
  const { address: evmAddress } = useAccount();
  
  // Solana 地址：显式按 namespace 获取，避免 EVM/Solana 同连时读错账户。
  const { address: solanaAddress } = useAppKitAccount({ namespace: 'solana' });

  const fetchBalance = useCallback(async (skipCache = false) => {
    if (!chain) {
      setBalance('0');
      setRawBalance(BigInt(0));
      return;
    }

    // 根据链类型确定使用哪个地址
    const address = chain.type === 'evm' ? evmAddress : chain.type === 'solana' ? solanaAddress : undefined;
    
    if (!address) {
      setBalance('0');
      setRawBalance(BigInt(0));
      return;
    }

    // 检查缓存（除非强制跳过）
    if (!skipCache) {
      const cached = getCachedBalance(chain.id, address);
      if (cached) {
        setBalance(cached.balance);
        setRawBalance(cached.rawBalance);
        setLastUpdated(cached.timestamp);
        return;
      }
    }

    // 防止并发请求
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      let balanceValue: bigint = BigInt(0);
      let balanceStr = '0';

      if (chain.type === 'evm' && chain.chainId) {
        // EVM 链余额查询
        const result = await readEvmUsdcBalance(chain, address);

        balanceValue = result as bigint;
        balanceStr = formatUnits(balanceValue, USDC_DECIMALS);
        
      } else if (chain.type === 'solana' && solanaAddress) {
        // Solana 余额查询 - 使用 Helius 私有 RPC
        balanceValue = await fetchSolanaUsdcBalance(solanaAddress);
        balanceStr = formatUnits(balanceValue, USDC_DECIMALS);
      }

      // 更新状态
      setRawBalance(balanceValue);
      setBalance(balanceStr);
      setLastUpdated(Date.now());
      
      // 写入缓存
      setCachedBalance(chain.id, address, balanceStr, balanceValue);
      
    } catch (err) {
      console.warn('Failed to fetch USDC balance:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance('0');
      setRawBalance(BigInt(0));
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [chain, evmAddress, solanaAddress]);

  // 强制刷新（跳过缓存）
  const refetch = useCallback(async () => {
    if (chain) {
      const address = chain.type === 'evm' ? evmAddress : solanaAddress;
      if (address) {
        clearBalanceCache(chain.id, address);
      }
    }
    await fetchBalance(true);
  }, [chain, evmAddress, solanaAddress, fetchBalance]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refetch every 30 seconds
  useEffect(() => {
    if (!chain) return;
    
    const address = chain.type === 'evm' ? evmAddress : solanaAddress;
    if (!address) return;

    const interval = setInterval(() => fetchBalance(true), 30000);
    return () => clearInterval(interval);
  }, [chain, evmAddress, solanaAddress, fetchBalance]);

  return {
    balance,
    rawBalance,
    isLoading,
    error,
    refetch,
    lastUpdated,
  };
}

async function readEvmUsdcBalance(chain: Chain, address: string): Promise<bigint> {
  if (!chain.chainId) return BigInt(0);

  const viemChain = VIEM_CHAINS[chain.chainId] || {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [chain.rpcUrl] },
    },
  };

  const client = createEvmPublicClient(viemChain, chain.rpcUrl);

  return await client.readContract({
    address: chain.usdcAddress as `0x${string}`,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
}

/**
 * Fetch Solana USDC balance using Helius RPC
 */
async function fetchSolanaUsdcBalance(walletAddress: string): Promise<bigint> {
  let lastError: unknown;

  for (const rpcUrl of getSolanaRpcUrls(SOLANA_RPC_URL)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: SOLANA_USDC_MINT },
            { encoding: 'jsonParsed' }
          ]
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        console.warn(`[Solana RPC] ${rpcUrl} HTTP error: ${response.status}`);
        continue;
      }

      const data = (await response.json()) as SolanaBalanceRpcResponse;

      if (data.error) {
        lastError = new Error(data.error.message || JSON.stringify(data.error));
        console.warn('[Solana RPC] Error:', data.error.message || JSON.stringify(data.error));
        continue;
      }

      const accounts = data.result?.value || [];

      if (accounts.length === 0) {
        // 没有 token account 意味着余额为 0
        return BigInt(0);
      }

      // 聚合所有 token account 余额
      let total = BigInt(0);
      for (const acc of accounts) {
        const amount = acc?.account?.data?.parsed?.info?.tokenAmount?.amount;
        if (amount) {
          total += BigInt(amount);
        }
      }

      return total;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      lastError = error;
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Solana RPC] ${rpcUrl} request timeout`);
      } else {
        console.warn(`[Solana RPC] ${rpcUrl} error:`, error);
      }
    }
  }

  console.warn('[Solana RPC] All balance RPC endpoints failed:', lastError);
  return BigInt(0);
}

/**
 * Format balance for display
 */
export function formatBalance(balance: string, decimals: number = 2): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (num < 0.01) return '<0.01';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
