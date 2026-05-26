// ─────────────────────────────────────────────────────────────────────────────
// src/components/journal/JournalForm.tsx — Entrada pre-trade del journal
// PRE-TRADE: borde azul | POST-TRADE: dinámico según outcome
// Props mode: sin hooks, sin Supabase — solo visual
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import type { EmotionalState, ConfidenceLevel, SetupType, JournalEntry } from '../../types'
import { X, ChevronRight, Lock } from 'lucide-react'
import { useFlightPlan } from '../../hooks/useFlightPlan'
import { useOrders } from '../../hooks/useOrders'

// ─── Props ───────────────────────────────────────────────────────────────────

interface JournalFormProps {
  orderId?:     string
  symbol?:      string            // undefined = editable por el usuario
  side?:        'buy' | 'sell'   // undefined = editable por el usuario
  entryPrice?:  number           // filled_avg_price de la orden, para calcular R/R
  onSave:       (data: Partial<JournalEntry>) => void
  onClose?:     () => void
}

// ─── Constantes de diseño ────────────────────────────────────────────────────

const EMOTIONAL_STATES: {
  value: EmotionalState
  label: string
  color: string
  bg:    string
}[] = [
  { value: 'calm',      label: 'Tranquilo',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  { value: 'confident', label: 'Confiado',   color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  { value: 'excited',   label: 'Emocionado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { value: 'uncertain', label: 'Inseguro',   color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  { value: 'fearful',   label: 'Temeroso',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
]

const SETUP_TYPES: { value: SetupType; label: string }[] = [
  { value: 'breakout',      label: 'Breakout'      },
  { value: 'pullback',      label: 'Pullback'      },
  { value: 'earnings_play', label: 'Earnings Play' },
  { value: 'swing',         label: 'Swing'         },
  { value: 'reversal',      label: 'Reversal'      },
  { value: 'other',         label: 'Other'         },
]

const CONFIDENCE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981']

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Muy bajo',
  2: 'Bajo',
  3: 'Neutral',
  4: 'Alto',
  5: 'Muy alto',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JournalForm({
  orderId,
  symbol: symbolProp,
  side: sideProp,
  entryPrice: entryPriceProp,
  onSave,
  onClose,
}: JournalFormProps) {
  // Symbol / side editables si no vienen por props
  const [symbolInput,     setSymbolInput]     = useState(symbolProp ?? '')
  const [sideInput,       setSideInput]       = useState<'buy' | 'sell'>(sideProp ?? 'buy')
  const [entryPriceInput, setEntryPriceInput] = useState('')

  // PRE-TRADE fields
  const [thesis,         setThesis]         = useState('')
  const [tradeType,      setTradeType]      = useState<'intraday' | 'swing' | null>(null)
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null)
  const [confidence,     setConfidence]     = useState<ConfidenceLevel | null>(null)
  const [setupType,      setSetupType]      = useState<SetupType | ''>('')
  const [stopLoss,       setStopLoss]       = useState('')
  const [target,         setTarget]         = useState('')
  const [isTradeTypeLocked, setIsTradeTypeLocked] = useState(false)

  const { plan, updateCandidate } = useFlightPlan()
  const { orders } = useOrders()

  const resolvedSymbol     = symbolProp ?? symbolInput
  const resolvedSide       = sideProp   ?? sideInput
  const resolvedEntryPrice = entryPriceProp ?? (entryPriceInput ? parseFloat(entryPriceInput) : undefined)

  // Find matching flight plan candidate
  const candidate = useMemo(() => {
    if (!plan || !resolvedSymbol) return null
    return plan.candidates?.find(c => c.symbol.toUpperCase() === resolvedSymbol.toUpperCase()) || null
  }, [plan, resolvedSymbol])

  // Find matching order
  const preloadedOrder = useMemo(() => {
    if (orderId) {
      return orders.find(o => o.id === orderId) || null
    }
    if (resolvedSymbol) {
      return orders.find(o => o.symbol.toUpperCase() === resolvedSymbol.toUpperCase()) || null
    }
    return null
  }, [orders, orderId, resolvedSymbol])

  // Precarga desde Flight Plan o la orden
  useEffect(() => {
    if (candidate) {
      setThesis(prev => prev || candidate.entry_thesis || '')
      setSetupType(prev => prev || (candidate.setup_type as SetupType) || '')
      setStopLoss(prev => prev || candidate.stop_loss?.toString() || '')
      setTarget(prev => prev || candidate.target?.toString() || '')
    }
  }, [candidate])

  // Precarga de trade_type (con opción de bloqueo y cambio)
  useEffect(() => {
    if (preloadedOrder?.trade_type) {
      setTradeType(preloadedOrder.trade_type)
      setIsTradeTypeLocked(true)
    } else if (candidate?.trade_type) {
      setTradeType(candidate.trade_type)
      setIsTradeTypeLocked(true)
    } else {
      setIsTradeTypeLocked(false)
    }
  }, [preloadedOrder, candidate])

  // Auto R/R
  const rrNum = resolvedEntryPrice && stopLoss && target
    ? (parseFloat(target) - resolvedEntryPrice) / (resolvedEntryPrice - parseFloat(stopLoss))
    : null
  const rrRatio = rrNum !== null && isFinite(rrNum) ? rrNum.toFixed(2) : null

  const isValid =
    resolvedSymbol.trim().length > 0 &&
    thesis.trim().length > 0 &&
    emotionalState !== null &&
    confidence !== null &&
    tradeType !== null

  const handleSave = () => {
    if (!isValid || !emotionalState || !confidence || !tradeType) return
    onSave({
      order_id:            orderId,
      symbol:              resolvedSymbol.trim().toUpperCase(),
      side:                resolvedSide,
      asset_class:         'equity',
      trade_type:          tradeType,
      entry_thesis:        thesis.trim(),
      emotional_state:     emotionalState,
      confidence_level:    confidence,
      setup_type:          setupType || undefined,
      planned_stop_loss:   stopLoss    ? parseFloat(stopLoss)    : undefined,
      planned_target:      target      ? parseFloat(target)      : undefined,
      planned_risk_reward: rrRatio     ? parseFloat(rrRatio)     : undefined,
      followed_plan:       false,
    })

    // Marcar como ejecutado en el Flight Plan si corresponde
    if (plan && resolvedSymbol) {
      const candidate = plan.candidates?.find(c => c.symbol === resolvedSymbol)
      if (candidate && !candidate.executed) {
        updateCandidate({ id: candidate.id, updates: { executed: true } })
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {symbolProp ? (
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: '"Syne", sans-serif', letterSpacing: '-0.01em' }}>
                {symbolProp}
              </span>
            ) : (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nueva entrada
              </span>
            )}
            {sideProp && (
              <span
                className={`badge badge-${resolvedSide === 'buy' ? 'long' : 'short'}`}
                style={{ fontSize: '0.5625rem' }}
              >
                {resolvedSide.toUpperCase()}
              </span>
            )}
            {orderId && (
              <span className="badge" style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.2)',
                fontSize: '0.5rem',
              }}>
                ORDEN VINCULADA
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            📓 Pre-trade · capturá la tesis antes de entrar
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '0.25rem', flexShrink: 0,
              border: '1px solid var(--border-default)', backgroundColor: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* Symbol + Side (solo si no vienen por props) */}
        {(!symbolProp || !sideProp) && (
          <div style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: !symbolProp && !sideProp ? '1fr auto' : '1fr', gap: '0.75rem' }}>
            {!symbolProp && (
              <div>
                <label style={labelStyle}>Símbolo <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={symbolInput}
                  onChange={e => setSymbolInput(e.target.value.toUpperCase())}
                  placeholder="AAPL, BTC, NVDA..."
                  className="input-base font-mono"
                  style={{ textTransform: 'uppercase', fontWeight: 600 }}
                  maxLength={10}
                />
              </div>
            )}
            {!sideProp && (
              <div>
                <label style={labelStyle}>Lado</label>
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
                  {(['buy', 'sell'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSideInput(s)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: `1px solid ${sideInput === s
                          ? (s === 'buy' ? '#10b981' : '#ef4444')
                          : 'var(--border-default)'}`,
                        backgroundColor: sideInput === s
                          ? (s === 'buy' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)')
                          : 'transparent',
                        color: sideInput === s
                          ? (s === 'buy' ? '#10b981' : '#ef4444')
                          : 'var(--text-muted)',
                        fontSize: '0.8125rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 150ms ease',
                        fontFamily: '"Syne", sans-serif',
                      }}
                    >
                      {s === 'buy' ? 'BUY' : 'SELL'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRE-TRADE SECTION ─────────────────────────────────────────── */}
        <div style={{
          borderLeft: '3px solid #3b82f6',
          paddingLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.125rem',
        }}>
          <h3 style={sectionTitleStyle('#3b82f6')}>Pre-Trade</h3>

          {/* Tipo de operación */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>
                Tipo de operación <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isTradeTypeLocked && (
                <button
                  type="button"
                  onClick={() => setIsTradeTypeLocked(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
                  }}
                >
                  <Lock size={10} /> Cambiar
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {([
                { value: 'intraday', label: 'Intraday (Día)', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                { value: 'swing', label: 'Swing (Varios días)', color: '#a855f7', bg: 'rgba(163,116,255,0.12)' },
              ] as const).map(({ value, label, color, bg }) => {
                const selected = tradeType === value
                const isDisabled = isTradeTypeLocked
                const showAsSelected = selected
                const opacity = isTradeTypeLocked ? (showAsSelected ? 1 : 0.3) : 1

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setTradeType(selected ? null : value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: `1px solid ${showAsSelected ? color : 'var(--border-default)'}`,
                      backgroundColor: showAsSelected ? bg : 'transparent',
                      color: showAsSelected ? color : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: showAsSelected ? 600 : 400,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms ease',
                      fontFamily: '"Syne", sans-serif',
                      opacity,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {isTradeTypeLocked && (
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                Precargado automáticamente desde {preloadedOrder ? 'la orden ejecutada' : 'el plan de vuelo'}.
              </p>
            )}
          </div>

          {/* Tesis de entrada */}
          <div>
            <label style={labelStyle}>
              Tesis de entrada <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="¿Por qué entrás? Catalyst, setup técnico, nivel de convicción, qué tiene que pasar para que funcione..."
              rows={4}
              className="input-base"
              style={{ resize: 'vertical', lineHeight: 1.6, marginTop: '0.375rem' }}
            />
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {thesis.length} / 500 caracteres
            </p>
          </div>

          {/* Emotional State — pills */}
          <div>
            <label style={labelStyle}>
              Estado emocional <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
              {EMOTIONAL_STATES.map(({ value, label, color, bg }) => {
                const selected = emotionalState === value
                return (
                  <button
                    key={value}
                    onClick={() => setEmotionalState(selected ? null : value)}
                    style={{
                      padding: '0.375rem 1rem',
                      borderRadius: '9999px',
                      border: `1px solid ${selected ? color : 'var(--border-default)'}`,
                      backgroundColor: selected ? bg : 'transparent',
                      color: selected ? color : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: selected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      fontFamily: '"Syne", sans-serif',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Confidence Level — 5 dots */}
          <div>
            <label style={labelStyle}>
              Nivel de convicción <span style={{ color: '#ef4444' }}>*</span>
              {confidence && (
                <span style={{ marginLeft: '0.5rem', color: CONFIDENCE_COLORS[confidence - 1], fontSize: '0.6875rem', fontWeight: 600 }}>
                  — {CONFIDENCE_LABELS[confidence]}
                </span>
              )}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.625rem' }}>
              {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => {
                const color    = CONFIDENCE_COLORS[level - 1]
                const filled   = confidence !== null && level <= confidence
                const isCurrent = confidence === level
                return (
                  <button
                    key={level}
                    onClick={() => setConfidence(level === confidence ? null : level)}
                    title={CONFIDENCE_LABELS[level]}
                    style={{
                      width:  '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: `2px solid ${filled ? color : 'var(--border-default)'}`,
                      backgroundColor: filled ? color : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: isCurrent ? `0 0 10px ${color}60` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: filled ? 'white' : 'var(--text-muted)',
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}>
                      {level}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Setup Type */}
          <div>
            <label style={labelStyle}>Tipo de setup</label>
            <select
              value={setupType}
              onChange={e => setSetupType(e.target.value as SetupType | '')}
              className="input-base"
              style={{ marginTop: '0.375rem', cursor: 'pointer' }}
            >
              <option value="">— Seleccionar (opcional) —</option>
              {SETUP_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Stop Loss + Target */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Stop Loss planificado</label>
              <input
                type="number"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                placeholder="$0.00"
                className="input-base font-mono"
                style={{ marginTop: '0.375rem' }}
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Target planificado</label>
              <input
                type="number"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="$0.00"
                className="input-base font-mono"
                style={{ marginTop: '0.375rem' }}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Entry price (si no viene por props, para calcular R/R) */}
          {!entryPriceProp && (
            <div>
              <label style={labelStyle}>Precio de entrada <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(para calcular R/R)</span></label>
              <input
                type="number"
                value={entryPriceInput}
                onChange={e => setEntryPriceInput(e.target.value)}
                placeholder="$0.00"
                className="input-base font-mono"
                style={{ marginTop: '0.375rem' }}
                step="0.01"
                min="0"
              />
            </div>
          )}

          {/* R/R calculado */}
          {rrRatio && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Risk / Reward
                </span>
              </div>
              <span className="font-mono" style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: parseFloat(rrRatio) >= 2 ? '#10b981' : parseFloat(rrRatio) >= 1 ? '#f59e0b' : '#ef4444',
              }}>
                1 : {rrRatio}
              </span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ height: '1rem' }} />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
        display: 'flex',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-surface)',
      }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.625rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 500,
            }}
          >
            Ahora no
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="btn-primary"
          style={{ flex: 2 }}
        >
          Guardar entrada
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Shared micro-styles ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  letterSpacing: '0.01em',
}

function sectionTitleStyle(color: string): React.CSSProperties {
  return {
    fontSize: '0.625rem',
    fontWeight: 700,
    color,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  }
}
