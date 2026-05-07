// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Journal.tsx — Página principal del Trading Journal
// Layout: JournalList (60%) + JournalStats (40%)
// Panel lateral deslizable: JournalForm | PostMortemPanel
// FASE 4 — datos mock, sin hooks de Supabase todavía
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { JournalEntry } from '../types'
import JournalList     from '../components/journal/JournalList'
import JournalStats    from '../components/journal/JournalStats'
import JournalForm     from '../components/journal/JournalForm'
import PostMortemPanel from '../components/journal/PostMortemPanel'
import { Plus } from 'lucide-react'

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    user_id: 'u1',
    order_id: 'o1',
    symbol: 'AAPL',
    side: 'buy',
    asset_class: 'equity',
    entry_thesis:
      'Breakout above $195 resistance with volume 2× avg. iPhone upgrade cycle + China recovery thesis intact. Earnings beat expected per consensus.',
    setup_type: 'breakout',
    planned_stop_loss:   190,
    planned_target:      210,
    planned_risk_reward: 3,
    emotional_state:     'confident',
    confidence_level:    4,
    outcome:             'win',
    actual_pnl:          1234.56,
    actual_pnl_pct:      7.8,
    exit_reason:         'Target hit at $210 after earnings surprise',
    what_went_right:     "Waited for volume confirmation. Didn't jump the gun.",
    what_went_wrong:     'Entered slightly late, missed ~$2 on price.',
    lesson:              'Volume confirmation is non-negotiable for breakouts.',
    post_emotional_state: 'satisfied',
    followed_plan:       true,
    tags:                ['breakout', 'earnings', 'momentum'],
    created_at:          '2026-04-15T10:30:00Z',
    updated_at:          '2026-04-22T14:00:00Z',
  },
  {
    id: '2',
    user_id: 'u1',
    symbol: 'BTC',
    side: 'buy',
    asset_class: 'crypto',
    entry_thesis:
      'ETF flow momentum intact. RSI bouncing from 50 on weekly. Risk-on environment with tech leading.',
    setup_type:          'pullback',
    planned_stop_loss:   88000,
    planned_target:      105000,
    planned_risk_reward: 2.5,
    emotional_state:     'calm',
    confidence_level:    3,
    outcome:             'loss',
    actual_pnl:          -876.32,
    actual_pnl_pct:      -3.2,
    exit_reason:         'Stop hit after Fed hawkish surprise',
    what_went_right:     "Stop loss respected, didn't override it.",
    what_went_wrong:     'Weekend entry = thin liquidity = bad fill price.',
    lesson:              'Avoid weekend crypto entries. Liquidity is a risk.',
    post_emotional_state: 'neutral',
    followed_plan:       true,
    tags:                ['crypto', 'macro-risk', 'liquidity'],
    created_at:          '2026-04-10T08:15:00Z',
    updated_at:          '2026-04-13T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'u1',
    order_id: 'o3',
    symbol: 'NVDA',
    side: 'buy',
    asset_class: 'equity',
    entry_thesis:
      'AI infra capex supercycle intact. Blackwell demand ahead of guidance. Data center backlog 3+ quarters. Sector rotation into semis.',
    setup_type:          'swing',
    planned_stop_loss:   850,
    planned_target:      1100,
    planned_risk_reward: 4.2,
    emotional_state:     'excited',
    confidence_level:    5,
    outcome:             'win',
    actual_pnl:          3420.00,
    actual_pnl_pct:      14.3,
    exit_reason:         'Partial at $1050 (resistance), rest at $1100 (target)',
    what_went_right:     'High conviction → held through volatility. Sized correctly.',
    what_went_wrong:     'Got a bit excited and sized up 10% more than plan.',
    lesson:              'High conviction ≠ permission to break position sizing rules.',
    post_emotional_state: 'satisfied',
    followed_plan:       false,
    tags:                ['ai', 'momentum', 'size-creep'],
    created_at:          '2026-03-20T09:45:00Z',
    updated_at:          '2026-04-02T15:30:00Z',
  },
  {
    id: '4',
    user_id: 'u1',
    order_id: 'o4',
    symbol: 'META',
    side: 'buy',
    asset_class: 'equity',
    entry_thesis:
      'Reels monetization inflection + ad revenue reacceleration. Reality Labs losses declining. AI-enhanced ads showing strong ROAS.',
    setup_type:       'earnings_play',
    emotional_state:  'uncertain',
    confidence_level: 2,
    outcome:          'loss',
    actual_pnl:       -543.21,
    actual_pnl_pct:   -2.1,
    exit_reason:      'Entered pre-earnings. Guidance light on capex concerns.',
    what_went_right:  'Had a stop in place and used it.',
    what_went_wrong:  "Entered too early. Didn't wait for earnings confirmation.",
    lesson:           "Don't buy pre-earnings without hedging IV crush risk.",
    post_emotional_state: 'regretful',
    followed_plan:    false,
    tags:             ['earnings', 'entrada-precoz', 'timing'],
    created_at:       '2026-02-28T11:00:00Z',
    updated_at:       '2026-03-02T09:00:00Z',
  },
  {
    id: '5',
    user_id: 'u1',
    order_id: 'o5',
    symbol: 'TSLA',
    side: 'buy',
    asset_class: 'equity',
    entry_thesis:
      'Robotaxi catalyst coming. Oversold on weekly RSI (42). Mean reversion setup post-40% correction. Risk-defined entry near demand zone.',
    setup_type:          'reversal',
    planned_stop_loss:   215,
    planned_target:      280,
    planned_risk_reward: 2.8,
    emotional_state:     'calm',
    confidence_level:    3,
    // Sin outcome → post-mortem pendiente
    followed_plan:       false,
    tags:                ['reversal', 'speculative'],
    created_at:          '2026-05-02T10:00:00Z',
    updated_at:          '2026-05-02T10:00:00Z',
  },
  {
    id: '6',
    user_id: 'u1',
    symbol: 'SOL',
    side: 'buy',
    asset_class: 'crypto',
    entry_thesis:
      'Solana ecosystem activity surge. DeFi TVL growing 4× this quarter. Strong fundamentals vs peers.',
    setup_type:       'breakout',
    emotional_state:  'confident',
    confidence_level: 4,
    outcome:          'breakeven',
    actual_pnl:       12.45,
    actual_pnl_pct:   0.1,
    exit_reason:      'Closed flat after thesis changed with market rotation',
    what_went_right:  'Recognized thesis invalidation early.',
    what_went_wrong:  'Entry timing was off — entered at resistance.',
    lesson:           'Breakout entries need clear break + retest, not just approach.',
    post_emotional_state: 'neutral',
    followed_plan:    true,
    tags:             ['crypto', 'breakout', 'timing'],
    created_at:       '2026-04-05T14:20:00Z',
    updated_at:       '2026-04-08T11:00:00Z',
  },
]

