import { 
  type Address, 
  type Hash,
  encodeFunctionData,
  parseUnits,
  maxUint256,
} from 'viem';
import type { Chain } from '@/types';
import { USDC_DECIMALS, FINALITY_THRESHOLD } from './constants';
import { evmAddressToBytes32 } from './address-utils';

// ERC20 ABI for approve
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// TokenMessengerV2 ABI
const TOKEN_MESSENGER_V2_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [{ type: 'uint64' }],
  },
] as const;

// MessageTransmitterV2 ABI
const MESSAGE_TRANSMITTER_V2_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Get approve transaction data
 */
export function getApproveData(
  spender: Address,
  amount: bigint = maxUint256
): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  });
}

/**
 * Get depositForBurn transaction data
 */
export function getDepositForBurnData(
  amount: string,
  destinationDomain: number,
  mintRecipient: string, // Can be EVM or Solana address
  burnToken: Address,
  destinationCaller: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000',
  maxFee: bigint = BigInt(0),
  isFastTransfer: boolean = true
): `0x${string}` {
  const amountInUnits = parseUnits(amount, USDC_DECIMALS);
  
  // Convert recipient to bytes32 format
  let recipientBytes32: `0x${string}`;
  if (mintRecipient.startsWith('0x') && mintRecipient.length === 42) {
    // EVM address
    recipientBytes32 = evmAddressToBytes32(mintRecipient) as `0x${string}`;
  } else {
    // Assume it's already bytes32 or Solana address converted
    recipientBytes32 = mintRecipient as `0x${string}`;
  }

  const minFinalityThreshold = isFastTransfer 
    ? FINALITY_THRESHOLD.FAST - 1  // < 1000 for fast
    : FINALITY_THRESHOLD.STANDARD;  // >= 1000 for standard

  return encodeFunctionData({
    abi: TOKEN_MESSENGER_V2_ABI,
    functionName: 'depositForBurn',
    args: [
      amountInUnits,
      destinationDomain,
      recipientBytes32,
      burnToken,
      destinationCaller,
      maxFee,
      minFinalityThreshold,
    ],
  });
}

/**
 * Get receiveMessage transaction data
 */
export function getReceiveMessageData(
  message: `0x${string}`,
  attestation: `0x${string}`
): `0x${string}` {
  return encodeFunctionData({
    abi: MESSAGE_TRANSMITTER_V2_ABI,
    functionName: 'receiveMessage',
    args: [message, attestation],
  });
}

/**
 * Calculate max fee with buffer
 */
export function calculateMaxFee(
  amount: string,
  feePercentBps: number,
  bufferPercent: number = 5
): bigint {
  const amountInUnits = parseUnits(amount, USDC_DECIMALS);
  const feeAmount = (amountInUnits * BigInt(feePercentBps)) / BigInt(10000);
  const buffer = (feeAmount * BigInt(bufferPercent)) / BigInt(100);
  return feeAmount + buffer;
}

/**
 * Build bridge transaction for EVM chain
 */
export function buildBridgeTransaction(
  sourceChain: Chain,
  destChain: Chain,
  amount: string,
  recipient: string,
  isFastTransfer: boolean
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const maxFee = isFastTransfer
    ? calculateMaxFee(amount, sourceChain.fastTransferFee)
    : BigInt(0);

  const data = getDepositForBurnData(
    amount,
    destChain.domainId,
    recipient,
    sourceChain.usdcAddress as Address,
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    maxFee,
    isFastTransfer
  );

  return {
    to: sourceChain.tokenMessengerAddress as Address,
    data,
    value: BigInt(0),
  };
}

/**
 * Build approve transaction for USDC
 */
export function buildApproveTransaction(
  sourceChain: Chain,
  amount?: string
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const approveAmount = amount
    ? parseUnits(amount, USDC_DECIMALS)
    : maxUint256;

  const data = getApproveData(
    sourceChain.tokenMessengerAddress as Address,
    approveAmount
  );

  return {
    to: sourceChain.usdcAddress as Address,
    data,
    value: BigInt(0),
  };
}

/**
 * Build receive message transaction for claiming
 */
export function buildClaimTransaction(
  destChain: Chain,
  message: `0x${string}`,
  attestation: `0x${string}`
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const data = getReceiveMessageData(message, attestation);

  return {
    to: destChain.messageTransmitterAddress as Address,
    data,
    value: BigInt(0),
  };
}

export { ERC20_ABI, TOKEN_MESSENGER_V2_ABI, MESSAGE_TRANSMITTER_V2_ABI };

