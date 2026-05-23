// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Trading.tsx — Página de trading
// Layout dos columnas:
//   Izquierda: OrderForm + RiskCalculator (integrado en el form)
//   Derecha:   Watchlist con precios simulados + OrderHistory debajo
// Símbolo seleccionado en watchlist → precarga en OrderForm
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import OrderForm from '../components/trading/OrderForm'
import ConfirmOrderModal from '../components/trading/ConfirmOrderModal'
import OrderHistory from '../components/trading/OrderHistory'
import { WatchlistPanel } from '../components/watchlist/WatchlistPanel'
import { useOrders } from '../hooks/useOrders'
import { usePortfolio } from '../hooks/usePortfolio'
import { useWatchlist } from '../hooks/useWatchlist'
import { useSettings } from '../hooks/useSettings'
import { useFlightPlan } from '../hooks/useFlightPlan'
import { useTradingStore } from '../stores/tradingStore'
import { ChartContainer } from '../components/chart/ChartContainer'
import type { OrderDraft } from '../components/trading/OrderForm'
import type { UserSettings } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Trading page principal
// ─────────────────────────────────────────────────────────────────────────────

function inferBroker(symbol: string): 'binance' | 'alpaca' {
  const s = symbol.toUpperCase().trim();
  const isCrypto = 
    s.includes('/') || 
    s.endsWith('USDT') || 
    s.endsWith('BTC') || 
    s.endsWith('ETH') || 
    s.endsWith('SOL') ||
    s.endsWith('BNB') ||
    s.endsWith('XRP') ||
    s.endsWith('ADA') ||
    s.endsWith('DOGE') ||
    s.endsWith('AVAX') ||
    s.endsWith('DOT') ||
    s.endsWith('LINK');
    
  return isCrypto ? 'binance' : 'alpaca';
}

