'use client';

import { useEffect, useRef } from 'react';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isValidEvmAddress, isValidSolanaAddress } from '@/lib/cctp/address-utils';
import type { ChainType } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface AddressInputProps {
  address: string;
  onChange: (address: string) => void;
  chainType: ChainType;
  connectedAddress?: string;
  disabled?: boolean;
}

export function AddressInput({
  address,
  onChange,
  chainType,
  connectedAddress,
  disabled = false,
}: AddressInputProps) {
  const { t } = useTranslation();
  const prevChainType = useRef(chainType);

  // 当目标链类型改变时，检查地址格式是否匹配
  useEffect(() => {
    if (prevChainType.current !== chainType) {
      // 链类型改变了
      prevChainType.current = chainType;
      
      // 如果有已连接的对应钱包地址，自动填充
      if (connectedAddress) {
        onChange(connectedAddress);
      } else if (address) {
        // 检查当前地址是否与新链类型兼容
        const isCurrentAddressValid = isAddressValidForChain(address, chainType);
        if (!isCurrentAddressValid) {
          // 地址格式不兼容，清空
          onChange('');
        }
      }
    }
  }, [chainType, connectedAddress, address, onChange]);

  // 初始加载时自动填充
  useEffect(() => {
    if (connectedAddress && !address) {
      onChange(connectedAddress);
    }
  }, [connectedAddress]);

  const isValid = address ? isAddressValidForChain(address, chainType) : false;

  const placeholder = (() => {
    switch (chainType) {
      case 'evm':
        return '0x...';
      case 'solana':
        return 'Solana address (e.g., 8RnP...)';
      default:
        return 'Enter address...';
    }
  })();

  const handleUseMyAddress = () => {
    if (connectedAddress) {
      onChange(connectedAddress);
    }
  };

  // 检查是否显示"Use My Address"按钮
  const showUseMyAddress = connectedAddress && address !== connectedAddress;

  // 地址格式错误提示
  const getErrorMessage = () => {
    if (!address) return null;
    if (isValid) return null;

    switch (chainType) {
      case 'evm':
        return t.addressInput.invalidEvmAddress;
      case 'solana':
        return t.addressInput.invalidSolanaAddress;
      default:
        return t.addressInput.invalidAddress;
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">{t.addressInput.sendTo}</label>
        {showUseMyAddress && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUseMyAddress}
            className="h-auto py-0.5 px-2 text-xs text-primary hover:text-primary/80"
          >
            {t.addressInput.useMyAddress.replace('{chain}', chainType === 'solana' ? 'Solana' : chainType === 'evm' ? 'EVM' : '')}
          </Button>
        )}
      </div>
      
      <div className="relative flex items-center bg-background/50 border border-border rounded-xl transition-colors hover:border-border/80">
        <Input
          type="text"
          placeholder={placeholder}
          value={address}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="border-0 bg-transparent pr-12 h-14 text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {address && (
          <div className="absolute right-4">
            {isValid ? (
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <IconCheck className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
                <IconAlertCircle className="w-4 h-4 text-warning" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-xs text-warning flex items-center gap-1">
          <IconAlertCircle className="w-3 h-3" />
          {errorMessage}
        </p>
      )}

      {/* Chain Type Hint */}
      {!address && !connectedAddress && (
        <p className="text-xs text-muted-foreground">
          {chainType === 'solana' 
            ? t.addressInput.enterSolanaAddress
            : chainType === 'evm'
            ? t.addressInput.enterEvmAddress
            : t.addressInput.enterAddress}
        </p>
      )}
    </div>
  );
}

/**
 * Check if address is valid for the given chain type
 */
function isAddressValidForChain(address: string, chainType: ChainType): boolean {
  switch (chainType) {
    case 'evm':
      return isValidEvmAddress(address);
    case 'solana':
      return isValidSolanaAddress(address);
    default:
      return false;
  }
}
