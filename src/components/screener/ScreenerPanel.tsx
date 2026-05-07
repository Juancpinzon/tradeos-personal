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

const MOCK_PRESETS: ScreenerPreset[] = [
  {
    id: 'preset-1',
    user_id: 'mock',
    name: 'Momentum Growth',
    criteria: {
      market_cap_min: 2_000_000_000,
      revenue_growth_min_pct: 20,
      volume_avg_min: 200_000,
      ath_distance_max_pct: -20,
      eps_next_positive: true,
      asset_class: 'equity',
    },
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset-2',
    user_id: 'mock',
    name: 'Breakout Técnico',
    criteria: {
      market_cap_min: 1_000_000_000,
      price_min: 10,
      ath_distance_max_pct: -10,
      rsi_weekly_min: 50,
      rsi_weekly_max: 70,
      eps_next_positive: true,
      asset_class: 'equity',
    },
    created_at: new Date().toISOString(),
  },
]

const addDays = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0] as string
}

const MOCK_RESULTS: ScreenerResultItem[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 924.37,
    market_cap: 2_280_000_000_000,
    revenue_growth_pct: 122.4,
    ath_distance_pct: -5.2,
    rsi_weekly: 65,
    eps_next_estimate: 5.89,
    volume_avg: 45_000_000,
    next_earnings_date: addDays(5),
    score: 94,
    ai_note: 'Momentum técnico excepcional. Extensión natural de tu posición actual. Revenue acelerado por demanda de H100. RSI semanal en zona saludable (65) sin sobrecompra.',
    already_in_portfolio: true,
    already_in_watchlist: false,
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 498.50,
    market_cap: 1_270_000_000_000,
    revenue_growth_pct: 27.3,
    ath_distance_pct: -4.1,
    rsi_weekly: 58,
    eps_next_estimate: 5.17,
    volume_avg: 18_000_000,
    score: 87,
    ai_note: 'Monetización de Reels mejorando. Costos de infrastructure IA bajo control. Margen operativo expandiéndose a 38%. Diversificación de exposición tech sin solaparse con AAPL.',
    already_in_portfolio: false,
    already_in_watchlist: true,
  },
  {
    symbol: 'CRWD',
    name: 'CrowdStrike Holdings',
    price: 358.20,
    market_cap: 88_700_000_000,
    revenue_growth_pct: 31.7,
    ath_distance_pct: -12.4,
    rsi_weekly: 61,
    eps_next_estimate: 0.93,
    volume_avg: 6_500_000,
    next_earnings_date: addDays(28),
    score: 79,
    ai_note: 'Ciberseguridad cloud-native con ARR creciendo 33% YoY. Net Revenue Retention >120%. Segmento no representado en tu portafolio actual — buena diversificación sectorial.',
    already_in_portfolio: false,
    already_in_watchlist: false,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 420.18,
    market_cap: 3_120_000_000_000,
    revenue_growth_pct: 17.6,
    ath_distance_pct: -7.8,
    rsi_weekly: 55,
    eps_next_estimate: 3.10,
    volume_avg: 22_000_000,
    score: 76,
    ai_note: 'Sólido pero ya tienes posición. Azure creciendo 31% YoY. El peso actual de 14.2% en tu portafolio no justifica ampliar — scoring moderado por concentración ya existente.',
    already_in_portfolio: true,
    already_in_watchlist: false,
  },
  {
    symbol: 'SHOP',
    name: 'Shopify Inc.',
    price: 71.45,
    market_cap: 91_200_000_000,
    revenue_growth_pct: 24.2,
    ath_distance_pct: -38.1,
    rsi_weekly: 48,
    eps_next_estimate: 0.21,
    volume_avg: 9_800_000,
    score: 68,
    ai_note: 'Revenue growth saludable pero ATH distance elevada (-38%). RSI semanal bajo 50 indica momentum técnico débil. Esperar confirmación por sobre $75 antes de entrada.',
    already_in_portfolio: false,
    already_in_watchlist: false,
  },
]

const MOCK_AI_SUMMARY =
  'NVDA extiende tu posición existente con momentum técnico excepcional. META y CRWD representan exposición nueva sin solapamiento: ads-tech y ciberseguridad. MSFT ya está en portafolio; ampliar solo si recortás primero. SHOP requiere confirmación técnica.'

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
  const [hasRun, setHasRun]   = useState(true) // true = mostrar mock results por defecto
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
