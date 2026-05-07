// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Research.tsx — Research Agent (Fase 3)
// ─────────────────────────────────────────────────────────────────────────────

import { ResearchPanel } from '../components/research/ResearchPanel'

export default function Research() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'Syne, system-ui, sans-serif',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Research Agent
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '2px 0 0',
              fontFamily: 'Syne, system-ui, sans-serif',
            }}
          >
            Fundamentales FMP · técnicos Alpaca · exposición del portafolio
          </p>
        </div>

        <span
          style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'rgba(99,160,255,0.9)',
            fontFamily: 'Syne, system-ui, sans-serif',
            letterSpacing: '0.04em',
          }}
        >
          claude-sonnet-4-20250514
        </span>
      </div>

      {/* Panel principal */}
      <div
        style={{
          flex: 1,
          padding: '16px 24px 20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ResearchPanel />
      </div>
    </div>
  )
}
