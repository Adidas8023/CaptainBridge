import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Solana USDC Mint address (mainnet)
export const SOLANA_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Get the USDC Associated Token Account (ATA) address for a Solana wallet
 * This is required for CCTP transfers TO Solana - mintRecipient must be the ATA, not the wallet
 */
export async function getSolanaUsdcAta(walletAddress: string): Promise<string> {
  const walletPubkey = new PublicKey(walletAddress);
  const ata = await getAssociatedTokenAddress(SOLANA_USDC_MINT, walletPubkey);
  return ata.toBase58();
}

/**
 * Convert Solana wallet address to USDC ATA bytes32 (for CCTP mintRecipient)
 * IMPORTANT: CCTP requires the token account address, not the wallet address!
 */
export async function solanaWalletToAtaBytes32(walletAddress: string): Promise<string> {
  const ata = await getSolanaUsdcAta(walletAddress);
  const bytes32 = solanaAddressToBytes32(ata);
  return bytes32;
}

/**
 * Convert EVM address (20 bytes) to bytes32 format
 * Pads with 12 leading zero bytes
 */
export function evmAddressToBytes32(address: string): string {
  const cleanAddress = address.replace('0x', '').toLowerCase();
  return `0x000000000000000000000000${cleanAddress}`;
}

/**
 * Convert bytes32 to EVM address (20 bytes)
 * Removes leading zero padding
 */
export function bytes32ToEvmAddress(bytes32: string): string {
  const clean = bytes32.replace('0x', '');
  return `0x${clean.slice(24)}`;
}

/**
 * Convert Solana address (Base58) to bytes32 hex
 */
export function solanaAddressToBytes32(solanaAddress: string): string {
  try {
    const pubkey = new PublicKey(solanaAddress);
    const bytes = pubkey.toBytes();
    return '0x' + Buffer.from(bytes).toString('hex');
  } catch {
    throw new Error('Invalid Solana address');
  }
}

/**
 * Convert bytes32 hex to Solana address (Base58)
 */
export function bytes32ToSolanaAddress(bytes32: string): string {
  try {
    const clean = bytes32.replace('0x', '');
    const bytes = Buffer.from(clean, 'hex');
    const pubkey = new PublicKey(bytes);
    return pubkey.toBase58();
  } catch {
    throw new Error('Invalid bytes32 for Solana address');
  }
}

/**
 * Validate EVM address format
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert address based on chain types
 */
export function convertAddressForChain(
  address: string,
  sourceChainType: 'evm' | 'solana',
  destChainType: 'evm' | 'solana'
): string {
  // Same chain type - no conversion needed
  if (sourceChainType === destChainType) {
    return address;
  }

  // EVM -> Solana: pad to bytes32, user needs to provide Solana address
  if (sourceChainType === 'evm' && destChainType === 'solana') {
    // For EVM to Solana, user must provide a valid Solana address
    if (isValidSolanaAddress(address)) {
      return solanaAddressToBytes32(address);
    }
    throw new Error('Please provide a valid Solana address');
  }

  // Solana -> EVM: user needs to provide EVM address
  if (sourceChainType === 'solana' && destChainType === 'evm') {
    if (isValidEvmAddress(address)) {
      return evmAddressToBytes32(address);
    }
    throw new Error('Please provide a valid EVM address');
  }

  return address;
}

