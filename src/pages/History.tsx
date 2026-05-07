// ─────────────────────────────────────────────────────────────────────────────
// src/pages/History.tsx — Historial de órdenes + Earnings calendar
// Datos mock — sin llamadas reales (Fase 6 visual)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { History as HistoryIcon, Calendar, ChevronUp, ChevronDown, Search } from 'lucide-react'
import type { Order, EarningsEvent } from '../types'
import { formatCurrency } from '../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ORDERS: (Order & { risk_amount?: number })[] = [
  {
    id: 'o1', user_id: 'u', broker_order_id: 'alp-001', broker: 'alpaca',
    symbol: 'AAPL', side: 'buy', order_type: 'market', qty: 45,
    filled_qty: 45, filled_avg_price: 182.43,
    status: 'filled', asset_class: 'equity',
    portfolio_weight_at_order: 6.5, risk_amount: 2508,
    submitted_at: '2026-05-05T09:32:00Z', filled_at: '2026-05-05T09:32:04Z',
  },
  {
    id: 'o2', user_id: 'u', broker_order_id: 'alp-002', broker: 'alpaca',
    symbol: 'NVDA', side: 'buy', order_type: 'market', qty: 15,
    filled_qty: 15, filled_avg_price: 949.20,
    status: 'filled', asset_class: 'equity',
    portfolio_weight_at_order: 11.4, risk_amount: 3800,
    submitted_at: '2026-05-03T10:15:00Z', filled_at: '2026-05-03T10:15:02Z',
  },
  {
    id: 'o3', user_id: 'u', broker_order_id: 'alp-003', broker: 'alpaca',
    symbol: 'TSLA', side: 'sell', order_type: 'limit', qty: 5,
    limit_price: 179.00, filled_qty: 5, filled_avg_price: 178.90,
    status: 'filled', asset_class: 'equity',
    portfolio_weight_at_order: 1.4, risk_amount: undefined,
    submitted_at: '2026-05-02T14:45:00Z', filled_at: '2026-05-02T14:52:10Z',
  },
  {
    id: 'o4', user_id: 'u', broker_order_id: 'alp-004', broker: 'alpaca',
    symbol: 'MSFT', side: 'buy', order_type: 'market', qty: 20,
    filled_qty: 20, filled_avg_price: 415.30,
    status: 'filled', asset_class: 'equity',
    portfolio_weight_at_order: 6.6, risk_amount: 1890,
    submitted_at: '2026-04-28T09:45:00Z', filled_at: '2026-04-28T09:45:01Z',
  },
  {
    id: 'o5', user_id: 'u', broker_order_id: 'bnb-001', broker: 'binance',
    symbol: 'BTC', side: 'buy', order_type: 'market', qty: 0.25,
    filled_qty: 0.25, filled_avg_price: 62480,
    status: 'filled', asset_class: 'crypto',
    portfolio_weight_at_order: 12.5, risk_amount: 625,
    submitted_at: '2026-04-25T15:00:00Z', filled_at: '2026-04-25T15:00:00Z',
  },
  {
    id: 'o6', user_id: 'u', broker_order_id: 'alp-005', broker: 'alpaca',
    symbol: 'SPY', side: 'buy', order_type: 'market', qty: 30,
    filled_qty: 30, filled_avg_price: 528.60,
    status: 'filled', asset_class: 'equity',
    portfolio_weight_at_order: 12.7, risk_amount: 3150,
    submitted_at: '2026-04-20T09:31:00Z', filled_at: '2026-04-20T09:31:01Z',
  },
  {
    id: 'o7', user_id: 'u', broker_order_id: 'alp-006', broker: 'alpaca',
    symbol: 'AAPL', side: 'sell', order_type: 'stop', qty: 10,
    stop_price: 177.00,
    status: 'cancelled', asset_class: 'equity',
    submitted_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'o8', user_id: 'u', broker_order_id: 'bnb-002', broker: 'binance',
    symbol: 'ETH', side: 'buy', order_type: 'limit', qty: 2,
    limit_price: 3100,
    status: 'pending', asset_class: 'crypto',
    risk_amount: undefined,
    submitted_at: '2026-04-10T11:30:00Z',
  },
]

interface EarningsEventEx extends EarningsEvent {
  company: string
  daysUntil: number // negative = past
}

const MOCK_EARNINGS: EarningsEventEx[] = [
  {
    symbol: 'AAPL', company: 'Apple Inc.',
    report_date: '2026-05-09', report_time: 'before_market',
    eps_estimate: 1.58, eps_actual: undefined,
    fetched_at: '2026-05-06T00:00:00Z',
    daysUntil: 3,
  },
  {
    symbol: 'MSFT', company: 'Microsoft Corp.',
    report_date: '2026-05-20', report_time: 'after_market',
    eps_estimate: 3.22, eps_actual: undefined,
    fetched_at: '2026-05-06T00:00:00Z',
    daysUntil: 14,
  },
  {
    symbol: 'NVDA', company: 'NVIDIA Corp.',
    report_date: '2026-05-28', report_time: 'after_market',
    eps_estimate: 5.84, eps_actual: undefined,
    fetched_at: '2026-05-06T00:00:00Z',
    daysUntil: 22,
  },
  {
    symbol: 'TSLA', company: 'Tesla, Inc.',
    report_date: '2026-04-22', report_time: 'after_market',
    eps_estimate: 0.48, eps_actual: 0.41, surprise_pct: -14.6,
    fetched_at: '2026-05-06T00:00:00Z',
    daysUntil: -14,
  },
]

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

