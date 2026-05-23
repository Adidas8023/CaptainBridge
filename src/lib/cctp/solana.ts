import { 
  PublicKey, 
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { USDC_DECIMALS, FINALITY_THRESHOLD } from './constants';

// Solana CCTP Program IDs
export const TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID = new PublicKey(
  'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe'
);
export const MESSAGE_TRANSMITTER_V2_PROGRAM_ID = new PublicKey(
  'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC'
);
export const SOLANA_USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

// CCTP V2 Fee Recipient Wallet (Circle's fee collector for Fast Transfer)
// This is the expected owner for fee_recipient_token_account in HandleReceiveUnfinalizedMessage
export const CCTP_FEE_RECIPIENT_WALLET = new PublicKey(
  'YYfrm52epnyUrr4hzyF9ZZcjQg36nuirKeB6Hemntd8'
);

// Solana Domain ID
export const SOLANA_DOMAIN_ID = 5;

/**
 * Convert amount to Solana lamports (USDC has 6 decimals)
 */
export function toSolanaAmount(amount: string): bigint {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
  return BigInt(whole + paddedDecimal);
}

/**
 * Convert bytes32 hex to Solana PublicKey
 */
export function bytes32ToPublicKey(bytes32: string): PublicKey {
  const clean = bytes32.replace('0x', '');
  const bytes = Buffer.from(clean, 'hex');
  return new PublicKey(bytes);
}

/**
 * Convert PublicKey to bytes32 hex
 */
export function publicKeyToBytes32(pubkey: PublicKey): string {
  return '0x' + Buffer.from(pubkey.toBytes()).toString('hex');
}

/**
 * Get the user's USDC token account address
 */
export async function getUsdcTokenAccount(
  userPubkey: PublicKey
): Promise<PublicKey> {
  return getAssociatedTokenAddress(
    SOLANA_USDC_MINT,
    userPubkey
  );
}

/**
 * Helper: write bigint as little-endian u64 into Uint8Array (early declaration for PDA use)
 */
function writeBigUInt64LEEarly(arr: Uint8Array, value: bigint, offset: number): void {
  for (let i = 0; i < 8; i++) {
    arr[offset + i] = Number((value >> BigInt(8 * i)) & BigInt(0xff));
  }
}

/**
 * Helper: convert string to Uint8Array (UTF-8) - early declaration
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Find Program Derived Address for message sent event account
 */
export function findMessageSentEventAccountPda(
  messageSender: PublicKey,
  nonce: bigint
): [PublicKey, number] {
  const nonceBuffer = new Uint8Array(8);
  writeBigUInt64LEEarly(nonceBuffer, nonce, 0);
  
  return PublicKey.findProgramAddressSync(
    [
      stringToBytes('message_sent'),
      messageSender.toBytes(),
      nonceBuffer,
    ],
    MESSAGE_TRANSMITTER_V2_PROGRAM_ID
  );
}

/**
 * Find Token Messenger Minter program state PDA
 */
export function findTokenMessengerMinterStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToBytes('token_messenger')],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find Message Transmitter program state PDA
 */
export function findMessageTransmitterStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToBytes('message_transmitter')],
    MESSAGE_TRANSMITTER_V2_PROGRAM_ID
  );
}

/**
 * Helper: write bigint as little-endian u64 into Uint8Array
 */
function writeBigUInt64LE(arr: Uint8Array, value: bigint, offset: number): void {
  for (let i = 0; i < 8; i++) {
    arr[offset + i] = Number((value >> BigInt(8 * i)) & BigInt(0xff));
  }
}

/**
 * Helper: write number as little-endian u32 into Uint8Array
 */
function writeUInt32LE(arr: Uint8Array, value: number, offset: number): void {
  arr[offset] = value & 0xff;
  arr[offset + 1] = (value >> 8) & 0xff;
  arr[offset + 2] = (value >> 16) & 0xff;
  arr[offset + 3] = (value >> 24) & 0xff;
}

/**
 * Build deposit for burn instruction data
 * 
 * Note: This is a simplified version. In production, you'd use Anchor
 * or the official CCTP SDK for proper instruction building.
 */
