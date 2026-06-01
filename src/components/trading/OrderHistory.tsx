// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/OrderHistory.tsx
// Tabla de órdenes recientes con status color-coded.
// filled=verde, cancelled=gris, rejected=rojo, pending/accepted=amarillo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, X } from 'lucide-react'
import { formatCurrency, formatQty, formatDate } from '../../lib/formatters'
import type { Order } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────

const CANCELLABLE: ReadonlySet<Order['status']> = new Set(['accepted', 'pending'])

interface OrderHistoryProps {
  orders: Order[]
  isLoading: boolean
  limit?: number
  onCancelOrder?: (brokerOrderId: string) => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Order['status'],
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'PENDING',
    color: 'var(--color-warning)',
    bg:    'rgba(245, 158, 11, 0.1)',
    icon:  <Clock size={11} />,
  },
  accepted: {
    label: 'ACCEPTED',
    color: 'var(--color-warning)',
    bg:    'rgba(245, 158, 11, 0.08)',
    icon:  <Loader2 size={11} className="spin-icon" />,
  },
  partially_filled: {
    label: 'PARTIAL',
    color: 'var(--color-warning)',
    bg:    'rgba(245, 158, 11, 0.1)',
    icon:  <Loader2 size={11} className="spin-icon" />,
  },
  filled: {
    label: 'FILLED',
    color: 'var(--color-profit)',
    bg:    'rgba(16, 185, 129, 0.1)',
    icon:  <CheckCircle size={11} />,
  },
  cancelled: {
    label: 'CANCELLED',
    color: 'var(--color-neutral)',
    bg:    'rgba(107, 114, 128, 0.1)',
    icon:  <XCircle size={11} />,
  },
  rejected: {
    label: 'REJECTED',
    color: 'var(--color-loss)',
    bg:    'rgba(239, 68, 68, 0.1)',
    icon:  <AlertCircle size={11} />,
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderHistory({
  orders,
  isLoading,
  limit = 20,
  onCancelOrder,
}: OrderHistoryProps) {
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())
  const displayOrders = orders.slice(0, limit)

  async function handleCancel(order: Order) {
    if (!onCancelOrder || !order.broker_order_id) return

    if (!window.confirm(`¿Seguro que deseas cancelar la orden ${order.side.toUpperCase()} ${order.qty} ${order.symbol}?`)) {
      return
    }

    setCancellingIds(prev => new Set(prev).add(order.id))
    try {
      await onCancelOrder(order.broker_order_id)
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  const showActionsCol = !!onCancelOrder

  return (
    <div className="order-history">
      <div className="order-history__header">
        <span className="order-history__title">HISTORIAL DE ÓRDENES</span>
        <span className="order-history__count">
          {orders.length} órdenes
        </span>
      </div>

      {isLoading && (
        <div className="order-history__loading">
          <Loader2 size={16} className="spin-icon" />
          <span>Cargando órdenes...</span>
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="order-history__empty">
          <Clock size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p>No hay órdenes registradas</p>
          <span>Las órdenes aparecerán aquí después de ejecutarlas</span>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="order-history__table-wrap">
          <table className="order-history__table">
            <thead>
              <tr>
                <th>SÍMBOLO</th>
                <th>LADO</th>
                <th>TIPO</th>
                <th className="text-right">QTY</th>
                <th className="text-right">PRECIO</th>
                <th className="text-right">STATUS</th>
                <th className="text-right">FECHA</th>
                {showActionsCol && <th />}
              </tr>
            </thead>
            <tbody>
              {displayOrders.map(order => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                const price = order.filled_avg_price ?? order.limit_price ?? null
                const isBuy = order.side === 'buy'
                const isCancellable = showActionsCol && CANCELLABLE.has(order.status)
                const isCancelling = cancellingIds.has(order.id)

                return (
                  <tr key={order.id} className="order-row">
                    <td className="order-row__symbol font-mono">{order.symbol}</td>

                    <td>
                      <span
                        className="order-side-badge"
                        style={{
                          color: isBuy ? 'var(--color-profit)' : 'var(--color-loss)',
                          background: isBuy
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'rgba(239, 68, 68, 0.08)',
                          borderColor: isBuy
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        {isBuy ? '▲' : '▼'} {order.side.toUpperCase()}
                      </span>
                    </td>

                    <td className="order-row__type">
                      {order.order_type.toUpperCase().replace('_', ' ')}
                    </td>

                    <td className="text-right font-mono">
                      {formatQty(order.filled_qty ?? order.qty)}
                      {order.filled_qty && order.filled_qty < order.qty && (
                        <span className="order-row__sub">/{formatQty(order.qty)}</span>
                      )}
                    </td>

                    <td className="text-right font-mono">
                      {price ? formatCurrency(price) : <span style={{ color: 'var(--text-muted)' }}>Market</span>}
                    </td>

                    <td className="text-right">
                      <span
                        className="status-badge"
                        style={{
                          color:            statusCfg.color,
                          backgroundColor:  statusCfg.bg,
                          borderColor:      statusCfg.color + '33',
                        }}
                      >
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </td>

                    <td className="text-right order-row__date">
                      {formatDate(order.submitted_at)}
                    </td>

                    {showActionsCol && (
                      <td className="text-right order-row__actions">
                        {isCancellable && (
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancel(order)}
                            disabled={isCancelling}
                            title="Cancelar orden"
                          >
                            {isCancelling
                              ? <Loader2 size={11} className="spin-icon" />
                              : <X size={11} />}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .order-history {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          overflow: hidden;
        }
        .order-history__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-default);
          background: rgba(255,255,255,0.02);
        }
        .order-history__title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }
        .order-history__count {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-family: "IBM Plex Mono", monospace;
        }
        .order-history__loading,
        .order-history__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 32px 16px;
          color: var(--text-muted);
          font-size: 0.78rem;
          text-align: center;
        }
        .order-history__loading {
          flex-direction: row;
          gap: 8px;
          padding: 20px 16px;
        }
        .order-history__empty p {
          color: var(--text-secondary);
          font-weight: 500;
        }
        .order-history__empty span {
          font-size: 0.7rem;
        }
        .order-history__table-wrap {
          overflow-x: auto;
        }
        .order-history__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
        }
        .order-history__table thead tr {
          border-bottom: 1px solid var(--border-default);
        }
        .order-history__table th {
          padding: 8px 12px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          text-align: left;
          white-space: nowrap;
          background: rgba(255,255,255,0.01);
        }
        .order-history__table th.text-right {
          text-align: right;
        }
        .order-row {
          border-bottom: 1px solid var(--border-subtle);
          transition: background 120ms ease;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row:hover { background: var(--bg-hover); }
        .order-row td {
          padding: 9px 12px;
          vertical-align: middle;
        }
        .order-row td.text-right {
          text-align: right;
        }
        .order-row__symbol {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.82rem;
        }
        .order-row__type {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }
        .order-row__sub {
          color: var(--text-muted);
          font-size: 0.68rem;
        }
        .order-row__date {
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .order-row__actions {
          width: 32px;
          padding-right: 8px !important;
        }
        .order-side-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid;
          white-space: nowrap;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid;
          white-space: nowrap;
        }
        .cancel-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.06);
          color: var(--color-loss);
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease;
          padding: 0;
        }
        .cancel-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
