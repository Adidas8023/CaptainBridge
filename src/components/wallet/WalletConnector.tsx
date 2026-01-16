'use client';

import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Button } from '@/components/ui/button';

/**
 * 钱包连接器组件
 * 分开显示 EVM 和 Solana 钱包连接按钮
 * 点击后弹出 AppKit 原生弹窗，并显示对应网络
 */
export function WalletConnector() {
  const { open } = useAppKit();
  
  // EVM 钱包状态
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  
  // Solana 钱包状态
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  const solanaAddress = solanaAccount.address;
  const isSolanaConnected = solanaAccount.isConnected;

  // EVM 按钮点击 - 指定 eip155 namespace
  const handleEvmClick = useCallback(() => {
    if (isEvmConnected) {
      // 已连接：打开 EVM 账户视图
      open({ view: 'Account', namespace: 'eip155' });
    } else {
      // 未连接：打开 EVM 连接视图
      open({ view: 'Connect', namespace: 'eip155' });
    }
  }, [open, isEvmConnected]);

  // Solana 按钮点击 - 指定 solana namespace
  const handleSolanaClick = useCallback(() => {
    if (isSolanaConnected) {
      // 已连接：打开 Solana 账户视图
      open({ view: 'Account', namespace: 'solana' });
    } else {
      // 未连接：打开 Solana 连接视图
      open({ view: 'Connect', namespace: 'solana' });
    }
  }, [open, isSolanaConnected]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* EVM 钱包按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleEvmClick}
        className={`h-8 sm:h-9 px-2 sm:px-3 gap-1.5 sm:gap-2 ${
          isEvmConnected 
            ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
            : 'border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400'
        }`}
        title={isEvmConnected && evmAddress ? evmAddress : 'Connect EVM Wallet'}
      >
        <img src="/logos/ethereum-eth-logo.png" alt="EVM" className="w-4 h-4 rounded-full" />
        {/* 移动端：已连接显示缩短地址，未连接只显示图标 */}
        {isEvmConnected && evmAddress ? (
          <span className="text-xs font-mono hidden xs:inline sm:inline">
            {formatAddress(evmAddress)}
          </span>
        ) : (
          <span className="text-xs hidden sm:inline">EVM</span>
        )}
        {/* 移动端未连接时显示小圆点指示状态 */}
        {!isEvmConnected && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 sm:hidden" />
        )}
      </Button>

      {/* Solana 钱包按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSolanaClick}
        className={`h-8 sm:h-9 px-2 sm:px-3 gap-1.5 sm:gap-2 ${
          isSolanaConnected 
            ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20' 
            : 'border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400'
        }`}
        title={isSolanaConnected && solanaAddress ? solanaAddress : 'Connect Solana Wallet'}
      >
        <img src="/logos/solana.png" alt="Solana" className="w-4 h-4 rounded-full" />
        {/* 移动端：已连接显示缩短地址，未连接只显示图标 */}
        {isSolanaConnected && solanaAddress ? (
          <span className="text-xs font-mono hidden xs:inline sm:inline">
            {formatAddress(solanaAddress)}
          </span>
        ) : (
          <span className="text-xs hidden sm:inline">SOL</span>
        )}
        {/* 移动端未连接时显示小圆点指示状态 */}
        {!isSolanaConnected && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 sm:hidden" />
        )}
      </Button>
    </div>
  );
}
