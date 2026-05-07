// ─────────────────────────────────────────────────────────────────────────────
// src/lib/importParser.ts — Parser de Excel para historial de operaciones
// Soporta formato propio del usuario (Ticker|Movimiento|Cantidad|Precio|Fecha)
// y formato genérico (Symbol|Side|Qty|Price|Date)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedTrade {
  symbol:      string
  side:        'buy' | 'sell'
  qty:         number
  price:       number
  date:        Date
  total:       number                    // calculado: qty * price
  asset_class: 'equity' | 'crypto'      // detectado por el símbolo
  raw_row:     unknown[]                // fila original para mostrar en preview
  error?:      string                   // si hay problema con esta fila
}

export type DetectedFormat = 'tradeos' | 'generic' | 'unknown'

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────────────────────

/** Detecta si un símbolo es cripto por convención */
function detectAssetClass(symbol: string): 'equity' | 'crypto' {
  const s = symbol.trim().toUpperCase()
  if (s.includes('/')) return 'crypto'
  if (s.endsWith('USDT') || s.endsWith('BTC') || s.endsWith('ETH')) return 'crypto'
  return 'equity'
}

/** Parsea fechas en múltiples formatos: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD y variantes */
function parseDate(raw: unknown): Date | null {
  if (raw == null) return null

  // Si es número (Excel serial date)
  if (typeof raw === 'number') {
    // Excel serial: días desde 1900-01-01 (con bug del año bisiesto de Excel)
    const excelEpoch = new Date(1899, 11, 30)
    const ms = excelEpoch.getTime() + raw * 86400000
    const d = new Date(ms)
    if (!isNaN(d.getTime())) return d
  }

  // Si ya es Date
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw
  }

  const str = String(raw).trim()
  if (!str) return null

  // Intentar ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`)
    if (!isNaN(d.getTime())) return d
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(str)
  if (dmy) {
    // Intenta DD/MM/YYYY primero (formato argentino)
    const day = parseInt(dmy[1]!, 10)
    const mon = parseInt(dmy[2]!, 10)
    const yr  = parseInt(dmy[3]!, 10)
    if (mon <= 12 && day <= 31) {
      const d = new Date(yr, mon - 1, day)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Fallback: Date nativa
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/** Normaliza texto de una celda a string limpio */
function cellStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** Normaliza número de una celda */
function cellNum(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,\.]/g, m => m === ',' ? '.' : ''))
  return isNaN(n) ? null : n
}

/** Normaliza side: Compra/Buy/B → buy, Venta/Sell/S → sell */
function parseSide(raw: unknown): 'buy' | 'sell' | null {
  const s = cellStr(raw).toLowerCase()
  if (['compra', 'buy', 'b', 'c', 'long', 'entrada'].includes(s)) return 'buy'
  if (['venta', 'sell', 's', 'v', 'short', 'salida'].includes(s))  return 'sell'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// detectFormat
// Analiza los headers de la primera fila para determinar el formato
// ─────────────────────────────────────────────────────────────────────────────

export function detectFormat(rows: unknown[][]): DetectedFormat {
  if (!rows.length) return 'unknown'

  // Buscar la fila de headers (puede no ser la primera si hay títulos)
  let headerRow: string[] | null = null
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const cells = row.map(c => cellStr(c).toLowerCase())
    // Detectar formato TradeOS: ticker, movimiento, cantidad, precio, fecha
    const hasTradeOS = cells.some(c => ['ticker', 'movimiento'].includes(c))
    if (hasTradeOS) {
      headerRow = cells
      break
    }
    // Detectar formato genérico: symbol, side, qty, price, date
    const hasGeneric = cells.some(c => ['symbol', 'side', 'qty'].includes(c))
    if (hasGeneric) {
      headerRow = cells
      break
    }
  }

  if (!headerRow) {
    // Sin headers reconocibles, aún puede ser TradeOS si los datos coinciden con el patrón
    return 'unknown'
  }

  const hasTradeOS = headerRow.some(c => ['ticker', 'movimiento'].includes(c))
  if (hasTradeOS) return 'tradeos'

  const hasGeneric = headerRow.some(c => ['symbol', 'side', 'qty', 'price', 'date'].includes(c))
  if (hasGeneric) return 'generic'

  return 'unknown'
}

// ─────────────────────────────────────────────────────────────────────────────
// parseTradeOSFormat
// Formato del usuario: Ticker | Movimiento | Cantidad | Precio | Fecha
// ─────────────────────────────────────────────────────────────────────────────

