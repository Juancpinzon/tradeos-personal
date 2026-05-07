// ─────────────────────────────────────────────────────────────────────────────
// src/components/portfolio/EquityChart.tsx — Gráfico histórico de equity (30d)
// Recharts LineChart con gradiente azul, tooltip custom, ejes mínimos
// ─────────────────────────────────────────────────────────────────────────────

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { EquitySnapshot } from '../../types'
import { formatCurrency, formatDate } from '../../lib/formatters'

interface EquityChartProps {
  snapshots: EquitySnapshot[]
}

interface ChartPoint {
  date:   string   // display label (eje X)
  equity: number
  rawDate: string
}

// ── Tooltip personalizado ──────────────────────────────────────────────────

interface TooltipPayload {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?:  string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const equity = payload[0]?.value ?? 0

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.375rem',
        padding: '0.625rem 0.875rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p
        className="font-mono"
        style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}
      >
        {formatCurrency(equity)}
      </p>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function EquityChart({ snapshots }: EquityChartProps) {
  if (!snapshots.length) {
    return (
      <div
        style={{
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
        }}
      >
        Sin datos históricos
      </div>
    )
  }

  const data: ChartPoint[] = snapshots.map((s) => ({
    date:    formatDate(s.snapshot_at),
    equity:  s.equity,
    rawDate: s.snapshot_at,
  }))

  // Tomar solo uno de cada N para no saturar el eje X
  const stride       = Math.ceil(data.length / 6)
  const tickIndices  = data
    .map((_, i) => i)
    .filter((i) => i % stride === 0 || i === data.length - 1)

  const ticks = tickIndices
    .map((i) => data[i]?.date)
    .filter((d): d is string => d !== undefined)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        {/* Definición del gradiente */}
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
          </linearGradient>
        </defs>

        {/* Eje X: fechas abreviadas, sin línea */}
        <XAxis
          dataKey="date"
          ticks={ticks}
          tick={{
            fontSize:   11,
            fill:       'var(--text-muted)',
            fontFamily: '"IBM Plex Mono", monospace',
          }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />

        {/* Tooltip custom */}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
        />

        {/* Área con gradiente */}
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#equityGradient)"
          dot={false}
          activeDot={{
            r:           4,
            fill:        '#3b82f6',
            stroke:      'var(--bg-elevated)',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
