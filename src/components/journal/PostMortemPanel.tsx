// ─────────────────────────────────────────────────────────────────────────────
// src/components/journal/PostMortemPanel.tsx — Post-mortem de una operación
// Borde izquierdo dinámico: verde (win) · rojo (loss) · gris (breakeven)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { JournalEntry, TradeOutcome, PostEmotionalState } from '../../types'
import { formatCurrency, formatDateShort } from '../../lib/formatters'
import { X, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface PostMortemPanelProps {
  entry:   JournalEntry
  onSave:  (updates: Partial<JournalEntry>) => void
  onClose?: () => void
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const OUTCOMES: {
  value: TradeOutcome
  label: string
  color: string
  bg:    string
  icon:  React.ReactNode
}[] = [
  {
    value: 'win',
    label: 'Win',
    color: '#10b981',
    bg:    'rgba(16,185,129,0.12)',
    icon:  <CheckCircle2 size={15} />,
  },
  {
    value: 'loss',
    label: 'Loss',
    color: '#ef4444',
    bg:    'rgba(239,68,68,0.12)',
    icon:  <XCircle size={15} />,
  },
  {
    value: 'breakeven',
    label: 'Breakeven',
    color: '#9ca3af',
    bg:    'rgba(156,163,175,0.10)',
    icon:  <MinusCircle size={15} />,
  },
]

const POST_EMOTIONAL_STATES: {
  value: PostEmotionalState
  label: string
  emoji: string
}[] = [
  { value: 'satisfied',  label: 'Satisfecho',   emoji: '😌' },
  { value: 'relieved',   label: 'Aliviado',     emoji: '😮‍💨' },
  { value: 'neutral',    label: 'Neutral',      emoji: '😐' },
  { value: 'anxious',    label: 'Ansioso',      emoji: '😰' },
  { value: 'regretful',  label: 'Arrepentido',  emoji: '😔' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function PostMortemPanel({ entry, onSave, onClose }: PostMortemPanelProps) {
  const [outcome,         setOutcome]         = useState<TradeOutcome | ''>(entry.outcome ?? '')
  const [actualPnl,       setActualPnl]       = useState(entry.actual_pnl?.toString()     ?? '')
  const [actualPnlPct,    setActualPnlPct]    = useState(entry.actual_pnl_pct?.toString() ?? '')
  const [exitReason,      setExitReason]      = useState(entry.exit_reason               ?? '')
  const [whatWentRight,   setWhatWentRight]   = useState(entry.what_went_right           ?? '')
  const [whatWentWrong,   setWhatWentWrong]   = useState(entry.what_went_wrong           ?? '')
  const [lesson,          setLesson]          = useState(entry.lesson                    ?? '')
  const [followedPlan,    setFollowedPlan]    = useState<boolean | null>(
    entry.outcome !== undefined ? entry.followed_plan : null
  )
  const [postEmotional,   setPostEmotional]   = useState<PostEmotionalState | ''>(entry.post_emotional_state ?? '')

  const borderColor =
    outcome === 'win'       ? '#10b981' :
    outcome === 'loss'      ? '#ef4444' :
    outcome === 'breakeven' ? '#9ca3af' :
    'var(--border-default)'

  const isValid = outcome !== '' && followedPlan !== null
  const isReadOnly = entry.outcome !== undefined  // ya tiene post-mortem

  const handleSave = () => {
    if (!outcome || followedPlan === null) return
    onSave({
      outcome:             outcome as TradeOutcome,
      actual_pnl:          actualPnl    ? parseFloat(actualPnl)    : undefined,
      actual_pnl_pct:      actualPnlPct ? parseFloat(actualPnlPct) : undefined,
      exit_reason:         exitReason   || undefined,
      what_went_right:     whatWentRight || undefined,
      what_went_wrong:     whatWentWrong || undefined,
      lesson:              lesson        || undefined,
      followed_plan:       followedPlan,
      post_emotional_state: postEmotional || undefined,
    })
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
            <span style={{
              fontSize: '1.125rem', fontWeight: 700,
              color: 'var(--text-primary)', fontFamily: '"Syne", sans-serif',
              letterSpacing: '-0.01em',
            }}>
              {entry.symbol}
            </span>
            <span
              className={`badge badge-${entry.side === 'buy' ? 'long' : 'short'}`}
              style={{ fontSize: '0.5625rem' }}
            >
              {entry.side.toUpperCase()}
            </span>
            {isReadOnly && (
              <span className="badge" style={{
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '0.5rem',
              }}>
                COMPLETADO
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            🔍 Post-mortem · {formatDateShort(entry.created_at)}
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

      {/* ── Tesis original (recap) ──────────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(59,130,246,0.04)',
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: '0.5625rem', color: '#3b82f6',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontWeight: 700, marginBottom: '0.375rem',
        }}>
          Tesis original
        </p>
        <p style={{
          fontSize: '0.8125rem', color: 'var(--text-secondary)',
          lineHeight: 1.6, fontStyle: 'italic',
        }}>
          "{entry.entry_thesis}"
        </p>
        {entry.planned_risk_reward && (
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
            {entry.planned_stop_loss && (
              <span className="font-mono" style={{ fontSize: '0.6875rem', color: '#ef4444' }}>
                SL ${entry.planned_stop_loss.toFixed(2)}
              </span>
            )}
            {entry.planned_target && (
              <span className="font-mono" style={{ fontSize: '0.6875rem', color: '#10b981' }}>
                TP ${entry.planned_target.toFixed(2)}
              </span>
            )}
            <span className="font-mono" style={{ fontSize: '0.6875rem', color: '#3b82f6' }}>
              R/R 1:{entry.planned_risk_reward.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* POST-TRADE SECTION */}
        <div style={{
          borderLeft: `3px solid ${borderColor}`,
          paddingLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.125rem',
          transition: 'border-color 250ms ease',
        }}>
          <h3 style={{
            fontSize: '0.625rem', fontWeight: 700, color: borderColor,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            transition: 'color 250ms ease',
          }}>
            Post-Trade
          </h3>

          {/* Outcome */}
          <div>
            <label style={labelStyle}>
              Resultado <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {OUTCOMES.map(({ value, label, color, bg, icon }) => {
                const selected = outcome === value
                return (
                  <button
                    key={value}
                    onClick={() => !isReadOnly && setOutcome(selected ? '' : value)}
                    disabled={isReadOnly}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: `1px solid ${selected ? color : 'var(--border-default)'}`,
                      backgroundColor: selected ? bg : 'transparent',
                      color: selected ? color : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: selected ? 700 : 400,
                      cursor: isReadOnly ? 'default' : 'pointer',
                      transition: 'all 150ms ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                      fontFamily: '"Syne", sans-serif',
                      opacity: isReadOnly ? 0.85 : 1,
                    }}
                  >
                    {icon} {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* PnL real */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>PnL real ($)</label>
              <input
                type="number"
                value={actualPnl}
                onChange={e => setActualPnl(e.target.value)}
                placeholder="0.00"
                className="input-base font-mono"
                style={{ marginTop: '0.375rem' }}
                step="0.01"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label style={labelStyle}>PnL real (%)</label>
              <input
                type="number"
                value={actualPnlPct}
                onChange={e => setActualPnlPct(e.target.value)}
                placeholder="0.00"
                className="input-base font-mono"
                style={{ marginTop: '0.375rem' }}
                step="0.01"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* PnL display si hay datos */}
          {actualPnl && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              backgroundColor: parseFloat(actualPnl) >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${parseFloat(actualPnl) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Resultado final
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span className="font-mono" style={{
                  fontSize: '1rem', fontWeight: 700,
                  color: parseFloat(actualPnl) >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {parseFloat(actualPnl) >= 0 ? '+' : ''}{formatCurrency(parseFloat(actualPnl))}
                </span>
                {actualPnlPct && (
                  <span className="font-mono" style={{
                    fontSize: '0.8125rem',
                    color: parseFloat(actualPnlPct) >= 0 ? '#10b981' : '#ef4444',
                  }}>
                    ({parseFloat(actualPnlPct) >= 0 ? '+' : ''}{parseFloat(actualPnlPct).toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Razón de salida */}
          <div>
            <label style={labelStyle}>Razón de salida</label>
            <input
              type="text"
              value={exitReason}
              onChange={e => setExitReason(e.target.value)}
              placeholder="Stop hit, target alcanzado, cambio de tesis..."
              className="input-base"
              style={{ marginTop: '0.375rem' }}
              disabled={isReadOnly}
            />
          </div>

          {/* ¿Qué funcionó? */}
          <div>
            <label style={labelStyle}>✅ ¿Qué funcionó?</label>
            <textarea
              value={whatWentRight}
              onChange={e => setWhatWentRight(e.target.value)}
              placeholder="Lo que salió bien en esta operación..."
              rows={2}
              className="input-base"
              style={{ resize: 'vertical', marginTop: '0.375rem', lineHeight: 1.6 }}
              disabled={isReadOnly}
            />
          </div>

          {/* ¿Qué falló? */}
          <div>
            <label style={labelStyle}>❌ ¿Qué falló?</label>
            <textarea
              value={whatWentWrong}
              onChange={e => setWhatWentWrong(e.target.value)}
              placeholder="Lo que no salió como esperaba..."
              rows={2}
              className="input-base"
              style={{ resize: 'vertical', marginTop: '0.375rem', lineHeight: 1.6 }}
              disabled={isReadOnly}
            />
          </div>

          {/* Lección */}
          <div>
            <label style={labelStyle}>📚 Lección principal</label>
            <textarea
              value={lesson}
              onChange={e => setLesson(e.target.value)}
              placeholder="¿Qué aprendés de esta operación?"
              rows={2}
              className="input-base"
              style={{ resize: 'vertical', marginTop: '0.375rem', lineHeight: 1.6 }}
              disabled={isReadOnly}
            />
          </div>

          {/* ¿Seguiste el plan? */}
          <div>
            <label style={labelStyle}>
              ¿Seguiste el plan? <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[
                { value: true,  label: 'Sí, seguí el plan', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                { value: false, label: 'No, improvisé',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
              ].map(({ value, label, color, bg }) => {
                const selected = followedPlan === value
                return (
                  <button
                    key={String(value)}
                    onClick={() => !isReadOnly && setFollowedPlan(selected ? null : value)}
                    disabled={isReadOnly}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: `1px solid ${selected ? color : 'var(--border-default)'}`,
                      backgroundColor: selected ? bg : 'transparent',
                      color: selected ? color : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: selected ? 600 : 400,
                      cursor: isReadOnly ? 'default' : 'pointer',
                      transition: 'all 150ms ease',
                      fontFamily: '"Syne", sans-serif',
                      opacity: isReadOnly ? 0.85 : 1,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estado emocional post */}
          <div>
            <label style={labelStyle}>¿Cómo te sentís ahora?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
              {POST_EMOTIONAL_STATES.map(({ value, label, emoji }) => {
                const selected = postEmotional === value
                return (
                  <button
                    key={value}
                    onClick={() => !isReadOnly && setPostEmotional(selected ? '' : value)}
                    disabled={isReadOnly}
                    style={{
                      padding: '0.375rem 0.875rem',
                      borderRadius: '9999px',
                      border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      backgroundColor: selected ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color: selected ? 'var(--color-primary)' : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      fontWeight: selected ? 600 : 400,
                      cursor: isReadOnly ? 'default' : 'pointer',
                      transition: 'all 150ms ease',
                      fontFamily: '"Syne", sans-serif',
                      opacity: isReadOnly ? 0.85 : 1,
                    }}
                  >
                    {emoji} {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

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
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </button>
        )}
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="btn-primary"
            style={{ flex: 2 }}
          >
            Guardar post-mortem
          </button>
        )}
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
