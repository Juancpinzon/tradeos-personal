// ─────────────────────────────────────────────────────────────────────────────
// KpiGrid.tsx — Grid 2x4 de KPIs clave del ResearchDataSnapshot
// Label: text-muted 10px uppercase. Valor: IBM Plex Mono 16px bold.
// Badge amarillo parpadeante si earnings < 7 días.
// ─────────────────────────────────────────────────────────────────────────────

import type { ResearchDataSnapshot } from '../../types'
import { formatCurrency, formatPercent, formatLargeNumber } from '../../lib/formatters'

interface Props {
  data: ResearchDataSnapshot
  symbol: string
}

interface KpiCard {
  label: string
  value: string
  subValue?: string
  subColor?: 'profit' | 'loss' | 'neutral' | 'warning'
  highlight?: boolean // borde especial para earnings próximos
  pulse?: boolean
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
}

function pnlColor(value: number | null | undefined): 'profit' | 'loss' | 'neutral' {
  if (value === null || value === undefined) return 'neutral'
  return value > 0 ? 'profit' : value < 0 ? 'loss' : 'neutral'
}

const COLOR_MAP: Record<string, string> = {
  profit:  'var(--color-profit)',
  loss:    'var(--color-loss)',
  neutral: 'var(--text-muted)',
  warning: 'var(--color-warning)',
}

export function KpiGrid({ data }: Props) {
  const earningsDays = data.next_earnings_date ? daysUntil(data.next_earnings_date) : null
  const earningsClose = earningsDays !== null && earningsDays >= 0 && earningsDays <= 7

  const cards: KpiCard[] = [
    {
      label: 'PRECIO',
      value: data.price ? formatCurrency(data.price) : 'N/D',
      subValue: data.price_change_pct_1d !== undefined
        ? formatPercent(data.price_change_pct_1d)
        : undefined,
      subColor: pnlColor(data.price_change_pct_1d),
    },
    {
      label: 'DIST. ATH',
      value: data.ath_distance_pct !== undefined
        ? formatPercent(data.ath_distance_pct)
        : 'N/D',
      subValue: data.week_52_high ? `High: ${formatCurrency(data.week_52_high)}` : undefined,
      subColor: pnlColor(data.ath_distance_pct),
    },
    {
      label: 'RSI SEMANAL',
      value: data.rsi_weekly !== undefined && data.rsi_weekly !== null
        ? data.rsi_weekly.toFixed(0)
        : 'N/D',
      subValue: data.rsi_weekly !== undefined && data.rsi_weekly !== null
        ? rsiLabel(data.rsi_weekly)
        : undefined,
      subColor: rsiColor(data.rsi_weekly),
    },
    {
      label: 'EPS ACTUAL',
      value: data.eps_current !== undefined && data.eps_current !== null
        ? formatCurrency(data.eps_current)
        : 'N/D',
      subValue: data.eps_next_estimate !== undefined && data.eps_next_estimate !== null
        ? `Est Q+1: ${formatCurrency(data.eps_next_estimate)}`
        : undefined,
      subColor: pnlColor(data.eps_growth_next_pct),
    },
    {
      label: 'CRECIMIENTO EPS',
      value: data.eps_growth_next_pct !== undefined && data.eps_growth_next_pct !== null
        ? formatPercent(data.eps_growth_next_pct)
        : 'N/D',
      subColor: pnlColor(data.eps_growth_next_pct),
    },
    {
      label: 'REV. GROWTH YoY',
      value: data.revenue_growth_pct !== undefined && data.revenue_growth_pct !== null
        ? formatPercent(data.revenue_growth_pct)
        : 'N/D',
      subColor: pnlColor(data.revenue_growth_pct),
    },
    {
      label: 'P/E RATIO',
      value: data.pe_ratio !== undefined && data.pe_ratio !== null
        ? data.pe_ratio.toFixed(1) + 'x'
        : 'N/D',
      subValue: data.market_cap ? formatLargeNumber(data.market_cap) : undefined,
      subColor: 'neutral',
    },
    {
      label: 'PRÓX. EARNINGS',
      value: data.next_earnings_date
        ? earningsDays !== null && earningsDays >= 0
          ? `${earningsDays}d`
          : data.next_earnings_date
        : 'N/D',
      subValue: earningsClose ? '⚠️ MUY PRÓXIMO' : data.next_earnings_date ?? undefined,
      subColor: earningsClose ? 'warning' : 'neutral',
      highlight: earningsClose,
      pulse: earningsClose,
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
      }}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </div>
  )
}

function KpiCard({ card }: { card: KpiCard }) {
  return (
    <div
      style={{
        background: 'var(--bg-base)',
        border: `1px solid ${card.highlight ? 'rgba(245,158,11,0.4)' : 'var(--border-default)'}`,
        borderRadius: '6px',
        padding: '8px 10px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '4px',
          fontFamily: 'Syne, system-ui, sans-serif',
        }}
      >
        {card.label}
      </div>

      {/* Valor principal */}
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: '"IBM Plex Mono", "Courier New", monospace',
          color: card.subColor && card.subColor !== 'neutral'
            ? COLOR_MAP[card.subColor]
            : 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {card.value}
      </div>

      {/* Sub-valor */}
      {card.subValue && (
        <div
          style={{
            fontSize: '10px',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            color: card.subColor ? COLOR_MAP[card.subColor] : 'var(--text-muted)',
            marginTop: '2px',
          }}
        >
          {card.subValue}
        </div>
      )}

      {/* Pulso para earnings próximos */}
      {card.pulse && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-warning)',
            animation: 'earningsPulse 1.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}

function rsiLabel(rsi: number): string {
  if (rsi >= 70) return 'Sobrecomprado'
  if (rsi >= 50) return 'Zona alcista'
  if (rsi >= 30) return 'Zona bajista'
  return 'Sobrevendido'
}

function rsiColor(rsi: number | null | undefined): 'profit' | 'loss' | 'warning' | 'neutral' {
  if (rsi === null || rsi === undefined) return 'neutral'
  if (rsi >= 70) return 'loss'    // sobrecomprado → riesgo
  if (rsi >= 50) return 'profit'  // momentum alcista
  if (rsi >= 30) return 'warning'
  return 'loss'                   // sobrevendido
}
