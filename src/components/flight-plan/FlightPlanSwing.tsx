// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanSwing.tsx
// Visualización de posiciones abiertas (Swing) para seguimiento en el plan
// ─────────────────────────────────────────────────────────────────────────────

import { Anchor } from 'lucide-react'
import type { Position } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/formatters'

interface Props {
  positions: Position[]
}

export function FlightPlanSwing({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <div className="fp-swing fp-swing--empty">
        <Anchor size={24} className="fp-swing__empty-icon" />
        <p>No hay posiciones swing abiertas actualmente.</p>
      </div>
    )
  }

  return (
    <div className="fp-swing">
      <h3 className="fp-section-title">POSICIONES SWING ABIERTAS</h3>
      <div className="fp-swing__list">
        {positions.map(pos => {
          const isProfit = pos.unrealized_pnl >= 0
          return (
            <div key={pos.id} className="fp-swing-item">
              <div className="fp-swing-item__main">
                <span className="fp-swing-item__symbol">{pos.symbol}</span>
                <span className={`fp-swing-item__pnl ${isProfit ? 'profit' : 'loss'}`}>
                  {isProfit ? '+' : ''}{formatPercent(pos.unrealized_pnl_pct)}
                </span>
              </div>
              <div className="fp-swing-item__details">
                <div className="fp-detail">
                  <span className="fp-detail__label">Entry</span>
                  <span className="fp-detail__value">{formatCurrency(pos.avg_entry_price)}</span>
                </div>
                <div className="fp-detail">
                  <span className="fp-detail__label">Actual</span>
                  <span className="fp-detail__value">{formatCurrency(pos.current_price)}</span>
                </div>
                <div className="fp-detail">
                  <span className="fp-detail__label">Peso</span>
                  <span className="fp-detail__value">{pos.portfolio_weight_pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .fp-swing {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px;
        }
        .fp-swing--empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-muted);
          font-size: 0.8rem;
          min-height: 120px;
          text-align: center;
        }
        .fp-swing__empty-icon {
          opacity: 0.3;
        }
        .fp-swing__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }
        .fp-swing-item {
          padding: 12px;
          background: var(--bg-elevated);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
        }
        .fp-swing-item__main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .fp-swing-item__symbol {
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .fp-swing-item__pnl {
          font-size: 0.8rem;
          font-weight: 700;
        }
        .fp-swing-item__pnl.profit { color: var(--color-profit); }
        .fp-swing-item__pnl.loss { color: var(--color-loss); }
        
        .fp-swing-item__details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .fp-detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fp-detail__label {
          font-size: 0.55rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .fp-detail__value {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
