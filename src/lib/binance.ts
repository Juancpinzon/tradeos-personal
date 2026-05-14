// src/lib/binance.ts
import type { Position } from "../types";

interface BinanceBalance {
  asset: string;
  free: number;
  locked: number;
}

/**
 * Normaliza un balance de Binance al formato de Position unificado de TradeOS.
 * Nota: Binance Spot no entrega el precio promedio de compra directamente.
 * Se asume PnL 0 hasta que se implemente el cálculo via historial de órdenes.
 */
export function normalizeBinanceBalance(
  balance: BinanceBalance,
  priceUsd: number
): Position {
  const qty = balance.free + balance.locked;
  const marketValue = qty * priceUsd;

  return {
    id: `binance-${balance.asset}`,
    user_id: "", // Se llena en el hook
    symbol: balance.asset,
    qty,
    avg_entry_price: priceUsd, // Fallback al precio actual
    current_price: priceUsd,
    market_value: marketValue,
    unrealized_pnl: 0,
    unrealized_pnl_pct: 0,
    portfolio_weight_pct: 0,
    side: "long",
    asset_class: "crypto",
    broker: "binance",
    synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * Mapea símbolos de Binance a pares USDT para obtener precios.
 * Ej: BTC -> BTCUSDT
 */
export function getBinanceSymbolPrice(asset: string): string {
  if (asset === "USDT") return "USDTUSDT"; // O manejar especial
  return `${asset}USDT`;
}
