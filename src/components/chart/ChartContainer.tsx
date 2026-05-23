import { useState, useTransition } from 'react';
import { useChartData } from '../../hooks/useChartData';
import { PriceChart } from './PriceChart';
import type { IndicatorType } from '../../lib/chart/indicators';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { RefreshCw } from 'lucide-react';

interface ChartContainerProps {
  symbol: string;
  broker: 'alpaca' | 'binance';
  stopLossPrice?: number | null;
  targetPrice?: number | null;
  entryPrice?: number | null;
  height?: number;
  className?: string;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
const INDICATORS: { label: string; value: IndicatorType }[] = [
  { label: 'EMA20', value: 'EMA20' },
  { label: 'EMA50', value: 'EMA50' },
  { label: 'EMA200', value: 'EMA200' },
  { label: 'RSI', value: 'RSI' },
  { label: 'MACD', value: 'MACD' },
  { label: 'ATR', value: 'ATR' },
  { label: 'Volumen', value: 'Volume' }
];

export function ChartContainer({
  symbol,
  broker,
  stopLossPrice = null,
  targetPrice = null,
  entryPrice = null,
  height = 420,
  className = ''
}: ChartContainerProps) {
  const [timeframe, setTimeframe] = useState('1h');
  const [indicators, setIndicators] = useState<IndicatorType[]>(['EMA20', 'EMA50', 'Volume']);
  const [, startTransition] = useTransition();

  const {
    candles,
    isLoading,
    error,
    lastPrice,
    change24h,
    changePct24h,
    refetch
  } = useChartData({ symbol, timeframe, broker });

  const handleTimeframeChange = (tf: string) => {
    startTransition(() => {
      setTimeframe(tf);
    });
  };

  const toggleIndicator = (ind: IndicatorType) => {
    setIndicators(prev => 
      prev.includes(ind) 
        ? prev.filter(i => i !== ind) 
        : [...prev, ind]
    );
  };

  // Format pricing details
  const priceColorClass = change24h && change24h > 0 
    ? 'text-emerald-400' 
    : change24h && change24h < 0 
      ? 'text-red-400' 
      : 'text-gray-400';

  if (!symbol) {
    return (
      <div 
        style={{ height }}
        className="flex flex-col items-center justify-center text-gray-500 border border-gray-800 rounded-lg bg-surface"
      >
        <span className="text-3xl mb-2">📊</span>
        <p className="font-semibold text-sm">Seleccioná un símbolo</p>
        <p className="text-xs text-gray-600 mt-1">Hacé click en la watchlist o escribí en el buscador</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border border-gray-800 rounded-lg bg-surface overflow-hidden ${className}`}>
      
      {/* 1. Header del Chart */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-gray-800 bg-[#0a0e17]/40">
        <div className="flex items-center gap-3">
          {/* Symbol info */}
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-white tracking-wider">
              {symbol}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              {broker === 'binance' ? 'Crypto · Binance' : 'Equity · Alpaca'}
            </span>
          </div>

          {/* Pricing data */}
          {lastPrice !== null && (
            <div className="flex items-baseline gap-2 pl-3 border-l border-gray-800">
              <span className="font-mono text-base font-bold text-white">
                {formatCurrency(lastPrice, broker === 'binance' && lastPrice < 1 ? 6 : 2)}
              </span>
              {change24h !== null && changePct24h !== null && (
                <span className={`font-mono text-xs font-semibold ${priceColorClass}`}>
                  {formatPercent(changePct24h)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live streaming status badge */}
        <div className="flex items-center gap-2">
          {broker === 'binance' ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EN VIVO
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/20 text-blue-400 border border-blue-900/30">
              POLLING 60S
            </span>
          )}
          
          <button 
            onClick={refetch}
            title="Recargar datos"
            disabled={isLoading}
            className="p-1 rounded bg-[#1f2937] hover:bg-gray-700 text-gray-400 border border-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Barra de Herramientas (Timeframe & Indicadores) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-gray-800 bg-[#0f172a]/20">
        
        {/* Selector de Timeframe */}
        <div className="flex items-center gap-1 p-0.5 bg-gray-950/60 border border-gray-850 rounded">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 py-0.5 text-xs font-bold font-mono rounded cursor-pointer transition-all ${
                timeframe === tf 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Selector de Indicadores */}
        <div className="flex flex-wrap items-center gap-1">
          {INDICATORS.map(ind => {
            const active = indicators.includes(ind.value);
            return (
              <button
                key={ind.value}
                onClick={() => toggleIndicator(ind.value)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer transition-all ${
                  active 
                    ? 'border-blue-500 bg-blue-950/30 text-blue-400' 
                    : 'border-gray-800 bg-[#111827] text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                {ind.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Área del Gráfico */}
      <div className="relative flex-1 bg-[#0a0e17] overflow-hidden" style={{ minHeight: height }}>
        {isLoading && candles.length === 0 ? (
          /* Loading State: Shimmer skeleton */
          <div className="absolute inset-0 flex flex-col gap-3 p-4 animate-pulse justify-center">
            <div className="h-6 w-1/4 bg-gray-900 rounded mb-2" />
            <div className="flex-1 flex gap-2 items-end">
              {Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-gray-900 rounded-t"
                  style={{ height: `${Math.sin(i / 5) * 40 + 60}%` }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-red-400 bg-surface">
            <span className="text-3xl mb-2">⚠️</span>
            <p className="font-bold text-sm">Error al cargar datos de mercado</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">{error}</p>
            <button 
              onClick={refetch}
              className="mt-4 px-4 py-1.5 text-xs font-semibold rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          </div>
        ) : (
          /* Native chart display */
          <PriceChart
            candles={candles}
            indicators={indicators}
            stopLossPrice={stopLossPrice}
            targetPrice={targetPrice}
            entryPrice={entryPrice}
            height={height}
          />
        )}
      </div>

      {/* 4. Footer status info */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-800 text-[10px] text-gray-500 font-mono bg-gray-950/40">
        <span>Velas cargadas: {candles.length}</span>
        {candles.length > 0 && (
          <span>Último tick: {new Date(candles[candles.length - 1]!.time * 1000).toLocaleTimeString()}</span>
        )}
      </div>

    </div>
  );
}
