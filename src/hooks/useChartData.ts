import { useState, useEffect, useRef } from 'react';
import type { OHLCV } from '../lib/chart/indicators';
import { BinanceChartWS, fetchBinanceKlines } from '../lib/chart/binance-ws';
import { fetchAlpacaBars } from '../lib/chart/alpaca-bars';

interface UseChartDataOptions {
  symbol: string;              // 'AAPL' o 'BTC/USDT'
  timeframe: string;           // '1m', '5m', '15m', '1h', '4h', '1d', '1w'
  broker: 'alpaca' | 'binance';
}

interface UseChartDataReturn {
  candles: OHLCV[];            // datos históricos + últimas velas
  isLoading: boolean;
  error: string | null;
  lastPrice: number | null;
  change24h: number | null;
  changePct24h: number | null;
  refetch: () => void;
}

export function useChartData({ symbol, timeframe, broker }: UseChartDataOptions): UseChartDataReturn {
  const [debouncedSymbol, setDebouncedSymbol] = useState('');
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [changePct24h, setChangePct24h] = useState<number | null>(null);

  const wsRef = useRef<BinanceChartWS | null>(null);
  const isMounted = useRef(true);

  // Debounce the symbol input
  useEffect(() => {
    const cleanSym = symbol.trim();
    if (cleanSym.length < 1) {
      setDebouncedSymbol('');
      setIsLoading(false);
      return;
    }

    if (cleanSym !== debouncedSymbol) {
      setIsLoading(true);
    }

    const handler = setTimeout(() => {
      setDebouncedSymbol(cleanSym);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [symbol]);

  // Helper to load data
  const loadData = async () => {
    if (!debouncedSymbol) return;
    setIsLoading(true);
    setError(null);

    try {
      if (broker === 'binance') {
        const data = await fetchBinanceKlines(debouncedSymbol, timeframe);
        if (isMounted.current) {
          setCandles(data);
          if (data.length > 0) {
            const last = data[data.length - 1]!;
            setLastPrice(last.close);
          }
        }
      } else {
        const data = await fetchAlpacaBars(debouncedSymbol, timeframe);
        if (isMounted.current) {
          setCandles(data);
          if (data.length > 0) {
            const last = data[data.length - 1]!;
            setLastPrice(last.close);
            
            // For Alpaca, we can estimate 24h change from historical daily bars if available,
            // or let the UI display it. Let's do a simple calculation if timeframe is 1d:
            if (data.length > 1) {
              const prev = data[data.length - 2]!;
              const chg = last.close - prev.close;
              const chgPct = prev.close > 0 ? (chg / prev.close) * 100 : 0;
              setChange24h(chg);
              setChangePct24h(chgPct);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[useChartData] Error loading chart data:', err);
      if (isMounted.current) {
        setError(err.message || 'Error al cargar datos del gráfico');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!debouncedSymbol) {
      setCandles([]);
      setIsLoading(false);
      setError(null);
      setLastPrice(null);
      setChange24h(null);
      setChangePct24h(null);
      return;
    }

    isMounted.current = true;
    void loadData();

    // Setup live subscription
    if (broker === 'binance') {
      console.log(`[useChartData] Suscribiendo a Binance WS para ${debouncedSymbol} (${timeframe})`);
      
      const callbacks = {
        onKline: (kline: any) => {
          if (!isMounted.current) return;
          
          setCandles(prev => {
            if (prev.length === 0) return [kline];
            const last = prev[prev.length - 1]!;
            
            if (last.time === kline.time) {
              // Update current incomplete candle
              const next = [...prev];
              next[next.length - 1] = {
                time: kline.time,
                open: kline.open,
                high: kline.high,
                low: kline.low,
                close: kline.close,
                volume: kline.volume
              };
              return next;
            } else if (kline.time > last.time) {
              // A new candle has started! Append it.
              return [...prev, {
                time: kline.time,
                open: kline.open,
                high: kline.high,
                low: kline.low,
                close: kline.close,
                volume: kline.volume
              }];
            }
            return prev;
          });
          
          setLastPrice(kline.close);
        },
        onTicker: (ticker: any) => {
          if (!isMounted.current) return;
          setLastPrice(ticker.price);
          setChange24h(ticker.change24h);
          setChangePct24h(ticker.changePct24h);
        },
        onError: () => {
          if (isMounted.current) {
            setError('Error en la conexión WebSocket de Binance');
          }
        }
      };

      wsRef.current = new BinanceChartWS(debouncedSymbol, timeframe, callbacks);
      wsRef.current.connect();
    } else {
      // For Alpaca, background polling every 60s
      console.log(`[useChartData] Iniciando polling cada 60s para Alpaca ${debouncedSymbol}`);
      const intervalId = setInterval(() => {
        void (async () => {
          try {
            const data = await fetchAlpacaBars(debouncedSymbol, timeframe);
            if (isMounted.current && data.length > 0) {
              setCandles(data);
              const last = data[data.length - 1]!;
              setLastPrice(last.close);
              if (data.length > 1) {
                const prev = data[data.length - 2]!;
                const chg = last.close - prev.close;
                const chgPct = prev.close > 0 ? (chg / prev.close) * 100 : 0;
                setChange24h(chg);
                setChangePct24h(chgPct);
              }
            }
          } catch (e) {
            console.error('[useChartData] Error in Alpaca polling:', e);
          }
        })();
      }, 60000);

      return () => {
        clearInterval(intervalId);
      };
    }

    return () => {
      isMounted.current = false;
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [debouncedSymbol, timeframe, broker]);

  return {
    candles,
    isLoading,
    error,
    lastPrice,
    change24h,
    changePct24h,
    refetch: () => void loadData()
  };
}
