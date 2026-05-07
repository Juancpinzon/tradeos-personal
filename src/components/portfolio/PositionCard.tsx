// ─────────────────────────────────────────────────────────────────────────────
// src/components/portfolio/PositionCard.tsx
// Tarjeta de posición individual con PnL, barra de peso, badge de broker
// y badge de earnings cuando hay reporte en < 7 días
// ─────────────────────────────────────────────────────────────────────────────

import type { Position, EarningsEvent } from '../../types'
import { formatCurrency, formatPercent, formatQty } from '../../lib/formatters'
import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ─────────────────────────────────────────────────────────────────────────────
// EarningsBadge
// ─────────────────────────────────────────────────────────────────────────────

function EarningsBadge({ days }: { days: number }) {
  const isCritical = days <= 3
  const isWarning  = days <= 7

  if (!isWarning) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.125rem 0.4rem',
        borderRadius: '0.25rem',
        fontSize: '0.5625rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: '"IBM Plex Mono", monospace',
        backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
        color: isCritical ? '#ef4444' : '#f59e0b',
        animation: isCritical ? 'earningsPulse 1.5s ease-in-out infinite' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <style>{`
        @keyframes earningsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      📅 {days}d
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BrokerBadge
// ─────────────────────────────────────────────────────────────────────────────

function BrokerBadge({ broker }: { broker: 'alpaca' | 'binance' }) {
  const isAlpaca = broker === 'alpaca'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.075rem 0.35rem',
        borderRadius: '0.2rem',
        fontSize: '0.5rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        backgroundColor: isAlpaca
          ? 'rgba(59, 130, 246, 0.1)'
          : 'rgba(234, 179, 8, 0.1)',
        border: `1px solid ${isAlpaca ? 'rgba(59, 130, 246, 0.25)' : 'rgba(234, 179, 8, 0.25)'}`,
        color: isAlpaca ? '#60a5fa' : '#ca8a04',
      }}
    >
      {isAlpaca ? 'ALP' : 'BNB'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface PositionCardProps {
  position: Position
  /** Lista de eventos de earnings para detectar si hay uno próximo */
  earningsEvents?: EarningsEvent[]
  /** Si true, muestra en formato compacto (para Dashboard) */
  compact?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// PositionCard
// ─────────────────────────────────────────────────────────────────────────────

export default function PositionCard({ position, earningsEvents = [], compact = false }: PositionCardProps) {
  const navigate = useNavigate()

  const pnl        = position.unrealized_pnl
  const pnlPct     = position.unrealized_pnl_pct
  const pnlColor   = pnl >= 0 ? '#10b981' : '#ef4444'
  const weightPct  = Math.min(position.portfolio_weight_pct, 100)

  // Buscar earnings próximos para este símbolo
  const nextEarnings = earningsEvents
    .filter(e => e.symbol === position.symbol && daysUntil(e.report_date) >= 0)
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())[0]

  const earningsDays = nextEarnings ? daysUntil(nextEarnings.report_date) : null

  return (
    <div
      className="fade-in"
      onClick={() => navigate(`/trading?symbol=${position.symbol}`)}
      style={{
        padding: compact ? '0.625rem 0' : '0.875rem 0',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        cursor: 'pointer',
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Fila 1: Symbol + badges + precio actual */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: compact ? '0.875rem' : '0.9375rem',
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            {position.symbol}
          </span>
          <BrokerBadge broker={position.broker} />
          <span className={`badge badge-${position.side}`} style={{ fontSize: '0.5rem' }}>
            {position.side.toUpperCase()}
          </span>
          {earningsDays !== null && earningsDays <= 7 && (
            <EarningsBadge days={earningsDays} />
          )}
        </div>
        <span className="font-mono" style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {formatCurrency(position.current_price)}
        </span>
      </div>

      {/* Fila 2: Qty @ entry · market value · PnL */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {formatQty(position.qty)} @ {formatCurrency(position.avg_entry_price)}
          {!compact && (
            <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
              · {formatCurrency(position.market_value, 0)}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: pnlColor }}>
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
          </span>
          <span className="font-mono" style={{ fontSize: '0.6875rem', color: pnlColor }}>
            {formatPercent(pnlPct)}
          </span>
        </div>
      </div>

      {/* Fila 3: Barra de peso en portafolio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            flex: 1,
            height: '3px',
            backgroundColor: 'var(--border-subtle)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${weightPct}%`,
              height: '100%',
              backgroundColor: pnl >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              borderRadius: '2px',
              transition: 'width 400ms ease',
            }}
          />
        </div>
        <span className="font-mono" style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'right' }}>
          {position.portfolio_weight_pct.toFixed(1)}%
        </span>
        {nextEarnings && !compact && (
          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
            · {nextEarnings.report_time === 'before_market' ? 'BMO' : nextEarnings.report_time === 'after_market' ? 'AMC' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
