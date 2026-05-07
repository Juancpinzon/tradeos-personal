// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Settings.tsx — Configuración de TradeOS Personal
// API Keys · Risk Management · Trading Mode
// Datos mock — sin llamadas reales (Fase 6 visual)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Circle,
  XCircle,
  RefreshCw,
  Save,
  TrendingUp,
  Cpu,
  BarChart2,
  FileUp,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import ImporterModal from '../components/importer/ImporterModal'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'error' | 'unconfigured'
type TradingMode = 'paper' | 'live'

interface ApiKeyState {
  apiKey:  string
  secret:  string
  showKey: boolean
  showSecret: boolean
  status:  ConnectionStatus
  loading: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes mock
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PORTFOLIO_EQUITY = 125_430

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
}) {
  return (
    <div style={{ marginBottom: '1.125rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.3rem' }}>
        <Icon size={16} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{
          fontFamily: '"Syne", sans-serif',
          fontWeight: 700,
          fontSize:   '1rem',
          color:      'var(--text-primary)',
          margin:     0,
        }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.625rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const styles: Record<ConnectionStatus, React.CSSProperties> = {
    connected: {
      backgroundColor: 'rgba(16,185,129,0.1)',
      border:          '1px solid rgba(16,185,129,0.3)',
      color:           '#10b981',
    },
    error: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      border:          '1px solid rgba(239,68,68,0.3)',
      color:           '#ef4444',
    },
    unconfigured: {
      backgroundColor: 'var(--bg-elevated)',
      border:          '1px solid var(--border-default)',
      color:           'var(--text-muted)',
    },
  }
  const labels: Record<ConnectionStatus, string> = {
    connected:   '✓ Conectado',
    error:       '✗ Error',
    unconfigured:'○ No configurado',
  }
  const icons = {
    connected:   <CheckCircle2 size={12} strokeWidth={2.5} />,
    error:       <XCircle size={12} strokeWidth={2.5} />,
    unconfigured:<Circle size={12} strokeWidth={2} />,
  }

  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         '0.3rem',
      padding:     '0.2rem 0.625rem',
      borderRadius:'999px',
      fontSize:    '0.6875rem',
      fontWeight:  600,
      fontFamily:  '"Syne", sans-serif',
      ...styles[status],
    }}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyCard
// ─────────────────────────────────────────────────────────────────────────────

interface ApiKeyCardProps {
  name:        string
  description: string
  icon:        React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  state:       ApiKeyState
  onChange:    (patch: Partial<ApiKeyState>) => void
  singleKey?:  boolean  // some providers only need API key (no secret)
}

