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
      
      // Enviar todos los símbolos en una sola llamada para evitar ERR_CONNECTION_CLOSED
      const results: Record<string, MarketData> = {};
      const symbolsParam = symbols.map(s => s.replace('/', '')).join(',');
      
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/alpaca-proxy/quotes?symbols=${symbolsParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // data structure is { AAPL: { p: 150, t: ... }, MSFT: { p: ..., t: ... } }
          for (const symbolKey of Object.keys(data)) {
            // Re-map symbol back if it was crypto without slash, but Alpaca returns equities mainly
            const trade = data[symbolKey];
            results[symbolKey] = {
              symbol: symbolKey,
              price: trade.p,
              change_pct: 0,
              last_updated: new Date().toISOString()
            };
          }
        } else {
          console.error("Error fetching bulk quotes:", await res.text());
        }
      } catch (e) {
        console.error("Network error fetching bulk quotes:", e);
      }

      return results;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: symbols.length > 0
  });
}