export function buildDepositForBurnInstructionData(
  amount: bigint,
  destinationDomain: number,
  mintRecipient: Uint8Array, // 32 bytes
  destinationCaller: Uint8Array, // 32 bytes, usually all zeros
  maxFee: bigint,
  minFinalityThreshold: number
): Uint8Array {
  // Instruction discriminator for deposit_for_burn (8 bytes)
  // This would be computed from the anchor IDL in production
  const discriminator = new Uint8Array([0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x7a, 0x8b]);
  
  const totalSize = 8 + 8 + 4 + 32 + 32 + 8 + 4; // 96 bytes
  const data = new Uint8Array(totalSize);
  
  let offset = 0;
  
  // Write discriminator
  data.set(discriminator, offset);
  offset += 8;
  
  // Write amount (little-endian u64)
  writeBigUInt64LE(data, amount, offset);
  offset += 8;
  
  // Write destination_domain (little-endian u32)
  writeUInt32LE(data, destinationDomain, offset);
  offset += 4;
  
  // Write mint_recipient (32 bytes)
  data.set(mintRecipient.slice(0, 32), offset);
  offset += 32;
  
  // Write destination_caller (32 bytes)
  data.set(destinationCaller.slice(0, 32), offset);
  offset += 32;
  
  // Write max_fee (little-endian u64)
  writeBigUInt64LE(data, maxFee, offset);
  offset += 8;
  
  // Write min_finality_threshold (little-endian u32)
  writeUInt32LE(data, minFinalityThreshold, offset);
  
  return data;
}

/**
 * Create deposit for burn instruction
 * 
 * Note: This is a simplified implementation. In production, use the 
 * official Circle CCTP Solana SDK or Anchor generated client.
 */
export async function createDepositForBurnInstruction(
  userPubkey: PublicKey,
  amount: string,
  destinationDomain: number,
  mintRecipient: string, // bytes32 hex for destination address
  isFastTransfer: boolean = true
): Promise<TransactionInstruction> {
  const amountInUnits = toSolanaAmount(amount);
  
  // Get user's USDC token account
  const userUsdcAccount = await getUsdcTokenAccount(userPubkey);
  
  // Get program state PDAs
  const [tokenMessengerState] = findTokenMessengerMinterStatePda();
  const [messageTransmitterState] = findMessageTransmitterStatePda();
  
  // Convert recipient hex to Uint8Array
  const hexStr = mintRecipient.replace('0x', '');
  const mintRecipientBuffer = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    mintRecipientBuffer[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2) || '0', 16);
  }
  
  // Destination caller (all zeros means anyone can call)
  const destinationCallerBuffer = new Uint8Array(32);
  
  // Calculate finality threshold
  const minFinalityThreshold = isFastTransfer 
    ? FINALITY_THRESHOLD.FAST - 1 
    : FINALITY_THRESHOLD.STANDARD;
  
  // Max fee (0 for standard transfer)
  const maxFee = BigInt(0); // In production, calculate based on fee API
  
  // Build instruction data
  const instructionData = buildDepositForBurnInstructionData(
    amountInUnits,
    destinationDomain,
    mintRecipientBuffer,
    destinationCallerBuffer,
    maxFee,
    minFinalityThreshold
  );
  
  // Build account keys
  // Note: This is simplified. Actual accounts depend on the program implementation
  const keys = [
    { pubkey: userPubkey, isSigner: true, isWritable: true },
    { pubkey: userUsdcAccount, isSigner: false, isWritable: true },
    { pubkey: SOLANA_USDC_MINT, isSigner: false, isWritable: true },
    { pubkey: tokenMessengerState, isSigner: false, isWritable: true },
    { pubkey: messageTransmitterState, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    keys,
    programId: TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID,
    data: Buffer.from(instructionData),
  });
}

/**
 * Build receive message instruction data
 */
