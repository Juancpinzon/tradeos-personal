// ─────────────────────────────────────────────────────────────────────────────
// src/components/screener/ScreenerSaveModal.tsx
// Modal para guardar un preset de screener con nombre personalizado
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import type { ScreenerCriteria } from '../../types'
import { formatLargeNumber } from '../../lib/formatters'

export interface ScreenerSaveModalProps {
  criteria: ScreenerCriteria
  onSave: (name: string) => void
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para describir los criterios activos
// ─────────────────────────────────────────────────────────────────────────────

function buildCriteriaBadges(c: ScreenerCriteria): string[] {
  const badges: string[] = []

  if (c.asset_class && c.asset_class !== 'both') {
    badges.push(c.asset_class === 'equity' ? 'Acciones' : 'Cripto')
  } else if (c.asset_class === 'both') {
    badges.push('Acciones + Cripto')
  }

  if (c.market_cap_min != null) {
    badges.push(`Market Cap ≥ ${formatLargeNumber(c.market_cap_min)}`)
  }
  if (c.price_min != null) {
    badges.push(`Precio ≥ $${c.price_min}`)
  }
  if (c.revenue_growth_min_pct != null) {
    badges.push(`Rev. growth ≥ ${c.revenue_growth_min_pct}%`)
  }
  if (c.volume_avg_min != null) {
    badges.push(`Vol ≥ ${(c.volume_avg_min / 1000).toFixed(0)}K`)
  }
  if (c.ath_distance_max_pct != null) {
    badges.push(`ATH dist ≤ ${c.ath_distance_max_pct}%`)
  }
  if (c.rsi_weekly_min != null || c.rsi_weekly_max != null) {
    const min = c.rsi_weekly_min ?? '—'
    const max = c.rsi_weekly_max ?? '—'
    badges.push(`RSI ${min}–${max}`)
  }
  if (c.eps_next_positive) {
    badges.push('EPS+ próximo')
  }
  if (c.exclude_dividends) {
    badges.push('Sin dividendos')
  }
  if (c.sector) {
    badges.push(c.sector)
  }

  return badges
}

// ─────────────────────────────────────────────────────────────────────────────
// ScreenerSaveModal
// ─────────────────────────────────────────────────────────────────────────────

export default function ScreenerSaveModal({ criteria, onSave, onClose }: ScreenerSaveModalProps) {
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [visible, setVisible] = useState(false)

  const badges = buildCriteriaBadges(criteria)

  // Fade-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Cerrar con Escape
  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  function handleSubmit() {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setError('El nombre no puede estar vacío.')
      return
    }
    if (trimmed.length > 50) {
      setError('Máximo 50 caracteres.')
      return
    }
    onSave(trimmed)
  }

  return (
    <>
      {/* Inline keyframes */}
      <style>{`
        @keyframes _modal-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          50,
          backgroundColor: 'rgba(0,0,0,0.72)',
          backdropFilter:  'blur(4px)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          opacity:         visible ? 1 : 0,
          transition:      'opacity 180ms ease',
        }}
      >
        {/* Card — stopPropagation para que clicks internos no cierren */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width:           '100%',
            maxWidth:        '420px',
            backgroundColor: 'var(--bg-surface)',
            border:          '1px solid var(--border-default)',
            borderRadius:    '0.75rem',
            overflow:        'hidden',
            animation:       visible ? '_modal-in 200ms ease both' : 'none',
            boxShadow:       '0 24px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            padding:       '1.125rem 1.25rem',
            borderBottom:  '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Save size={16} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
              <span style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 600,
                fontSize:   '1.0625rem',
                color:      'var(--text-primary)',
              }}>
                Guardar preset
              </span>
            </div>
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              style={{
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                width:           '28px',
                height:          '28px',
                borderRadius:    '0.375rem',
                border:          '1px solid var(--border-default)',
                backgroundColor: 'transparent',
                color:           'var(--text-muted)',
                cursor:          'pointer',
                transition:      'background-color 120ms, color 120ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* Criterios activos */}
            {badges.length > 0 && (
              <div>
                <span style={{
                  display:       'block',
                  fontSize:      '0.6875rem',
                  fontWeight:    600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color:         'var(--text-muted)',
                  marginBottom:  '0.5rem',
                }}>
                  Criterios activos
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {badges.map(b => (
                    <span
                      key={b}
                      style={{
                        display:         'inline-flex',
                        alignItems:      'center',
                        padding:         '0.2rem 0.5rem',
                        borderRadius:    '0.25rem',
                        backgroundColor: 'var(--bg-elevated)',
                        border:          '1px solid var(--border-default)',
                        fontSize:        '0.75rem',
                        color:           'var(--text-secondary)',
                        fontFamily:      '"Syne", sans-serif',
                        fontWeight:      500,
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {badges.length === 0 && (
              <p style={{
                fontSize:        '0.8125rem',
                color:           'var(--text-muted)',
                fontStyle:       'italic',
                padding:         '0.625rem',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius:    '0.375rem',
                border:          '1px solid var(--border-subtle)',
              }}>
                No hay criterios configurados. El preset se guardará en blanco.
              </p>
            )}

            {/* Input nombre */}
            <div>
              <label
                htmlFor="preset-name"
                style={{
                  display:      'block',
                  fontSize:     '0.8125rem',
                  fontWeight:   500,
                  color:        'var(--text-secondary)',
                  marginBottom: '0.4rem',
                }}
              >
                Nombre del preset
              </label>
              <input
                id="preset-name"
                className="input-base"
                type="text"
                maxLength={50}
                placeholder="ej. Momentum Growth"
                value={name}
                autoFocus
                onChange={e => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                style={{ width: '100%' }}
              />
              {error && (
                <p style={{
                  marginTop: '0.375rem',
                  fontSize:  '0.75rem',
                  color:     'var(--color-loss)',
                }}>
                  {error}
                </p>
              )}
              <p style={{
                marginTop: '0.3rem',
                fontSize:  '0.6875rem',
                color:     'var(--text-muted)',
              }}>
                {name.trim().length}/50 caracteres
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display:        'flex',
            gap:            '0.625rem',
            justifyContent: 'flex-end',
            padding:        '0.875rem 1.25rem',
            borderTop:      '1px solid var(--border-subtle)',
            backgroundColor:'rgba(17,24,39,0.5)',
          }}>
            <button
              onClick={handleClose}
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
                transition:      'background-color 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={name.trim().length === 0}
              style={{
                padding:         '0.5rem 1.25rem',
                borderRadius:    '0.375rem',
                border:          'none',
                backgroundColor: name.trim().length === 0 ? 'var(--bg-elevated)' : 'var(--color-primary)',
                color:           name.trim().length === 0 ? 'var(--text-muted)' : 'white',
                fontSize:        '0.875rem',
                fontFamily:      '"Syne", sans-serif',
                fontWeight:      700,
                cursor:          name.trim().length === 0 ? 'not-allowed' : 'pointer',
                display:         'flex',
                alignItems:      'center',
                gap:             '0.4rem',
                transition:      'background-color 120ms, opacity 120ms',
                opacity:         name.trim().length === 0 ? 0.5 : 1,
              }}
            >
              <Save size={14} strokeWidth={2.5} />
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
