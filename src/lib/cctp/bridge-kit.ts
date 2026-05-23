import { type Chain as ViemChain, type EIP1193Provider } from 'viem';
import type { Chain } from '@/types';
import { createSolanaConnection } from '@/config/wallet';
import { createEvmPublicClient } from '@/config/rpc';

export type BridgeAdapter = unknown;
export type SolanaBridgeProvider = {
  isConnected?: boolean;
  connect?: () => Promise<unknown>;
  signTransaction?: unknown;
  signAllTransactions?: unknown;
  signMessage?: unknown;
  sendTransaction?: unknown;
  signAndSendTransaction?: unknown;
};

type BridgeKitChain =
  | 'Ethereum'
  | 'Avalanche'
  | 'Optimism'
  | 'Arbitrum'
  | 'Solana'
  | 'Base'
  | 'Polygon'
  | 'Unichain'
  | 'Linea'
  | 'Codex'
  | 'Sonic'
  | 'World_Chain'
  | 'Monad'
  | 'Sei'
  | 'XDC'
  | 'HyperEVM'
  | 'Ink'
  | 'Plume'
  | 'Edge'
  | 'Injective'
  | 'Morph'
  | 'Pharos';

type TransferSpeed = 'FAST' | 'SLOW';

type BridgeStepLike = {
  name?: unknown;
  state?: unknown;
  txHash?: unknown;
  explorerUrl?: unknown;
  errorMessage?: unknown;
};

type BridgeResultLike = {
  state?: unknown;
  steps?: unknown;
};

type BridgeEventLike = {
  method?: unknown;
  name?: unknown;
  values?: unknown;
  data?: unknown;
};

const BRIDGE_CHAIN_BY_DOMAIN: Record<number, BridgeKitChain> = {
  0: 'Ethereum',
  1: 'Avalanche',
  2: 'Optimism',
  3: 'Arbitrum',
  5: 'Solana',
  6: 'Base',
  7: 'Polygon',
  10: 'Unichain',
  11: 'Linea',
  12: 'Codex',
  13: 'Sonic',
  14: 'World_Chain',
  15: 'Monad',
  16: 'Sei',
  18: 'XDC',
  19: 'HyperEVM',
  21: 'Ink',
  22: 'Plume',
  28: 'Edge',
  29: 'Injective',
  30: 'Morph',
  31: 'Pharos',
};

// Circle CCTP v2 fast-transfer source support. Starknet intentionally omitted.
const FAST_TRANSFER_SOURCE_DOMAINS = new Set([0, 2, 3, 5, 6, 10, 11, 12, 14, 21, 22, 28, 30]);

const EVM_TX_HASH_RE = /0x[a-fA-F0-9]{64}/;
const SOLANA_SIGNATURE_RE = /[1-9A-HJ-NP-Za-km-z]{64,100}/;

export async function createBridgeKit() {
  const { BridgeKit } = await import('@circle-fin/bridge-kit');
  return new BridgeKit();
}

export function toBridgeKitChain(chain: Chain): BridgeKitChain {
  const bridgeChain = BRIDGE_CHAIN_BY_DOMAIN[chain.domainId];
  if (!bridgeChain) {
    throw new Error(`${chain.name} is not supported by Circle Bridge Kit`);
  }
  return bridgeChain;
}

export function supportsFastTransfer(chain: Chain | null | undefined): boolean {
  if (!chain) return false;
  return chain.supportsFastTransfer ?? FAST_TRANSFER_SOURCE_DOMAINS.has(chain.domainId);
}

export function getTransferSpeed(chain: Chain, isFastTransfer: boolean): TransferSpeed {
  return isFastTransfer && supportsFastTransfer(chain) ? 'FAST' : 'SLOW';
}

