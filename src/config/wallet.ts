import { getDefaultSolanaRpcUrl } from './rpc';
export { createSolanaConnection, getSolanaRpcUrls, withSolanaRpcFallback } from './rpc';

// Reown Project ID - 从环境变量读取
// 从 https://cloud.reown.com 获取
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// 检查必要的环境变量
if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID && typeof window !== 'undefined') {
  console.warn('[Config] NEXT_PUBLIC_REOWN_PROJECT_ID 未设置，钱包连接可能无法正常工作');
}

export const solanaConfig = {
  mainnet: {
    rpcUrl: getDefaultSolanaRpcUrl(),
    // Solana mainnet CAIP NetworkId (genesis hash)
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};
