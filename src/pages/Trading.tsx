// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Trading.tsx — Página de trading
// Layout dos columnas:
//   Izquierda: OrderForm + RiskCalculator (integrado en el form)
//   Derecha:   Watchlist con precios simulados + OrderHistory debajo
// Símbolo seleccionado en watchlist → precarga en OrderForm
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import OrderForm from '../components/trading/OrderForm'
import ConfirmOrderModal from '../components/trading/ConfirmOrderModal'
import OrderHistory from '../components/trading/OrderHistory'
import { useOrders } from '../hooks/useOrders'
import { usePortfolio } from '../hooks/usePortfolio'
import { formatCurrency, formatPercent } from '../lib/formatters'
import type { OrderDraft } from '../components/trading/OrderForm'
import type { UserSettings } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Config de watchlist (mock: se reemplazará con useMarketData en Fase 3)
// ─────────────────────────────────────────────────────────────────────────────

interface WatchItem {
  symbol: string
  price: number
  change1d: number
  inPortfolio: boolean
  earningsDays?: number | null
}

const MOCK_WATCHLIST: WatchItem[] = []

// Settings por defecto (se reemplazará con hook useSettings en Fase 6)
const DEFAULT_SETTINGS: UserSettings = {
  id:                  'loading',
  alpaca_mode:         'paper',
  live_trading_enabled: false,
  default_broker:      'alpaca',
  risk_per_trade_pct:   1,
  max_position_size_pct: 10,
  created_at:          new Date().toISOString(),
  updated_at:          new Date().toISOString(),
}

// ─────────────────────────────────────────────────────────────────────────────
// Watchlist row
// ─────────────────────────────────────────────────────────────────────────────

