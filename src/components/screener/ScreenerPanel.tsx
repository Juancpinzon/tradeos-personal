// ─────────────────────────────────────────────────────────────────────────────
// src/components/screener/ScreenerPanel.tsx
// Contenedor principal: preset selector + form + results
// Mock data incluido para Fase 5 visual
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { ScreenerCriteria, ScreenerResultItem, ScreenerPreset } from '../../types'
import ScreenerCriteriaForm from './ScreenerCriteriaForm'
import ScreenerResultsTable from './ScreenerResultsTable'

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PRESETS: ScreenerPreset[] = []

const MOCK_RESULTS: ScreenerResultItem[] = []
const MOCK_AI_SUMMARY = ''

// ─────────────────────────────────────────────────────────────────────────────
// ScreenerPanel
// ─────────────────────────────────────────────────────────────────────────────

interface ScreenerPanelProps {
  /** Para Fase 6: recibir resultados reales y estado de carga desde hook */
  externalResults?: ScreenerResultItem[]
  externalSummary?: string
  externalEvaluated?: number
  isLoadingExternal?: boolean
}

export default function ScreenerPanel({
  externalResults,
  externalSummary,
  externalEvaluated,
  isLoadingExternal = false,
}: ScreenerPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(MOCK_PRESETS[0]?.id ?? '')
  const [criteria, setCriteria] = useState<ScreenerCriteria>(
    MOCK_PRESETS[0]?.criteria ?? {
      eps_next_positive: true,
      asset_class: 'equity',
    }
  )
  const [isRunning, setIsRunning] = useState(false)
  const [hasRun, setHasRun]   = useState(false)
  const [showSave, setShowSave] = useState(false)

  function handlePresetChange(presetId: string) {
    const preset = MOCK_PRESETS.find(p => p.id === presetId)
    if (preset) {
      setSelectedPresetId(presetId)
      setCriteria(preset.criteria)
    }
  }

  function handleRun() {
    setIsRunning(true)
    setHasRun(false)
    // Simular latencia de Edge Function
    setTimeout(() => {
      setIsRunning(false)
      setHasRun(true)
    }, 1800)
  }

  const results  = externalResults ?? (hasRun ? MOCK_RESULTS : [])
  const summary  = externalSummary ?? (hasRun ? MOCK_AI_SUMMARY : undefined)
  const evaluated = externalEvaluated ?? (hasRun ? 847 : undefined)
  const loading  = isLoadingExternal || isRunning

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>

      {/* Header con preset selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            🎯 Screener IA
          </h1>

          {/* Preset dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              id="screener-preset-select"
              value={selectedPresetId}
              onChange={e => handlePresetChange(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.375rem',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                padding: '0.375rem 0.75rem',
                fontFamily: '"Syne", sans-serif',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {MOCK_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>

        {/* Leyenda rápida */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          <span>★ = en portafolio</span>
          <span>WL = en watchlist</span>
          <span>Click en fila → Research</span>
        </div>
      </div>

      {/* Criteria form */}
      <ScreenerCriteriaForm
        criteria={criteria}
        onChange={c => { setCriteria(c); setSelectedPresetId('custom') }}
        isRunning={loading}
        onRun={handleRun}
        onSave={() => setShowSave(true)}
      />

      {/* Save preset modal (simple inline) */}
      {showSave && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--color-primary)',
          borderRadius: '0.5rem',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <input
            autoFocus
            className="input-base"
            placeholder="Nombre del preset..."
            style={{ flex: 1, fontSize: '0.875rem' }}
          />
          <button
            onClick={() => setShowSave(false)}
            style={{
              padding: '0.5rem 1rem',
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
            Guardar
          </button>
          <button
            onClick={() => setShowSave(false)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '0.5rem',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--border-default)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Ejecutando screener...
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              Filtrando universo → enriqueciendo con FMP → scoring Claude 0-100
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <ScreenerResultsTable
          results={results}
          totalEvaluated={evaluated}
          aiSummary={summary}
        />
      )}
    </div>
  )
}
