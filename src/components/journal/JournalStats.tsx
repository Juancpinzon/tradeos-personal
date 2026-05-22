// ─────────────────────────────────────────────────────────────────────────────
// src/components/journal/JournalStats.tsx — Métricas de comportamiento
// Números grandes en Syne 700 · barras comparativas · tag de error frecuente
// ─────────────────────────────────────────────────────────────────────────────

import type { JournalEntry } from '../../types'
import { formatCurrency } from '../../lib/formatters'
import { TrendingUp, Target, BookOpen, AlertTriangle, BarChart2 } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface JournalStatsProps {
  entries: JournalEntry[]
}

// ─── Stats computation ───────────────────────────────────────────────────────

interface ComputedStats {
  winRate:          number
  avgWin:           number
  avgLoss:          number
  profitFactor:     number
  followedPlanPct:  number
  topTag:           [string, number] | null
  wins:             number
  losses:           number
  breakevens:       number
  closed:           number
  totalEntries:     number
  avgConfidence:    number
  intradayWinRate:      number
  intradayWins:         number
  intradayLosses:       number
  intradayProfitFactor: number
  swingWinRate:         number
  swingWins:            number
  swingLosses:          number
  swingProfitFactor:    number
}

function computeStats(entries: JournalEntry[]): ComputedStats {
  const closed    = entries.filter(e => e.outcome !== undefined)
  const wins      = closed.filter(e => e.outcome === 'win')
  const losses    = closed.filter(e => e.outcome === 'loss')
  const breakevens = closed.filter(e => e.outcome === 'breakeven')

  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0

  const avgWin  = wins.length > 0
    ? wins.reduce((s, e) => s + (e.actual_pnl ?? 0), 0) / wins.length
    : 0
  const avgLoss = losses.length > 0
    ? losses.reduce((s, e) => s + (e.actual_pnl ?? 0), 0) / losses.length
    : 0

  const totalWinAmount  = wins.reduce((s, e) => s + (e.actual_pnl ?? 0), 0)
  const totalLossAmount = losses.reduce((s, e) => s + Math.abs(e.actual_pnl ?? 0), 0)
  const profitFactor    = totalLossAmount > 0
    ? totalWinAmount / totalLossAmount
    : wins.length > 0 ? 99 : 0

  const withOutcome      = entries.filter(e => e.outcome !== undefined)
  const followedPlanPct  = withOutcome.length > 0
    ? (withOutcome.filter(e => e.followed_plan).length / withOutcome.length) * 100
    : 0

  // Intraday specific stats
  const intradayClosed = closed.filter(e => e.trade_type === 'intraday')
  const intradayWins = intradayClosed.filter(e => e.outcome === 'win')
  const intradayLosses = intradayClosed.filter(e => e.outcome === 'loss')
  const intradayWinRate = intradayClosed.length > 0 ? (intradayWins.length / intradayClosed.length) * 100 : 0
  
  const intradayTotalWinAmount  = intradayWins.reduce((s, e) => s + (e.actual_pnl ?? 0), 0)
  const intradayTotalLossAmount = intradayLosses.reduce((s, e) => s + Math.abs(e.actual_pnl ?? 0), 0)
  const intradayProfitFactor    = intradayTotalLossAmount > 0
    ? intradayTotalWinAmount / intradayTotalLossAmount
    : intradayWins.length > 0 ? 99 : 0

  // Swing specific stats
  const swingClosed = closed.filter(e => e.trade_type === 'swing')
  const swingWins = swingClosed.filter(e => e.outcome === 'win')
  const swingLosses = swingClosed.filter(e => e.outcome === 'loss')
  const swingWinRate = swingClosed.length > 0 ? (swingWins.length / swingClosed.length) * 100 : 0
  
  const swingTotalWinAmount  = swingWins.reduce((s, e) => s + (e.actual_pnl ?? 0), 0)
  const swingTotalLossAmount = swingLosses.reduce((s, e) => s + Math.abs(e.actual_pnl ?? 0), 0)
  const swingProfitFactor    = swingTotalLossAmount > 0
    ? swingTotalWinAmount / swingTotalLossAmount
    : swingWins.length > 0 ? 99 : 0

  // Tag más frecuente en losses
  const tagCounts: Record<string, number> = {}
  losses.forEach(e => (e.tags ?? []).forEach(t => {
    tagCounts[t] = (tagCounts[t] ?? 0) + 1
  }))
  const topTagEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0] ?? null

  const avgConfidence = entries.length > 0
    ? entries.reduce((s, e) => s + e.confidence_level, 0) / entries.length
    : 0

  return {
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    followedPlanPct,
    topTag:         topTagEntry,
    wins:           wins.length,
    losses:         losses.length,
    breakevens:     breakevens.length,
    closed:         closed.length,
    totalEntries:   entries.length,
    avgConfidence,
    intradayWinRate,
    intradayWins:         intradayWins.length,
    intradayLosses:       intradayLosses.length,
    intradayProfitFactor,
    swingWinRate,
    swingWins:            swingWins.length,
    swingLosses:          swingLosses.length,
    swingProfitFactor,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JournalStats({ entries }: JournalStatsProps) {
  const s = computeStats(entries)

  const winRateColor = s.winRate >= 60 ? '#10b981' : s.winRate < 40 ? '#ef4444' : '#f59e0b'
  const pfColor      = s.profitFactor >= 1.5 ? '#10b981' : s.profitFactor < 1 ? '#ef4444' : '#f59e0b'
  const planColor    = s.followedPlanPct >= 70 ? '#10b981' : s.followedPlanPct < 50 ? '#ef4444' : '#f59e0b'

  const maxBarValue = Math.max(Math.abs(s.avgWin), Math.abs(s.avgLoss)) || 1

  if (entries.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '3rem 1.5rem', gap: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <BookOpen size={28} strokeWidth={1} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.5 }}>
          Sin operaciones registradas todavía.<br />
          Empezá creando tu primera entrada.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>

      {/* ── Win Rate + Profit Factor ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>

        {/* Win Rate */}
        <StatCard
          label="Win Rate"
          icon={<TrendingUp size={13} strokeWidth={1.75} />}
          accentColor={winRateColor}
        >
          <p className="font-display" style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: winRateColor,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: '"Syne", sans-serif',
          }}>
            {s.winRate.toFixed(0)}
            <span style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.125rem' }}>%</span>
          </p>
          <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            {s.wins}W · {s.losses}L · {s.breakevens}B
          </p>

          {/* Separación por trade_type */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#3b82f6', fontWeight: 500 }}>Intraday</span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.intradayWinRate.toFixed(0)}% <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>({s.intradayWins}W-{s.intradayLosses}L)</span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#a855f7', fontWeight: 500 }}>Swing</span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.swingWinRate.toFixed(0)}% <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>({s.swingWins}W-{s.swingLosses}L)</span>
              </span>
            </div>
          </div>
        </StatCard>

        {/* Profit Factor */}
        <StatCard
          label="Profit Factor"
          icon={<BarChart2 size={13} strokeWidth={1.75} />}
          accentColor={pfColor}
        >
          <p className="font-display" style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: pfColor,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: '"Syne", sans-serif',
          }}>
            {s.profitFactor >= 99 ? '∞' : s.profitFactor.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
            Ganancia bruta / pérdida bruta
          </p>

          {/* Separación por trade_type */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#3b82f6', fontWeight: 500 }}>Intraday</span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.intradayProfitFactor >= 99 ? '∞' : s.intradayProfitFactor.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#a855f7', fontWeight: 500 }}>Swing</span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.swingProfitFactor >= 99 ? '∞' : s.swingProfitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </StatCard>
      </div>

      {/* ── Seguí el plan ───────────────────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.125rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          backgroundColor: planColor, opacity: 0.5,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Target size={13} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Seguí el plan
            </p>
          </div>
          <span className="font-mono" style={{
            fontSize: '1.25rem', fontWeight: 700,
            color: planColor,
          }}>
            {s.followedPlanPct.toFixed(0)}%
          </span>
        </div>
        <div style={{
          height: '6px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${s.followedPlanPct}%`,
            height: '100%',
            backgroundColor: planColor,
            borderRadius: '3px',
            transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          {s.closed} operaciones cerradas · {Math.round(s.followedPlanPct * s.closed / 100)} siguieron el plan
        </p>
      </div>

      {/* ── Avg Win vs Avg Loss ──────────────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.125rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
      }}>
        <p style={{
          fontSize: '0.625rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: '0.875rem',
        }}>
          Avg Win vs Avg Loss
        </p>

        {/* Avg Win */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 500 }}>Avg Win</span>
            <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>
              {s.avgWin > 0 ? '+' : ''}{formatCurrency(s.avgWin)}
            </span>
          </div>
          <div style={{ height: '5px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${(s.avgWin / maxBarValue) * 100}%`,
              height: '100%',
              backgroundColor: '#10b981',
              borderRadius: '3px',
              transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>

        {/* Avg Loss */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3125rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 500 }}>Avg Loss</span>
            <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ef4444' }}>
              {formatCurrency(s.avgLoss)}
            </span>
          </div>
          <div style={{ height: '5px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${(Math.abs(s.avgLoss) / maxBarValue) * 100}%`,
              height: '100%',
              backgroundColor: '#ef4444',
              borderRadius: '3px',
              transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>

        {/* R/R implícito */}
        {s.avgWin > 0 && s.avgLoss < 0 && (
          <div style={{
            marginTop: '0.75rem',
            paddingTop: '0.625rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>R/R implícito</span>
            <span className="font-mono" style={{
              fontSize: '0.8125rem', fontWeight: 700,
              color: s.avgWin / Math.abs(s.avgLoss) >= 1.5 ? '#10b981' : '#f59e0b',
            }}>
              1:{(s.avgWin / Math.abs(s.avgLoss)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ── Error más frecuente ──────────────────────────────────────────── */}
      {s.topTag && (
        <div style={{
          padding: '1rem 1.125rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            backgroundColor: '#ef4444', opacity: 0.4,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
            <AlertTriangle size={13} strokeWidth={1.75} style={{ color: '#ef4444' }} />
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Error más frecuente
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.25rem',
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: '"Syne", sans-serif',
              letterSpacing: '0.01em',
            }}>
              #{s.topTag[0]}
            </span>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {s.topTag[1]}× en losses
            </span>
          </div>
        </div>
      )}

      {/* ── Confianza promedio ───────────────────────────────────────────── */}
      <div style={{
        padding: '0.875rem 1.125rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Convicción promedio
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: i <= Math.round(s.avgConfidence)
                  ? ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'][i - 1]
                  : 'var(--bg-elevated)',
                border: `1px solid ${i <= Math.round(s.avgConfidence)
                  ? 'transparent'
                  : 'var(--border-default)'}`,
              }}
            />
          ))}
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
            {s.avgConfidence.toFixed(1)}/5
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  icon,
  accentColor,
  children,
}: {
  label:        string
  icon:         React.ReactNode
  accentColor:  string
  children:     React.ReactNode
}) {
  return (
    <div style={{
      padding: '1rem 1.125rem',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        backgroundColor: accentColor, opacity: 0.6,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <p style={{
          fontSize: '0.5625rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
        }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  )
}
