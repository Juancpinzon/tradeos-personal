import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface MarketData {
  symbol: string;
  price: number;
  change_pct: number;
  bid?: number;
  ask?: number;
  last_updated: string;
}

export function useMarketData(symbols: string[]) {
  return useQuery({
    queryKey: ['market-data', symbols.sort()],
    queryFn: async () => {
      if (symbols.length === 0) return {};

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      // Por ahora, traemos los precios uno por uno o vía proxy masivo si existiera.
      // Alpaca tiene /v2/stocks/snapshots para múltiples símbolos.
      // Vamos a usar un endpoint que acepte múltiples símbolos si es posible, 
      // o mapear sobre los existentes.
      
      const results: Record<string, MarketData> = {};
      
      await Promise.all(symbols.map(async (symbol) => {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/alpaca-proxy/quote/${symbol.replace('/', '')}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            results[symbol] = {
              symbol,
              price: data.price,
              change_pct: data.change_pct || 0,
              bid: data.bid,
              ask: data.ask,
              last_updated: new Date().toISOString()
            };
          }
        } catch (e) {
          console.error(`Error fetching price for ${symbol}:`, e);
        }
      }));

      return results;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: symbols.length > 0
  });
}
