import { Chain } from '@/types';

// ===========================================
// RPC URL 配置 - 优先使用环境变量，否则使用公共节点
// ===========================================
const getRpcUrl = (envKey: string, defaultUrl: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[envKey] || defaultUrl;
  }
  return defaultUrl;
};

// 默认公共 RPC URLs
const DEFAULT_RPC = {
  ethereum: 'https://eth.llamarpc.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  optimism: 'https://mainnet.optimism.io',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  solana: 'https://api.mainnet-beta.solana.com',
  base: 'https://mainnet.base.org',
  polygon: 'https://polygon-rpc.com',
  unichain: 'https://mainnet.unichain.org',
  linea: 'https://rpc.linea.build',
  codex: 'https://rpc.codex.xyz',
  sonic: 'https://rpc.soniclabs.com',
  worldchain: 'https://worldchain-mainnet.g.alchemy.com/public',
  monad: 'https://monad-mainnet.drpc.org',
  sei: 'https://evm-rpc.sei-apis.com',
  xdc: 'https://erpc.xinfin.network',
  hyperevm: 'https://rpc.hyperliquid.xyz/evm',
  ink: 'https://rpc-gel.inkonchain.com',
  plume: 'https://rpc.plume.org',
};

// CCTP V2 Supported Chains
export const CHAINS: Chain[] = [
  // =========================
  // CCTP V2 主网合约（EVM）
  // Circle 官方文档：TokenMessengerV2 / MessageTransmitterV2 在多条 EVM 链上地址相同
  // - TokenMessengerV2(Mainnet): 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d
  // - MessageTransmitterV2(Mainnet): 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64
  //
  // 你之前遇到的“合约模拟执行失败”，核心原因就是：
  // 这里填的是 V1 的 TokenMessenger/MessageTransmitter 地址，但你发的是 V2 的 depositForBurn calldata。
  // =========================
  {
    id: 'ethereum',
    name: 'Ethereum',
    domainId: 0,
    type: 'evm',
    chainId: 1,
    icon: '/logos/ethereum-eth-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_ETHEREUM_RPC_URL', DEFAULT_RPC.ethereum),
    explorerUrl: 'https://etherscan.io',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1, // 0.01%
    color: '#627EEA',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    domainId: 1,
    type: 'evm',
    chainId: 43114,
    icon: '/logos/avalanche-avax-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_AVALANCHE_RPC_URL', DEFAULT_RPC.avalanche),
    explorerUrl: 'https://snowtrace.io',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#E84142',
  },
  {
    id: 'optimism',
    name: 'OP Mainnet',
    domainId: 2,
    type: 'evm',
    chainId: 10,
    icon: '/logos/optimism-ethereum-op-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_OPTIMISM_RPC_URL', DEFAULT_RPC.optimism),
    explorerUrl: 'https://optimistic.etherscan.io',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    // ✅ V2（OP -> Base 走 depositForBurn V2 必须用这套合约地址）
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#FF0420',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    domainId: 3,
    type: 'evm',
    chainId: 42161,
    icon: '/logos/arbitrum-arb-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_ARBITRUM_RPC_URL', DEFAULT_RPC.arbitrum),
    explorerUrl: 'https://arbiscan.io',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#28A0F0',
  },
  {
    id: 'solana',
    name: 'Solana',
    domainId: 5,
    type: 'solana',
    icon: '/logos/solana.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_SOLANA_RPC_URL', DEFAULT_RPC.solana),
    explorerUrl: 'https://solscan.io',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenMessengerAddress: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
    messageTransmitterAddress: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
    fastTransferFee: 1,
    color: '#9945FF',
  },
  {
    id: 'base',
    name: 'Base',
    domainId: 6,
    type: 'evm',
    chainId: 8453,
    icon: '/logos/base.webp',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_BASE_RPC_URL', DEFAULT_RPC.base),
    explorerUrl: 'https://basescan.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#0052FF',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    domainId: 7,
    type: 'evm',
    chainId: 137,
    icon: '/logos/polygon-matic-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_POLYGON_RPC_URL', DEFAULT_RPC.polygon),
    explorerUrl: 'https://polygonscan.com',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#8247E5',
  },
  {
    id: 'unichain',
    name: 'Unichain',
    domainId: 10,
    type: 'evm',
    chainId: 130,
    icon: '/logos/uniswap-uni-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_UNICHAIN_RPC_URL', DEFAULT_RPC.unichain),
    explorerUrl: 'https://uniscan.xyz',
    usdcAddress: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#FF007A',
  },
  {
    id: 'linea',
    name: 'Linea Mainnet',
    domainId: 11,
    type: 'evm',
    chainId: 59144,
    icon: '/logos/linea.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_LINEA_RPC_URL', DEFAULT_RPC.linea),
    explorerUrl: 'https://lineascan.build',
    usdcAddress: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    // ✅ V2（Circle 文档已列出主网 V2 地址）
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 14, // 0.14%
    color: '#121212',
  },
  {
    id: 'codex',
    name: 'Codex',
    domainId: 12,
    type: 'evm',
    chainId: 81224,
    icon: '/logos/codex-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_CODEX_RPC_URL', DEFAULT_RPC.codex),
    explorerUrl: 'https://explorer.codex.xyz',
    usdcAddress: '0xd996633a415985DBd7D6D12f4A4343E31f5037cf', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#00D4AA',
  },
  {
    id: 'sonic',
    name: 'Sonic',
    domainId: 13,
    type: 'evm',
    chainId: 146,
    icon: '/logos/Sonic.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_SONIC_RPC_URL', DEFAULT_RPC.sonic),
    explorerUrl: 'https://sonicscan.org',
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#1DB954',
  },
  {
    id: 'worldchain',
    name: 'World Chain',
    domainId: 14,
    type: 'evm',
    chainId: 480,
    icon: '/logos/worldcoin-org-wld-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_WORLDCHAIN_RPC_URL', DEFAULT_RPC.worldchain),
    explorerUrl: 'https://worldscan.org',
    usdcAddress: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1',
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#00D4AA',
  },
  {
    id: 'monad',
    name: 'Monad',
    domainId: 15,
    type: 'evm',
    chainId: 143,
    icon: '/logos/monad.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_MONAD_RPC_URL', DEFAULT_RPC.monad),
    explorerUrl: 'https://monadexplorer.com',
    usdcAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1, // 不支持 Fast Transfer，只支持 Standard
    color: '#836EF9',
  },
  {
    id: 'sei',
    name: 'Sei Network',
    domainId: 16,
    type: 'evm',
    chainId: 1329,
    icon: '/logos/sei-sei-logo.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_SEI_RPC_URL', DEFAULT_RPC.sei),
    explorerUrl: 'https://seitrace.com',
    usdcAddress: '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#9B1C1C',
  },
  {
    id: 'xdc',
    name: 'XDC Network',
    domainId: 18,
    type: 'evm',
    chainId: 50,
    icon: '/logos/xdc.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_XDC_RPC_URL', DEFAULT_RPC.xdc),
    explorerUrl: 'https://xdcscan.io',
    usdcAddress: '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#2B2F3B',
  },
  {
    id: 'hyperevm',
    name: 'HyperEVM',
    domainId: 19,
    type: 'evm',
    chainId: 999,
    icon: '/logos/hyperliquid.svg',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_HYPEREVM_RPC_URL', DEFAULT_RPC.hyperevm),
    explorerUrl: 'https://explorer.hyperliquid.xyz',
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 1,
    color: '#50E3C2',
  },
  {
    id: 'ink',
    name: 'Ink',
    domainId: 21,
    type: 'evm',
    chainId: 57073,
    icon: '/logos/ink.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_INK_RPC_URL', DEFAULT_RPC.ink),
    explorerUrl: 'https://explorer.inkonchain.com',
    usdcAddress: '0x2D270e6886d130D724215A266106e6832161EAEd', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 2, // 0.02%
    color: '#FF6B00',
  },
  {
    id: 'plume',
    name: 'Plume',
    domainId: 22,
    type: 'evm',
    chainId: 98866,
    icon: '/logos/plume.png',
    rpcUrl: getRpcUrl('NEXT_PUBLIC_PLUME_RPC_URL', DEFAULT_RPC.plume),
    explorerUrl: 'https://explorer.plume.org',
    usdcAddress: '0x222365EF19F7947e5484218551B56bb3965Aa7aF', // ✅ Circle 官方 USDC
    // ✅ V2
    tokenMessengerAddress: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitterAddress: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    fastTransferFee: 2, // 0.02%
    color: '#8B5CF6',
  },
];

// Helper functions
export const getChainById = (id: string): Chain | undefined => 
  CHAINS.find(chain => chain.id === id);

export const getChainByDomainId = (domainId: number): Chain | undefined =>
  CHAINS.find(chain => chain.domainId === domainId);

export const getEvmChains = (): Chain[] =>
  CHAINS.filter(chain => chain.type === 'evm');

export const getSolanaChain = (): Chain | undefined =>
  CHAINS.find(chain => chain.type === 'solana');


// Circle Iris API
export const IRIS_API_URL = 'https://iris-api.circle.com';
export const IRIS_API_URL_TESTNET = 'https://iris-api-sandbox.circle.com';

// Finality thresholds
export const FINALITY_THRESHOLD = {
  FAST: 1000,      // < 1000 for fast transfer
  STANDARD: 2000,  // >= 1000 for standard transfer
};

// USDC Decimals
export const USDC_DECIMALS = 6;

