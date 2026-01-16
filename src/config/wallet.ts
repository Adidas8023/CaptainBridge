// Reown Project ID - 从环境变量读取
// 从 https://cloud.reown.com 获取
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// 检查必要的环境变量
if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID && typeof window !== 'undefined') {
  console.warn('[Config] NEXT_PUBLIC_REOWN_PROJECT_ID 未设置，钱包连接可能无法正常工作');
}

// Solana configuration - 从环境变量读取 RPC URL
const DEFAULT_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export const solanaConfig = {
  mainnet: {
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_SOLANA_RPC,
    // Solana mainnet CAIP NetworkId (genesis hash)
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};
