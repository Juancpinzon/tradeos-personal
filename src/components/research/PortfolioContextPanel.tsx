// ─────────────────────────────────────────────────────────────────────────────
// PortfolioContextPanel.tsx
// Muestra la exposición del usuario en el símbolo: qty, avg entry, precio actual,
// PnL $ y %, weight% del portafolio. Todo en font-mono con colores semánticos.
// Si no tiene posición: mensaje en text-muted.
// ─────────────────────────────────────────────────────────────────────────────

import type { PortfolioContext } from '../../types'
import { formatCurrency, formatPercent, formatQty } from '../../lib/formatters'

interface Props {
  context: PortfolioContext
  symbol: string
}

export function PortfolioContextPanel({ context, symbol }: Props) {
  const sectionLabel: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontFamily: 'Syne, system-ui, sans-serif',
    marginBottom: '8px',
  }

  if (!context.has_position) {
    return (
      <div
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          padding: '12px',
        }}
      >
        <div style={sectionLabel}>TU POSICIÓN</div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
          }}
        >
          Sin posición en {symbol}
        </p>
      </div>
    )
  }

  const pnl    = context.unrealized_pnl ?? 0
  const pnlPct = context.unrealized_pnl_pct ?? 0
  const isProfit = pnl >= 0

  return (
    <div
      style={{
        background: 'var(--bg-base)',
        border: `1px solid ${isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: '6px',
        padding: '12px',
      }}
    >
      <div style={sectionLabel}>TU POSICIÓN</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Cantidad y precio entrada */}
        <Row
          label="Cantidad"
          value={formatQty(context.qty ?? 0) + ' acc'}
        />
        <Row
          label="Entrada"
          value={formatCurrency(context.avg_entry_price ?? 0)}
        />
        <Row
          label="Precio actual"
          value={formatCurrency(context.current_price ?? 0)}
        />

        {/* Divisor */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />

        {/* PnL */}
        <Row
          label="PnL $"
          value={formatCurrency(pnl)}
          valueColor={isProfit ? 'var(--color-profit)' : 'var(--color-loss)'}
        />
        <Row
          label="PnL %"
          value={formatPercent(pnlPct)}
          valueColor={isProfit ? 'var(--color-profit)' : 'var(--color-loss)'}
        />
        <Row
          label="Weight"
          value={formatPercent(context.portfolio_weight_pct ?? 0, false)}
          valueColor="var(--text-secondary)"
        />

        {/* Equity total */}
        {context.total_portfolio_equity !== undefined && (
          <>
            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />
            <Row
              label="Portafolio total"
              value={formatCurrency(context.total_portfolio_equity ?? 0, 0)}
              valueColor="var(--text-muted)"
            />
          </>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'Syne, system-ui, sans-serif',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: '"IBM Plex Mono", "Courier New", monospace',
          color: valueColor ?? 'var(--text-primary)',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}
