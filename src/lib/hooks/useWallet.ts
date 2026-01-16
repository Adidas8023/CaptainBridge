'use client';

import { useMemo, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect as useEvmDisconnect, useSwitchChain } from 'wagmi';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import type { Chain } from '@/types';

export type WalletType = 'evm' | 'solana' | null;

interface UseWalletReturn {
  // Connection state
  isConnected: boolean;
  address: string | undefined;
  walletType: WalletType;
  
  // EVM specific
  evmAddress: `0x${string}` | undefined;
  evmChainId: number | undefined;
  isEvmConnected: boolean;
  
  // Solana specific  
  solanaAddress: string | undefined;
  isSolanaConnected: boolean;
  
  // Actions
  connect: (chainType?: 'evm' | 'solana') => void;
  disconnectEvm: () => void;
  disconnectSolana: () => void;
  switchNetwork: (chain: Chain) => Promise<void>;
  
  // Helpers
  getAddressForChain: (chain: Chain | null) => string | undefined;
  isCorrectNetwork: (chain: Chain | null) => boolean;
}

export function useWallet(): UseWalletReturn {
  // Reown AppKit hooks
  const { open } = useAppKit();
  
  // ✅ 显式按 namespace 分别获取账户状态
  const evmAppKitAccount = useAppKitAccount({ namespace: 'eip155' });
  const solanaAppKitAccount = useAppKitAccount({ namespace: 'solana' });
  
  // Wagmi EVM hooks
  const { address: evmAddress, isConnected: isEvmConnected, chain: evmChain } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect: evmDisconnect } = useEvmDisconnect();
  const { switchChainAsync } = useSwitchChain();

  // Solana 状态
  const solanaAddress = solanaAppKitAccount.address;
  const isSolanaConnected = solanaAppKitAccount.isConnected;

  // 综合连接状态
  const isConnected = isEvmConnected || isSolanaConnected;
  
  // 优先返回 EVM 地址，否则返回 Solana 地址
  const address = evmAddress || solanaAddress;

  // 根据当前活跃钱包确定类型
  const walletType = useMemo<WalletType>(() => {
    if (isEvmConnected) return 'evm';
    if (isSolanaConnected) return 'solana';
    return null;
  }, [isEvmConnected, isSolanaConnected]);

  // 连接钱包
  const connect = useCallback((chainType?: 'evm' | 'solana') => {
    if (chainType === 'solana') {
      // ✅ Solana: 打开 AppKit 弹窗，显式指定 namespace
      console.log('[Wallet] Opening Solana connect...');
      open({ view: 'Connect', namespace: 'solana' });
      return;
    }
    // EVM：交给 wagmi connectors
    void (async () => {
      try {
        // ✅ 从已实例化的 connectors 数组中获取
        const injectedConnector = connectors.find(c => c.id === 'injected') ?? connectors[0];
        if (injectedConnector) {
          console.log('[Wallet] Connecting EVM with:', injectedConnector.id);
          await connectAsync({ connector: injectedConnector });
          console.log('[Wallet] ✅ EVM connected');
          return;
        }
        console.warn('[Wallet] No injected connector found');
      } catch (error) {
        console.error('[Wallet] ❌ EVM connect failed:', error);
      }
    })();
  }, [open, connectAsync, connectors]);

  // 断开 EVM 钱包
  const disconnectEvm = useCallback(() => {
    if (isEvmConnected) {
      evmDisconnect();
    }
  }, [isEvmConnected, evmDisconnect]);

  // 断开 Solana 钱包 - AppKit 处理
  const disconnectSolana = useCallback(() => {
    // 尽量直接断开 Solana provider，不影响 EVM
    if (!isSolanaConnected) return;
    const provider = (window as any).solana;
    if (provider?.disconnect) {
      void provider.disconnect();
      return;
    }
    open({ view: 'Account' });
  }, [isSolanaConnected, open]);

  // 切换网络 - ⚠️ 只有在已连接时才能切换
  const switchNetwork = useCallback(async (chain: Chain) => {
    if (chain.type === 'evm' && chain.chainId) {
      // ✅ 必须先连接才能切换
      if (!isEvmConnected) {
        console.warn('[Wallet] Cannot switch chain: EVM not connected');
        return;
      }
      try {
        console.log('[Wallet] Switching to chain:', chain.chainId);
        await switchChainAsync({ chainId: chain.chainId });
        console.log('[Wallet] ✅ Switched to', chain.name);
      } catch (error) {
        console.error('[Wallet] ❌ Switch failed:', error);
        throw error;
      }
    }
    // Solana: AppKit 只配置了主网，不需要切换网络
  }, [switchChainAsync, isEvmConnected]);

  // 获取指定链类型的钱包地址
  const getAddressForChain = useCallback((chain: Chain | null): string | undefined => {
    if (!chain) return undefined;
    
    if (chain.type === 'evm') {
      return evmAddress;
    } else if (chain.type === 'solana') {
      return solanaAddress;
    }
    return undefined;
  }, [evmAddress, solanaAddress]);

  // 检查是否连接到正确的网络
  const isCorrectNetwork = useCallback((chain: Chain | null): boolean => {
    if (!chain || !isConnected) return false;
    
    if (chain.type === 'evm') {
      return evmChain?.id === chain.chainId;
    } else if (chain.type === 'solana') {
      return isSolanaConnected;
    }
    return false;
  }, [isConnected, evmChain, isSolanaConnected]);

  return {
    // Connection state
    isConnected,
    address,
    walletType,
    
    // EVM specific
    evmAddress,
    evmChainId: evmChain?.id,
    isEvmConnected,
    
    // Solana specific
    solanaAddress,
    isSolanaConnected,
    
    // Actions
    connect,
    disconnectEvm,
    disconnectSolana,
    switchNetwork,
    
    // Helpers
    getAddressForChain,
    isCorrectNetwork,
  };
}

/**
 * Format address for display
 */
export function formatAddress(address: string | undefined, length: number = 4): string {
  if (!address) return '';
  if (address.length <= length * 2 + 3) return address;
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}