function formatReportTime(rt: 'before_market' | 'after_market' | 'unknown'): string {
  if (rt === 'before_market') return 'Pre-market'
  if (rt === 'after_market')  return 'Post-market'
  return 'Horario desconocido'
}

function formatEarningsDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
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
// EarningsCard
// ─────────────────────────────────────────────────────────────────────────────

function EarningsCard({ e }: { e: EarningsEventEx }) {
  const isPast     = e.daysUntil < 0
  const isImminent = !isPast && e.daysUntil <= 7
  const isSoon     = !isPast && e.daysUntil > 7 && e.daysUntil <= 14

  return (
    <div style={{
      minWidth:        '200px',
      maxWidth:        '220px',
      backgroundColor: 'var(--bg-surface)',
      border:          isImminent
        ? '1px solid rgba(245,158,11,0.4)'
        : '1px solid var(--border-default)',
      borderRadius:    '0.625rem',
      padding:         '1rem',
      display:         'flex',
      flexDirection:   'column',
      gap:             '0.625rem',
      flexShrink:      0,
    }}>
      {/* Symbol + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span className="font-mono" style={{
          fontSize:   '1rem',
          fontWeight: 700,
          color:      'var(--text-primary)',
        }}>
          {e.symbol}
        </span>
        {isPast ? (
          <span style={{
            padding:         '0.175rem 0.5rem',
            borderRadius:    '0.25rem',
            backgroundColor: 'var(--bg-elevated)',
            border:          '1px solid var(--border-default)',
            fontSize:        '0.625rem',
            fontWeight:      600,
            color:           'var(--text-muted)',
            fontFamily:      '"Syne", sans-serif',
            whiteSpace:      'nowrap',
          }}>
            Reportado
          </span>
        ) : isImminent ? (
          <span style={{
            padding:         '0.175rem 0.5rem',
            borderRadius:    '0.25rem',
            backgroundColor: 'rgba(245,158,11,0.12)',
            border:          '1px solid rgba(245,158,11,0.35)',
            fontSize:        '0.625rem',
            fontWeight:      700,
            color:           '#f59e0b',
            fontFamily:      '"Syne", sans-serif',
            whiteSpace:      'nowrap',
          }}>
            ⚠ {e.daysUntil}d
          </span>
        ) : isSoon ? (
          <span style={{
            padding:         '0.175rem 0.5rem',
            borderRadius:    '0.25rem',
            backgroundColor: 'rgba(59,130,246,0.1)',
            border:          '1px solid rgba(59,130,246,0.25)',
            fontSize:        '0.625rem',
            fontWeight:      600,
            color:           '#3b82f6',
            fontFamily:      '"Syne", sans-serif',
            whiteSpace:      'nowrap',
          }}>
            {e.daysUntil}d
          </span>
        ) : null}
      </div>

      {/* Company */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
        {e.company}
      </p>

      {/* Date + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Calendar size={12} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {formatEarningsDate(e.report_date)} · {formatReportTime(e.report_time)}
        </span>
      </div>

      {/* EPS row */}
      <div style={{
        borderTop:   '1px solid var(--border-subtle)',
        paddingTop:  '0.5rem',
        display:     'flex',
        flexDirection:'column',
        gap:         '0.3rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>EPS Est.</span>
          <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ${e.eps_estimate?.toFixed(2) ?? '—'}
          </span>
        </div>

        {e.eps_actual != null && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>EPS Real</span>
              <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ${e.eps_actual.toFixed(2)}
              </span>
            </div>
            {e.surprise_pct != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Sorpresa</span>
                <span className="font-mono" style={{
                  fontSize:   '0.8125rem',
                  fontWeight: 700,
                  color:      e.surprise_pct >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {e.surprise_pct > 0 ? '+' : ''}{e.surprise_pct.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
  // Filters
  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterBroker, setFilterBroker] = useState<string>('all')
  const [filterSide,   setFilterSide]   = useState<string>('all')

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
    let list = [...MOCK_ORDERS]

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
            {MOCK_ORDERS.length} órdenes
          </span>
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
                      Sin órdenes para los filtros seleccionados
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
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
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Posiciones y watchlist — próximos 30 días
          </p>
        </div>

        <div style={{
          display:   'flex',
          gap:       '0.875rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
        }}>
          {MOCK_EARNINGS.map(e => (
            <EarningsCard key={`${e.symbol}-${e.report_date}`} e={e} />
          ))}
        </div>
      </section>

    </div>
  )
}
