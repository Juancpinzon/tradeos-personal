// ─────────────────────────────────────────────────────────────────────────────
// src/components/importer/FormatGuide.tsx — Guía colapsable de formato Excel
// Muestra el formato esperado y permite descargar la plantilla
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────────────────────
// Datos de ejemplo para la guía
// ─────────────────────────────────────────────────────────────────────────────

const EXAMPLE_ROWS = [
  { Ticker: 'AAPL',    Movimiento: 'Compra', Cantidad: 10,   Precio: 182.50, Fecha: '15/04/2024' },
  { Ticker: 'NVDA',    Movimiento: 'Compra', Cantidad: 5,    Precio: 870.00, Fecha: '22/04/2024' },
  { Ticker: 'BTC/USDT',Movimiento: 'Venta',  Cantidad: 0.25, Precio: 64000,  Fecha: '30/04/2024' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Generador de plantilla Excel
// ─────────────────────────────────────────────────────────────────────────────

function generateTemplate() {
  const wb = XLSX.utils.book_new()

  // Hoja 1: Movimientos con datos de ejemplo
  const wsData = [
    ['Ticker', 'Movimiento', 'Cantidad', 'Precio', 'Fecha'],
    ['AAPL',    'Compra', 10,   182.50, '15/04/2024'],
    ['NVDA',    'Compra', 5,    870.00, '22/04/2024'],
    ['BTC/USDT','Venta',  0.25, 64000,  '30/04/2024'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Anchos de columna
  ws['!cols'] = [
    { wch: 14 }, // Ticker
    { wch: 12 }, // Movimiento
    { wch: 10 }, // Cantidad
    { wch: 12 }, // Precio
    { wch: 14 }, // Fecha
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')

  // Hoja 2: Instrucciones
  const instrData = [
    ['INSTRUCCIONES PARA IMPORTAR HISTORIAL EN TRADEOS'],
    [''],
    ['COLUMNAS REQUERIDAS (en orden):'],
    ['• Ticker      — Símbolo del activo (ej: AAPL, NVDA, BTC/USDT)'],
    ['• Movimiento  — "Compra" o "Venta"'],
    ['• Cantidad    — Número de acciones/unidades (puede ser decimal)'],
    ['• Precio      — Precio de ejecución por unidad'],
    ['• Fecha       — Formato DD/MM/YYYY (también acepta MM/DD/YYYY y YYYY-MM-DD)'],
    [''],
    ['REGLAS:'],
    ['• No borres la fila de encabezados'],
    ['• Los símbolos con "/" se detectan automáticamente como cripto (ej: BTC/USDT)'],
    ['• También se detectan cripto por sufijo: USDT, BTC, ETH'],
    ['• Las filas vacías se ignoran automáticamente'],
    ['• Se puede importar el archivo solo una vez (TradeOS lo recuerda por nombre)'],
    [''],
    ['SOPORTE:'],
    ['Si tu Excel tiene columnas con nombres distintos, el importador intenta'],
    ['detectarlas automáticamente. También soporta el formato genérico:'],
    ['Symbol | Side (buy/sell) | Qty | Price | Date'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
  wsInstr['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')

  // Descargar
  XLSX.writeFile(wb, 'template_historial_tradeos.xlsx')
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export default function FormatGuide() {
  const [open, setOpen] = useState(false)

  const thStyle: React.CSSProperties = {
    padding:        '0.5rem 0.75rem',
    textAlign:      'left',
    fontSize:       '0.6875rem',
    fontWeight:     600,
    color:          'var(--text-muted)',
    textTransform:  'uppercase',
    letterSpacing:  '0.06em',
    backgroundColor:'var(--bg-base)',
    borderBottom:   '1px solid var(--border-default)',
    whiteSpace:     'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding:     '0.5rem 0.75rem',
    fontSize:    '0.8125rem',
    borderBottom:'1px solid var(--border-subtle)',
    color:       'var(--text-secondary)',
  }

  return (
    <div style={{
      backgroundColor: 'rgba(59,130,246,0.04)',
      border:          '1px solid rgba(59,130,246,0.2)',
      borderRadius:    '0.5rem',
      overflow:        'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          width:           '100%',
          padding:         '0.75rem 1rem',
          background:      'none',
          border:          'none',
          cursor:          'pointer',
          color:           'var(--color-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={15} strokeWidth={1.75} />
          <span style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 600,
            fontSize:   '0.8125rem',
          }}>
            Formato esperado
          </span>
        </div>
        {open
          ? <ChevronUp size={15} strokeWidth={2} />
          : <ChevronDown size={15} strokeWidth={2} />
        }
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(59,130,246,0.15)', padding: '0 1rem 1rem' }}>

          {/* Columnas requeridas */}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 0.5rem' }}>
            Columnas requeridas en la hoja "Movimientos":
          </p>

          <div style={{ overflowX: 'auto', borderRadius: '0.375rem', border: '1px solid var(--border-default)', marginBottom: '0.875rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Ticker</th>
                  <th style={thStyle}>Movimiento</th>
                  <th style={thStyle}>Cantidad</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.Ticker}
                    </td>
                    <td style={{
                      ...tdStyle,
                      color: row.Movimiento === 'Compra' ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                    }}>
                      {row.Movimiento}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace' }}>
                      {row.Cantidad}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace' }}>
                      {row.Precio.toLocaleString('es-AR')}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace' }}>
                      {row.Fecha}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Nota sobre formatos de fecha */}
          <div style={{
            display:         'flex',
            flexDirection:   'column',
            gap:             '0.3rem',
            marginBottom:    '0.875rem',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Formatos de fecha aceptados:</strong>{' '}
              DD/MM/YYYY · MM/DD/YYYY · YYYY-MM-DD
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Si tu Excel tiene columnas con nombres distintos, el importador intenta detectarlas automáticamente.
              También soporta el formato genérico: Symbol | Side | Qty | Price | Date.
            </p>
          </div>

          {/* Botón de descarga */}
          <button
            onClick={generateTemplate}
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              gap:             '0.375rem',
              padding:         '0.4375rem 0.875rem',
              borderRadius:    '0.375rem',
              border:          '1px solid rgba(59,130,246,0.4)',
              backgroundColor: 'rgba(59,130,246,0.08)',
              color:           'var(--color-primary)',
              fontSize:        '0.8125rem',
              fontFamily:      '"Syne", sans-serif',
              fontWeight:      600,
              cursor:          'pointer',
              transition:      'all 150ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(59,130,246,0.15)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(59,130,246,0.08)'
            }}
          >
            <Download size={14} strokeWidth={2} />
            Descargar plantilla Excel vacía
          </button>
        </div>
      )}
    </div>
  )
}
