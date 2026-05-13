// ─────────────────────────────────────────────────────────────────────────────
// src/pages/History.tsx — Historial de órdenes + Earnings calendar
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { History as HistoryIcon, Calendar, ChevronUp, ChevronDown, Search, Loader2 } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import type { Order } from '../types'
import { formatCurrency } from '../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type SortKey = 'symbol' | 'submitted_at' | 'qty' | 'status'
type SortDir = 'asc' | 'desc'

function formatDatetime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function getOrderValue(o: Order): number | null {
  const price = o.filled_avg_price ?? o.limit_price ?? o.stop_price
  if (!price) return null
  return o.qty * price
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Order['status'] }) {
  const cfg: Record<Order['status'], { color: string; bg: string; border: string; label: string }> = {
    filled:           { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', label: 'Filled' },
    pending:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', label: 'Pendiente' },
    accepted:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', label: 'Aceptada' },
    partially_filled: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', label: 'Parcial' },
    cancelled:        { color: '#6b7280', bg: 'var(--bg-elevated)',     border: 'var(--border-default)', label: 'Cancelada' },
    rejected:         { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  label: 'Rechazada' },
  }
  const c = cfg[status]
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      padding:         '0.175rem 0.5rem',
      borderRadius:    '0.25rem',
      backgroundColor: c.bg,
      border:          `1px solid ${c.border}`,
      fontSize:        '0.6875rem',
      fontWeight:      600,
      color:           c.color,
      fontFamily:      '"Syne", sans-serif',
      whiteSpace:      'nowrap',
    }}>
      {c.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SideBadge
// ─────────────────────────────────────────────────────────────────────────────

function SideBadge({ side }: { side: 'buy' | 'sell' }) {
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      padding:         '0.175rem 0.5rem',
      borderRadius:    '0.25rem',
      backgroundColor: side === 'buy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border:          side === 'buy' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
      fontSize:        '0.6875rem',
      fontWeight:      700,
      color:           side === 'buy' ? '#10b981' : '#ef4444',
      fontFamily:      '"Syne", sans-serif',
      letterSpacing:   '0.04em',
      textTransform:   'uppercase',
    }}>
      {side === 'buy' ? 'BUY' : 'SELL'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SortableHeader
// ─────────────────────────────────────────────────────────────────────────────

function SortableHeader({
  col, label, sortKey, sortDir, onSort,
}: {
  col:     SortKey
  label:   string
  sortKey: SortKey
  sortDir: SortDir
  onSort:  (k: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding:    '0.625rem 0.875rem',
        textAlign:  'left',
        fontSize:   '0.6875rem',
        fontWeight: 600,
        color:      active ? 'var(--color-primary)' : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        cursor:     'pointer',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-default)',
        transition: 'color 120ms',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {label}
        {active && (sortDir === 'asc'
          ? <ChevronUp size={12} strokeWidth={2.5} />
          : <ChevronDown size={12} strokeWidth={2.5} />
        )}
      </span>
    </th>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// History page
// ─────────────────────────────────────────────────────────────────────────────

export default function History() {
  const { orders, isLoading } = useOrders()

  // Filters
  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterBroker, setFilterBroker] = useState<string>('all')
  const [filterSide,   setFilterSide]   = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('submitted_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...orders]

    if (search.trim()) {
      const q = search.trim().toUpperCase()
      list = list.filter(o => o.symbol.includes(q))
    }
    if (filterStatus !== 'all') {
      list = list.filter(o => o.status === filterStatus)
    }
    if (filterBroker !== 'all') {
      list = list.filter(o => o.broker === filterBroker)
    }
    if (filterSide !== 'all') {
      list = list.filter(o => o.side === filterSide)
    }
    if (filterSource === 'imported') {
      list = list.filter(o => (o as Order & { imported?: boolean }).imported)
    } else if (filterSource === 'executed') {
      list = list.filter(o => !(o as Order & { imported?: boolean }).imported)
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'symbol')       cmp = a.symbol.localeCompare(b.symbol)
      if (sortKey === 'submitted_at') cmp = a.submitted_at.localeCompare(b.submitted_at)
      if (sortKey === 'qty')          cmp = a.qty - b.qty
      if (sortKey === 'status')       cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [search, filterStatus, filterBroker, filterSide, sortKey, sortDir])

  const selectStyle: React.CSSProperties = {
    padding:         '0.4rem 0.75rem',
    borderRadius:    '0.375rem',
    border:          '1px solid var(--border-default)',
    backgroundColor: 'var(--bg-elevated)',
    color:           'var(--text-secondary)',
    fontSize:        '0.8125rem',
    cursor:          'pointer',
    fontFamily:      '"Syne", sans-serif',
    outline:         'none',
  }

  const thBase: React.CSSProperties = {
    padding:         '0.625rem 0.875rem',
    textAlign:       'left',
    fontSize:        '0.6875rem',
    fontWeight:      600,
    color:           'var(--text-muted)',
    textTransform:   'uppercase',
    letterSpacing:   '0.06em',
    whiteSpace:      'nowrap',
    backgroundColor: 'var(--bg-elevated)',
    borderBottom:    '1px solid var(--border-default)',
  }

  const tdBase: React.CSSProperties = {
    padding:     '0.75rem 0.875rem',
    borderBottom:'1px solid var(--border-subtle)',
    verticalAlign:'middle',
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>

      {/* ─── ORDER HISTORY ─── */}
      <section style={{ marginBottom: '2.5rem' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <HistoryIcon size={20} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize:   '1.25rem',
            color:      'var(--text-primary)',
            margin:     0,
          }}>
            Historial de Órdenes
          </h1>
          <span style={{
            padding:         '0.2rem 0.625rem',
            borderRadius:    '0.25rem',
            backgroundColor: 'var(--bg-elevated)',
            border:          '1px solid var(--border-default)',
            fontSize:        '0.75rem',
            fontWeight:      600,
            color:           'var(--text-muted)',
            fontFamily:      '"Syne", sans-serif',
          }}>
            {orders.length} órdenes
          </span>
          {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
        </div>

        {/* Filter row */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             '0.625rem',
          marginBottom:    '1rem',
          flexWrap:        'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '160px', maxWidth: '240px' }}>
            <Search
              size={13}
              strokeWidth={2}
              style={{
                position:  'absolute',
                left:      '0.625rem',
                top:       '50%',
                transform: 'translateY(-50%)',
                color:     'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input-base"
              placeholder="Buscar símbolo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', width: '100%', fontSize: '0.8125rem' }}
            />
          </div>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">Estado: Todos</option>
            <option value="filled">Filled</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelada</option>
            <option value="rejected">Rechazada</option>
          </select>

          <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)} style={selectStyle}>
            <option value="all">Broker: Todos</option>
            <option value="alpaca">Alpaca</option>
            <option value="binance">Binance</option>
          </select>

          <select value={filterSide} onChange={e => setFilterSide(e.target.value)} style={selectStyle}>
            <option value="all">Lado: Todos</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>

          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={selectStyle}>
            <option value="all">Mostrar: Todas</option>
            <option value="executed">Ejecutadas</option>
            <option value="imported">Importadas</option>
          </select>
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border:          '1px solid var(--border-default)',
          borderRadius:    '0.625rem',
          overflow:        'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr>
                  <SortableHeader col="symbol"       label="Símbolo"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th style={thBase}>Lado</th>
                  <th style={thBase}>Tipo</th>
                  <SortableHeader col="qty"          label="Cantidad"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th style={thBase}>Precio Fill</th>
                  <th style={thBase}>Valor</th>
                  <th style={thBase}>Riesgo</th>
                  <SortableHeader col="status"       label="Estado"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortableHeader col="submitted_at" label="Fecha"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        ...tdBase,
                        textAlign:  'center',
                        padding:    '3rem',
                        color:      'var(--text-muted)',
                        fontSize:   '0.875rem',
                      }}
                    >
                      Sin órdenes registradas.
                    </td>
                  </tr>
                ) : filtered.map(order => {
                  const fillPrice = order.filled_avg_price ?? order.limit_price ?? order.stop_price
                  const value     = getOrderValue(order)

                  return (
                    <tr
                      key={order.id}
                      style={{ transition: 'background-color 100ms', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-elevated)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}
                    >
                      {/* Symbol */}
                      <td style={tdBase}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                            {order.symbol}
                          </span>
                          <span style={{
                            fontSize:        '0.5625rem',
                            fontWeight:      600,
                            color:           'var(--text-muted)',
                            backgroundColor: 'var(--bg-elevated)',
                            border:          '1px solid var(--border-default)',
                            borderRadius:    '0.2rem',
                            padding:         '0.1rem 0.3rem',
                            textTransform:   'uppercase',
                            letterSpacing:   '0.04em',
                          }}>
                            {order.asset_class === 'crypto' ? 'CRYPTO' : 'EQUITY'}
                          </span>
                          {(order as Order & { imported?: boolean }).imported && (
                            <span style={{
                              fontSize: '0.5625rem', fontWeight: 700,
                              backgroundColor: 'rgba(139,92,246,0.12)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              color: '#a78bfa', borderRadius: '0.2rem',
                              padding: '0.1rem 0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>Importado</span>
                          )}
                        </div>
                      </td>

                      {/* Side */}
                      <td style={tdBase}><SideBadge side={order.side} /></td>

                      {/* Type */}
                      <td style={{ ...tdBase }}>
                        <span style={{
                          fontSize:      '0.8125rem',
                          color:         'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          fontVariant:   'small-caps',
                        }}>
                          {order.order_type}
                        </span>
                      </td>

                      {/* Qty */}
                      <td style={tdBase}>
                        <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {order.qty % 1 === 0 ? order.qty : order.qty.toFixed(4)}
                        </span>
                      </td>

                      {/* Fill price */}
                      <td style={tdBase}>
                        {fillPrice != null ? (
                          <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {formatCurrency(fillPrice)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>

                      {/* Value */}
                      <td style={tdBase}>
                        {value != null ? (
                          <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {formatCurrency(value, 0)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>

                      {/* Risk */}
                      <td style={tdBase}>
                        {order.risk_amount != null ? (
                          <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {formatCurrency(order.risk_amount, 0)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdBase}><StatusBadge status={order.status} /></td>

                      {/* Date */}
                      <td style={tdBase}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDatetime(order.submitted_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── EARNINGS ─── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Calendar size={18} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize:   '1.125rem',
            color:      'var(--text-primary)',
            margin:     0,
          }}>
            Próximos Earnings
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Posiciones y watchlist — próximos 30 días
          </p>
        </div>

        <div style={{
          padding:         '2rem',
          backgroundColor: 'var(--bg-surface)',
          border:          '1px solid var(--border-default)',
          borderRadius:    '0.625rem',
          textAlign:       'center',
          color:           'var(--text-muted)',
          fontSize:        '0.875rem',
        }}>
          Sin eventos de earnings próximos. Conectá FMP en Settings para activar el calendario.
        </div>
      </section>

    </div>
  )
}