export function parseTradeOSFormat(rows: unknown[][]): ParsedTrade[] {
  if (!rows.length) return []

  // Encontrar la fila de headers
  let headerIdx = -1
  let colTicker    = -1
  let colMovimiento = -1
  let colCantidad  = -1
  let colPrecio    = -1
  let colFecha     = -1

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const cells = row.map(c => cellStr(c).toLowerCase())
    if (cells.some(c => ['ticker', 'movimiento'].includes(c))) {
      headerIdx    = i
      colTicker    = cells.findIndex(c => c === 'ticker')
      colMovimiento = cells.findIndex(c => c === 'movimiento')
      colCantidad  = cells.findIndex(c => ['cantidad', 'cant'].includes(c))
      colPrecio    = cells.findIndex(c => ['precio', 'price'].includes(c))
      colFecha     = cells.findIndex(c => ['fecha', 'date'].includes(c))
      break
    }
  }

  if (headerIdx === -1) return []

  const trades: ParsedTrade[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    // Saltar filas vacías
    if (row.every(c => c == null || cellStr(c) === '')) continue

    const rawSymbol = colTicker    >= 0 ? row[colTicker]    : row[0]
    const rawSide   = colMovimiento >= 0 ? row[colMovimiento] : row[1]
    const rawQty    = colCantidad  >= 0 ? row[colCantidad]  : row[2]
    const rawPrice  = colPrecio    >= 0 ? row[colPrecio]    : row[3]
    const rawDate   = colFecha     >= 0 ? row[colFecha]     : row[4]

    const symbol = cellStr(rawSymbol).toUpperCase()
    const side   = parseSide(rawSide)
    const qty    = cellNum(rawQty)
    const price  = cellNum(rawPrice)
    const date   = parseDate(rawDate)

    const errors: string[] = []
    if (!symbol)    errors.push('Símbolo vacío')
    if (!side)      errors.push(`Movimiento inválido: "${cellStr(rawSide)}"`)
    if (!qty || qty <= 0) errors.push('Cantidad inválida')
    if (!price || price <= 0) errors.push('Precio inválido')
    if (!date)      errors.push(`Fecha inválida: "${cellStr(rawDate)}"`)

    trades.push({
      symbol:      symbol || '???',
      side:        side   ?? 'buy',
      qty:         qty    ?? 0,
      price:       price  ?? 0,
      date:        date   ?? new Date(),
      total:       (qty ?? 0) * (price ?? 0),
      asset_class: detectAssetClass(symbol),
      raw_row:     row,
      error:       errors.length > 0 ? errors.join('; ') : undefined,
    })
  }

  return trades
}

// ─────────────────────────────────────────────────────────────────────────────
// parseGenericFormat
// Formato genérico: Symbol | Side | Qty | Price | Date
// ─────────────────────────────────────────────────────────────────────────────

export function parseGenericFormat(rows: unknown[][]): ParsedTrade[] {
  if (!rows.length) return []

  let headerIdx = -1
  let colSymbol = -1
  let colSide   = -1
  let colQty    = -1
  let colPrice  = -1
  let colDate   = -1

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const cells = row.map(c => cellStr(c).toLowerCase())
    if (cells.some(c => ['symbol', 'side', 'qty'].includes(c))) {
      headerIdx = i
      colSymbol = cells.findIndex(c => ['symbol', 'ticker', 'sym'].includes(c))
      colSide   = cells.findIndex(c => ['side', 'direction', 'type'].includes(c))
      colQty    = cells.findIndex(c => ['qty', 'quantity', 'shares', 'amount'].includes(c))
      colPrice  = cells.findIndex(c => ['price', 'fill_price', 'avg_price'].includes(c))
      colDate   = cells.findIndex(c => ['date', 'fill_date', 'time', 'datetime'].includes(c))
      break
    }
  }

  if (headerIdx === -1) return []

  const trades: ParsedTrade[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    if (row.every(c => c == null || cellStr(c) === '')) continue

    const rawSymbol = colSymbol >= 0 ? row[colSymbol] : row[0]
    const rawSide   = colSide   >= 0 ? row[colSide]   : row[1]
    const rawQty    = colQty    >= 0 ? row[colQty]    : row[2]
    const rawPrice  = colPrice  >= 0 ? row[colPrice]  : row[3]
    const rawDate   = colDate   >= 0 ? row[colDate]   : row[4]

    const symbol = cellStr(rawSymbol).toUpperCase()
    const side   = parseSide(rawSide)
    const qty    = cellNum(rawQty)
    const price  = cellNum(rawPrice)
    const date   = parseDate(rawDate)

    const errors: string[] = []
    if (!symbol)          errors.push('Símbolo vacío')
    if (!side)            errors.push(`Side inválido: "${cellStr(rawSide)}"`)
    if (!qty || qty <= 0) errors.push('Qty inválida')
    if (!price || price <= 0) errors.push('Precio inválido')
    if (!date)            errors.push(`Fecha inválida: "${cellStr(rawDate)}"`)

    trades.push({
      symbol:      symbol || '???',
      side:        side   ?? 'buy',
      qty:         qty    ?? 0,
      price:       price  ?? 0,
      date:        date   ?? new Date(),
      total:       (qty ?? 0) * (price ?? 0),
      asset_class: detectAssetClass(symbol),
      raw_row:     row,
      error:       errors.length > 0 ? errors.join('; ') : undefined,
    })
  }

  return trades
}

// ─────────────────────────────────────────────────────────────────────────────
// parseTrades — punto de entrada unificado
// ─────────────────────────────────────────────────────────────────────────────

export function parseTrades(rows: unknown[][]): { format: DetectedFormat; trades: ParsedTrade[] } {
  const format = detectFormat(rows)
  let trades: ParsedTrade[] = []

  if (format === 'tradeos') {
    trades = parseTradeOSFormat(rows)
  } else if (format === 'generic') {
    trades = parseGenericFormat(rows)
  }

  return { format, trades }
}
