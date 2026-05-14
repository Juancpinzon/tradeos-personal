import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, formatPercent, formatCompactNumber } from '../../lib/formatters';
import type { ScreenerResultItem } from '../../types';

interface Props {
  items: ScreenerResultItem[];
}

type SortKey = keyof ScreenerResultItem;

export function ScreenerResultsTable({ items }: Props) {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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

  return (
    <div style={{
      width: '100%',
      height: '100%',
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
            <Th label="Symbol" sortKey="symbol" onSort={handleSort} config={sortConfig} />
            <Th label="Nombre" sortKey="name" onSort={handleSort} config={sortConfig} />
            <Th label="Precio" sortKey="price" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="Market Cap" sortKey="market_cap" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="Rev Growth" sortKey="revenue_growth_pct" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="ATH%" sortKey="ath_distance_pct" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="RSI" sortKey="rsi_weekly" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="EPS Est" sortKey="eps_next_estimate" onSort={handleSort} config={sortConfig} align="right" />
            <Th label="Score" sortKey="score" onSort={handleSort} config={sortConfig} align="center" />
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr
              key={item.symbol}
              onClick={() => navigate(`/research?symbol=${item.symbol}`)}
              onMouseEnter={() => setHoveredRow(item.symbol)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                cursor: 'pointer',
                background: hoveredRow === item.symbol ? 'var(--bg-elevated)' : 'transparent',
                transition: 'background 150ms ease',
              }}
            >
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, sortKey, onSort, config, align = 'left' }: { 
  label: string; 
  sortKey: SortKey; 
  onSort: (key: SortKey) => void; 
  config: any;
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
