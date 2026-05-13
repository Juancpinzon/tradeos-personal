// ─────────────────────────────────────────────────────────────────────────────
// src/lib/formatters.ts — Funciones de formato financiero
// Uso obligatorio para todos los números, precios, porcentajes y fechas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea un valor numérico como moneda USD.
 * @example formatCurrency(1234.56) → "$1,234.56"
 * @example formatCurrency(1234567.89, 0) → "$1,234,568"
 */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formatea un valor numérico como porcentaje con signo explícito.
 * @example formatPercent(2.34) → "+2.34%"
 * @example formatPercent(-1.1, false) → "-1.10%"
 */
export function formatPercent(value: number, showSign = true): string {
  const formatted = Math.abs(value).toFixed(2)
  if (!showSign) {
    return `${value < 0 ? '-' : ''}${formatted}%`
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatted}%`
}

/**
 * Formatea una fecha como string legible.
 * @example formatDate(new Date()) → "May 6, 2026"
 * @example formatDate("2026-04-15") → "Apr 15, 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Formatea fecha en formato abreviado para ejes de gráficos.
 * @example formatDateShort("2026-04-15") → "Apr 15"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Formatea cantidad de acciones/unidades.
 * @example formatQty(45) → "45"
 * @example formatQty(1234567) → "1,234,567"
 * @example formatQty(0.00145, 6) → "0.001450"
 */
export function formatQty(value: number, decimals?: number): string {
  // Si el valor es un entero, no mostrar decimales a menos que se especifique
  const auto = decimals ?? (Number.isInteger(value) ? 0 : value < 1 ? 6 : 2)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: auto,
    maximumFractionDigits: auto,
  }).format(value)
}

/**
 * Formatea números grandes con sufijos K/M/B/T (con $).
 * @example formatLargeNumber(1_500_000) → "$1.5M"
 */
export function formatLargeNumber(value: number): string {
  return `$${formatCompactNumber(value)}`
}

/**
 * Formatea números grandes con sufijos K/M/B/T (sin moneda).
 * @example formatCompactNumber(1_500_000) → "1.5M"
 */
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${(value / 1e6).toFixed(1)}M`
  if (abs >= 1e3)  return `${(value / 1e3).toFixed(1)}K`
  return value.toString()
}
