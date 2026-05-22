// ─────────────────────────────────────────────────────────────────────────────
// src/components/journal/JournalList.tsx — Lista de entradas del journal
// Timeline con barra lateral de color · filtros · badge de post-mortem pendiente
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { JournalEntry, TradeOutcome, SetupType } from '../../types'
import { formatCurrency, formatDateShort } from '../../lib/formatters'
import { Filter, SlidersHorizontal, ChevronRight } from 'lucide-react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface JournalListProps {
  entries:              JournalEntry[]
  onSelect:             (entry: JournalEntry) => void
  pendingPostMortems?:  string[]   // IDs de entradas sin outcome
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function outcomeEmoji(outcome?: TradeOutcome) {
  if (outcome === 'win')       return '✅'
  if (outcome === 'loss')      return '❌'
  if (outcome === 'breakeven') return '⬛'
  return '⬜'
}

function outcomeColor(outcome?: TradeOutcome) {
  if (outcome === 'win')       return '#10b981'
  if (outcome === 'loss')      return '#ef4444'
  if (outcome === 'breakeven') return '#9ca3af'
  return '#374151'
}

const SETUP_LABELS: Record<SetupType, string> = {
  breakout:      'Breakout',
  pullback:      'Pullback',
  earnings_play: 'Earnings',
  swing:         'Swing',
  reversal:      'Reversal',
  other:         'Other',
}

