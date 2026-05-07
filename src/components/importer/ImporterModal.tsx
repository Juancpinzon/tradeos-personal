// src/components/importer/ImporterModal.tsx
import { useRef, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { parseTrades } from '../../lib/importParser'
import type { ParsedTrade, DetectedFormat } from '../../lib/importParser'
import { useImporter } from '../../hooks/useImporter'
import FormatGuide from './FormatGuide'
import { formatCurrency } from '../../lib/formatters'
import { useNavigate } from 'react-router-dom'

interface Props { onClose: () => void }

type Broker = 'alpaca' | 'binance' | 'manual'

export default function ImporterModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { state, setParsedTrades, importTrades, checkDuplicate, reset } = useImporter()

  const [dragging, setDragging]     = useState(false)
  const [filename, setFilename]     = useState('')
  const [format, setFormat]         = useState<DetectedFormat | null>(null)
  const [broker, setBroker]         = useState<Broker>('manual')
  const [createJournal, setJournal] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setParseError(null)
    if (!file.name.endsWith('.xlsx')) {
      setParseError('Solo se aceptan archivos .xlsx')
      return
    }
    const isDup = await checkDuplicate(file.name)
    if (isDup) {
      setParseError(`"${file.name}" ya fue importado anteriormente. Renombrá el archivo si querés reimportar.`)
      return
    }
    setFilename(file.name)
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0] ?? ''] ?? wb.Sheets[Object.keys(wb.Sheets)[0] ?? '']
    if (!ws) { setParseError('No se pudo leer la hoja del archivo'); return }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
    const { format: fmt, trades } = parseTrades(rows as unknown[][])
    if (fmt === 'unknown') {
      setParseError('Formato no reconocido. Revisá la guía de formato abajo.')
      return
    }
    setFormat(fmt)
    setParsedTrades(trades)
  }, [checkDuplicate, setParsedTrades])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  function handleImport() {
    importTrades(state.validTrades, { broker, createJournal, filename })
  }

  function downloadErrors() {
    if (!state.result) return
    const csv = ['Fila,Error', ...state.result.errors.map(e => `${e.row},"${e.error}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'errores_importacion.csv'; a.click()
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  }
  const modal: React.CSSProperties = {
    width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto',
    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: '0.75rem', boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column',
  }
  const hdr: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--border-default)',
    flexShrink: 0,
  }
  const body: React.CSSProperties = { padding: '1.5rem', flex: 1 }

  const btnPrimary = (disabled = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    padding: '0.5625rem 1.25rem', borderRadius: '0.375rem', border: 'none',
    backgroundColor: disabled ? 'var(--bg-elevated)' : 'var(--color-primary)',
    color: disabled ? 'var(--text-muted)' : 'white',
    fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  })
  const btnGhost: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    padding: '0.5625rem 1rem', borderRadius: '0.375rem',
    border: '1px solid var(--border-default)', backgroundColor: 'transparent',
    color: 'var(--text-secondary)', fontFamily: '"Syne", sans-serif',
    fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
  }

  const thS: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
    backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)',
    whiteSpace: 'nowrap', textAlign: 'left',
  }
  const tdS: React.CSSProperties = {
    padding: '0.625rem 0.75rem', fontSize: '0.8125rem',
    borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle',
  }

  const step = state.step

  return (
    <div style={overlay} onClick={step === 'importing' ? undefined : onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={hdr}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Upload size={18} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
              Importar historial desde Excel
            </span>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <X size={20} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* ── PASO 1: UPLOAD ── */}
        {step === 'upload' && (
          <div style={body}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--border-default)'}`,
                borderRadius: '0.625rem',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragging ? 'rgba(59,130,246,0.04)' : 'var(--bg-elevated)',
                transition: 'all 200ms',
                marginBottom: '1.25rem',
              }}
            >
              <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onFileChange} />
              <Upload size={36} strokeWidth={1.25} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>
                Arrastrá tu archivo Excel aquí
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                o hacé click para seleccionarlo · Solo .xlsx
              </p>
            </div>
            {parseError && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1rem' }}>
                <AlertTriangle size={16} strokeWidth={2} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '0.8125rem', color: '#ef4444', margin: 0 }}>{parseError}</p>
              </div>
            )}
            <FormatGuide />
          </div>
        )}

        {/* ── PASO 2: PREVIEW ── */}
        {step === 'preview' && (
          <div style={body}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[
                { label: 'Encontradas', val: state.parsedTrades.length, color: 'var(--text-primary)' },
                { label: 'Válidas', val: state.validTrades.length, color: '#10b981' },
                { label: 'Con errores', val: state.invalidTrades.length, color: state.invalidTrades.length > 0 ? '#f59e0b' : 'var(--text-muted)' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.625rem 1rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0 0 0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '1.25rem', color: s.color, margin: 0 }}>{s.val}</p>
                </div>
              ))}
              {format && (
                <div style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.5rem', padding: '0.625rem 1rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0 0 0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formato</p>
                  <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', margin: 0 }}>
                    {format === 'tradeos' ? 'TradeOS' : 'Genérico'}
                  </p>
                </div>
              )}
            </div>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    {['Fecha','Symbol','Lado','Qty','Precio','Total','Estado'].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.parsedTrades.slice(0, 10).map((t: ParsedTrade, i: number) => (
                    <tr key={i} style={{ backgroundColor: t.error ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                      <td style={{ ...tdS, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td style={{ ...tdS, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {t.symbol}
                      </td>
                      <td style={tdS}>
                        <span style={{
                          display: 'inline-flex', padding: '0.15rem 0.4rem', borderRadius: '0.2rem',
                          backgroundColor: t.side === 'buy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          border: t.side === 'buy' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
                          color: t.side === 'buy' ? '#10b981' : '#ef4444',
                          fontSize: '0.625rem', fontWeight: 700, fontFamily: '"Syne", sans-serif', textTransform: 'uppercase',
                        }}>{t.side}</span>
                      </td>
                      <td style={{ ...tdS, fontFamily: '"JetBrains Mono", monospace' }}>{t.qty}</td>
                      <td style={{ ...tdS, fontFamily: '"JetBrains Mono", monospace' }}>{formatCurrency(t.price)}</td>
                      <td style={{ ...tdS, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(t.total, 0)}
                      </td>
                      <td style={tdS}>
                        {t.error
                          ? <span title={t.error} style={{ color: '#f59e0b', fontSize: '0.75rem' }}>⚠ {t.error.split(';')[0]}</span>
                          : <span style={{ color: '#10b981' }}>✓</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {state.parsedTrades.length > 10 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Mostrando 10 de {state.parsedTrades.length} operaciones
              </p>
            )}

            {/* Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 500 }}>Broker</label>
                <select
                  value={broker}
                  onChange={e => setBroker(e.target.value as Broker)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: '"Syne", sans-serif' }}
                >
                  <option value="manual">Manual</option>
                  <option value="alpaca">Alpaca</option>
                  <option value="binance">Binance</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: '0.1rem' }}>
                <input type="checkbox" checked={createJournal} onChange={e => setJournal(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Crear entrada de Journal para cada operación
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button style={btnGhost} onClick={reset}>Cancelar</button>
              <button
                style={btnPrimary(state.validTrades.length === 0)}
                disabled={state.validTrades.length === 0}
                onClick={handleImport}
              >
                <Upload size={14} strokeWidth={2} />
                Importar {state.validTrades.length} operaciones válidas
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: IMPORTING ── */}
        {step === 'importing' && (
          <div style={{ ...body, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '1.5rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>
                {state.progressMsg}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                No cerrés esta ventana durante la importación
              </p>
            </div>
            <div style={{ width: '100%', maxWidth: '340px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${state.progress}%`, backgroundColor: 'var(--color-primary)', borderRadius: '3px', transition: 'width 300ms' }} />
            </div>
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              {state.progress}%
            </p>
          </div>
        )}

        {/* ── PASO 4: COMPLETED ── */}
        {step === 'completed' && state.result && (
          <div style={body}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
              <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                Importación completada
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{filename}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {[
                { label: 'Importadas', val: state.result.importedRows, color: '#10b981' },
                { label: 'Omitidas',   val: state.result.skippedRows,  color: '#f59e0b' },
                { label: 'Errores',    val: state.result.errors.length, color: state.result.errors.length > 0 ? '#ef4444' : 'var(--text-muted)' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0 0 0.2rem', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</p>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '1.375rem', color: s.color, margin: 0 }}>{s.val}</p>
                </div>
              ))}
            </div>

            {state.result.errors.length > 0 && (
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <button style={btnGhost} onClick={downloadErrors}>
                  <Download size={14} strokeWidth={2} />
                  Descargar lista de errores (.csv)
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={btnPrimary()} onClick={() => { onClose(); navigate('/history') }}>
                Ver en Historial
              </button>
              <button style={btnGhost} onClick={() => { onClose(); navigate('/journal') }}>
                Ver estadísticas del Journal
              </button>
              <button style={btnGhost} onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div style={{ ...body, textAlign: 'center' }}>
            <AlertTriangle size={40} strokeWidth={1.5} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
            <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Error en la importación</p>
            <p style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '1.5rem' }}>{state.error}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button style={btnPrimary()} onClick={reset}>Intentar de nuevo</button>
              <button style={btnGhost} onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
