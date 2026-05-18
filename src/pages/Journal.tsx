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
import { Plus, Loader2 } from 'lucide-react'

import { useJournal } from '../hooks/useJournal'
import { useMediaQuery } from '../hooks/useMediaQuery'

// ─── Panel mode type ──────────────────────────────────────────────────────────

type PanelMode = 'form' | 'postmortem' | null

// ─── Component ───────────────────────────────────────────────────────────────

export default function Journal() {
  const { entries, isLoading, addEntry, updateEntry } = useJournal()
  const [panelMode,     setPanelMode]     = useState<PanelMode>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')

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

  const handleSaveForm = async (data: Partial<JournalEntry>) => {
    await addEntry(data)
    setPanelMode(null)
  }

  const handleSavePostMortem = async (updates: Partial<JournalEntry>) => {
    if (!selectedEntry) return
    await updateEntry({ id: selectedEntry.id, updates })
    setPanelMode(null)
    setSelectedEntry(null)
  }

  const closePanel = () => {
    setPanelMode(null)
    setSelectedEntry(null)
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      position:      'relative',
      ...(isMobile
        ? { minHeight: '100%' }
        : { height: '100%', overflow: 'hidden' }
      ),
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
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Nueva entrada
        </button>
      </div>

      {isLoading && entries.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      )}

      {/* ── Main: Lista + Stats ──────────────────────────────────────── */}
      <div style={isMobile ? {
        display:       'flex',
        flexDirection: 'column',
      } : {
        flex:                1,
        display:             'grid',
        gridTemplateColumns: '3fr 2fr',
        overflow:            'hidden',
        minHeight:           0,
      }}>

        {/* Entries list */}
        <div style={isMobile ? {
          borderBottom:  '1px solid var(--border-subtle)',
        } : {
          borderRight:   '1px solid var(--border-subtle)',
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
        }}>
          <JournalList
            entries={entries}
            onSelect={handleEntrySelect}
            pendingPostMortems={pendingPostMortems}
          />
        </div>

        {/* Stats — full-width below list on mobile */}
        <div style={{ overflowY: isMobile ? undefined : 'auto', display: 'flex', flexDirection: 'column' }}>
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
            bottom:          isMobile ? '56px' : 0,
            width:           isMobile ? '100vw' : '500px',
            maxWidth:        isMobile ? '100vw' : '95vw',
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