// ─── Panel mode type ──────────────────────────────────────────────────────────

type PanelMode = 'form' | 'postmortem' | null

// ─── Component ───────────────────────────────────────────────────────────────

export default function Journal() {
  const [entries,       setEntries]       = useState<JournalEntry[]>(MOCK_ENTRIES)
  const [panelMode,     setPanelMode]     = useState<PanelMode>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  // IDs de entradas vinculadas a una orden sin outcome todavía
  const pendingPostMortems = entries
    .filter(e => e.order_id !== undefined && e.outcome === undefined)
    .map(e => e.id)

  const handleEntrySelect = (entry: JournalEntry) => {
    setSelectedEntry(entry)
    setPanelMode('postmortem')
  }

  const handleNewEntry = () => {
    setSelectedEntry(null)
    setPanelMode('form')
  }

  const handleSaveForm = (data: Partial<JournalEntry>) => {
    const newEntry: JournalEntry = {
      id:               String(Date.now()),
      user_id:          'u1',
      symbol:           data.symbol         ?? 'SYM',
      side:             data.side           ?? 'buy',
      asset_class:      data.asset_class    ?? 'equity',
      entry_thesis:     data.entry_thesis   ?? '',
      emotional_state:  data.emotional_state ?? 'calm',
      confidence_level: data.confidence_level ?? 3,
      followed_plan:    false,
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString(),
      ...data,
    }
    setEntries(prev => [newEntry, ...prev])
    setPanelMode(null)
  }

  const handleSavePostMortem = (updates: Partial<JournalEntry>) => {
    if (!selectedEntry) return
    setEntries(prev =>
      prev.map(e =>
        e.id === selectedEntry.id
          ? { ...e, ...updates, updated_at: new Date().toISOString() }
          : e
      )
    )
    setPanelMode(null)
    setSelectedEntry(null)
  }

  const closePanel = () => {
    setPanelMode(null)
    setSelectedEntry(null)
  }

  return (
    <div style={{
      display:   'flex',
      flexDirection: 'column',
      height:    '100%',
      position:  'relative',
      overflow:  'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '1.125rem 1.5rem',
        borderBottom:    '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        flexShrink:      0,
        gap:             '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{
              fontFamily:    '"Syne", sans-serif',
              fontWeight:    700,
              fontSize:      '1.125rem',
              color:         'var(--text-primary)',
              lineHeight:    1,
              letterSpacing: '-0.01em',
            }}>
              📓 Trading Journal
            </h1>

            {/* Badge de post-mortems pendientes */}
            {pendingPostMortems.length > 0 && (
              <span style={{
                display:         'inline-flex',
                alignItems:      'center',
                justifyContent:  'center',
                minWidth:        '20px',
                height:          '20px',
                padding:         '0 0.375rem',
                borderRadius:    '9999px',
                backgroundColor: '#f59e0b',
                color:           '#0a0e17',
                fontSize:        '0.625rem',
                fontWeight:      800,
                fontFamily:      '"Syne", sans-serif',
              }}>
                {pendingPostMortems.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Tesis · Post-mortem · Métricas de comportamiento
          </p>
        </div>

        <button
          onClick={handleNewEntry}
          className="btn-primary"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
        >
          <Plus size={14} />
          Nueva entrada
        </button>
      </div>

      {/* ── Main: Lista + Stats ──────────────────────────────────────── */}
      <div style={{
        flex:               1,
        display:            'grid',
        gridTemplateColumns: '3fr 2fr',
        overflow:           'hidden',
        minHeight:          0,
      }}>

        {/* Columna izquierda — JournalList */}
        <div style={{
          borderRight: '1px solid var(--border-subtle)',
          overflow:    'hidden',
          display:     'flex',
          flexDirection: 'column',
        }}>
          <JournalList
            entries={entries}
            onSelect={handleEntrySelect}
            pendingPostMortems={pendingPostMortems}
          />
        </div>

        {/* Columna derecha — JournalStats */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding:      '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink:   0,
          }}>
            <h2 style={{
              fontFamily:    '"Syne", sans-serif',
              fontWeight:    600,
              fontSize:      '0.6875rem',
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Estadísticas · {entries.length} entradas
            </h2>
          </div>
          <JournalStats entries={entries} />
        </div>
      </div>

      {/* ── Panel lateral deslizante ─────────────────────────────────── */}
      {panelMode !== null && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePanel}
            style={{
              position:        'fixed',
              inset:           0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              zIndex:          40,
              animation:       'jBdIn 200ms ease forwards',
            }}
          />

          {/* Panel */}
          <div style={{
            position:        'fixed',
            top:             0,
            right:           0,
            bottom:          0,
            width:           '500px',
            maxWidth:        '95vw',
            backgroundColor: 'var(--bg-base)',
            borderLeft:      '1px solid var(--border-default)',
            zIndex:          50,
            display:         'flex',
            flexDirection:   'column',
            overflow:        'hidden',
            animation:       'jPanelIn 270ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            <style>{`
              @keyframes jBdIn    { from { opacity: 0; } to { opacity: 1; } }
              @keyframes jPanelIn {
                from { transform: translateX(40px); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>

            {panelMode === 'form' && (
              <JournalForm
                onSave={handleSaveForm}
                onClose={closePanel}
              />
            )}

            {panelMode === 'postmortem' && selectedEntry && (
              <PostMortemPanel
                entry={selectedEntry}
                onSave={handleSavePostMortem}
                onClose={closePanel}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