export async function createEvmBridgeAdapter(provider: EIP1193Provider): Promise<BridgeAdapter> {
  const { createViemAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2');

  return createViemAdapterFromProvider({
    provider,
    getPublicClient: ({ chain }: { chain: ViemChain }) => createEvmPublicClient(chain),
  });
}

export async function createSolanaBridgeAdapter(provider: SolanaBridgeProvider): Promise<BridgeAdapter> {
  const { createSolanaAdapterFromProvider } = await import('@circle-fin/adapter-solana');

  return createSolanaAdapterFromProvider({
    provider: provider as Parameters<typeof createSolanaAdapterFromProvider>[0]['provider'],
    connection: createSolanaConnection('confirmed'),
  });
}

export function extractBridgeHashes(input: unknown): {
  sourceTxHash?: string;
  destTxHash?: string;
} {
  const steps = getBridgeSteps(input);
  const hashes = unique(steps.map(extractStepHash).filter(isString));
  const sourceTxHash =
    findHashByStepName(steps, /burn|deposit|bridge|transfer|send/i, /approve|mint|claim|receive|forward|relay/i) ??
    hashes.find((hash) => hash);
  const destTxHash =
    findHashByStepName([...steps].reverse(), /mint|claim|receive|forward|relay/i) ??
    hashes.findLast((hash) => hash !== sourceTxHash);

  return { sourceTxHash, destTxHash };
}

export function getBridgeFailureMessage(input: unknown): string | null {
  const result = getBridgeResult(input);
  const failedStep = getBridgeSteps(result).find((step) => step.state === 'error');
  if (failedStep?.errorMessage && typeof failedStep.errorMessage === 'string') {
    return failedStep.errorMessage;
  }

  if (input instanceof Error) {
    return input.message;
  }

  return null;
}

export function inferBridgeStep(input: unknown):
  | 'approving'
  | 'burning'
  | 'waiting-attestation'
  | 'claiming'
  | 'completed'
  | null {
  const label = getBridgeEventLabel(input);

  if (/complete|success|done/i.test(label)) return 'completed';
  if (/attest|message|iris|poll/i.test(label)) return 'waiting-attestation';
  if (/mint|claim|receive|forward|relay/i.test(label)) return 'claiming';
  if (/approve|allowance|permit/i.test(label)) return 'approving';
  if (/burn|deposit|bridge|transfer|send/i.test(label)) return 'burning';

  return null;
}

export function extractBridgeEventHash(input: unknown): string | null {
  return extractHash(input);
}

export function isDestinationBridgeEvent(input: unknown): boolean {
  return /mint|claim|receive|forward|relay/i.test(getBridgeEventLabel(input));
}

function getBridgeResult(input: unknown): BridgeResultLike | null {
  if (!input || typeof input !== 'object') return null;

  const direct = input as BridgeResultLike;
  if (Array.isArray(direct.steps)) return direct;

  const record = input as Record<string, unknown>;
  for (const key of ['result', 'bridgeResult', 'data', 'cause']) {
    const nested = getBridgeResult(record[key]);
    if (nested) return nested;
  }

  return null;
}

function getBridgeSteps(input: unknown): BridgeStepLike[] {
  const result = getBridgeResult(input);
  if (!result || !Array.isArray(result.steps)) return [];

  return result.steps.filter((step): step is BridgeStepLike => Boolean(step && typeof step === 'object'));
}

function findHashByStepName(
  steps: BridgeStepLike[],
  include: RegExp,
  exclude?: RegExp
): string | undefined {
  for (const step of steps) {
    const name = typeof step.name === 'string' ? step.name : '';
    if (!include.test(name)) continue;
    if (exclude?.test(name)) continue;

    const hash = extractStepHash(step);
    if (hash) return hash;
  }

  return undefined;
}

function extractStepHash(step: BridgeStepLike): string | null {
  if (typeof step.txHash === 'string') return step.txHash;
  if (typeof step.explorerUrl === 'string') return extractHash(step.explorerUrl);
  return extractHash(step);
}

function getBridgeEventLabel(input: unknown): string {
  if (!input || typeof input !== 'object') return '';

  const payload = input as BridgeEventLike;
  const values = payload.values && typeof payload.values === 'object' ? (payload.values as Record<string, unknown>) : null;
  const labels = [
    payload.method,
    payload.name,
    values?.method,
    values?.name,
    values?.step,
    values?.state,
  ];

  return labels.filter((value): value is string => typeof value === 'string').join(' ');
}

function extractHash(input: unknown): string | null {
  if (typeof input === 'string') {
    return input.match(EVM_TX_HASH_RE)?.[0] ?? input.match(SOLANA_SIGNATURE_RE)?.[0] ?? null;
  }

  if (!input || typeof input !== 'object') return null;

  const record = input as Record<string, unknown>;
  for (const key of ['txHash', 'transactionHash', 'hash', 'signature', 'explorerUrl']) {
    const hash = extractHash(record[key]);
    if (hash) return hash;
  }

  for (const key of ['values', 'data', 'result']) {
    const hash = extractHash(record[key]);
    if (hash) return hash;
  }

  return null;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
