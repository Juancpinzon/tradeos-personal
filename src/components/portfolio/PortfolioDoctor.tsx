// ─────────────────────────────────────────────────────────────────────────────
// src/components/portfolio/PortfolioDoctor.tsx
// Modal de análisis holístico IA del portafolio. Llama a claude-portfolio-doctor
// cuando se abre y muestra el resultado parseado en secciones accionables.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─────────────────────────────────────────────────────────────────────────────

type RiskLevel = 'Conservative' | 'Moderate' | 'Aggressive'

interface AnalysisSection {
  icon: string
  title: string
  content: string
  recommendations?: Array<{ symbol: string; action: string }>
}

interface DoctorAnalysis {
  risk_level: RiskLevel
  sections: AnalysisSection[]
  analysis_date: string
}

// ─────────────────────────────────────────────────────────────────────────────
// API call
// ─────────────────────────────────────────────────────────────────────────────

async function runDoctorAnalysis(): Promise<DoctorAnalysis> {
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    session = refreshed.session
  }
  if (!session?.access_token) throw new Error('Sin sesión activa')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-portfolio-doctor`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  })

  const json = await res.json() as DoctorAnalysis & { error?: string }
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskBadge
// ─────────────────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = {
    Conservative: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', color: '#60a5fa', icon: '🛡️' },
    Moderate:     { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  color: '#fbbf24', icon: '⚖️' },
    Aggressive:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   color: '#f87171', icon: '🔥' },
  }[level] ?? { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#fbbf24', icon: '⚖️' }

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

function SectionCard({ section, onNavigate }: { section: AnalysisSection; onNavigate: (symbol: string) => void }) {
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
                fontFamily: '"Syne", sans-serif',
                transition: 'background-color 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)')}
            >
              {r.symbol} → {r.action}
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
          animation: 'doctorSpin 0.9s linear infinite',
        }} />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem' }}>
          🩺
        </span>
        <style>{`@keyframes doctorSpin { to { transform: rotate(360deg); } }`}</style>
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
// ErrorState
// ─────────────────────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1rem', padding: '3rem 2rem', textAlign: 'center',
    }}>
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '340px' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '0.5rem 1.25rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--color-primary)',
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          fontSize: '0.8125rem',
          cursor: 'pointer',
          fontFamily: '"Syne", sans-serif',
          fontWeight: 600,
        }}
      >
        Reintentar
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioDoctor — Modal principal
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioDoctorProps {
  isOpen: boolean
  onClose: () => void
}

export default function PortfolioDoctor({ isOpen, onClose }: PortfolioDoctorProps) {
  const navigate = useNavigate()
  const [analysis, setAnalysis]   = useState<DoctorAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  // Disparar análisis cuando se abre el modal (y no hay análisis previo)
  useEffect(() => {
    if (!isOpen) return
    if (analysis || isLoading) return

    setIsLoading(true)
    setErrorMsg(null)

    runDoctorAnalysis()
      .then(setAnalysis)
      .catch((e: Error) => setErrorMsg(e.message ?? 'Error al generar el análisis'))
      .finally(() => setIsLoading(false))
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetry() {
    setAnalysis(null)
    setErrorMsg(null)
    setIsLoading(true)

    runDoctorAnalysis()
      .then(setAnalysis)
      .catch((e: Error) => setErrorMsg(e.message ?? 'Error al generar el análisis'))
      .finally(() => setIsLoading(false))
  }

  function handleNavigate(symbol: string) {
    onClose()
    navigate(`/trading?symbol=${symbol}`)
  }

  function handleClose() {
    onClose()
    // No limpiar el análisis — se conserva si el usuario reabre el modal
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
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
          top: '50%', left: '50%',
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
          animation: 'doctorModalIn 200ms ease-out',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <style>{`
          @keyframes doctorModalIn {
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
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                🩺 Portfolio Doctor
              </h2>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Análisis holístico · claude-sonnet-4-20250514
              </p>
            </div>
            {!isLoading && analysis && (
              <RiskBadge level={analysis.risk_level} />
            )}
          </div>

          <button
            onClick={handleClose}
            aria-label="Cerrar"
            style={{
              width: '32px', height: '32px',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
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
          ) : errorMsg ? (
            <ErrorState message={errorMsg} onRetry={handleRetry} />
          ) : analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analysis.sections.map(section => (
                <SectionCard
                  key={section.title}
                  section={section}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!isLoading && analysis && (
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
              Análisis: {formatDate(analysis.analysis_date)} · Datos: posiciones + fundamentales FMP
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleRetry}
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
                🔄 Nuevo análisis
              </button>
              <button
                onClick={handleClose}
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
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