export function buildReceiveMessageInstructionData(
  message: Uint8Array,
  attestation: Uint8Array
): Uint8Array {
  // Anchor instruction discriminator = sha256("global:receive_message")[0:8]
  const discriminator = new Uint8Array([0x26, 0x90, 0x7f, 0xe1, 0x1f, 0xe1, 0xee, 0x19]);
  
  const totalSize = 8 + 4 + message.length + 4 + attestation.length;
  const data = new Uint8Array(totalSize);
  
  let offset = 0;
  
  // Write discriminator
  data.set(discriminator, offset);
  offset += 8;
  
  // Write message length and data
  writeUInt32LE(data, message.length, offset);
  offset += 4;
  data.set(message, offset);
  offset += message.length;
  
  // Write attestation length and data
  writeUInt32LE(data, attestation.length, offset);
  offset += 4;
  data.set(attestation, offset);
  
  return data;
}

/**
 * Helper: convert string to Uint8Array (UTF-8)
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Find remote token messenger PDA for a given domain
 */
export function findRemoteTokenMessengerPda(domain: number): [PublicKey, number] {
  // IMPORTANT: domain is passed as ASCII string (e.g., "0" for ETH), not as u32 bytes!
  const domainSeed = Buffer.from(domain.toString(), 'utf8');
  
  return PublicKey.findProgramAddressSync(
    [
      stringToUint8Array('remote_token_messenger'),
      domainSeed,
    ],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find used nonce PDA
 * CCTP V2: seeds are ['used_nonce', nonce] - NO sourceDomain!
 * This matches Circle's official SDK implementation
 */
export function findUsedNoncePda(
  _sourceDomain: number,  // Kept for API compatibility but not used
  nonce: Uint8Array  // 32 bytes
): [PublicKey, number] {
  // IMPORTANT: CCTP V2 uses only ['used_nonce', nonce] as seeds
  // sourceDomain is NOT part of the PDA seeds!
  return PublicKey.findProgramAddressSync(
    [
      stringToUint8Array('used_nonce'),
      nonce,  // Only nonce, no sourceDomain
    ],
    MESSAGE_TRANSMITTER_V2_PROGRAM_ID
  );
}

/**
 * Find authority PDA
 * Seeds: ['message_transmitter_authority', tokenMessengerProgramId]
 */
export function findAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      stringToUint8Array('message_transmitter_authority'),
      TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID.toBuffer(),
    ],
    MESSAGE_TRANSMITTER_V2_PROGRAM_ID
  );
}

/**
 * Find custody token account PDA
 * Seeds: ['custody', usdcMint]
 */
export function findCustodyTokenAccountPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      stringToUint8Array('custody'),
      SOLANA_USDC_MINT.toBuffer(),
    ],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find event authority PDA used by MessageTransmitter (required by SDK)
 * Seeds: ['__event_authority']
 */
export function findEventAuthorityPda(): [PublicKey, number] {
  // Anchor expects: PDA = findProgramAddress(["__event_authority"], MESSAGE_TRANSMITTER_V2_PROGRAM_ID)
  // 这里必须用 MessageTransmitter 的 programId 来派生，否则会触发 ConstraintSeeds(2006)
  return PublicKey.findProgramAddressSync(
    [stringToUint8Array('__event_authority')],
    MESSAGE_TRANSMITTER_V2_PROGRAM_ID
  );
}

/**
 * Find event authority PDA used by TokenMessengerMinter
 * Seeds: ['__event_authority']
 * IMPORTANT: This is different from MessageTransmitter's event_authority!
 */
export function findTokenMessengerEventAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToUint8Array('__event_authority')],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find token_minter PDA (SDK uses this in remaining accounts)
 */
export function findTokenMinterPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToUint8Array('token_minter')],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find local_token PDA (SDK uses this in remaining accounts)
 */
export function findLocalTokenPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [stringToUint8Array('local_token'), SOLANA_USDC_MINT.toBuffer()],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Find token_pair PDA
 * Seeds: ['token_pair', sourceDomainId, remoteToken]
 * - sourceDomainId: domain as UTF8 string (e.g. "0" for Ethereum)
 * - remoteToken: remote token address as raw 32 bytes
 * 
 * Note: Circle docs say "sourceTokenInBase58" but this refers to naming/display,
 * the actual seed is the raw 32 bytes (verified on mainnet).
 */
