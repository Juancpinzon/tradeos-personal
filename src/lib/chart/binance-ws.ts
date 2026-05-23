/*
 * NOTA DE ARQUITECTURA: Este módulo conecta directamente a stream.binance.com
 * sin API key. Los datos de precios de mercado de Binance son públicos y no
 * requieren autenticación. Esta es la única excepción al principio de "no
 * llamadas externas desde el cliente" — aplica exclusivamente a datos de
 * mercado sin autenticación (equivalente a un embed de chart externo).
 * Las operaciones de cuenta (balances, órdenes) siguen yendo por alpaca-proxy
 * y binance-proxy Edge Functions.
 */

import type { OHLCV } from './indicators';

export interface BinanceKline {
  time: number;        // kline open time (ms → convertir a s para lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;   // true cuando la vela cierra
}

export interface BinanceTicker {
  symbol: string;
  price: number;
  change24h: number;
  changePct24h: number;
}

interface WSCallbacks {
  onKline: (kline: BinanceKline) => void;
  onTicker: (ticker: BinanceTicker) => void;
  onError?: (err: Event) => void;
}

export class BinanceChartWS {
  private symbol: string;
  private interval: string;
  private callbacks: WSCallbacks;
  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private maxReconnectRetries = 5;
  private isIntentionalDisconnect = false;
  private reconnectTimer: number | null = null;

  constructor(symbol: string, interval: string, callbacks: WSCallbacks) {
    this.symbol = symbol;
    this.interval = interval;
    this.callbacks = callbacks;
  }

  private getWSUrl(): string {
    const norm = this.symbol.toLowerCase().replace('/', '');
    // Binance miniTicker para cambio de precio de 24h, y kline para velas en vivo
    return `wss://stream.binance.com:9443/stream?streams=${norm}@kline_${this.interval}/${norm}@miniTicker`;
  }

  public connect(): void {
    this.isIntentionalDisconnect = false;
    const url = this.getWSUrl();
    
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error('[BinanceWS] Error al crear WebSocket:', e);
      this.handleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log(`[BinanceWS] [${new Date().toISOString()}] Conectado a stream de Binance para ${this.symbol}`);
      this.reconnectCount = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { stream, data } = payload;

        if (!data) return;

        if (stream.includes('@kline')) {
          const k = data.k;
          if (k) {
            const kline: BinanceKline = {
              time: Math.floor(k.t / 1000), // ms a s
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isClosed: k.x
            };
            this.callbacks.onKline(kline);
          }
        } else if (stream.includes('@miniTicker')) {
          const price = parseFloat(data.c);
          const open = parseFloat(data.o);
          const change24h = price - open;
          const changePct24h = open > 0 ? (change24h / open) * 100 : 0;

          const ticker: BinanceTicker = {
            symbol: this.symbol,
            price,
            change24h,
            changePct24h
          };
          this.callbacks.onTicker(ticker);
        }
      } catch (err) {
        console.error('[BinanceWS] Error al parsear mensaje:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[BinanceWS] WebSocket error:', err);
      if (this.callbacks.onError) this.callbacks.onError(err);
    };

    this.ws.onclose = (event) => {
      console.log(`[BinanceWS] [${new Date().toISOString()}] Conexión cerrada. Code: ${event.code}. Limpio: ${event.wasClean}`);
      if (!this.isIntentionalDisconnect) {
        this.handleReconnect();
      }
    };
  }

  private handleReconnect(): void {
    if (this.reconnectCount >= this.maxReconnectRetries) {
      console.error('[BinanceWS] Máximo de reintentos alcanzado. Deteniendo reconexión.');
      return;
    }

    const backoff = Math.pow(2, this.reconnectCount) * 1000; // 1s, 2s, 4s, 8s, 16s
    this.reconnectCount++;

    console.log(`[BinanceWS] [${new Date().toISOString()}] Intentando reconectar en ${backoff / 1000}s (Intento ${this.reconnectCount}/${this.maxReconnectRetries})`);
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, backoff);
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log(`[BinanceWS] Desconectado manualmente de ${this.symbol}`);
  }

  public changeSymbol(symbol: string, interval: string): void {
    console.log(`[BinanceWS] Cambiando símbolo de ${this.symbol} (${this.interval}) a ${symbol} (${interval})`);
    this.disconnect();
    this.symbol = symbol;
    this.interval = interval;
    this.connect();
  }
}

// REST fetch inicial de klines históricos
export async function fetchBinanceKlines(symbol: string, interval: string, limit = 500): Promise<OHLCV[]> {
  const norm = symbol.toUpperCase().replace('/', '');
  const url = `https://api.binance.com/api/v3/klines?symbol=${norm}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error en Binance API REST (HTTP ${res.status})`);
  }

  const raw = await res.json() as Array<any[]>;
  return raw.map(bar => ({
    time: Math.floor(bar[0] / 1000), // ms a s
    open: parseFloat(bar[1]),
    high: parseFloat(bar[2]),
    low: parseFloat(bar[3]),
    close: parseFloat(bar[4]),
    volume: parseFloat(bar[5])
  }));
}
