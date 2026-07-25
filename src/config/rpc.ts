import { Connection, type Commitment } from '@solana/web3.js';
import { createPublicClient, fallback, http, type Chain as ViemChain } from 'viem';

type EvmRpcConfig = {
  envKey: string;
  defaultUrl: string;
  fallbacks?: string[];
  alchemyNetwork?: string;
};

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const SOLANA_RPC_ENV_KEY = 'NEXT_PUBLIC_SOLANA_RPC_URL';
const DEFAULT_SOLANA_RPC = 'https://solana-rpc.publicnode.com';
const SOLANA_RPC_FALLBACKS = [
  DEFAULT_SOLANA_RPC,
  'https://api.mainnet-beta.solana.com',
];

export const EVM_RPC_CONFIG: Record<number, EvmRpcConfig> = {
  1: {
    envKey: 'NEXT_PUBLIC_ETHEREUM_RPC_URL',
    defaultUrl: 'https://ethereum-rpc.publicnode.com',
    fallbacks: ['https://cloudflare-eth.com'],
    alchemyNetwork: 'eth-mainnet',
  },
  10: {
    envKey: 'NEXT_PUBLIC_OPTIMISM_RPC_URL',
    defaultUrl: 'https://mainnet.optimism.io',
    fallbacks: ['https://optimism-rpc.publicnode.com'],
    alchemyNetwork: 'opt-mainnet',
  },
  25: {
    envKey: 'NEXT_PUBLIC_CRONOS_RPC_URL',
    defaultUrl: 'https://evm.cronos.org',
    fallbacks: ['https://cronos-evm-rpc.publicnode.com'],
  },
  50: {
    envKey: 'NEXT_PUBLIC_XDC_RPC_URL',
    defaultUrl: 'https://erpc.xdcrpc.com',
    fallbacks: ['https://rpc.xinfin.network'],
  },
  130: {
    envKey: 'NEXT_PUBLIC_UNICHAIN_RPC_URL',
    defaultUrl: 'https://mainnet.unichain.org',
  },
  137: {
    envKey: 'NEXT_PUBLIC_POLYGON_RPC_URL',
    defaultUrl: 'https://polygon-bor-rpc.publicnode.com',
    fallbacks: ['https://polygon-rpc.com'],
    alchemyNetwork: 'polygon-mainnet',
  },
  143: {
    envKey: 'NEXT_PUBLIC_MONAD_RPC_URL',
    defaultUrl: 'https://monad-mainnet.drpc.org',
  },
  146: {
    envKey: 'NEXT_PUBLIC_SONIC_RPC_URL',
    defaultUrl: 'https://rpc.soniclabs.com',
  },
  480: {
    envKey: 'NEXT_PUBLIC_WORLDCHAIN_RPC_URL',
    defaultUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
  },
  999: {
    envKey: 'NEXT_PUBLIC_HYPEREVM_RPC_URL',
    defaultUrl: 'https://rpc.hyperliquid.xyz/evm',
  },
  1329: {
    envKey: 'NEXT_PUBLIC_SEI_RPC_URL',
    defaultUrl: 'https://evm-rpc.sei-apis.com',
  },
  1672: {
    envKey: 'NEXT_PUBLIC_PHAROS_RPC_URL',
    defaultUrl: 'https://rpc.pharos.xyz',
  },
  1776: {
    envKey: 'NEXT_PUBLIC_INJECTIVE_RPC_URL',
    defaultUrl: 'https://sentry.evm-rpc.injective.network',
  },
  2818: {
    envKey: 'NEXT_PUBLIC_MORPH_RPC_URL',
    defaultUrl: 'https://rpc.morphl2.io',
  },
  3343: {
    envKey: 'NEXT_PUBLIC_EDGE_RPC_URL',
    defaultUrl: 'https://edge-mainnet.g.alchemy.com/public',
  },
  8453: {
    envKey: 'NEXT_PUBLIC_BASE_RPC_URL',
    defaultUrl: 'https://mainnet.base.org',
    fallbacks: ['https://base-rpc.publicnode.com'],
    alchemyNetwork: 'base-mainnet',
  },
  42161: {
    envKey: 'NEXT_PUBLIC_ARBITRUM_RPC_URL',
    defaultUrl: 'https://arb1.arbitrum.io/rpc',
    fallbacks: ['https://arbitrum-one-rpc.publicnode.com'],
    alchemyNetwork: 'arb-mainnet',
  },
  43114: {
    envKey: 'NEXT_PUBLIC_AVALANCHE_RPC_URL',
    defaultUrl: 'https://api.avax.network/ext/bc/C/rpc',
    fallbacks: ['https://avalanche-c-chain-rpc.publicnode.com'],
    alchemyNetwork: 'avax-mainnet',
  },
  57073: {
    envKey: 'NEXT_PUBLIC_INK_RPC_URL',
    defaultUrl: 'https://rpc-gel.inkonchain.com',
  },
  59144: {
    envKey: 'NEXT_PUBLIC_LINEA_RPC_URL',
    defaultUrl: 'https://rpc.linea.build',
    fallbacks: ['https://linea-rpc.publicnode.com'],
    alchemyNetwork: 'linea-mainnet',
  },
  81224: {
    envKey: 'NEXT_PUBLIC_CODEX_RPC_URL',
    defaultUrl: 'https://rpc.codex.xyz',
  },
  98866: {
    envKey: 'NEXT_PUBLIC_PLUME_RPC_URL',
    defaultUrl: 'https://rpc.plume.org',
  },
};

