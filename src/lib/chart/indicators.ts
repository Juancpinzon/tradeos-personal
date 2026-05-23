import type { Time, LineData, HistogramData } from 'lightweight-charts';

export interface OHLCV {
  time: number;  // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorType = 'EMA20' | 'EMA50' | 'EMA200' | 'RSI' | 'MACD' | 'ATR' | 'Volume';

// Helper to compute SMA (Simple Moving Average)
function calcSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// EMA calculator
export function calcEMA(data: OHLCV[], period: number): LineData[] {
  const emaList: LineData[] = [];
  if (data.length < period) return emaList;

  const k = 2 / (period + 1);
  
  // Seed with SMA
  const initialPrices = data.slice(0, period).map(d => d.close);
  let prevEma = calcSMA(initialPrices, period);
  
  emaList.push({
    time: data[period - 1]!.time as Time,
    value: prevEma
  });

  for (let i = period; i < data.length; i++) {
    const currentClose = data[i]!.close;
    const currentEma = currentClose * k + prevEma * (1 - k);
    emaList.push({
      time: data[i]!.time as Time,
      value: currentEma
    });
    prevEma = currentEma;
  }

  return emaList;
}

// Helper to calculate EMA on an arbitrary series of { time, value }
function calcEMAForSeries(series: { time: Time; value: number }[], period: number): LineData[] {
  const emaList: LineData[] = [];
  if (series.length < period) return emaList;

  const k = 2 / (period + 1);
  const initialValues = series.slice(0, period).map(s => s.value);
  let prevEma = initialValues.reduce((a, b) => a + b, 0) / period;

  emaList.push({
    time: series[period - 1]!.time,
    value: prevEma
  });

  for (let i = period; i < series.length; i++) {
    const currentVal = series[i]!.value;
    const currentEma = currentVal * k + prevEma * (1 - k);
    emaList.push({
      time: series[i]!.time,
      value: currentEma
    });
    prevEma = currentEma;
  }

  return emaList;
}

// RSI (Wilder's smoothed RSI)
export function calcRSI(data: OHLCV[], period: number = 14): LineData[] {
  const rsiList: LineData[] = [];
  if (data.length <= period) return rsiList;

  // Calculate daily gains/losses
  const gains: number[] = [0];
  const losses: number[] = [0];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i]!.close - data[i - 1]!.close;
    gains.push(diff > 0 ? diff : 0);
    const loss = diff < 0 ? -diff : 0;
    losses.push(loss);
  }

  // Seed with SMA
  let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  rsiList.push({
    time: data[period]!.time as Time,
    value: rsi
  });

  for (let i = period + 1; i < data.length; i++) {
    const currentGain = gains[i]!;
    const currentLoss = losses[i]!;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    rsiList.push({
      time: data[i]!.time as Time,
      value: rsi
    });
  }

  return rsiList;
}

// MACD (12, 26, 9)
export function calcMACD(
  data: OHLCV[],
  fast = 12,
  slow = 26,
  signal = 9
): {
  macd: LineData[];
  signal: LineData[];
  histogram: HistogramData[];
} {
  const empty = { macd: [], signal: [], histogram: [] };
  if (data.length < slow) return empty;

  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);

  // We align them by time
  const macdSeries: { time: Time; value: number }[] = [];
  const emaFastMap = new Map<number, number>();
  emaFast.forEach(item => emaFastMap.set(item.time as number, item.value));

  emaSlow.forEach(item => {
    const t = item.time as number;
    const valFast = emaFastMap.get(t);
    if (valFast !== undefined) {
      macdSeries.push({
        time: item.time,
        value: valFast - item.value
      });
    }
  });

  if (macdSeries.length < signal) return empty;

  // Signal line is EMA of MACD series
  const signalSeries = calcEMAForSeries(macdSeries, signal);

  // Histogram is MACD - Signal
  const signalMap = new Map<number, number>();
  signalSeries.forEach(item => signalMap.set(item.time as number, item.value));

  const histogram: HistogramData[] = [];
  const macdFinal: LineData[] = [];
  const signalFinal: LineData[] = [];

  macdSeries.forEach(m => {
    const t = m.time as number;
    const sigVal = signalMap.get(t);
    if (sigVal !== undefined) {
      const histVal = m.value - sigVal;
      macdFinal.push(m);
      signalFinal.push({ time: m.time, value: sigVal });
      histogram.push({
        time: m.time,
        value: histVal,
        color: histVal >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
      });
    }
  });

  return {
    macd: macdFinal,
    signal: signalFinal,
    histogram
  };
}

// ATR (Average True Range)
export function calcATR(data: OHLCV[], period: number = 14): LineData[] {
  const atrList: LineData[] = [];
  if (data.length < period) return atrList;

  // Compute TRs
  const trs: number[] = [];
  trs.push(data[0]!.high - data[0]!.low);

  for (let i = 1; i < data.length; i++) {
    const hl = data[i]!.high - data[i]!.low;
    const hpc = Math.abs(data[i]!.high - data[i - 1]!.close);
    const lpc = Math.abs(data[i]!.low - data[i - 1]!.close);
    trs.push(Math.max(hl, hpc, lpc));
  }

  // Seed ATR with SMA of TR
  let prevAtr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrList.push({
    time: data[period - 1]!.time as Time,
    value: prevAtr
  });

  for (let i = period; i < data.length; i++) {
    const currentTr = trs[i]!;
    const currentAtr = (prevAtr * (period - 1) + currentTr) / period;
    atrList.push({
      time: data[i]!.time as Time,
      value: currentAtr
    });
    prevAtr = currentAtr;
  }

  return atrList;
}

// Volume series
export function calcVolumeSeries(data: OHLCV[]): HistogramData[] {
  return data.map(d => ({
    time: d.time as Time,
    value: d.volume,
    color: d.close >= d.open ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
  }));
}
