// Chain Types
export type ChainType = 'evm' | 'solana';

export interface Chain {
  id: string;
  name: string;
  domainId: number;
  type: ChainType;
  chainId?: number; // EVM chain ID
  icon: string;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  fastTransferFee: number; // in basis points (1 bps = 0.01%)
  supportsFastTransfer?: boolean;
  color: string;
}

// Transaction Types
export type TransactionStatus = 
  | 'pending'      // 交易已提交，等待确认
  | 'burning'      // 正在销毁 USDC
  | 'attesting'    // 等待 Circle 认证
  | 'ready'        // 认证完成，可以 claim
  | 'claiming'     // 正在 claim
  | 'completed'    // 完成
  | 'failed';      // 失败

export interface BridgeTransaction {
  id: string;
  sourceChain: Chain;
  destChain: Chain;
  amount: string;
  recipient: string;
  sender: string;
  sourceTxHash: string;
  destTxHash?: string;
  status: TransactionStatus;
  isFastTransfer: boolean;
  fee: string;
  message?: string;
  attestation?: string;
  createdAt: number;
  updatedAt: number;
}

// Bridge State Types
export interface BridgeState {
  sourceChain: Chain | null;
  destChain: Chain | null;
  amount: string;
  recipient: string;
  isFastTransfer: boolean;
  fee: string;
  eta: string;
  isLoading: boolean;
  error: string | null;
}

// Iris API Response Types
export interface IrisDecodedMessageBody {
  mintRecipient: string;
  amount: string;
  burnToken?: string;
  messageSender?: string;
}

export interface IrisDecodedMessage {
  decodedMessageBody?: IrisDecodedMessageBody;
  finalityThresholdExecuted?: string;
}

export interface IrisMessage {
  message: string;
  attestation: string;
  status: 'pending' | 'complete';
  eventNonce: string;
  decodedMessage?: IrisDecodedMessage;
}

export interface IrisMessagesResponse {
  messages: IrisMessage[];
}

export interface IrisFeeResponse {
  feeInBps: number;           // Fast Transfer fee in basis points
  standardFeeInBps?: number;  // Standard Transfer fee (usually 0)
}

export interface IrisAllowanceResponse {
  allowance: string;
  used: string;
  remaining: string;
}
