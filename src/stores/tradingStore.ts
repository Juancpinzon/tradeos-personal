import { create } from 'zustand';

interface TradingState {
  symbol: string;
  activeSymbol: string;
  stopLossPrice: number | null;
  targetPrice: number | null;
  entryPrice: number | null;
  
  // Actions
  setSymbol: (symbol: string) => void;
  setStopLossPrice: (price: number | null) => void;
  setTargetPrice: (price: number | null) => void;
  setEntryPrice: (price: number | null) => void;
  reset: () => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  symbol: '',
  activeSymbol: '',
  stopLossPrice: null,
  targetPrice: null,
  entryPrice: null,

  setSymbol: (symbol) => 
    set(() => ({ 
      symbol: symbol.toUpperCase(), 
      activeSymbol: symbol.toUpperCase() 
    })),
  setStopLossPrice: (price) => set({ stopLossPrice: price }),
  setTargetPrice: (price) => set({ targetPrice: price }),
  setEntryPrice: (price) => set({ entryPrice: price }),
  
  reset: () => set({
    symbol: '',
    activeSymbol: '',
    stopLossPrice: null,
    targetPrice: null,
    entryPrice: null,
  }),
}));
