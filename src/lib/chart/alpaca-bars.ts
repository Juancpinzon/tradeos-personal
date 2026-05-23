import { supabase } from '../supabase';
import type { OHLCV } from './indicators';

// Mapeo de timeframes de la UI al formato requerido por Alpaca
export const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1Min',
  '5m': '5Min',
  '15m': '15Min',
  '1h': '1Hour',
  '4h': '4Hour',
  '1d': '1Day',
  '1w': '1Week'
};

export async function fetchAlpacaBars(symbol: string, timeframe: string, limit = 500): Promise<OHLCV[]> {
  const alpacaTimeframe = TIMEFRAME_MAP[timeframe] || '1Hour';
  const cleanSymbol = symbol.toUpperCase().trim();

  // Llamada a la Edge Function 'alpaca-proxy' usando POST
  const { data, error } = await supabase.functions.invoke('alpaca-proxy', {
    body: {
      endpoint: '/bars',
      params: {
        symbol: cleanSymbol,
        timeframe: alpacaTimeframe,
        limit
      }
    }
  });

  if (error) {
    console.error('[AlpacaBars] Error al invocar alpaca-proxy:', error);
    throw new Error(error.message || 'Error al obtener barras de Alpaca');
  }

  if (!Array.isArray(data)) {
    console.warn('[AlpacaBars] Los datos devueltos no son un array:', data);
    return [];
  }

  // Mapear el formato de Alpaca { t, o, h, l, c, v } a nuestro formato OHLCV
  return data.map((bar: any) => {
    const unixTime = Math.floor(new Date(bar.t).getTime() / 1000);
    return {
      time: unixTime,
      open: typeof bar.o === 'number' ? bar.o : parseFloat(bar.o || 0),
      high: typeof bar.h === 'number' ? bar.h : parseFloat(bar.h || 0),
      low: typeof bar.low === 'number' ? bar.low : parseFloat(bar.l || 0), // handle low and l just in case
      close: typeof bar.c === 'number' ? bar.c : parseFloat(bar.c || 0),
      volume: typeof bar.v === 'number' ? bar.v : parseInt(bar.v || 0, 10)
    };
  });
}
