// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Dashboard.tsx — Vista principal de portafolio
// Alta densidad de información, diseño dark trading institucional
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../hooks/usePortfolio'
import EquityChart from '../components/portfolio/EquityChart'
import PortfolioDoctor from '../components/portfolio/PortfolioDoctor'
import PositionCard from '../components/portfolio/PositionCard'
import EarningsCalendar from '../components/earnings/EarningsCalendar'
import {
  formatCurrency,
  formatPercent,
} from '../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioSummary — Equity total + métricas secundarias + PnL del día
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioSummary({
  equity,
  cash,
  buying_power,
  pnl_today,
  pnl_today_pct,
  isSyncing,
}: {
  equity:       number
  cash:         number
  buying_power: number
  pnl_today:    number
  pnl_today_pct: number
  isSyncing:    boolean
}) {
  const pnlColor    = pnl_today >= 0 ? '#10b981' : '#ef4444'
  const pnlPositive = pnl_today >= 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Fila superior: equity total + syncing badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            Equity Total
          </p>
          <h1
            style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: '2rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
            className="font-display"
          >
            <span className="font-mono">{formatCurrency(equity)}</span>
          </h1>
        </div>

        {/* PnL hoy */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
            PnL Hoy
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="font-mono" style={{ fontSize: '1.375rem', fontWeight: 600, color: pnlColor }}>
              {pnlPositive ? '+' : ''}{formatCurrency(pnl_today)}
            </span>
            <span className="font-mono" style={{ fontSize: '0.875rem', color: pnlColor }}>
              {formatPercent(pnl_today_pct)}
            </span>
          </div>
        </div>
      </div>

      {/* Métricas secundarias + brokers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Cash + Buying power */}
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.125rem' }}>Cash</p>
            <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {formatCurrency(cash)}
            </span>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.125rem' }}>Buying Power</p>
            <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {formatCurrency(buying_power)}
            </span>
          </div>
        </div>

        {/* Broker badges + syncing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Alpaca badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#3b82f6',
            }}
          >
            <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>Alpaca</span>
            <span className="font-mono">{formatCurrency(equity)}</span>
          </span>

          {/* Binance placeholder */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ fontSize: '0.6875rem' }}>Binance</span>
            <span className="font-mono">—</span>
          </span>

          {/* Syncing indicator */}
          {isSyncing && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                color: 'var(--color-warning)',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <SyncSpinner />
              actualizando...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// PositionRow eliminado — ahora se usa PositionCard importado

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { account, positions, equitySnapshots, isLoading, isSyncing, error } = usePortfolio()
  const [doctorOpen, setDoctorOpen] = useState(false)
  const navigate = useNavigate()

  // Nunca bloquear el render con spinner de página completa.
  // Cada sección muestra su propio skeleton mientras carga.
  if (error && !account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem' }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          padding: '1.25rem 1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(239,68,68,0.3)',
          backgroundColor: 'rgba(239,68,68,0.05)',
        }}>
          <p style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>
            Error al cargar el portafolio
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {error?.message ?? 'Sin datos de cuenta. Verificá que las API keys de Alpaca estén configuradas en Settings.'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Revisá: Supabase → Edge Functions → alpaca-proxy → Logs para ver el error exacto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Portfolio Summary */}
      {isLoading || !account ? (
        <SkeletonSummary />
      ) : (
        <PortfolioSummary
          equity={account.equity}
          cash={account.cash}
          buying_power={account.buying_power}
          pnl_today={account.pnl_today}
          pnl_today_pct={account.pnl_today_pct}
          isSyncing={isSyncing}
        />
      )}

      {/* Contenido principal: dos columnas */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Columna izquierda: Posiciones ── */}
        <div
          style={{
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            padding: '0 1.5rem',
          }}
        >
          {/* Header sección */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--bg-base)',
              zIndex: 1,
              paddingTop: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '0',
            }}
          >
            <h2
              style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Posiciones Abiertas
              <span
                className="font-mono"
                style={{ marginLeft: '0.5rem', color: 'var(--color-primary)', fontSize: '0.6875rem' }}
              >
                {positions.length}
              </span>
            </h2>
          </div>

          {/* Lista de posiciones */}
          {isLoading ? (
            <SkeletonPositions />
          ) : positions.length === 0 ? (
            <p style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
              Sin posiciones abiertas
            </p>
          ) : (
            positions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                earningsEvents={[]}
                compact
              />
            ))
          )}

          {/* Portfolio Doctor — activo en Fase 5 */}
          <div style={{ padding: '1.25rem 0' }}>
            <button
              id="portfolio-doctor-btn"
              onClick={() => setDoctorOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                width: '100%',
                borderRadius: '0.375rem',
                border: '1px solid rgba(59,130,246,0.35)',
                backgroundColor: 'rgba(59,130,246,0.07)',
                color: 'var(--color-primary)',
                fontSize: '0.8125rem',
                fontFamily: '"Syne", sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.07)'
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'
              }}
            >
              <span>🩺</span>
              <span>Portfolio Doctor</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', opacity: 0.7 }}>IA ›</span>
            </button>
          </div>
        </div>

        {/* ── Columna derecha: Chart + Eventos ── */}
        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Equity Chart */}
          <div>
            <h2
              style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.875rem',
              }}
            >
              Equity — últimos 30 días
            </h2>
            <EquityChart snapshots={equitySnapshots} />
          </div>

          {/* Próximos Eventos — Earnings Calendar real */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <h2
                style={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Próximos Eventos
              </h2>
              <button
                onClick={() => navigate('/history#earnings')}
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 600,
                }}
              >
                Ver todos →
              </button>
            </div>
            <EarningsCalendar
              events={[]}
              compact
              maxEvents={3}
              showHeader={false}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Portfolio Doctor Modal */}
    <PortfolioDoctor
      isOpen={doctorOpen}
      onClose={() => setDoctorOpen(false)}
    />
  </>
  )
}

// ── Sync spinner inline ────────────────────────────────────────────────────

function SyncSpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ── Skeleton loaders ────────────────────────────────────────────────────────

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover,#1e2535) 50%, var(--bg-elevated) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.5s infinite',
  borderRadius: '4px',
}

function SkeletonSummary() {
  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)',
    }}>
      <style>{`@keyframes skeletonShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ ...shimmerStyle, width: '80px', height: '11px', marginBottom: '8px' }} />
          <div style={{ ...shimmerStyle, width: '180px', height: '32px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...shimmerStyle, width: '60px', height: '11px', marginBottom: '8px', marginLeft: 'auto' }} />
          <div style={{ ...shimmerStyle, width: '120px', height: '22px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ ...shimmerStyle, width: '90px', height: '14px' }} />
        <div style={{ ...shimmerStyle, width: '110px', height: '14px' }} />
        <div style={{ ...shimmerStyle, width: '80px', height: '14px' }} />
      </div>
    </div>
  )
}

function SkeletonPositions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          ...shimmerStyle,
          height: '72px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }} />
      ))}
    </div>
  )
}
