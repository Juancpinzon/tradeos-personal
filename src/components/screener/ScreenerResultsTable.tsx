// ─────────────────────────────────────────────────────────────────────────────
// src/components/screener/ScreenerResultsTable.tsx
// Tabla interactiva sortable con score badge
// props: { results: ScreenerResultItem[] }
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenerResultItem } from '../../types'
import { formatCurrency, formatPercent, formatLargeNumber, formatDateShort } from '../../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// Score badge
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const high = score >= 80
  const mid  = score >= 60

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.2rem 0.6rem',
      borderRadius: '0.375rem',
      backgroundColor: high ? 'rgba(16,185,129,0.15)' : mid ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)',
      border: `1px solid ${high ? 'rgba(16,185,129,0.35)' : mid ? 'rgba(245,158,11,0.35)' : 'rgba(107,114,128,0.25)'}`,
      color: high ? '#10b981' : mid ? '#f59e0b' : '#6b7280',
      fontFamily: '"IBM Plex Mono", monospace',
      fontWeight: 700,
      fontSize: '0.8125rem',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        backgroundColor: high ? '#10b981' : mid ? '#f59e0b' : '#6b7280',
      }} />
      {score}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column sort helpers
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<ScreenerResultItem,
  'score' | 'price' | 'market_cap' | 'revenue_growth_pct' | 'ath_distance_pct' | 'rsi_weekly' | 'volume_avg'>

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span style={{ color: 'var(--text-muted)', fontSize: '0.625rem' }}>⇅</span>
  return <span style={{ color: 'var(--color-primary)', fontSize: '0.625rem' }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

function TH({
  label, sortKey, current, direction, onSort,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  direction: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '0.5rem 0.75rem',
        fontSize: '0.5625rem',
        fontWeight: 700,
        color: active ? 'var(--color-primary)' : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        textAlign: 'right',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--border-default)',
        userSelect: 'none',
        transition: 'color 120ms',
      }}
    >
      {label} <SortIcon active={active} dir={direction} />
    </th>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ScreenerResultsTable
// ─────────────────────────────────────────────────────────────────────────────

interface ScreenerResultsTableProps {
  results: ScreenerResultItem[]
  totalEvaluated?: number
  aiSummary?: string
}

export default function ScreenerResultsTable({
  results,
  totalEvaluated,
  aiSummary,
}: ScreenerResultsTableProps) {
  const navigate = useNavigate()
  const [sortKey, setSortKey]   = useState<SortKey>('score')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  if (results.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🔍</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Configurá los criterios y ejecutá el screener para ver resultados
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Stats + AI summary */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
        padding: '0.875rem 1.125rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{results.length}</span>
            {' '}resultados
            {totalEvaluated && (
              <> · <span className="font-mono">{totalEvaluated.toLocaleString()}</span> evaluados</>
            )}
          </span>
        </div>
        {aiSummary && (
          <div style={{
            borderLeft: '2px solid var(--color-primary)',
            paddingLeft: '0.75rem',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
              🤖 {aiSummary}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <th style={{
                  padding: '0.5rem 0.75rem',
                  textAlign: 'left',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  borderBottom: '1px solid var(--border-default)',
                  whiteSpace: 'nowrap',
                }}>
                  Símbolo
                </th>
                <TH label="Precio"    sortKey="price"              current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="Mkt Cap"   sortKey="market_cap"         current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="Rev.%"     sortKey="revenue_growth_pct" current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="ATH%"      sortKey="ath_distance_pct"   current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="RSI"       sortKey="rsi_weekly"         current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="EPS est."  sortKey="score"              current={sortKey} direction={sortDir} onSort={handleSort} />
                <TH label="Score"     sortKey="score"              current={sortKey} direction={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const isHovered = hoveredRow === item.symbol
                return (
                  <>
                    <tr
                      key={item.symbol}
                      onClick={() => navigate(`/research?symbol=${item.symbol}`)}
                      onMouseEnter={() => setHoveredRow(item.symbol)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isHovered ? 'var(--bg-elevated)' : 'transparent',
                        transition: 'background-color 100ms',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Symbol */}
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontFamily: '"Syne", sans-serif',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)',
                          }}>
                            {item.symbol}
                          </span>
                          {item.already_in_portfolio && (
                            <span title="En portafolio" style={{ fontSize: '0.75rem' }}>★</span>
                          )}
                          {item.already_in_watchlist && !item.already_in_portfolio && (
                            <span title="En watchlist" style={{
                              fontSize: '0.5rem',
                              padding: '0.1rem 0.3rem',
                              borderRadius: '0.2rem',
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-default)',
                              color: 'var(--text-muted)',
                            }}>WL</span>
                          )}
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {item.name.length > 18 ? item.name.slice(0, 16) + '…' : item.name}
                          </span>
                        </div>
                      </td>

                      {/* Precio */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {formatCurrency(item.price)}
                        </span>
                      </td>

                      {/* Market cap */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {formatLargeNumber(item.market_cap)}
                        </span>
                      </td>

                      {/* Revenue growth */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{
                          fontSize: '0.8125rem',
                          color: item.revenue_growth_pct >= 20 ? '#10b981' : item.revenue_growth_pct >= 0 ? 'var(--text-secondary)' : '#ef4444',
                          fontWeight: 600,
                        }}>
                          {formatPercent(item.revenue_growth_pct)}
                        </span>
                      </td>

                      {/* ATH distance */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{
                          fontSize: '0.8125rem',
                          color: item.ath_distance_pct >= -10 ? '#10b981' : item.ath_distance_pct >= -25 ? '#f59e0b' : '#ef4444',
                        }}>
                          {formatPercent(item.ath_distance_pct)}
                        </span>
                      </td>

                      {/* RSI */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{
                          fontSize: '0.8125rem',
                          color: item.rsi_weekly !== undefined
                            ? item.rsi_weekly > 70 ? '#ef4444'
                            : item.rsi_weekly < 30 ? '#3b82f6'
                            : 'var(--text-secondary)'
                            : 'var(--text-muted)',
                        }}>
                          {item.rsi_weekly?.toFixed(0) ?? '—'}
                        </span>
                      </td>

                      {/* EPS est. */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.eps_next_estimate !== undefined
                            ? `${item.eps_next_estimate >= 0 ? '+' : ''}${formatCurrency(item.eps_next_estimate)}`
                            : '—'}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                        <ScoreBadge score={item.score} />
                      </td>
                    </tr>

                    {/* AI note row (visible si hover) */}
                    {isHovered && item.ai_note && (
                      <tr
                        key={`${item.symbol}-note`}
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <td colSpan={8} style={{ padding: '0.375rem 0.75rem 0.625rem 1.5rem' }}>
                          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                            🤖 {item.ai_note}
                            {item.next_earnings_date && (
                              <span style={{ marginLeft: '0.75rem', color: '#f59e0b' }}>
                                📅 Earnings: {formatDateShort(item.next_earnings_date)}
                              </span>
                            )}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
