// ─────────────────────────────────────────────────────────────────────────────
// ResearchPanel.tsx
// Layout dos columnas: análisis streaming (70%) | datos fuente sticky (30%)
// Cursor parpadeante al final del texto mientras llega el stream.
// Historial de análisis anteriores colapsable al pie.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { KpiGrid } from './KpiGrid'
import { TradingViewWidget } from './TradingViewWidget'
import { PortfolioContextPanel } from './PortfolioContextPanel'
import { useResearch } from '../../hooks/useResearch'
import type { ResearchEntry } from '../../types'
import { formatDate } from '../../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// Sección headers con emoji — Syne 600 12px uppercase tracking-wider
// ─────────────────────────────────────────────────────────────────────────────
const SECTION_HEADERS = [
  '📊 CUADRO DE MANDO',
  '📈 TESIS DE INVERSIÓN',
  '📉 ANÁLISIS FUNDAMENTAL',
  '💼 TU EXPOSICIÓN',
  '⚠️ RIESGOS',
  '📐 NIVELES TÉCNICOS',
  '📅 PRÓXIMO CATALIZADOR',
]

function renderAnalysis(text: string, isStreaming: boolean) {
  const lines = text.split('\n')

  return (
    <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
      {lines.map((line, i) => {
        const isSectionHeader = SECTION_HEADERS.some(h => {
      const prefix = h.split(' ')[0]
      return prefix !== undefined && line.trim().startsWith(prefix)
    })
        const isLast = i === lines.length - 1

        if (isSectionHeader) {
          return (
            <div
              key={i}
              style={{
                fontFamily: 'Syne, system-ui, sans-serif',
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-primary)',
                marginTop: i === 0 ? 0 : '20px',
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {line}
            </div>
          )
        }

        if (line.trim() === '') {
          return <div key={i} style={{ height: '6px' }} />
        }

        return (
          <div key={i} style={{ marginBottom: '2px' }}>
            {line}
            {isLast && isStreaming && <BlinkingCursor />}
          </div>
        )
      })}
      {!text.endsWith('\n') && isStreaming && lines.length === 0 && <BlinkingCursor />}
    </div>
  )
}

function BlinkingCursor() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '2px',
        height: '14px',
        background: 'var(--color-primary)',
        marginLeft: '2px',
        verticalAlign: 'text-bottom',
        animation: 'cursorBlink 0.9s ease-in-out infinite',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de historial colapsable
// ─────────────────────────────────────────────────────────────────────────────
function HistoryPanel({
  entries,
  onSelect,
}: {
  entries: ResearchEntry[]
  onSelect: (e: ResearchEntry) => void
}) {
  const [open, setOpen] = useState(false)

  if (entries.length === 0) return null

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-default)',
        marginTop: '24px',
        paddingTop: '12px',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: 0,
        }}
      >
        <span
          style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            display: 'inline-block',
          }}
        >
          ›
        </span>
        Análisis anteriores ({entries.length})
      </button>

      {open && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map(entry => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                  }}
                >
                  {entry.symbol}
                </span>
                <span
                  style={{
                    marginLeft: '10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {entry.query.length > 60 ? entry.query.slice(0, 60) + '…' : entry.query}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {formatDate(entry.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResearchPanel principal
// ─────────────────────────────────────────────────────────────────────────────

export function ResearchPanel() {
  const [symbolInput, setSymbolInput] = useState('')
  const [queryInput, setQueryInput] = useState('')
  const analysisRef = useRef<HTMLDivElement>(null)

  const {
    analyzeSymbol,
    streamingText,
    isStreaming,
    isLoading,
    error,
    currentSnapshot,
    currentPortfolioCtx,
    currentSymbol,
    history,
    loadHistoryEntry,
  } = useResearch()

  // Auto-scroll al final mientras llega el stream
  useEffect(() => {
    if (isStreaming && analysisRef.current) {
      analysisRef.current.scrollTop = analysisRef.current.scrollHeight
    }
  }, [streamingText, isStreaming])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sym = symbolInput.trim().toUpperCase()
    const q   = queryInput.trim() || `Analizá ${sym}: ¿conviene mantener o hay mejor momento para entrar?`
    if (sym) analyzeSymbol(sym, q)
  }

  const hasResult = streamingText.length > 0
  const displaySymbol = currentSymbol ?? symbolInput.toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* ── Barra de input ──────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}
      >
        {/* Símbolo */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            type="text"
            value={symbolInput}
            onChange={e => setSymbolInput(e.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={10}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '9px 12px',
              fontSize: '14px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 700,
              width: '100px',
              outline: 'none',
              letterSpacing: '0.06em',
              transition: 'border-color 150ms',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-default)' }}
          />
        </div>

        {/* Query */}
        <textarea
          value={queryInput}
          onChange={e => setQueryInput(e.target.value)}
          placeholder="¿Conviene mantener? ¿Hay catalizadores próximos? ¿Qué dicen los fundamentales?"
          rows={2}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            padding: '9px 12px',
            fontSize: '13px',
            fontFamily: 'Syne, system-ui, sans-serif',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.5',
            transition: 'border-color 150ms',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)' }}
        />

        {/* Botón */}
        <button
          type="submit"
          disabled={!symbolInput.trim() || isLoading || isStreaming}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'Syne, system-ui, sans-serif',
            cursor: isLoading || isStreaming ? 'not-allowed' : 'pointer',
            opacity: isLoading || isStreaming ? 0.6 : 1,
            letterSpacing: '0.03em',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 150ms',
            alignSelf: 'stretch',
          }}
          onMouseEnter={e => {
            if (!isLoading && !isStreaming)
              (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'
          }}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : isStreaming ? (
            <>
              <LoadingSpinner />
              Analizando…
            </>
          ) : (
            <>
              <span style={{ fontSize: '14px' }}>🔍</span>
              Analizar
            </>
          )}
        </button>
      </form>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--color-loss)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Layout dos columnas ────────────────────────────────────────────── */}
      {hasResult || isLoading ? (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Columna izquierda — análisis streaming (70%) */}
          <div
            ref={analysisRef}
            style={{
              flex: '0 0 70%',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '20px 24px',
                minHeight: '200px',
              }}
            >
              {isLoading && !hasResult ? (
                <SkeletonLoader />
              ) : (
                renderAnalysis(streamingText, isStreaming)
              )}
            </div>

            {/* Historial */}
            <HistoryPanel entries={history} onSelect={loadHistoryEntry} />
          </div>

          {/* Columna derecha — datos fuente sticky (30%) */}
          <div
            style={{
              flex: '0 0 calc(30% - 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* Sticky wrapper */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Header de datos fuente */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    fontFamily: 'Syne, system-ui, sans-serif',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>DATOS FUENTE</span>
                  <span
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      color: 'var(--color-primary)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {displaySymbol}
                  </span>
                </div>

                {currentSnapshot ? (
                  <KpiGrid data={currentSnapshot} symbol={displaySymbol} />
                ) : (
                  <SkeletonKpi />
                )}
              </div>

              {/* Posición del usuario */}
              {currentPortfolioCtx && (
                <PortfolioContextPanel
                  context={currentPortfolioCtx}
                  symbol={displaySymbol}
                />
              )}

              {/* TradingView chart */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  padding: '2px',
                }}
              >
                <TradingViewWidget symbol={displaySymbol} height={280} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Keyframes globales — inyectados inline una vez */}
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes earningsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-componentes de soporte
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '12px',
        height: '12px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}

function SkeletonLoader() {
  const lines = [80, 60, 100, 70, 90, 50, 85, 65, 75, 40]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {lines.map((w, i) => (
        <div
          key={i}
          style={{
            height: i % 4 === 0 ? '10px' : '13px',
            width: `${w}%`,
            borderRadius: '4px',
            background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            marginTop: i % 4 === 0 && i > 0 ? '8px' : 0,
          }}
        />
      ))}
    </div>
  )
}

function SkeletonKpi() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '52px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  )
}

function EmptyState() {
  const suggestions = ['AAPL', 'NVDA', 'MSFT', 'BTC']

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ fontSize: '40px', opacity: 0.4 }}>🔍</div>
      <div
        style={{
          fontSize: '14px',
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        Ingresá un símbolo y consultá al Research Agent
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Análisis con fundamentales FMP + técnicos Alpaca + tu exposición en el portafolio
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {suggestions.map(s => (
          <span
            key={s}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 700,
              color: 'var(--text-secondary)',
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