const EMOTIONAL_EMOJIS: Record<string, string> = {
  calm:      '😌',
  confident: '💪',
  excited:   '🔥',
  uncertain: '🤔',
  fearful:   '😰',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JournalList({
  entries,
  onSelect,
  pendingPostMortems = [],
}: JournalListProps) {
  const [filterSymbol,  setFilterSymbol]  = useState('')
  const [filterOutcome, setFilterOutcome] = useState<TradeOutcome | ''>('')
  const [filterSetup,   setFilterSetup]   = useState<SetupType | ''>('')
  const [showFilters,   setShowFilters]   = useState(false)

  const filtered = entries.filter(e => {
    if (filterSymbol && !e.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false
    if (filterOutcome) {
      if (filterOutcome === 'win' || filterOutcome === 'loss' || filterOutcome === 'breakeven') {
        if (e.outcome !== filterOutcome) return false
      }
    }
    if (filterSetup && e.setup_type !== filterSetup) return false
    return true
  })

  const pendingCount = pendingPostMortems.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Barra de búsqueda + filtros ─────────────────────────────────── */}
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={filterSymbol}
              onChange={e => setFilterSymbol(e.target.value.toUpperCase())}
              placeholder="Buscar símbolo..."
              className="input-base font-mono"
              style={{ fontSize: '0.8125rem', paddingLeft: '0.75rem' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            title="Filtros"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: `1px solid ${showFilters ? 'var(--color-primary)' : 'var(--border-default)'}`,
              backgroundColor: showFilters ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: showFilters ? 'var(--color-primary)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: '"Syne", sans-serif',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Filter size={13} />
            Filtros
            {(filterOutcome || filterSetup) && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                color: 'white', fontSize: '0.5625rem', fontWeight: 700,
              }}>
                {[filterOutcome, filterSetup].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filtros expandibles */}
        {showFilters && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
            <select
              value={filterOutcome}
              onChange={e => setFilterOutcome(e.target.value as TradeOutcome | '')}
              className="input-base"
              style={{ flex: 1, minWidth: '120px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value="">Todos los resultados</option>
              <option value="win">✅ Win</option>
              <option value="loss">❌ Loss</option>
              <option value="breakeven">⬛ Breakeven</option>
            </select>
            <select
              value={filterSetup}
              onChange={e => setFilterSetup(e.target.value as SetupType | '')}
              className="input-base"
              style={{ flex: 1, minWidth: '120px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value="">Todos los setups</option>
              <option value="breakout">Breakout</option>
              <option value="pullback">Pullback</option>
              <option value="earnings_play">Earnings Play</option>
              <option value="swing">Swing</option>
              <option value="reversal">Reversal</option>
              <option value="other">Other</option>
            </select>
            {(filterSymbol || filterOutcome || filterSetup) && (
              <button
                onClick={() => { setFilterSymbol(''); setFilterOutcome(''); setFilterSetup('') }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontFamily: '"Syne", sans-serif',
                  flexShrink: 0,
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Conteo + pendientes ─────────────────────────────────────────── */}
      <div style={{
        padding: '0.5rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.6875rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {filtered.length} entrada{filtered.length !== 1 ? 's' : ''}
        </span>
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: '#f59e0b', color: '#0a0e17',
              fontSize: '0.5625rem', fontWeight: 700,
            }}>
              {pendingCount}
            </span>
            <span style={{ fontSize: '0.6875rem', color: '#f59e0b' }}>
              post-mortem{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Lista de entradas ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '3rem 2rem', gap: '0.5rem',
            color: 'var(--text-muted)',
          }}>
            <SlidersHorizontal size={24} strokeWidth={1.25} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>Sin entradas que coincidan</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const isPending = pendingPostMortems.includes(entry.id)
            const color     = outcomeColor(entry.outcome)
            const pnlSign   = (entry.actual_pnl ?? 0) >= 0

            return (
              <JournalRow
                key={entry.id}
                entry={entry}
                isPending={isPending}
                color={color}
                pnlSign={pnlSign}
                onSelect={onSelect}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── JournalRow ──────────────────────────────────────────────────────────────

function JournalRow({
  entry,
  isPending,
  color,
  pnlSign,
  onSelect,
}: {
  entry:    JournalEntry
  isPending: boolean
  color:    string
  pnlSign:  boolean
  onSelect: (e: JournalEntry) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => onSelect(entry)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '0.9375rem 1.25rem 0.9375rem 1.625rem',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--bg-elevated)' : 'transparent',
        transition: 'background-color 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
      }}
    >
      {/* Barra lateral de outcome */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '3px',
        backgroundColor: entry.outcome ? color : 'var(--border-default)',
        opacity: entry.outcome ? 0.7 : 0.3,
        transition: 'background-color 250ms ease',
      }} />

      {/* Fila superior: símbolo + badges + outcome + flecha */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{
            fontSize: '0.9375rem', fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: '"Syne", sans-serif',
            letterSpacing: '-0.01em',
          }}>
            {entry.symbol}
          </span>
          <span
            className={`badge badge-${entry.side === 'buy' ? 'long' : 'short'}`}
            style={{ fontSize: '0.5rem', flexShrink: 0 }}
          >
            {entry.side.toUpperCase()}
          </span>
          {entry.setup_type && (
            <span style={{
              fontSize: '0.5625rem', padding: '0.1rem 0.375rem', borderRadius: '0.2rem',
              backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
            }}>
              {SETUP_LABELS[entry.setup_type]}
            </span>
          )}
          {entry.trade_type && (
            <span style={{
              fontSize: '0.5625rem', padding: '0.1rem 0.375rem', borderRadius: '0.2rem',
              backgroundColor: entry.trade_type === 'intraday' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
              color: entry.trade_type === 'intraday' ? '#3b82f6' : '#a855f7',
              border: `1px solid ${entry.trade_type === 'intraday' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(168, 85, 247, 0.25)'}`,
              textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
              fontWeight: 600,
            }}>
              {entry.trade_type}
            </span>
          )}
          {isPending && (
            <span style={{
              fontSize: '0.5625rem', padding: '0.1rem 0.375rem', borderRadius: '0.2rem',
              backgroundColor: 'rgba(245,158,11,0.12)',
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
            }}>
              post-mortem ⚡
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <span style={{ fontSize: '1rem' }}>{outcomeEmoji(entry.outcome)}</span>
          <ChevronRight
            size={14}
            style={{
              color: hovered ? 'var(--color-primary)' : 'var(--text-muted)',
              transition: 'color 120ms ease, transform 120ms ease',
              transform: hovered ? 'translateX(2px)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Fila inferior: tesis truncada + PnL + fecha + emoji emocional */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          lineHeight: 1.4,
        }}>
          {entry.entry_thesis}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {entry.actual_pnl !== undefined && (
            <span className="font-mono" style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: pnlSign ? '#10b981' : '#ef4444',
            }}>
              {pnlSign ? '+' : ''}{formatCurrency(entry.actual_pnl)}
            </span>
          )}
          <span style={{ fontSize: '0.875rem', lineHeight: 1 }}
            title={entry.emotional_state}
          >
            {EMOTIONAL_EMOJIS[entry.emotional_state] ?? ''}
          </span>
          <span className="font-mono" style={{
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
          }}>
            {formatDateShort(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