function ApiKeyCard({ name, description, icon: Icon, state, onChange, singleKey = false }: ApiKeyCardProps) {
  function handleSave() {
    onChange({ loading: true })
    // Mock: simulate verification delay
    setTimeout(() => {
      onChange({ loading: false, status: 'connected' })
    }, 1400)
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border:          '1px solid var(--border-default)',
      borderRadius:    '0.625rem',
      padding:         '1.25rem',
      display:         'flex',
      flexDirection:   'column',
      gap:             '1rem',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width:           '34px',
            height:          '34px',
            borderRadius:    '0.5rem',
            backgroundColor: 'var(--bg-elevated)',
            border:          '1px solid var(--border-default)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}>
            <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 600,
              fontSize:   '0.9375rem',
              color:      'var(--text-primary)',
              margin:     0,
            }}>
              {name}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {description}
            </p>
          </div>
        </div>
        <StatusBadge status={state.status} />
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 500 }}>
            API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={state.showKey ? 'text' : 'password'}
              className="input-base font-mono"
              placeholder="pk_••••••••••••••••"
              value={state.apiKey}
              onChange={e => onChange({ apiKey: e.target.value })}
              style={{ width: '100%', paddingRight: '2.5rem', fontSize: '0.8125rem' }}
            />
            <button
              onClick={() => onChange({ showKey: !state.showKey })}
              style={{
                position:        'absolute',
                right:           '0.625rem',
                top:             '50%',
                transform:       'translateY(-50%)',
                background:      'none',
                border:          'none',
                color:           'var(--text-muted)',
                cursor:          'pointer',
                display:         'flex',
                padding:         '0.125rem',
              }}
            >
              {state.showKey ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {!singleKey && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 500 }}>
              Secret Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={state.showSecret ? 'text' : 'password'}
                className="input-base font-mono"
                placeholder="sk_••••••••••••••••"
                value={state.secret}
                onChange={e => onChange({ secret: e.target.value })}
                style={{ width: '100%', paddingRight: '2.5rem', fontSize: '0.8125rem' }}
              />
              <button
                onClick={() => onChange({ showSecret: !state.showSecret })}
                style={{
                  position:   'absolute',
                  right:      '0.625rem',
                  top:        '50%',
                  transform:  'translateY(-50%)',
                  background: 'none',
                  border:     'none',
                  color:      'var(--text-muted)',
                  cursor:     'pointer',
                  display:    'flex',
                  padding:    '0.125rem',
                }}
              >
                {state.showSecret ? <EyeOff size={14} strokeWidth={1.75} /> : <Eye size={14} strokeWidth={1.75} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={state.loading}
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '0.4rem',
          padding:         '0.5rem 1rem',
          borderRadius:    '0.375rem',
          border:          'none',
          backgroundColor: state.loading ? 'var(--bg-elevated)' : 'var(--color-primary)',
          color:           state.loading ? 'var(--text-muted)' : 'white',
          fontSize:        '0.8125rem',
          fontFamily:      '"Syne", sans-serif',
          fontWeight:      700,
          cursor:          state.loading ? 'not-allowed' : 'pointer',
          transition:      'background-color 150ms',
          alignSelf:       'flex-start',
        }}
      >
        {state.loading ? (
          <>
            <RefreshCw size={13} strokeWidth={2.5} style={{ animation: 'spin 0.9s linear infinite' }} />
            Verificando...
          </>
        ) : (
          <>
            <CheckCircle2 size={13} strokeWidth={2.5} />
            Guardar y verificar
          </>
        )}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskSlider
// ─────────────────────────────────────────────────────────────────────────────

