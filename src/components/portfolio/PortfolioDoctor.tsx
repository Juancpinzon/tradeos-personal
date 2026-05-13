// ─────────────────────────────────────────────────────────────────────────────
// src/components/portfolio/PortfolioDoctor.tsx
// Modal de análisis holístico IA del portafolio
// Datos mock para Fase 5 visual — sin hooks ni Supabase
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { formatDate } from '../../lib/formatters'

// ──────────────────�const MOCK_ANALYSIS: { risk: RiskLevel; sections: MockSection[]; analysisDate: string } = {
  risk: 'Moderate',
  analysisDate: new Date().toISOString(),
  sections: [],
}al 14% YoY — el segmento más rentable.',
      recommendations: [
        { symbol: 'AAPL', action: 'Ver en Trading' },
      ],
    },
    {
      icon: '🚀',
      title: 'OPORTUNIDAD AUSENTE',
      content: 'Sector salud / biotech: completamente ausente. JNJ o UNH añadirían descorrelación real con tech (β < 0.3) y flujos de dividendos. En el espacio de mayor crecimiento, ISRG (robótica quirúrgica) tiene revenue growth del 17% YoY con márgenes del 29% — perfil de calidad similar a MSFT pero en sector no representado.',
      recommendations: [
        { symbol: 'UNH', action: 'Ver en Trading' },
        { symbol: 'ISRG', action: 'Ver en Trading' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskBadge
// ─────────────────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = {
    Conservative: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', color: '#60a5fa', icon: '🛡️' },
    Moderate:     { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  color: '#fbbf24', icon: '⚖️' },
    Aggressive:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   color: '#f87171', icon: '🔥' },
  }[level]

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1.25rem',
      borderRadius: '2rem',
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
    }}>
      <span style={{ fontSize: '1.125rem' }}>{cfg.icon}</span>
      <span style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em' }}>
        {level}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ section, onNavigate }: { section: MockSection; onNavigate: (symbol: string) => void }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.625rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.125rem' }}>{section.icon}</span>
        <h3 style={{
          fontFamily: '"Syne", sans-serif',
          fontWeight: 700,
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {section.title}
        </h3>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
        {section.content}
      </p>
      {section.recommendations && section.recommendations.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {section.recommendations.map(r => (
            <button
              key={r.symbol}
              onClick={() => onNavigate(r.symbol)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--color-primary)',
                backgroundColor: 'rgba(59,130,246,0.08)',
                color: 'var(--color-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 120ms',
                fontFamily: '"Syne", sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)')}
            >
              {r.symbol} →
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadingState
// ─────────────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.25rem',
      padding: '4rem 2rem',
    }}>
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid var(--border-default)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid transparent',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem' }}>
          🩺
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
          Analizando tu portafolio...
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Claude está evaluando correlaciones, concentración y fundamentales
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioDoctor — Modal principal
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioDoctorProps {
  isOpen: boolean
  onClose: () => void
  /** Opción de inyectar análisis real desde hook (Fase 5 backend) */
  analysis?: typeof MOCK_ANALYSIS | null
  isLoading?: boolean
}

export default function PortfolioDoctor({
  isOpen,
  onClose,
  analysis = MOCK_ANALYSIS,
  isLoading = false,
}: PortfolioDoctorProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const data = analysis ?? MOCK_ANALYSIS

  function handleNavigate(symbol: string) {
    onClose()
    navigate(`/trading?symbol=${symbol}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          animation: 'fadeIn 150ms ease-out',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 'min(90vw, 860px)',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideIn 200ms ease-out',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <style>{`
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translate(-50%, -48%); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                🩺 Portfolio Doctor
              </h2>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Análisis holístico · Claude claude-sonnet-4-20250514
              </p>
            </div>
            {!isLoading && <RiskBadge level={data.risk} />}
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: '32px', height: '32px',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
              transition: 'background-color 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {isLoading ? (
            <LoadingState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.sections.map(section => (
                <SectionCard
                  key={section.title}
                  section={section}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Análisis generado: {formatDate(data.analysisDate)} · Datos: posiciones + fundamentales FMP
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 500,
                }}
              >
                Cerrar
              </button>
              <button
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                💾 Guardar análisis
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