export default function Trading() {
  const [searchParams] = useSearchParams()
  const selectedSymbol = searchParams.get('symbol') || ''
  
  const [pendingDraft, setPendingDraft] = useState<OrderDraft | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastConfirmed, setLastConfirmed] = useState<string | null>(null)

  const { orders, isLoading: ordersLoading, submitOrder, isSubmitting, cancelOrder } = useOrders()
  const { account, positions } = usePortfolio()
  const { items: watchlistItems } = useWatchlist()
  const { data: settings } = useSettings()
  const { plan } = useFlightPlan()

  // Zustand Store
  const { 
    symbol: activeSymbol, 
    setSymbol, 
    stopLossPrice, 
    targetPrice,
    setEntryPrice
  } = useTradingStore()

  // Sync de URL param symbol a tradingStore
  useEffect(() => {
    if (selectedSymbol) {
      setSymbol(selectedSymbol);
    }
  }, [selectedSymbol, setSymbol])

  const userSettings: UserSettings = settings || {
    id: 'loading',
    alpaca_mode: 'paper',
    live_trading_enabled: false,
    default_broker: 'alpaca',
    risk_per_trade_pct: 2,
    max_position_size_pct: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Precio actual del símbolo seleccionado
  const selectedWatchItem = useMemo(() => 
    watchlistItems.find(w => w.symbol === selectedSymbol),
    [watchlistItems, selectedSymbol]
  )
  const currentPrice = selectedWatchItem?.marketData?.price ?? null

  // Precio actual del símbolo activo en el store
  const activeWatchItem = useMemo(() => 
    watchlistItems.find(w => w.symbol === activeSymbol),
    [watchlistItems, activeSymbol]
  )
  const activePrice = activeWatchItem?.marketData?.price ?? currentPrice ?? null

  // Sync del precio activo como entryPrice al store
  useEffect(() => {
    if (activePrice !== null) {
      setEntryPrice(activePrice);
    }
  }, [activePrice, setEntryPrice])

  // Posición actual del símbolo
  const currentPosition = positions.find(p => p.symbol === selectedSymbol)
  const portfolioWeightAtOrder = currentPosition?.portfolio_weight_pct ?? null

  // Suggested trade type from flight plan
  const suggestedTradeType = useMemo(() => {
    if (!pendingDraft || !plan) return null
    const candidate = plan.candidates?.find(
      (c: any) => c.symbol.toUpperCase() === pendingDraft.symbol.toUpperCase()
    )
    return candidate?.trade_type ?? null
  }, [pendingDraft, plan])

  // ── Handler: OrderForm → review ────────────────────────────────────────────
  const handleReviewOrder = useCallback((draft: OrderDraft) => {
    setSubmitError(null)
    setPendingDraft(draft)
  }, [])

  // ── Handler: modal confirm ─────────────────────────────────────────────────
  const handleConfirmOrder = useCallback(async (tradeType: 'intraday' | 'swing') => {
    if (!pendingDraft) return
    setSubmitError(null)

    try {
      // Calcular risk snapshot para guardar junto a la orden
      const entryPriceVal = pendingDraft.estimated_price ?? pendingDraft.limit_price ?? 0
      const stopLoss   = pendingDraft.stop_loss ?? 0
      const stopDist   = pendingDraft.side === 'buy'
        ? entryPriceVal - stopLoss
        : stopLoss - entryPriceVal

      const riskAmount = stopDist > 0 ? pendingDraft.qty * stopDist : undefined

      let rrRatio: number | undefined
      if (pendingDraft.target && stopDist > 0) {
        const reward = pendingDraft.side === 'buy'
          ? pendingDraft.target - entryPriceVal
          : entryPriceVal - pendingDraft.target
        if (reward > 0) rrRatio = reward / stopDist
      }

      await submitOrder({
        symbol:                   pendingDraft.symbol,
        side:                     pendingDraft.side,
        order_type:               pendingDraft.order_type,
        qty:                      pendingDraft.qty,
        limit_price:              pendingDraft.limit_price ?? undefined,
        stop_price:               (pendingDraft.order_type === 'stop' || pendingDraft.order_type === 'stop_limit')
                                    ? (pendingDraft.stop_loss ?? undefined)
                                    : undefined,
        risk_amount:              riskAmount,
        portfolio_weight_at_order: portfolioWeightAtOrder ?? undefined,
        stop_loss_price:          pendingDraft.stop_loss as number,
        target_price:             pendingDraft.target ?? undefined,
        risk_reward_ratio:        rrRatio,
        trade_type:               tradeType,
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

  const activeBroker = useMemo(() => inferBroker(activeSymbol), [activeSymbol])

  return (
    <div className="trading-page">

      {/* Columna izquierda — 40% ancho — Order entry + Watchlist */}
      <div className="trading-col trading-col--left" style={{ display: 'flex', flexDirection: 'column', height: '105%', overflow: 'hidden' }}>

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

        {/* Order form y Watchlist Panel */}
        <div className="trading-col__body" style={{ flex: 1, overflowY: 'auto' }}>
          <OrderForm
            initialSymbol={selectedSymbol}
            currentPrice={currentPrice}
            totalEquity={account?.equity ?? 0}
            userSettings={userSettings}
            onReviewOrder={handleReviewOrder}
          />

          {/* Hint: seleccionar de watchlist */}
          {!selectedSymbol && (
            <p className="trading-hint" style={{ marginTop: '8px' }}>
              <Clock size={11} />
              Seleccioná un símbolo de la watchlist para precargar el precio actual
            </p>
          )}
          
          <div className="mt-4 border-t border-gray-800 pt-4" style={{ flex: 1, minHeight: '300px' }}>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider">TU WATCHLIST</span>
            </div>
            <WatchlistPanel />
          </div>
        </div>
      </div>

      {/* Columna derecha — 60% ancho — Chart nativo + Historial de órdenes */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* ChartContainer de lightweight-charts v5 */}
        <div style={{ flex: '1 1 60%', padding: '14px', borderBottom: '1px solid var(--border-default)', overflow: 'hidden' }}>
          {activeSymbol ? (
            <ChartContainer
              symbol={activeSymbol}
              broker={activeBroker}
              stopLossPrice={stopLossPrice}
              targetPrice={targetPrice}
              entryPrice={activePrice}
              height={320}
              className="h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 border border-gray-850 rounded-lg bg-surface">
              <span className="text-4xl mb-3">📈</span>
              <p className="font-semibold text-sm text-gray-400">Seleccioná un símbolo</p>
              <p className="text-xs text-gray-600 mt-1.5 max-w-[280px] text-center">
                Buscá un ticker en el formulario o seleccioná una opción de la watchlist
              </p>
            </div>
          )}
        </div>

        {/* Order history */}
        <div style={{ flex: '0 0 40%', overflowY: 'auto', padding: '14px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Historial de Órdenes</span>
          </div>
          <OrderHistory
            orders={orders}
            isLoading={ordersLoading}
            limit={15}
            onCancelOrder={cancelOrder}
          />
        </div>
      </div>

      {/* Modal de confirmación — SIEMPRE antes de ejecutar */}
      {pendingDraft && (
        <ConfirmOrderModal
          draft={pendingDraft}
          totalEquity={account?.equity ?? 0}
          portfolioWeightAtOrder={portfolioWeightAtOrder}
          userSettings={userSettings}
          isSubmitting={isSubmitting}
          suggestedTradeType={suggestedTradeType}
          onConfirm={handleConfirmOrder}
          onCancel={handleCancelModal}
        />
      )}

      <style>{`
        .trading-page {
          display: grid;
          grid-template-columns: 420px 1fr;
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
