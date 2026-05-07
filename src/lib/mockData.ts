// ─────────────────────────────────────────────────────────────────────────────
// src/lib/mockData.ts — Datos demo realistas para Modo Demo
// TODO: reemplazar mock por llamada a alpaca-proxy cuando las keys estén disponibles.
//
// ARQUITECTURA:
// - Los tipos son idénticos a los que usarían datos reales
// - El origen del dato cambia (mock vs Edge Function), no la estructura
// - Buscar "MOCK_" en el codebase para encontrar todos los puntos de reemplazo
// ─────────────────────────────────────────────────────────────────────────────

import type { AccountSummary, Position, EquitySnapshot } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// CUENTA ALPACA PAPER (demo)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ACCOUNT: AccountSummary = {
  equity:       125_430.50,
  cash:          18_200.00,
  buying_power:  36_400.00,
  pnl_today:     +1_243.20,
  pnl_today_pct: +1.00,
  broker: 'alpaca',
  mode:   'paper',
}

// ─────────────────────────────────────────────────────────────────────────────
// POSICIONES MOCK (seed data del CLAUDE.md)
// ─────────────────────────────────────────────────────────────────────────────

// Equity total para calcular portfolio_weight_pct
const TOTAL_EQUITY = MOCK_ACCOUNT.equity

function makePosition(
  symbol: string,
  qty: number,
  avg_entry_price: number,
  current_price: number,
  asset_class: 'equity' | 'crypto' = 'equity',
): Position {
  const market_value      = qty * current_price
  const unrealized_pnl     = (current_price - avg_entry_price) * qty
  const unrealized_pnl_pct = ((current_price - avg_entry_price) / avg_entry_price) * 100
  const portfolio_weight_pct = (market_value / TOTAL_EQUITY) * 100

  return {
    id:         `mock-${symbol.toLowerCase()}`,
    user_id:    'mock-user',
    broker:     'alpaca',
    symbol,
    qty,
    avg_entry_price,
    current_price,
    market_value,
    unrealized_pnl,
    unrealized_pnl_pct,
    portfolio_weight_pct,
    side:       'long',
    asset_class,
    synced_at:  new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
}

export const MOCK_POSITIONS: Position[] = [
  makePosition('AAPL', 45, 168.20, 182.50),   // +$643.50 (+8.50%)
  makePosition('MSFT', 20, 378.00, 415.30),   // +$746.00 (+9.87%)
  makePosition('NVDA', 15, 820.00, 950.80),   // +$1,962.00 (+15.95%)
  makePosition('TSLA', 10, 195.00, 178.40),   // -$166.00 (-8.51%) ← pérdida
  makePosition('SPY',  30, 490.00, 528.60),   // +$1,158.00 (+7.88%)
]

// ─────────────────────────────────────────────────────────────────────────────
// EQUITY SNAPSHOTS — últimos 30 días con variación realista
// Desde ~$118,000 hasta $125,430 (equity actual)
// ─────────────────────────────────────────────────────────────────────────────

function generateEquitySnapshots(): EquitySnapshot[] {
  const snapshots: EquitySnapshot[] = []
  const now     = new Date()
  const start   = 118_000
  const end     = MOCK_ACCOUNT.equity
  const days    = 30

  // Generamos una trayectoria realista con algo de ruido pero tendencia alcista
  // Los valores son deterministas (no aleatorios) para consistencia en re-renders
  const dailyChanges = [
    0.3, -0.8, 1.2, 0.5, -0.3, 1.8, 0.7, -0.4, 0.9, 1.1,
    -1.2, 0.6, 2.1, -0.7, 0.4, 1.5, -0.2, 0.8, 1.3, -0.5,
    0.6, 1.9, -0.3, 0.7, 1.1, 0.4, -0.6, 1.4, 0.8, 0.9,
  ]

  let currentEquity = start
  const totalTarget = end - start
  // totalDrift usado implícitamente para estabilizar la curva
  void dailyChanges.reduce((a, b) => a + b, 0)

  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() - (days - 1 - i))

    // Ajustamos la variación diaria para que llegue al equity final
    const drift   = (dailyChanges[i] ?? 0)
    const step    = (totalTarget / days) + (drift * 200)
    currentEquity = Math.max(currentEquity + step, start * 0.95)

    // En el último punto forzamos el valor exacto
    const equity = i === days - 1 ? end : Math.round(currentEquity * 100) / 100

    snapshots.push({
      id:           `mock-snap-${i}`,
      user_id:      'mock-user',
      broker:       'total',
      equity,
      cash:          MOCK_ACCOUNT.cash * (0.9 + (i / days) * 0.2),
      buying_power:  MOCK_ACCOUNT.buying_power * (0.9 + (i / days) * 0.2),
      snapshot_at:  date.toISOString(),
    })
  }

  return snapshots
}

export const MOCK_EQUITY_SNAPSHOTS: EquitySnapshot[] = generateEquitySnapshots()
