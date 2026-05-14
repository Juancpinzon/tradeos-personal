import { useState } from 'react';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useSearchParams } from 'react-router-dom';
import { Plus, Bell, Trash2, TrendingUp, TrendingDown, Search, Loader2 } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { AlertConfigModal } from './AlertConfigModal';

export function WatchlistPanel() {
  const { items, isLoading, addItem, removeItem, updateAlerts } = useWatchlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol) {
      // Por defecto equity en Alpaca para la búsqueda simple
      addItem({ 
        symbol: newSymbol.toUpperCase(), 
        broker: 'alpaca', 
        asset_class: 'equity' 
      });
      setNewSymbol('');
    }
  };

  const handleClickSymbol = (symbol: string) => {
    // Actualizar URL con el símbolo seleccionado para que otros componentes reaccionen
    const newParams = new URLSearchParams(searchParams);
    newParams.set('symbol', symbol);
    setSearchParams(newParams);
  };

  return (
    <div style={containerStyle}>
      {/* Header & Add */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Search size={16} color="var(--text-muted)" />
          <h2 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Watchlist</h2>
        </div>
        
        <form onSubmit={handleAdd} style={addFormStyle}>
          <input
            type="text"
            placeholder="Agregar símbolo..."
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            style={inputStyle}
          />
          <button type="submit" style={addButtonStyle}><Plus size={18} /></button>
        </form>
      </div>

      {/* List */}
      <div style={listStyle}>
        {isLoading && items.length === 0 ? (
          <div style={loadingStyle}><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div style={emptyStyle}>No hay símbolos en tu watchlist.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} style={itemStyle}>
              <div 
                onClick={() => handleClickSymbol(item.symbol)}
                style={itemMainStyle}
              >
                <div style={symbolRowStyle}>
                  <span style={symbolTextStyle}>{item.symbol}</span>
                  <div style={priceContainer}>
                    <span style={priceTextStyle}>
                      {item.marketData ? formatCurrency(item.marketData.price) : '—'}
                    </span>
                    {item.marketData && (
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        color: item.marketData.change_pct >= 0 ? 'var(--color-profit)' : 'var(--color-loss)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {item.marketData.change_pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatPercent(item.marketData.change_pct)}
                      </span>
                    )}
                  </div>
                </div>
                
                {item.marketData && (
                  <div style={bidAskStyle}>
                    <span>B: {formatCurrency(item.marketData.bid || 0)}</span>
                    <span>A: {formatCurrency(item.marketData.ask || 0)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={actionsStyle}>
                <button 
                  onClick={() => setSelectedItem(item)}
                  style={{
                    ...actionButtonStyle,
                    color: (item.alert_price_above || item.alert_price_below) ? 'var(--color-primary)' : 'var(--text-muted)'
                  }}
                  title="Configurar Alertas"
                >
                  <Bell size={14} fill={(item.alert_price_above || item.alert_price_below) ? 'var(--color-primary)' : 'none'} />
                </button>
                <button 
                  onClick={() => removeItem(item.id)}
                  style={actionButtonStyle}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedItem && (
        <AlertConfigModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={updateAlerts}
        />
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderLeft: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  width: '300px',
  flexShrink: 0
};

const headerStyle: React.CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid var(--border-default)'
};

const addFormStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px'
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: '"IBM Plex Mono", monospace',
  outline: 'none'
};

const addButtonStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  width: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto'
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-subtle)',
  transition: 'background 150ms ease',
  gap: '12px'
};

const itemMainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  cursor: 'pointer'
};

const symbolRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const symbolTextStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  fontFamily: '"IBM Plex Mono", monospace',
  color: 'var(--color-primary)'
};

const priceContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2px'
};

const priceTextStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: '"IBM Plex Mono", monospace',
  color: 'var(--text-primary)'
};

const bidAskStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  fontSize: '10px',
  color: 'var(--text-muted)',
  fontFamily: '"IBM Plex Mono", monospace'
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const actionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 150ms'
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '40px',
  color: 'var(--text-muted)'
};

const emptyStyle: React.CSSProperties = {
  padding: '40px 20px',
  textAlign: 'center',
  fontSize: '13px',
  color: 'var(--text-muted)'
};
