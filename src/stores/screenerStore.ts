import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScreenerCriteria, ScreenerResult } from '../types';

interface ScreenerState {
  activeCriteria: ScreenerCriteria;
  activePresetId: string | null;
  lastResult: ScreenerResult | null;
  isRunning: boolean;
  
  // Actions
  setCriteria: (criteria: Partial<ScreenerCriteria>) => void;
  setPresetId: (id: string | null) => void;
  setLastResult: (result: ScreenerResult | null) => void;
  setIsRunning: (isRunning: boolean) => void;
  reset: () => void;
}

const DEFAULT_CRITERIA: ScreenerCriteria = {
  market_cap_min: 500000000, // $500M
  price_min: 5,
  revenue_growth_min_pct: 10,
  volume_avg_min: 100000,
  eps_next_positive: true,
  ath_distance_max_pct: -20,
  asset_class: 'equity',
};

export const useScreenerStore = create<ScreenerState>()(
  persist(
    (set) => ({
      activeCriteria: DEFAULT_CRITERIA,
      activePresetId: null,
      lastResult: null,
      isRunning: false,

      setCriteria: (criteria) => 
        set((state) => ({ 
          activeCriteria: { ...state.activeCriteria, ...criteria } 
        })),

      setPresetId: (id) => set({ activePresetId: id }),
      setLastResult: (result) => set({ lastResult: result }),
      setIsRunning: (isRunning) => set({ isRunning }),
      
      reset: () => set({ 
        activeCriteria: DEFAULT_CRITERIA, 
        activePresetId: null, 
        lastResult: null, 
        isRunning: false 
      }),
    }),
    {
      name: 'tradeos-screener-storage',
      partialize: (state) => ({ 
        activeCriteria: state.activeCriteria,
        activePresetId: state.activePresetId,
        lastResult: state.lastResult
      }),
    }
  )
);