function WatchlistRow({
  item,
  isSelected,
  onClick,
}: {
  item: WatchItem
  isSelected: boolean
  onClick: () => void
}) {
  const isPositive = item.change1d >= 0

  return (
    <div
      className={`watchlist-row ${isSelected ? 'watchlist-row--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="watchlist-row__left">
        <div className="watchlist-row__symbol">
          {item.symbol}
          {item.inPortfolio && (
            <span className="watchlist-row__portfolio-dot" title="En portafolio" />
          )}
        </div>
        {item.earningsDays !== null && item.earningsDays !== undefined && (
          <span className="watchlist-row__earnings">
            📅 {item.earningsDays}d
          </span>
        )}
      </div>
      <div className="watchlist-row__right">
        <span className="watchlist-row__price font-mono">
          {formatCurrency(item.price)}
        </span>
        <span
          className="watchlist-row__change font-mono"
          style={{ color: isPositive ? 'var(--color-profit)' : 'var(--color-loss)' }}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {formatPercent(item.change1d)}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Trading page principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Trading() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [pendingDraft, setPendingDraft] = useState<OrderDraft | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastConfirmed, setLastConfirmed] = useState<string | null>(null)

  const { orders, isLoading: ordersLoading, submitOrder } = useOrders()
  const { account, positions } = usePortfolio()

  // Precio actual del símbolo seleccionado (desde watchlist mock)
  const selectedItem = MOCK_WATCHLIST.find(w => w.symbol === selectedSymbol) ?? null
  const currentPrice = selectedItem?.price ?? null

  // Posición actual del símbolo para mostrar portfolio_weight_at_order en modal
  const currentPosition = positions.find(p => p.symbol === selectedSymbol)
  const portfolioWeightAtOrder = currentPosition?.portfolio_weight_pct ?? null

  // ── Handler: watchlist click ──────────────────────────────────────────────
  const handleSelectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol)
    setPendingDraft(null)
    setSubmitError(null)
  }, [])

  // ── Handler: OrderForm → review ────────────────────────────────────────────
  const handleReviewOrder = useCallback((draft: OrderDraft) => {
    setSubmitError(null)
    setPendingDraft(draft)
  }, [])

  // ── Handler: modal confirm ─────────────────────────────────────────────────
  const handleConfirmOrder = useCallback(async () => {
    if (!pendingDraft) return
    setSubmitError(null)

    try {
      // Calcular risk snapshot para guardar junto a la orden
      const entryPrice = pendingDraft.estimated_price ?? pendingDraft.limit_price ?? 0
      const stopLoss   = pendingDraft.stop_loss ?? 0
      const stopDist   = pendingDraft.side === 'buy'
        ? entryPrice - stopLoss
        : stopLoss - entryPrice

      const riskAmount = stopDist > 0 ? pendingDraft.qty * stopDist : undefined

      let rrRatio: number | undefined
      if (pendingDraft.target && stopDist > 0) {
        const reward = pendingDraft.side === 'buy'
          ? pendingDraft.target - entryPrice
          : entryPrice - pendingDraft.target
        if (reward > 0) rrRatio = reward / stopDist
      }

      await submitOrder.mutateAsync({
        ...pendingDraft,
        risk_amount:              riskAmount,
        portfolio_weight_at_order: portfolioWeightAtOrder ?? undefined,
        risk_reward_ratio:        rrRatio,
      })

      setLastConfirmed(`${pendingDraft.side.toUpperCase()} ${pendingDraft.qty} ${pendingDraft.symbol}`)
      setPendingDraft(null)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar la orden'
      setSubmitError(message)
      // Dejar el modal abierto para mostrar el error
    }
  }, [pendingDraft, submitOrder, portfolioWeightAtOrder])

  // ── Handler: modal cancel ──────────────────────────────────────────────────
  const handleCancelModal = useCallback(() => {
    setPendingDraft(null)
    setSubmitError(null)
  }, [])

  return (
    <div className="trading-page">

      {/* Columna izquierda — Order form */}
      <div className="trading-col trading-col--left">

        {/* Header de la columna */}
        <div className="trading-col__header">
          <span className="trading-col__title">ORDER ENTRY</span>
          <span className="badge badge-paper">PAPER MODE</span>
        </div>

        {/* Success banner */}
        {lastConfirmed && !pendingDraft && (
          <div className="trading-success">
            <span>✓</span>
            <span>Orden enviada: <strong>{lastConfirmed}</strong></span>
            <button
              onClick={() => setLastConfirmed(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', fontSize: '1rem', opacity: 0.7 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Error banner */}
        {submitError && (
          <div className="trading-error">
            <span>⚠</span>
            <span>{submitError}</span>
            <button
              onClick={() => setSubmitError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', fontSize: '1rem', opacity: 0.7 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Order form */}
        <div className="trading-col__body">
          <OrderForm
            initialSymbol={selectedSymbol}
            currentPrice={currentPrice}
            totalEquity={account?.equity ?? 0}
            userSettings={DEFAULT_SETTINGS}
            onReviewOrder={handleReviewOrder}
          />

          {/* Hint: seleccionar de watchlist */}
          {!selectedSymbol && (
            <p className="trading-hint">
              <Clock size={11} />
              Seleccioná un símbolo de la watchlist para precargar el precio actual
            </p>
          )}
        </div>
      </div>

      {/* Columna derecha — Watchlist + Order history */}
      <div className="trading-col trading-col--right">

        {/* Watchlist */}
        <div className="trading-watchlist">
          <div className="trading-col__header">
            <span className="trading-col__title">WATCHLIST</span>
            <button
              className="trading-col__refresh"
              title="Actualizar precios (Fase 3)"
              disabled
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="watchlist-body">
            {MOCK_WATCHLIST.map(item => (
              <WatchlistRow
                key={item.symbol}
                item={item}
                isSelected={selectedSymbol === item.symbol}
                onClick={() => handleSelectSymbol(item.symbol)}
              />
            ))}
          </div>

          <div className="watchlist-footer">
            <span className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              ● Precios en tiempo real disponibles en Fase 3
            </span>
          </div>
        </div>

        {/* Order history */}
        <div className="trading-history">
          <OrderHistory
            orders={orders}
            isLoading={ordersLoading}
            limit={15}
          />
        </div>
      </div>

      {/* Modal de confirmación — SIEMPRE antes de ejecutar */}
      {pendingDraft && (
        <ConfirmOrderModal
          draft={pendingDraft}
          totalEquity={account?.equity ?? 0}
          portfolioWeightAtOrder={portfolioWeightAtOrder}
          userSettings={DEFAULT_SETTINGS}
          isSubmitting={submitOrder.isPending}
          onConfirm={handleConfirmOrder}
          onCancel={handleCancelModal}
        />
      )}

      <style>{`
        .trading-page {
          display: grid;
          grid-template-columns: 360px 1fr;
          height: 100%;
          overflow: hidden;
          background: var(--bg-base);
        }
        @media (max-width: 900px) {
          .trading-page {
            grid-template-columns: 1fr;
            overflow: auto;
          }
        }
        .trading-col {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid var(--border-subtle);
        }
        .trading-col--right {
          border-right: none;
          overflow-y: auto;
        }
        .trading-col__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-default);
          background: var(--bg-surface);
          flex-shrink: 0;
        }
        .trading-col__title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .trading-col__refresh {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: not-allowed;
          opacity: 0.5;
          padding: 2px;
          display: flex;
          align-items: center;
        }
        .trading-col__body {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .trading-success {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(16, 185, 129, 0.08);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 0.78rem;
          color: var(--color-profit);
          flex-shrink: 0;
        }
        .trading-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(239, 68, 68, 0.08);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          font-size: 0.78rem;
          color: var(--color-loss);
          flex-shrink: 0;
        }
        .trading-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--text-muted);
          font-style: italic;
        }
        /* Watchlist */
        .trading-watchlist {
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
          flex-shrink: 0;
        }
        .watchlist-body {
          max-height: 320px;
          overflow-y: auto;
        }
        .watchlist-footer {
          padding: 8px 14px;
          border-top: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.01);
        }
        .watchlist-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 14px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background 120ms ease;
          gap: 12px;
        }
        .watchlist-row:last-child { border-bottom: none; }
        .watchlist-row:hover {
          background: var(--bg-hover);
        }
        .watchlist-row--selected {
          background: rgba(59, 130, 246, 0.08) !important;
          border-left: 2px solid var(--color-primary);
        }
        .watchlist-row__left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .watchlist-row__symbol {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: "IBM Plex Mono", monospace;
        }
        .watchlist-row__portfolio-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--color-primary);
          display: inline-block;
          flex-shrink: 0;
        }
        .watchlist-row__earnings {
          font-size: 0.62rem;
          color: var(--color-warning);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 4px;
          padding: 1px 5px;
        }
        .watchlist-row__right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .watchlist-row__price {
          font-size: 0.82rem;
          color: var(--text-primary);
          font-weight: 500;
        }
        .watchlist-row__change {
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        /* History */
        .trading-history {
          padding: 14px;
        }
      `}</style>
    </div>
  )
}
