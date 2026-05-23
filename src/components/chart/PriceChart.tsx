import { useEffect, useRef } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  LineStyle, 
  CrosshairMode,
  createTextWatermark
} from 'lightweight-charts';
import type { 
  IChartApi, 
  Time, 
  LogicalRange 
} from 'lightweight-charts';
import { 
  calcEMA, 
  calcRSI, 
  calcMACD, 
  calcATR, 
  calcVolumeSeries 
} from '../../lib/chart/indicators';
import type { OHLCV, IndicatorType } from '../../lib/chart/indicators';

interface PriceChartProps {
  candles: OHLCV[];
  indicators: IndicatorType[];       // active indicators
  stopLossPrice?: number | null;     // horizontal red dashed line
  targetPrice?: number | null;       // horizontal green dashed line
  entryPrice?: number | null;        // horizontal blue dashed line
  height?: number;                   // default: 400
}

export function PriceChart({
  candles,
  indicators,
  stopLossPrice = null,
  targetPrice = null,
  entryPrice = null,
  height = 400
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Keep track of active chart instances for cleanup and sync
  const activeChartsRef = useRef<IChartApi[]>([]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || candles.length === 0) return;

    // 1. Clear previous DOM contents and instances
    container.innerHTML = '';
    activeChartsRef.current.forEach(c => {
      try {
        c.remove();
      } catch (e) {
        // Safe skip
      }
    });
    activeChartsRef.current = [];

    // 2. Determine pane heights dynamically to fit perfectly in the height
    const hasRsi = indicators.includes('RSI');
    const hasMacd = indicators.includes('MACD');
    const hasAtr = indicators.includes('ATR');

    let rsiHeight = 85;
    let macdHeight = 85;
    let atrHeight = 70;

    let mainHeight = height - 20; // reserve space for headers/spacing
    if (hasRsi) mainHeight -= rsiHeight;
    if (hasMacd) mainHeight -= macdHeight;
    if (hasAtr) mainHeight -= atrHeight;
    
    // Guarantee main candlestick chart always has a readable height
    mainHeight = Math.max(mainHeight, 150);

    const chartsToSync: IChartApi[] = [];

    // Styling configuration shared across all panes
    const chartOptions = {
      width: container.clientWidth,
      layout: {
        background: { color: '#0a0e17' }, // --bg-base
        textColor: '#9ca3af',             // --text-secondary
      },
      grid: {
        vertLines: { color: '#1f2937' },  // --border-subtle
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#374151',           // --border-default
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    };

    // ─── PANE 0: Main Candlestick Chart ──────────────────────────────────────
    const mainDiv = document.createElement('div');
    mainDiv.style.width = '100%';
    mainDiv.style.height = `${mainHeight}px`;
    mainDiv.style.position = 'relative';
    container.appendChild(mainDiv);

    const mainChart = createChart(mainDiv, {
      ...chartOptions,
      height: mainHeight,
    });
    activeChartsRef.current.push(mainChart);
    chartsToSync.push(mainChart);

    // Add TradingView text watermark to satisfy Apache 2.0 attribution requirement
    const mainPane = mainChart.panes()[0];
    if (mainPane) {
      createTextWatermark(mainPane, {
        horzAlign: 'left' as const,
        vertAlign: 'bottom' as const,
        lines: [
          {
            text: 'TradingView',
            color: 'rgba(255, 255, 255, 0.08)',
            fontSize: 11,
          }
        ]
      });
    }

    // Candlesticks
    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    const formattedCandles = candles.map(c => ({
      ...c,
      time: c.time as Time
    }));
    candlestickSeries.setData(formattedCandles);

    // EMA 20
    if (indicators.includes('EMA20')) {
      const ema20 = mainChart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        title: 'EMA 20',
      });
      ema20.setData(calcEMA(candles, 20));
    }

    // EMA 50
    if (indicators.includes('EMA50')) {
      const ema50 = mainChart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 50',
      });
      ema50.setData(calcEMA(candles, 50));
    }

    // EMA 200
    if (indicators.includes('EMA200')) {
      const ema200 = mainChart.addSeries(LineSeries, {
        color: '#8b5cf6',
        lineWidth: 2,
        title: 'EMA 200',
      });
      ema200.setData(calcEMA(candles, 200));
    }

    // Volume Overlay (Bottom 20% scale margins)
    if (indicators.includes('Volume')) {
      const volumeSeries = mainChart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      
      mainChart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      volumeSeries.setData(calcVolumeSeries(candles));
    }

    // Price Lines (Stop Loss, Target, Entry) on Main Chart
    if (typeof stopLossPrice === 'number' && stopLossPrice > 0) {
      candlestickSeries.createPriceLine({
        price: stopLossPrice,
        color: '#ef4444',
        lineStyle: LineStyle.Dashed,
        lineWidth: 2,
        title: 'Stop Loss',
      });
    }

    if (typeof targetPrice === 'number' && targetPrice > 0) {
      candlestickSeries.createPriceLine({
        price: targetPrice,
        color: '#10b981',
        lineStyle: LineStyle.Dashed,
        lineWidth: 2,
        title: 'Target',
      });
    }

    if (typeof entryPrice === 'number' && entryPrice > 0) {
      candlestickSeries.createPriceLine({
        price: entryPrice,
        color: '#3b82f6',
        lineStyle: LineStyle.Dashed,
        lineWidth: 2,
        title: 'Entrada',
      });
    }

    // ─── PANE 1: RSI Pane ────────────────────────────────────────────────────
    if (hasRsi) {
      const rsiDiv = document.createElement('div');
      rsiDiv.style.width = '100%';
      rsiDiv.style.height = `${rsiHeight}px`;
      rsiDiv.style.borderTop = '1px solid #1f2937';
      rsiDiv.style.position = 'relative';
      container.appendChild(rsiDiv);

      const rsiChart = createChart(rsiDiv, {
        ...chartOptions,
        height: rsiHeight,
        timeScale: {
          ...chartOptions.timeScale,
          visible: false, // hide timeframe axis on middle charts
        }
      });
      activeChartsRef.current.push(rsiChart);
      chartsToSync.push(rsiChart);

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#10b981',
        lineWidth: 2,
        title: 'RSI (14)',
      });

      rsiSeries.createPriceLine({
        price: 30,
        color: '#4b5563',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        title: '30',
      });

      rsiSeries.createPriceLine({
        price: 70,
        color: '#4b5563',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        title: '70',
      });

      rsiSeries.setData(calcRSI(candles, 14));
    }

    // ─── PANE 2: MACD Pane ───────────────────────────────────────────────────
    if (hasMacd) {
      const macdDiv = document.createElement('div');
      macdDiv.style.width = '100%';
      macdDiv.style.height = `${macdHeight}px`;
      macdDiv.style.borderTop = '1px solid #1f2937';
      macdDiv.style.position = 'relative';
      container.appendChild(macdDiv);

      const macdChart = createChart(macdDiv, {
        ...chartOptions,
        height: macdHeight,
        timeScale: {
          ...chartOptions.timeScale,
          visible: false, // hide timeframe axis on middle charts
        }
      });
      activeChartsRef.current.push(macdChart);
      chartsToSync.push(macdChart);

      const macdLineSeries = macdChart.addSeries(LineSeries, {
        color: '#2563eb',
        lineWidth: 1,
        title: 'MACD',
      });

      const macdSignalSeries = macdChart.addSeries(LineSeries, {
        color: '#ea580c',
        lineWidth: 1,
        title: 'Sig',
      });

      const macdHistSeries = macdChart.addSeries(HistogramSeries, {
        title: 'Hist',
      });

      const macdData = calcMACD(candles);
      macdLineSeries.setData(macdData.macd);
      macdSignalSeries.setData(macdData.signal);
      macdHistSeries.setData(macdData.histogram);
    }

    // ─── PANE 3: ATR Pane ────────────────────────────────────────────────────
    if (hasAtr) {
      const atrDiv = document.createElement('div');
      atrDiv.style.width = '100%';
      atrDiv.style.height = `${atrHeight}px`;
      atrDiv.style.borderTop = '1px solid #1f2937';
      atrDiv.style.position = 'relative';
      container.appendChild(atrDiv);

      const atrChart = createChart(atrDiv, {
        ...chartOptions,
        height: atrHeight,
        timeScale: {
          ...chartOptions.timeScale,
          visible: false, // hide timeframe axis on middle charts
        }
      });
      activeChartsRef.current.push(atrChart);
      chartsToSync.push(atrChart);

      const atrSeries = atrChart.addSeries(LineSeries, {
        color: '#6b7280',
        lineWidth: 2,
        title: 'ATR (14)',
      });

      atrSeries.setData(calcATR(candles, 14));
    }

    // Ensure the last chart in the DOM stacked view actually has its timeScale visible
    if (chartsToSync.length > 0) {
      const lastChart = chartsToSync[chartsToSync.length - 1]!;
      lastChart.applyOptions({
        timeScale: {
          visible: true
        }
      });
    }

    // ─── TimeScale Synchronization (Scroll & Zoom) ───────────────────────────
    let isSyncing = false;
    chartsToSync.forEach(activeChart => {
      activeChart.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
        if (isSyncing || !range) return;
        isSyncing = true;
        chartsToSync.forEach(otherChart => {
          if (otherChart !== activeChart) {
            otherChart.timeScale().setVisibleLogicalRange(range);
          }
        });
        isSyncing = false;
      });
    });

    // Handle ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const width = entries[0].contentRect.width;
        chartsToSync.forEach(c => {
          c.resize(width, c.options().height || 100);
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      activeChartsRef.current.forEach(c => {
        try {
          c.remove();
        } catch (e) {
          // Safe skip
        }
      });
      activeChartsRef.current = [];
    };
  }, [candles, indicators, stopLossPrice, targetPrice, entryPrice, height]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full flex flex-col"
      style={{ minHeight: `${height}px`, background: '#0a0e17' }} 
    />
  );
}