export const RPC_DEFAULTS = {
  ethereum: getDefaultEvmRpcUrl(1),
  cronos: getDefaultEvmRpcUrl(25),
  avalanche: getDefaultEvmRpcUrl(43114),
  optimism: getDefaultEvmRpcUrl(10),
  arbitrum: getDefaultEvmRpcUrl(42161),
  solana: getDefaultSolanaRpcUrl(),
  base: getDefaultEvmRpcUrl(8453),
  polygon: getDefaultEvmRpcUrl(137),
  unichain: getDefaultEvmRpcUrl(130),
  linea: getDefaultEvmRpcUrl(59144),
  codex: getDefaultEvmRpcUrl(81224),
  sonic: getDefaultEvmRpcUrl(146),
  worldchain: getDefaultEvmRpcUrl(480),
  monad: getDefaultEvmRpcUrl(143),
  sei: getDefaultEvmRpcUrl(1329),
  xdc: getDefaultEvmRpcUrl(50),
  hyperevm: getDefaultEvmRpcUrl(999),
  ink: getDefaultEvmRpcUrl(57073),
  plume: getDefaultEvmRpcUrl(98866),
  edge: getDefaultEvmRpcUrl(3343),
  injective: getDefaultEvmRpcUrl(1776),
  morph: getDefaultEvmRpcUrl(2818),
  pharos: getDefaultEvmRpcUrl(1672),
};

export function getEvmRpcUrls(chainId: number, primaryRpcUrl?: string): string[] {
  const config = EVM_RPC_CONFIG[chainId];
  if (!config) return primaryRpcUrl ? [primaryRpcUrl] : [];

  return unique([
    primaryRpcUrl,
    process.env[config.envKey],
    getAlchemyRpcUrl(config.alchemyNetwork),
    config.defaultUrl,
    ...(config.fallbacks ?? []),
  ].filter(isUsableRpcUrl));
}

export function getDefaultEvmRpcUrl(chainId: number): string {
  const config = EVM_RPC_CONFIG[chainId];
  if (!config) return '';
  return getEvmRpcUrls(chainId)[0] ?? config.defaultUrl;
}

export function createEvmPublicClient(chain: ViemChain, primaryRpcUrl?: string) {
  const rpcUrls = getEvmRpcUrls(chain.id, primaryRpcUrl);
  const transports = (rpcUrls.length ? rpcUrls : chain.rpcUrls.default.http).map((rpcUrl) =>
    http(rpcUrl, { retryCount: 0, timeout: 8000 })
  );

  return createPublicClient({
    chain,
    transport: transports.length > 1 ? fallback(transports) : transports[0],
  });
}

export function getDefaultSolanaRpcUrl(): string {
  return getSolanaRpcUrls()[0] ?? DEFAULT_SOLANA_RPC;
}

export function getSolanaRpcUrls(primaryRpcUrl?: string): string[] {
  return unique([
    primaryRpcUrl,
    process.env[SOLANA_RPC_ENV_KEY],
    ...SOLANA_RPC_FALLBACKS,
  ].filter(isUsableRpcUrl));
}

export function createSolanaConnection(
  commitment: Commitment = 'confirmed',
  primaryRpcUrl?: string
): Connection {
  return new Connection(getSolanaRpcUrls(primaryRpcUrl)[0], commitment);
}

export async function withSolanaRpcFallback<T>(
  operation: (connection: Connection, rpcUrl: string) => Promise<T>,
  options: { commitment?: Commitment; primaryRpcUrl?: string } = {}
): Promise<T> {
  const rpcUrls = getSolanaRpcUrls(options.primaryRpcUrl);
  let lastError: unknown;

  for (const rpcUrl of rpcUrls) {
    try {
      return await operation(new Connection(rpcUrl, options.commitment ?? 'confirmed'), rpcUrl);
    } catch (err) {
      if (!isRecoverableRpcError(err)) {
        throw err;
      }

      lastError = err;
      console.warn(`[Solana RPC] ${rpcUrl} failed, trying fallback`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Solana RPC endpoints failed');
}

function getAlchemyRpcUrl(network: string | undefined): string | undefined {
  if (!network || !ALCHEMY_API_KEY) return undefined;
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

function isUsableRpcUrl(url: string | undefined): url is string {
  return Boolean(url && !url.includes('YOUR_API_KEY_HERE'));
}

function isRecoverableRpcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes('403') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('access forbidden') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout')
  );
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
