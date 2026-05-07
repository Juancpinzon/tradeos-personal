// ─────────────────────────────────────────────────────────────────────────────
// src/components/earnings/EarningsCalendar.tsx
// Timeline horizontal de earnings próximos 30 días
// Eventos < 7 días: borde amarillo. Eventos < 3 días: badge rojo parpadeante.
// ─────────────────────────────────────────────────────────────────────────────

import type { EarningsEvent } from '../../types'
import { formatDateShort, formatCurrency } from '../../lib/formatters'
import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Mock data para modo standalone / Fase 5 visual
// ─────────────────────────────────────────────────────────────────────────────

const today = new Date()
function addDays(d: Date, n: number): string {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r.toISOString().split('T')[0] as string
}

export const MOCK_EARNINGS_EVENTS: EarningsEvent[] = [
  {
    symbol: 'AAPL',
    report_date: addDays(today, 2),
    report_time: 'after_market',
    eps_estimate: 1.62,
    revenue_estimate: 94_500_000_000,
    fetched_at: new Date().toISOString(),
  },
  {
    symbol: 'NVDA',
    report_date: addDays(today, 5),
    report_time: 'after_market',
    eps_estimate: 5.89,
    revenue_estimate: 24_300_000_000,
    fetched_at: new Date().toISOString(),
  },
  {
    symbol: 'MSFT',
    report_date: addDays(today, 12),
    report_time: 'after_market',
    eps_estimate: 3.10,
    revenue_estimate: 68_100_000_000,
    fetched_at: new Date().toISOString(),
  },
  {
    symbol: 'TSLA',
    report_date: addDays(today, 18),
    report_time: 'after_market',
    eps_estimate: 0.43,
    fetched_at: new Date().toISOString(),
  },
  {
    symbol: 'BTC',
    report_date: addDays(today, 22),
    report_time: 'unknown',
    fetched_at: new Date().toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
}

function reportTimeLabel(rt: EarningsEvent['report_time']): string {
  if (rt === 'before_market') return 'Pre-mkt'
  if (rt === 'after_market') return 'Post-mkt'
  return 'Hora TBD'
}

// ─────────────────────────────────────────────────────────────────────────────
// EventCard — Tarjeta individual de evento de earnings
// ─────────────────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: EarningsEvent
  compact?: boolean
  onClick?: () => void
}

function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const days       = daysUntil(event.report_date)
  const isCritical = days <= 3
  const isWarning  = days <= 7

  const borderColor = isCritical
    ? 'rgba(239, 68, 68, 0.5)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.4)'
    : 'var(--border-default)'

  const dotColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#6b7280'

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: '0.5rem',
        padding: compact ? '0.625rem 0.75rem' : '0.875rem 1rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 150ms ease, transform 150ms ease',
        minWidth: compact ? '120px' : '160px',
        flex: compact ? '0 0 auto' : undefined,
      }}
      onMouseEnter={e => {
        if (!onClick) return
        e.currentTarget.style.borderColor = isCritical ? 'rgba(239,68,68,0.8)' : isWarning ? 'rgba(245,158,11,0.7)' : 'var(--color-primary)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = borderColor
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Indicador de urgencia */}
      {isWarning && (
        <span
          style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            animation: isCritical ? 'earningsPulse 1.2s ease-in-out infinite' : 'none',
          }}
        />
      )}

      {/* Symbol + fecha */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          {event.symbol}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: '0.5625rem',
            padding: '0.1rem 0.35rem',
            borderRadius: '0.2rem',
            backgroundColor: isCritical
              ? 'rgba(239,68,68,0.15)'
              : isWarning
              ? 'rgba(245,158,11,0.12)'
              : 'var(--bg-elevated)',
            color: dotColor,
            fontWeight: 700,
          }}
        >
          {days === 0 ? 'HOY' : `${days}d`}
        </span>
      </div>

      {/* Fecha + horario */}
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: compact ? 0 : '0.5rem' }}>
        {formatDateShort(event.report_date)} · {reportTimeLabel(event.report_time)}
      </p>

      {/* EPS estimate */}
      {!compact && event.eps_estimate !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            EPS Est.
          </span>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {event.eps_estimate >= 0 ? '+' : ''}{formatCurrency(event.eps_estimate)}
          </span>
        </div>
      )}

      {!compact && event.revenue_estimate !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Rev. Est.
          </span>
          <span className="font-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {(event.revenue_estimate / 1e9).toFixed(1)}B
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EarningsCalendar — Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface EarningsCalendarProps {
  events?: EarningsEvent[]
  /** Si true, muestra solo los próximos N eventos en modo compacto horizontal */
  compact?: boolean
  maxEvents?: number
  showHeader?: boolean
}

export default function EarningsCalendar({
  events = MOCK_EARNINGS_EVENTS,
  compact = false,
  maxEvents,
  showHeader = true,
}: EarningsCalendarProps) {
  const navigate = useNavigate()

  // Filtrar eventos futuros y ordenar por fecha
  const upcoming = events
    .filter(e => daysUntil(e.report_date) >= 0)
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .slice(0, maxEvents)

  if (upcoming.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>📅</span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Sin earnings próximos en los próximos 30 días
        </p>
      </div>
    )
  }

  // Modo compacto: tarjetas horizontales sin timeline
  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <style>{`
          @keyframes earningsPulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
          }
        `}</style>
        {upcoming.map(event => (
          <EventCard
            key={`${event.symbol}-${event.report_date}`}
            event={event}
            compact
            onClick={() => navigate(`/research?symbol=${event.symbol}`)}
          />
        ))}
      </div>
    )
  }

  // Modo full: timeline horizontal con línea y puntos
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        @keyframes earningsPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
        .earnings-dot-critical {
          animation: earningsPulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'var(--text-primary)',
            }}>
              📅 Earnings Calendar
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Próximos 30 días · {upcoming.length} eventos · posiciones + watchlist
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <LegendItem color="#ef4444" label="< 3 días" pulse />
            <LegendItem color="#f59e0b" label="< 7 días" />
            <LegendItem color="#6b7280" label="Normal" />
          </div>
        </div>
      )}

      {/* Timeline horizontal */}
      <div style={{ position: 'relative', paddingTop: '2rem' }}>
        {/* Línea del tiempo */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'var(--border-default)',
            borderRadius: '1px',
          }}
        />

        {/* Puntos + Tarjetas en columnas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(upcoming.length, 5)}, 1fr)`,
            gap: '1rem',
          }}
        >
          {upcoming.map((event) => {
            const days       = daysUntil(event.report_date)
            const isCritical = days <= 3
            const isWarning  = days <= 7
            const dotColor   = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#6b7280'

            return (
              <div key={`${event.symbol}-${event.report_date}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Dot en la timeline */}
                <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                  <div
                    className={isCritical ? 'earnings-dot-critical' : ''}
                    style={{
                      width: isCritical ? '14px' : '10px',
                      height: isCritical ? '14px' : '10px',
                      borderRadius: '50%',
                      backgroundColor: dotColor,
                      border: `2px solid var(--bg-base)`,
                      marginTop: '-4px',
                      boxShadow: `0 0 0 3px ${dotColor}30`,
                    }}
                  />
                </div>

                {/* Tarjeta */}
                <EventCard
                  event={event}
                  onClick={() => navigate(`/research?symbol=${event.symbol}`)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LegendItem
// ─────────────────────────────────────────────────────────────────────────────

function LegendItem({ color, label, pulse = false }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          animation: pulse ? 'earningsPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
