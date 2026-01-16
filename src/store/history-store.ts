import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BridgeTransaction, TransactionStatus } from '@/types';

interface HistoryStore {
  transactions: BridgeTransaction[];
  
  // Actions
  addTransaction: (tx: BridgeTransaction) => void;
  updateTransaction: (id: string, updates: Partial<BridgeTransaction>) => void;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  removeTransaction: (id: string) => void;
  clearHistory: () => void;
  getTransactionById: (id: string) => BridgeTransaction | undefined;
  getPendingTransactions: () => BridgeTransaction[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx) => {
        set((state) => ({
          transactions: [tx, ...state.transactions],
        }));
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? { ...tx, ...updates, updatedAt: Date.now() }
              : tx
          ),
        }));
      },

      updateTransactionStatus: (id, status) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? { ...tx, status, updatedAt: Date.now() }
              : tx
          ),
        }));
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
      },

      clearHistory: () => {
        set({ transactions: [] });
      },

      getTransactionById: (id) => {
        return get().transactions.find((tx) => tx.id === id);
      },

      getPendingTransactions: () => {
        return get().transactions.filter(
          (tx) => tx.status !== 'completed' && tx.status !== 'failed'
        );
      },
    }),
    {
      name: 'cctp-bridge-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selectors
export const useTransactions = () => useHistoryStore((state) => state.transactions);
export const usePendingTransactions = () => 
  useHistoryStore((state) => 
    state.transactions.filter(
      (tx) => tx.status !== 'completed' && tx.status !== 'failed'
    )
  );

// Helper to generate unique transaction ID
export function generateTxId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