function RiskSlider({
  label,
  value,
  min,
  max,
  step,
  description,
  displayValue,
  onChange,
}: {
  label:        string
  value:        number
  min:          number
  max:          number
  step:         number
  description:  string
  displayValue: string
  onChange:     (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{
          fontSize:   '0.875rem',
          fontWeight: 500,
          color:      'var(--text-secondary)',
        }}>
          {label}
        </label>
        <span className="font-mono" style={{
          fontSize:  '1.0625rem',
          fontWeight: 700,
          color:     'var(--text-primary)',
        }}>
          {displayValue}
        </span>
      </div>

      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div style={{
          position:        'absolute',
          left:            0,
          right:           0,
          height:          '4px',
          borderRadius:    '2px',
          backgroundColor: 'var(--bg-elevated)',
          border:          '1px solid var(--border-default)',
        }} />
        {/* Filled portion */}
        <div style={{
          position:        'absolute',
          left:            0,
          width:           `${pct}%`,
          height:          '4px',
          borderRadius:    '2px',
          backgroundColor: 'var(--color-primary)',
          pointerEvents:   'none',
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position:   'absolute',
            left:       0,
            right:      0,
            width:      '100%',
            height:     '20px',
            opacity:    0,
            cursor:     'pointer',
            margin:     0,
          }}
        />
        {/* Thumb visual */}
        <div style={{
          position:        'absolute',
          left:            `calc(${pct}% - 8px)`,
          width:           '16px',
          height:          '16px',
          borderRadius:    '50%',
          backgroundColor: 'var(--color-primary)',
          border:          '2px solid var(--bg-surface)',
          boxShadow:       '0 0 0 1px var(--color-primary)',
          pointerEvents:   'none',
          transition:      'left 50ms',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          {description}
        </p>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>
          {min}% — {max}%
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Trading Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────

function LiveConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          60,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter:  'blur(4px)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:           '100%',
          maxWidth:        '400px',
          backgroundColor: 'var(--bg-surface)',
          border:          '1px solid rgba(239,68,68,0.4)',
          borderRadius:    '0.75rem',
          overflow:        'hidden',
          boxShadow:       '0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          padding:         '1rem 1.25rem',
          backgroundColor: 'rgba(239,68,68,0.08)',
          borderBottom:    '1px solid rgba(239,68,68,0.2)',
          display:         'flex',
          alignItems:      'center',
          gap:             '0.625rem',
        }}>
          <AlertTriangle size={18} strokeWidth={2} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize:   '1rem',
            color:      '#ef4444',
          }}>
            Confirmar Live Trading
          </span>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            ¿Confirmar activación de Live Trading?
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Esta acción ejecutará órdenes reales en tu cuenta Alpaca. Solo activar cuando estés completamente seguro y tu cuenta esté fondeada.
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button
              onClick={onCancel}
              style={{
                padding:         '0.5rem 1.125rem',
                borderRadius:    '0.375rem',
                border:          '1px solid var(--border-default)',
                backgroundColor: 'transparent',
                color:           'var(--text-secondary)',
                fontSize:        '0.875rem',
                fontFamily:      '"Syne", sans-serif',
                fontWeight:      500,
                cursor:          'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding:         '0.5rem 1.25rem',
                borderRadius:    '0.375rem',
                border:          '1px solid rgba(239,68,68,0.5)',
                backgroundColor: 'rgba(239,68,68,0.15)',
                color:           '#ef4444',
                fontSize:        '0.875rem',
                fontFamily:      '"Syne", sans-serif',
                fontWeight:      700,
                cursor:          'pointer',
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings page
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_API: ApiKeyState = { apiKey: '', secret: '', showKey: false, showSecret: false, status: 'unconfigured', loading: false }

export default function Settings() {
  // Section A: API Keys
  const [alpaca,    setAlpaca]    = useState<ApiKeyState>({ ...INITIAL_API, status: 'connected' })
  const [binance,   setBinance]   = useState<ApiKeyState>({ ...INITIAL_API })
  const [anthropic, setAnthropic] = useState<ApiKeyState>({ ...INITIAL_API, status: 'connected' })
  const [fmp,       setFmp]       = useState<ApiKeyState>({ ...INITIAL_API, status: 'connected' })

  // Section B: Risk Management
  const [riskPct,    setRiskPct]    = useState(2)
  const [maxPosPct,  setMaxPosPct]  = useState(15)

  // Section C: Trading Mode
  const [mode,        setMode]        = useState<TradingMode>('paper')
  const [showConfirm, setShowConfirm] = useState(false)
  const [savedMsg,    setSavedMsg]    = useState(false)

  // Section D: Import History
  const [showImporter, setShowImporter] = useState(false)
  const [importHistory, setImportHistory] = useState<{
    id: string; filename: string; imported_rows: number;
    status: string; created_at: string;
  }[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('import_sessions')
        .select('id,filename,imported_rows,status,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setImportHistory(data)
    }
    load()
  }, [showImporter])

  function handleModeClick(m: TradingMode) {
    if (m === 'live' && mode === 'paper') {
      setShowConfirm(true)
    } else if (m === 'paper') {
      setMode('paper')
    }
  }

  function confirmLive() {
    setMode('live')
    setShowConfirm(false)
  }

  function handleSave() {
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2200)
  }

  // Computed
  const riskAmount   = (riskPct / 100) * MOCK_PORTFOLIO_EQUITY
  const maxPosAmount = (maxPosPct / 100) * MOCK_PORTFOLIO_EQUITY

  return (
    <>
      {showImporter && <ImporterModal onClose={() => setShowImporter(false)} />}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {showConfirm && (
        <LiveConfirmModal
          onConfirm={confirmLive}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <SettingsIcon size={22} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize:   '1.375rem',
            color:      'var(--text-primary)',
            margin:     0,
          }}>
            Configuración
          </h1>
        </div>

        {/* ─── SECTION A: API Keys ─── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <SectionHeader
              title="Claves de API"
              subtitle="Las claves se guardan en Supabase Vault cifrado — nunca en la base de datos"
              icon={ChevronRight}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              <ApiKeyCard
                name="Alpaca Markets"
                description="Broker NYSE/NASDAQ — paper & live"
                icon={TrendingUp}
                state={alpaca}
                onChange={p => setAlpaca(s => ({ ...s, ...p }))}
              />
              <ApiKeyCard
                name="Binance"
                description="Exchange cripto — spot trading"
                icon={BarChart2}
                state={binance}
                onChange={p => setBinance(s => ({ ...s, ...p }))}
              />
              <ApiKeyCard
                name="Anthropic (Claude API)"
                description="Research Agent · Screener · Portfolio Doctor"
                icon={Cpu}
                state={anthropic}
                onChange={p => setAnthropic(s => ({ ...s, ...p }))}
                singleKey
              />
              <ApiKeyCard
                name="Financial Modeling Prep"
                description="EPS · Revenue · Earnings calendar (250 req/día)"
                icon={BarChart2}
                state={fmp}
                onChange={p => setFmp(s => ({ ...s, ...p }))}
                singleKey
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION B: Risk Management ─── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <SectionHeader
              title="Gestión de Riesgo"
              subtitle={`Portafolio de referencia: ${formatCurrency(MOCK_PORTFOLIO_EQUITY, 0)}`}
              icon={AlertTriangle}
            />
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border:          '1px solid var(--border-default)',
              borderRadius:    '0.625rem',
              padding:         '1.5rem',
              display:         'flex',
              flexDirection:   'column',
              gap:             '1.75rem',
            }}>
              <RiskSlider
                label="Riesgo por operación"
                value={riskPct}
                min={0.5}
                max={10}
                step={0.5}
                displayValue={`${riskPct}% = ${formatCurrency(riskAmount, 0)} por trade`}
                description="Porcentaje máximo del portafolio que se arriesga en cada operación individual."
                onChange={setRiskPct}
              />
              <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
              <RiskSlider
                label="Tamaño máximo de posición"
                value={maxPosPct}
                min={5}
                max={50}
                step={5}
                displayValue={`${maxPosPct}% = ${formatCurrency(maxPosAmount, 0)} máx. por símbolo`}
                description="Porcentaje máximo del portafolio en un solo activo. Superar este límite activa una advertencia en el formulario de orden."
                onChange={setMaxPosPct}
              />
            </div>
          </div>
        </section>

        {/* ─── SECTION C: Trading Mode ─── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <SectionHeader
              title="Modo de Trading"
              subtitle="El modo paper no ejecuta órdenes reales. Siempre podés volver a paper desde acá."
              icon={TrendingUp}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

              {/* Paper card */}
              <button
                onClick={() => handleModeClick('paper')}
                style={{
                  display:         'flex',
                  flexDirection:   'column',
                  gap:             '0.75rem',
                  padding:         '1.25rem',
                  borderRadius:    '0.625rem',
                  border:          mode === 'paper'
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--border-default)',
                  backgroundColor: mode === 'paper'
                    ? 'rgba(59,130,246,0.07)'
                    : 'var(--bg-surface)',
                  cursor:          'pointer',
                  textAlign:       'left',
                  transition:      'all 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize:   '1rem',
                    color:      mode === 'paper' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}>
                    Paper Trading
                  </span>
                  {mode === 'paper' && (
                    <CheckCircle2 size={18} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
                  )}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Órdenes simuladas con datos reales del mercado. Ideal para probar estrategias sin riesgo de capital.
                </p>
                {mode === 'paper' && (
                  <span style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    padding:         '0.2rem 0.625rem',
                    borderRadius:    '999px',
                    backgroundColor: 'rgba(59,130,246,0.12)',
                    border:          '1px solid rgba(59,130,246,0.3)',
                    fontSize:        '0.6875rem',
                    fontWeight:      600,
                    color:           'var(--color-primary)',
                    alignSelf:       'flex-start',
                    fontFamily:      '"Syne", sans-serif',
                  }}>
                    Recomendado — sin riesgo de capital real
                  </span>
                )}
              </button>

              {/* Live card */}
              <button
                onClick={() => handleModeClick('live')}
                style={{
                  display:         'flex',
                  flexDirection:   'column',
                  gap:             '0.75rem',
                  padding:         '1.25rem',
                  borderRadius:    '0.625rem',
                  border:          mode === 'live'
                    ? '2px solid rgba(239,68,68,0.6)'
                    : '1px solid var(--border-default)',
                  backgroundColor: mode === 'live'
                    ? 'rgba(239,68,68,0.05)'
                    : 'var(--bg-surface)',
                  cursor:          'pointer',
                  textAlign:       'left',
                  transition:      'all 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize:   '1rem',
                    color:      mode === 'live' ? '#ef4444' : 'var(--text-secondary)',
                  }}>
                    Live Trading
                  </span>
                  {mode === 'live'
                    ? <AlertTriangle size={18} strokeWidth={2} style={{ color: '#ef4444' }} />
                    : <AlertTriangle size={16} strokeWidth={1.75} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  }
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Las órdenes se ejecutan en tu cuenta real de Alpaca. Requiere fondos reales y acepta riesgo de pérdida.
                </p>
                {mode === 'live' && (
                  <div style={{
                    display:         'flex',
                    alignItems:      'flex-start',
                    gap:             '0.5rem',
                    padding:         '0.75rem',
                    borderRadius:    '0.375rem',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border:          '1px solid rgba(239,68,68,0.3)',
                    marginTop:       '0.125rem',
                  }}>
                    <AlertTriangle size={14} strokeWidth={2.5} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{
                      fontSize:   '0.75rem',
                      color:      '#ef4444',
                      margin:     0,
                      lineHeight: 1.5,
                      fontWeight: 600,
                    }}>
                      ATENCIÓN: Las órdenes en modo Live se ejecutan con dinero real. Solo activar cuando estés seguro.
                    </p>
                  </div>
                )}
              </button>
            </div>

            {/* Save row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Última actualización: 06 May 2026, 09:41 AM
              </p>
              <button
                onClick={handleSave}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  gap:             '0.4rem',
                  padding:         '0.5625rem 1.25rem',
                  borderRadius:    '0.375rem',
                  border:          'none',
                  backgroundColor: savedMsg ? 'rgba(16,185,129,0.15)' : 'var(--color-primary)',
                  color:           savedMsg ? '#10b981' : 'white',
                  fontSize:        '0.875rem',
                  fontFamily:      '"Syne", sans-serif',
                  fontWeight:      700,
                  cursor:          'pointer',
                  transition:      'all 200ms',

                }}
              >
                {savedMsg ? (
                  <><CheckCircle2 size={14} strokeWidth={2.5} /> Configuración guardada</>
                ) : (
                  <><Save size={14} strokeWidth={2.5} /> Guardar configuración</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ─── SECTION D: Import History ─── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <SectionHeader
              title="Historial de operaciones"
              subtitle="Cargá operaciones previas desde Excel para alimentar el Journal con datos reales."
              icon={FileUp}
            />
            <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '0.625rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.375rem' }}>
                    Importar desde Excel (.xlsx)
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Columnas requeridas: <span style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--text-secondary)' }}>Ticker | Movimiento | Cantidad | Precio | Fecha</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowImporter(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5625rem 1.125rem', borderRadius: '0.375rem', border: 'none',
                    backgroundColor: 'var(--color-primary)', color: 'white',
                    fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                  }}
                >
                  <FileUp size={14} strokeWidth={2} />
                  Importar desde Excel
                </button>
              </div>

              {importHistory.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.625rem' }}>Importaciones anteriores</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {importHistory.map(h => (
                      <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', borderRadius: '0.375rem', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={13} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{h.filename}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(h.created_at).toLocaleDateString('es-AR')}
                          </span>
                          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: '#10b981' }}>
                            {h.imported_rows} importadas
                          </span>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '0.2rem', fontSize: '0.625rem', fontWeight: 600,
                            backgroundColor: h.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
                            color: h.status === 'completed' ? '#10b981' : 'var(--text-muted)',
                            border: h.status === 'completed' ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--border-default)',
                            fontFamily: '"Syne", sans-serif', textTransform: 'uppercase',
                          }}>{h.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