export function findTokenPairPda(sourceDomain: number, remoteMintKey: Uint8Array): [PublicKey, number] {
  const domainSeed = Buffer.from(sourceDomain.toString(), 'utf8');
  
  return PublicKey.findProgramAddressSync(
    [stringToUint8Array('token_pair'), domainSeed, remoteMintKey],
    TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID
  );
}

/**
 * Helper: read big-endian u32 from Uint8Array
 */
function readUInt32BE(arr: Uint8Array, offset: number): number {
  return (arr[offset] << 24) | (arr[offset + 1] << 16) | (arr[offset + 2] << 8) | arr[offset + 3];
}

/**
 * Helper: convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace('0x', '');
  const arr = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/**
 * Parse message to extract nonce, source domain and destination domain
 * CCTP V2 message format:
 * - version (4 bytes)
 * - sourceDomain (4 bytes)  
 * - destinationDomain (4 bytes)
 * - nonce (32 bytes) - bytes32 in V2!
 * - sender (32 bytes)
 * - recipient (32 bytes)
 * - ...
 */
export function parseMessage(message: Uint8Array): { sourceDomain: number; destinationDomain: number; nonce: Uint8Array } {
  const sourceDomain = readUInt32BE(message, 4);
  const destinationDomain = readUInt32BE(message, 8);
  // CCTP V2: nonce is 32 bytes (bytes32), not 8 bytes!
  const nonce = message.slice(12, 44);

  return { sourceDomain, destinationDomain, nonce };
}

/**
 * Parse message hex string to extract destination domain
 * Useful for determining the target chain from attestation response
 */
export function parseMessageHex(messageHex: string): { sourceDomain: number; destinationDomain: number; nonce: Uint8Array } {
  const messageBuffer = hexToUint8Array(messageHex);
  return parseMessage(messageBuffer);
}

/**
 * Extract mintRecipient from CCTP V2 message
 * CCTP V2 Message structure:
 *   Header (148 bytes): version(4) + srcDomain(4) + dstDomain(4) + nonce(32) + sender(32) + recipient(32) + destCaller(32) + minFinalityThreshold(4) + finalityThresholdExecuted(4)
 *   BurnMessage body: version(4) + burnToken(32) + mintRecipient(32) + ...
 * So mintRecipient starts at offset 148 + 4 + 32 = 184, ends at 216
 */
export function extractMintRecipientFromMessage(messageHex: string): PublicKey {
  const cleanHex = messageHex.replace('0x', '');
  // mintRecipient is at bytes 184-216 (offset after header + version + burnToken)
  const mintRecipientHex = cleanHex.slice(184 * 2, 216 * 2);
  const mintRecipientBytes = Buffer.from(mintRecipientHex, 'hex');
  return new PublicKey(mintRecipientBytes);
}

/**
 * Create receive_message instruction with complete account list (based on official IDL)
 */
