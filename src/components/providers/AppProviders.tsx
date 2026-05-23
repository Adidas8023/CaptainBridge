'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { 
  mainnet, 
  arbitrum, 
  optimism, 
  base, 
  polygon,
  avalanche,
  linea,
  solana,
} from '@reown/appkit/networks';
import { defineChain } from '@reown/appkit/networks';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { solanaConfig } from '@/config/wallet';
import { getEvmRpcUrls } from '@/config/rpc';
import { I18nProvider } from '@/lib/i18n';
import { useIsClient } from '@/lib/hooks/useIsClient';
import { logger } from '@/lib/logger';

// 保存原始 fetch 函数，防止浏览器扩展（如 Ambire）拦截导致 resource.clone 错误
const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : undefined;

// 修复浏览器扩展拦截 fetch 导致的兼容性问题
if (typeof window !== 'undefined' && originalFetch) {
  const patchedFetch: typeof fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    // 如果响应对象被扩展修改且缺少 clone 方法，则重新包装
    if (response && typeof response.clone !== 'function') {
      const blob = await response.blob();
      return new Response(blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return response;
  };
  window.fetch = patchedFetch;
}

// Project ID from Reown Cloud - 从环境变量读取
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// Query client for React Query (单例，模块级)
const queryClient = new QueryClient();

function withRpcUrls<T extends { id: number; rpcUrls?: unknown }>(network: T): T {
  return {
    ...network,
    rpcUrls: {
      default: { http: getEvmRpcUrls(network.id) },
    },
  };
}

const ethereum = withRpcUrls(mainnet);
const arbitrumOne = withRpcUrls(arbitrum);
const opMainnet = withRpcUrls(optimism);
const baseMainnet = withRpcUrls(base);
const polygonPos = withRpcUrls(polygon);
const avalancheCChain = withRpcUrls(avalanche);
const lineaMainnet = withRpcUrls(linea);

// 自定义网络配置 - AppKit 预设中没有的网络
const unichain = defineChain({
  id: 130,
  caipNetworkId: 'eip155:130',
  chainNamespace: 'eip155',
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(130) },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://uniscan.xyz' },
  },
});

const sonic = defineChain({
  id: 146,
  caipNetworkId: 'eip155:146',
  chainNamespace: 'eip155',
  name: 'Sonic',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(146) },
  },
  blockExplorers: {
    default: { name: 'Sonicscan', url: 'https://sonicscan.org' },
  },
});

const worldchain = defineChain({
  id: 480,
  caipNetworkId: 'eip155:480',
  chainNamespace: 'eip155',
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(480) },
  },
  blockExplorers: {
    default: { name: 'Worldscan', url: 'https://worldscan.org' },
  },
});

const sei = defineChain({
  id: 1329,
  caipNetworkId: 'eip155:1329',
  chainNamespace: 'eip155',
  name: 'Sei Network',
  nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(1329) },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
});

const ink = defineChain({
  id: 57073,
  caipNetworkId: 'eip155:57073',
  chainNamespace: 'eip155',
  name: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(57073) },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' },
  },
});

const monad = defineChain({
  id: 143,
  caipNetworkId: 'eip155:143',
  chainNamespace: 'eip155',
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(143) },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monadexplorer.com' },
  },
});

const xdc = defineChain({
  id: 50,
  caipNetworkId: 'eip155:50',
  chainNamespace: 'eip155',
  name: 'XDC Network',
  nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(50) },
  },
  blockExplorers: {
    default: { name: 'XDCScan', url: 'https://xdcscan.io' },
  },
});

const hyperevm = defineChain({
  id: 999,
  caipNetworkId: 'eip155:999',
  chainNamespace: 'eip155',
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(999) },
  },
  blockExplorers: {
    default: { name: 'HyperEVM Explorer', url: 'https://explorer.hyperliquid.xyz' },
  },
});

const plume = defineChain({
  id: 98866,
  caipNetworkId: 'eip155:98866',
  chainNamespace: 'eip155',
  name: 'Plume',
  nativeCurrency: { name: 'Plume', symbol: 'PLUME', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(98866) },
  },
  blockExplorers: {
    default: { name: 'Plume Explorer', url: 'https://explorer.plume.org' },
  },
});

const edge = defineChain({
  id: 3343,
  caipNetworkId: 'eip155:3343',
  chainNamespace: 'eip155',
  name: 'Edge',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(3343) },
  },
  blockExplorers: {
    default: { name: 'Edge Explorer', url: 'https://pro.edgex.exchange/en-US/explorer' },
  },
});

const injective = defineChain({
  id: 1776,
  caipNetworkId: 'eip155:1776',
  chainNamespace: 'eip155',
  name: 'Injective',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(1776) },
  },
  blockExplorers: {
    default: { name: 'InjScan', url: 'https://injscan.com' },
  },
});

const morph = defineChain({
  id: 2818,
  caipNetworkId: 'eip155:2818',
  chainNamespace: 'eip155',
  name: 'Morph',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(2818) },
  },
  blockExplorers: {
    default: { name: 'Morph Explorer', url: 'https://explorer.morph.network' },
  },
});

const pharos = defineChain({
  id: 1672,
  caipNetworkId: 'eip155:1672',
  chainNamespace: 'eip155',
  name: 'Pharos',
  nativeCurrency: { name: 'Pharos', symbol: 'PHAROS', decimals: 18 },
  rpcUrls: {
    default: { http: getEvmRpcUrls(1672) },
  },
  blockExplorers: {
    default: { name: 'Pharos Explorer', url: 'https://pharos.socialscan.io' },
  },
});

// 所有 EVM 网络
const evmNetworks = [
  ethereum,
  arbitrumOne,
  opMainnet,
  baseMainnet,
  polygonPos,
  avalancheCChain,
  lineaMainnet,
  unichain,
  sonic,
  worldchain,
  monad,
  sei,
  ink,
  xdc,
  hyperevm,
  plume,
  edge,
  injective,
  morph,
  pharos,
];

// Wagmi Adapter - EVM链配置
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: evmNetworks,
});

// Solana adapter - 模块级单例
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

// Solana mainnet 配置（使用自定义RPC）
const solanaMainnet = {
  ...solana,
  rpcUrl: solanaConfig.mainnet.rpcUrl,
};

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const mounted = useIsClient();
  const appKitInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (appKitInitialized.current) return;
    
    appKitInitialized.current = true;

    try {
      createAppKit({
        adapters: [wagmiAdapter, solanaWeb3JsAdapter],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        networks: [...evmNetworks, solanaMainnet] as any,
        projectId,
        metadata: {
          name: "Captain's Bridge",
          description: 'Cross-Chain USDC Bridge powered by Circle CCTP V2 - Zero extra fees',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          icons: ['/logos/abel-avatar.jpg'],
        },
        features: {
          analytics: false,
        },
        themeMode: 'light',
      });

      logger.info('[AppKit] Initialized (EVM + Solana)');
    } catch (error) {
      logger.warn('[AppKit] Init failed:', error);
    }

  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <I18nProvider>
            {mounted ? children : null}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
