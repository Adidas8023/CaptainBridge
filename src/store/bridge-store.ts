import { create } from 'zustand';
import type { Chain } from '@/types';
import { CHAINS } from '@/lib/cctp/constants';

interface BridgeStore {
  // State
  sourceChain: Chain | null;
  destChain: Chain | null;
  amount: string;
  recipient: string;
  isFastTransfer: boolean;
  fee: string;
  feeInBps: number;        // 真实费率（basis points），从 API 获取
  standardFeeInBps: number; // Standard transfer 费率
  eta: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSourceChain: (chain: Chain | null) => void;
  setDestChain: (chain: Chain | null) => void;
  swapChains: () => void;
  setAmount: (amount: string) => void;
  setRecipient: (recipient: string) => void;
  setIsFastTransfer: (isFast: boolean) => void;
  setFee: (fee: string) => void;
  setFeeInBps: (bps: number) => void;
  setStandardFeeInBps: (bps: number) => void;
  setEta: (eta: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  sourceChain: CHAINS.find(c => c.id === 'ethereum') || null,
  destChain: CHAINS.find(c => c.id === 'base') || null,
  amount: '',
  recipient: '',
  isFastTransfer: true,
  fee: '0.01%',
  feeInBps: 1,         // 默认 1 bps (0.01%)
  standardFeeInBps: 0, // Standard transfer 默认免费
  eta: 'a few seconds',
  isLoading: false,
  error: null,
};

export const useBridgeStore = create<BridgeStore>((set, get) => ({
  ...initialState,

  setSourceChain: (chain) => set({ sourceChain: chain }),
  
  setDestChain: (chain) => set({ destChain: chain }),
  
  swapChains: () => {
    const { sourceChain, destChain } = get();
    set({
      sourceChain: destChain,
      destChain: sourceChain,
    });
  },
  
  setAmount: (amount) => set({ amount }),
  
  setRecipient: (recipient) => set({ recipient }),
  
  setIsFastTransfer: (isFast) => {
    const { feeInBps, standardFeeInBps } = get();
    
    if (isFast) {
      // Fast transfer: use API fee rate
      set({
        isFastTransfer: true,
        fee: feeInBps === 0 ? 'Free' : `${(feeInBps / 100).toFixed(2)}%`,
        eta: 'a few seconds',
      });
    } else {
      // Standard transfer: use API standard fee (usually free)
      set({
        isFastTransfer: false,
        fee: standardFeeInBps === 0 ? 'Free' : `${(standardFeeInBps / 100).toFixed(2)}%`,
        eta: '15-20 minutes',
      });
    }
  },
  
  setFee: (fee) => set({ fee }),
  
  setFeeInBps: (bps) => {
    const { isFastTransfer } = get();
    set({ 
      feeInBps: bps,
      // 如果当前是 Fast Transfer，更新显示的 fee
      ...(isFastTransfer ? { fee: bps === 0 ? 'Free' : `${(bps / 100).toFixed(2)}%` } : {}),
    });
  },
  
  setStandardFeeInBps: (bps) => {
    const { isFastTransfer } = get();
    set({ 
      standardFeeInBps: bps,
      // 如果当前是 Standard Transfer，更新显示的 fee
      ...(!isFastTransfer ? { fee: bps === 0 ? 'Free' : `${(bps / 100).toFixed(2)}%` } : {}),
    });
  },
  
  setEta: (eta) => set({ eta }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));

// Selectors
export const useSourceChain = () => useBridgeStore((state) => state.sourceChain);
export const useDestChain = () => useBridgeStore((state) => state.destChain);
export const useAmount = () => useBridgeStore((state) => state.amount);
export const useRecipient = () => useBridgeStore((state) => state.recipient);
export const useIsFastTransfer = () => useBridgeStore((state) => state.isFastTransfer);
export const useFee = () => useBridgeStore((state) => state.fee);
export const useFeeInBps = () => useBridgeStore((state) => state.feeInBps);
export const useEta = () => useBridgeStore((state) => state.eta);

