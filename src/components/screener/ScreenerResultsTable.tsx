import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, ArrowUp, ArrowDown, Plane } from 'lucide-react';
import { useFlightPlan } from '../../hooks/useFlightPlan';
import { useFlightPlanExport, toast } from '../../hooks/useFlightPlanExport';
import { formatCurrency, formatPercent, formatCompactNumber } from '../../lib/formatters';
import type { ScreenerResultItem } from '../../types';

interface Props {
  items: ScreenerResultItem[];
}

type SortKey = keyof ScreenerResultItem;

export function ScreenerResultsTable({ items }: Props) {
  const navigate = useNavigate();
  const { plan, addCandidate } = useFlightPlan();
  const { exportCandidates } = useFlightPlanExport();
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig?.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal == null) return direction === 'asc' ? -1 : 1;
    if (bVal == null) return direction === 'asc' ? 1 : -1;
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--color-profit)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--text-muted)';
  };

  const handleExport = () => {
    const selectedItems = items.filter(item => selectedSymbols.has(item.symbol));
    const candidates = selectedItems.map(item => ({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      score: item.score,
      aiNote: item.ai_note,
      revGrowthPct: item.revenue_growth_pct,
      athDistPct: item.ath_distance_pct,
      nextEarningsDate: item.next_earnings_date ?? undefined
    }));
    exportCandidates(candidates);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
    }}>
      <div style={{
        flex: 1,
        width: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: '13px',
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            background: 'var(--bg-base)',
            zIndex: 10,
          }}>
            <tr>
              <th style={{ ...thStyle, width: '40px' }}></th>
              <Th label="Symbol" sortKey="symbol" onSort={handleSort} config={sortConfig} />
              <Th label="Nombre" sortKey="name" onSort={handleSort} config={sortConfig} />
              <Th label="Precio" sortKey="price" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="Market Cap" sortKey="market_cap" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="Rev Growth" sortKey="revenue_growth_pct" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="ATH%" sortKey="ath_distance_pct" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="RSI" sortKey="rsi_weekly" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="EPS Est" sortKey="eps_next_estimate" onSort={handleSort} config={sortConfig} align="right" />
              <Th label="Score" sortKey="score" onSort={handleSort} config={sortConfig} align="center" />
              <th style={{ ...thStyle, width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    ...tdStyle,
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  Ningún candidato pasó los filtros de esta corrida.
                  <br />
                  Probá bajar el mínimo de crecimiento, ampliar la distancia al
                  ATH o desactivar algún criterio, y volvé a correr.
                </td>
              </tr>
            )}
            {sortedItems.map((item) => (
              <tr
                key={item.symbol}
                onClick={() => navigate(`/research?symbol=${item.symbol}`)}
                onMouseEnter={() => setHoveredRow(item.symbol)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  cursor: 'pointer',
                  background: selectedSymbols.has(item.symbol)
                    ? 'rgba(23, 37, 84, 0.4)'
                    : hoveredRow === item.symbol
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                  transition: 'background 150ms ease',
                }}
              >
                <td
                  style={{ ...tdStyle, width: '40px', textAlign: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSymbols((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.symbol)) {
                        next.delete(item.symbol);
                      } else {
                        if (next.size >= 3) {
                          toast.error('Máximo 3 candidatos por Plan de Vuelo');
                          return prev;
                        }
                        next.add(item.symbol);
                      }
                      return next;
                    });
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSymbols.has(item.symbol)}
                    readOnly
                    style={{
                      cursor: 'pointer',
                      accentColor: 'var(--color-primary)',
                      width: '16px',
                      height: '16px',
                    }}
                  />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontFamily: '"IBM Plex Mono", monospace', 
                      fontWeight: 700,
                      color: 'var(--color-primary)'
                    }}>
                      {item.symbol}
                    </span>
                    {item.already_in_portfolio && <Star size={12} fill="var(--color-warning)" color="var(--color-warning)" />}
                    {item.already_in_watchlist && <Eye size={12} color="var(--color-primary)" />}
                  </div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {formatCurrency(item.price)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {formatCompactNumber(item.market_cap)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: (item.revenue_growth_pct || 0) > 0 ? 'var(--color-profit)' : 'var(--text-muted)' }}>
                  {item.revenue_growth_pct ? formatPercent(item.revenue_growth_pct) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: (item.ath_distance_pct || 0) >= -5 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                  {formatPercent(item.ath_distance_pct)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: getRsiColor(item.rsi_weekly) }}>
                  {item.rsi_weekly?.toFixed(0) || '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {item.eps_next_estimate ? `$${item.eps_next_estimate.toFixed(2)}` : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: `${getScoreColor(item.score)}22`,
                    color: getScoreColor(item.score),
                    fontWeight: 700,
                    fontSize: '11px',
                    border: `1px solid ${getScoreColor(item.score)}44`,
                    position: 'relative'
                  }}>
                    {item.score}
                    
                    {hoveredRow === item.symbol && (
                      <div style={tooltipStyle}>
                        {item.ai_note}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!plan) {
                        alert('Primero debés inicializar el Plan de Vuelo del día.');
                        return;
                      }
                      addCandidate({
                        symbol: item.symbol,
                        setup_type: 'breakout', // Default
                        current_price: item.price,
                        stop_loss: item.price * 0.95, // Default 5%
                        target: item.price * 1.15, // Default 15%
                        entry_thesis: item.ai_note
                      });
                    }}
                    title="Agregar al Plan de Vuelo"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: item.already_in_portfolio ? 'var(--text-muted)' : 'var(--color-primary)',
                      cursor: item.already_in_portfolio ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: hoveredRow === item.symbol ? 1 : 0.3,
                      transition: 'opacity 0.2s'
                    }}
                    disabled={item.already_in_portfolio}
                  >
                    <Plane size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {items.length > 0 && (
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <button
            onClick={handleExport}
            disabled={selectedSymbols.size === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: selectedSymbols.size === 0 ? 'var(--bg-elevated)' : 'var(--color-primary)',
              color: selectedSymbols.size === 0 ? 'var(--text-muted)' : '#ffffff',
              cursor: selectedSymbols.size === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 150ms ease',
            }}
          >
            <Plane size={16} />
            Exportar al Plan de Vuelo ({selectedSymbols.size}/3)
          </button>
        </div>
      )}
    </div>
  );
}

function Th({ label, sortKey, onSort, config, align = 'left' }: { 
  label: string; 
  sortKey: SortKey; 
  onSort: (key: SortKey) => void; 
  config: { key: SortKey; direction: 'asc' | 'desc' } | null;
  align?: 'left' | 'right' | 'center'
}) {
  const isSorted = config?.key === sortKey;
  return (
    <th 
      onClick={() => onSort(sortKey)}
      style={{
        textAlign: align,
        padding: '12px 16px',
        color: 'var(--text-muted)',
        fontWeight: 600,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-default)',
        userSelect: 'none'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        gap: '4px' 
      }}>
        {label}
        {isSorted && (
          config.direction === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
        )}
      </div>
    </th>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-subtle)',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-default)',
};

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  right: '50%',
  transform: 'translateX(50%)',
  marginBottom: '8px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '6px',
  padding: '8px 12px',
  width: '240px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  zIndex: 100,
  textAlign: 'left',
  lineHeight: '1.4',
  pointerEvents: 'none',
};

function getRsiColor(rsi?: number) {
  if (!rsi) return 'var(--text-muted)';
  if (rsi >= 70) return 'var(--color-loss)';
  if (rsi <= 30) return 'var(--color-profit)';
  return 'var(--text-secondary)';
}