export function createReceiveMessageInstruction(
  payer: PublicKey,
  mintRecipient: PublicKey, // User's USDC token account (ATA)
  messageHex: string,
  attestationHex: string
): TransactionInstruction {
  const messageBuffer = hexToUint8Array(messageHex);
  const attestationBuffer = hexToUint8Array(attestationHex);
  
  // Parse message to get source domain and nonce
  const { sourceDomain, nonce } = parseMessage(messageBuffer);
  
  // Find all required PDAs
  const [messageTransmitterState] = findMessageTransmitterStatePda();
  const [tokenMessengerState] = findTokenMessengerMinterStatePda();
  const [authorityPda] = findAuthorityPda();
  const [usedNonce] = findUsedNoncePda(sourceDomain, nonce);
  const [remoteTokenMessenger] = findRemoteTokenMessengerPda(sourceDomain);
  const [custodyTokenAccount] = findCustodyTokenAccountPda();
  const [eventAuthority] = findEventAuthorityPda(); // MessageTransmitter's event authority
  const [tokenMessengerEventAuthority] = findTokenMessengerEventAuthorityPda(); // TokenMessengerMinter's event authority
  const [tokenMinterPda] = findTokenMinterPda();
  const [localTokenPda] = findLocalTokenPda();
  
  // remoteMintKey: source chain USDC address (burn token) in bytes32
  // CCTP V2 Fast Transfer message structure:
  //   Header (148 bytes): version(4) + srcDomain(4) + dstDomain(4) + nonce(32) + sender(32) + recipient(32) + destCaller(32) + minFinalityThreshold(4) + finalityThresholdExecuted(4)
  //   BurnMessage body: version(4) + burnToken(32) + mintRecipient(32) + amount(32) + messageSender(32) + ...
  // So burnToken starts at offset 148 + 4 = 152, ends at 152 + 32 = 184
  const burnTokenHex = messageHex.slice(2 + 152 * 2, 2 + 184 * 2);
  const remoteMintKey = Buffer.from(burnTokenHex, 'hex'); // 32 bytes
  const [tokenPairPda] = findTokenPairPda(sourceDomain, remoteMintKey);

  // Fee recipient ATA: MUST use Circle's fee collector wallet, NOT the payer!
  // HandleReceiveUnfinalizedMessage requires the fee_recipient_token_account to be owned by CCTP_FEE_RECIPIENT_WALLET
  const feeRecipientAta = getAssociatedTokenAddressSync(SOLANA_USDC_MINT, CCTP_FEE_RECIPIENT_WALLET, true);

  const data = buildReceiveMessageInstructionData(messageBuffer, attestationBuffer);

  // Complete account list following official IDL/SDK requirements
  // IMPORTANT:
  // Anchor 会按 IDL 顺序把"前 N 个" accounts 映射到指令账户；其余才是 remainingAccounts 给 CPI。
  // 如果把 token_messenger 的 CPI accounts 提前塞进去，链上会把其中某个账户错当成 event_authority，从而触发 ConstraintSeeds(2006)。
  // 
  // FIX: TokenMessengerMinter's HandleReceiveUnfinalizedMessage (Fast Transfer) requires its OWN event_authority PDA!
  // Error 3005 (AccountNotEnoughKeys) was caused by missing this account.
  const keys = [
    // Core MessageTransmitter accounts (IDL order)
    { pubkey: payer, isSigner: true, isWritable: true }, // payer
    { pubkey: payer, isSigner: true, isWritable: false }, // caller
    { pubkey: authorityPda, isSigner: false, isWritable: false }, // authority_pda
    { pubkey: messageTransmitterState, isSigner: false, isWritable: false }, // message_transmitter
    { pubkey: usedNonce, isSigner: false, isWritable: true }, // used_nonce
    { pubkey: TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID, isSigner: false, isWritable: false }, // receiver (TokenMessengerMinter program)
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event_authority (MessageTransmitter's)
    { pubkey: MESSAGE_TRANSMITTER_V2_PROGRAM_ID, isSigner: false, isWritable: false }, // program (for Anchor event CPI)

    // Remaining accounts passed to TokenMessengerMinter for USDC mint (CPI remainingAccounts)
    { pubkey: tokenMessengerState, isSigner: false, isWritable: false }, // token_messenger (state)
    { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false }, // remote_token_messenger
    { pubkey: tokenMinterPda, isSigner: false, isWritable: true }, // token_minter
    { pubkey: localTokenPda, isSigner: false, isWritable: true }, // local_token PDA
    { pubkey: tokenPairPda, isSigner: false, isWritable: false }, // token_pair
    { pubkey: feeRecipientAta, isSigner: false, isWritable: true }, // fee_recipient_ata
    { pubkey: mintRecipient, isSigner: false, isWritable: true }, // mint_recipient (user's ATA)
    { pubkey: custodyTokenAccount, isSigner: false, isWritable: true }, // custody_token_account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
    { pubkey: tokenMessengerEventAuthority, isSigner: false, isWritable: false }, // TokenMessengerMinter's event_authority (REQUIRED for HandleReceiveUnfinalizedMessage!)
    { pubkey: TOKEN_MESSENGER_MINTER_V2_PROGRAM_ID, isSigner: false, isWritable: false }, // TokenMessengerMinter program (for Anchor event CPI in CPI)
  ];

  return new TransactionInstruction({
    keys,
    programId: MESSAGE_TRANSMITTER_V2_PROGRAM_ID,
    data: Buffer.from(data),
  });
}

export {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
};
