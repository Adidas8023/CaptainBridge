// Constants and chain configuration
export * from './constants';

// Address utilities
// NOTE: address-utils.ts 里也导出了 SOLANA_USDC_MINT，会与 solana.ts 的同名导出冲突（Next/TS 会报重复导出）
// 这里改为显式导出，避免二义性；SOLANA_USDC_MINT 统一从 ./solana 导出。
export {
  getSolanaUsdcAta,
  solanaWalletToAtaBytes32,
  evmAddressToBytes32,
  bytes32ToEvmAddress,
  solanaAddressToBytes32,
  bytes32ToSolanaAddress,
  isValidEvmAddress,
  isValidSolanaAddress,
  formatAddress,
  convertAddressForChain,
} from './address-utils';

// Circle Iris API
export * from './iris-api';

// EVM chain operations
export * from './evm';

// Solana chain operations  
export * from './solana';

