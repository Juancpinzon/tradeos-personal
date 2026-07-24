import { useState } from 'react';
import { useScreenerStore } from '../../stores/screenerStore';
import { useScreener } from '../../hooks/useScreener';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Search, Save, Play } from 'lucide-react';

export function ScreenerCriteriaForm() {
  const { activeCriteria, setCriteria, isRunning } = useScreenerStore();
  const { runScreener, savePreset } = useScreener();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? parseFloat(value) : value;
    setCriteria({ [name]: val });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (presetName.trim()) {
      await savePreset(presetName, activeCriteria);
      setShowSaveModal(false);
      setPresetName('');
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div style={isMobile ? {
      width: '100%',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
    } : {
      width: '420px',
      flexShrink: 0,
      borderRight: '1px solid var(--border-default)',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: 'Syne, system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Search size={14} /> Criterios de Búsqueda
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => runScreener(activeCriteria)}
            disabled={isRunning}
            style={{
              flex: 1,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isRunning ? 0.7 : 1,
            }}
          >
            <Play size={14} fill="currentColor" /> {isRunning ? 'Corriendo...' : 'Correr'}
          </button>
          
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              padding: '8px',
              cursor: 'pointer',
            }}
            title="Guardar como preset"
          >
            <Save size={14} />
          </button>
        </div>
      </div>

      <div style={{
        ...(isMobile ? {} : { flex: 1, overflowY: 'auto' }),
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Búsqueda por Símbolo / Nombre Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Símbolo</label>
            <input
              type="text"
              name="symbol_query"
              placeholder="Ej: AAPL"
              value={activeCriteria.symbol_query || ''}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={sectionStyle}>
            <label style={labelStyle}>Nombre</label>
            <input
              type="text"
              name="name_query"
              placeholder="Ej: Apple"
              value={(activeCriteria as any).name_query || ''}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Market Cap */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Market Cap Mín.</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              name="market_cap_min"
              min={100000000}
              max={100000000000}
              step={100000000}
              value={activeCriteria.market_cap_min || 500000000}
              onChange={handleChange}
              style={rangeStyle}
            />
          </div>
          <div style={valueDisplay}>{formatCurrency(activeCriteria.market_cap_min || 500000000)}</div>
        </div>

        {/* Revenue Growth */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Revenue Growth Mín. (%)</label>
          <input
            type="range"
            name="revenue_growth_min_pct"
            min={0}
            max={100}
            value={activeCriteria.revenue_growth_min_pct || 0}
            onChange={handleChange}
            style={rangeStyle}
          />
          <div style={valueDisplay}>{activeCriteria.revenue_growth_min_pct || 0}%</div>
        </div>

        {/* ATH Distance */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Distancia ATH Máx. (%)</label>
          <input
            type="range"
            name="ath_distance_max_pct"
            min={-100}
            max={0}
            value={activeCriteria.ath_distance_max_pct || -20}
            onChange={handleChange}
            style={rangeStyle}
          />
          <div style={valueDisplay}>{activeCriteria.ath_distance_max_pct || -20}%</div>
        </div>

        {/* RSI Weekly */}
        <div style={sectionStyle}>
          <label style={labelStyle}>RSI Semanal (Rango)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              name="rsi_weekly_min"
              placeholder="Min"
              value={activeCriteria.rsi_weekly_min || ''}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="number"
              name="rsi_weekly_max"
              placeholder="Max"
              value={activeCriteria.rsi_weekly_max || ''}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Price Min */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Precio Mínimo ($)</label>
          <input
            type="number"
            name="price_min"
            value={activeCriteria.price_min || ''}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Price Max */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Precio Máximo ($)</label>
          <input
            type="number"
            name="price_max"
            value={activeCriteria.price_max || ''}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              name="eps_next_positive"
              checked={activeCriteria.eps_next_positive || false}
              onChange={handleChange}
            />
            EPS Próx. Positivo
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              name="exclude_dividends"
              checked={activeCriteria.exclude_dividends || false}
              onChange={handleChange}
            />
            Excluir con Dividendos
          </label>
        </div>

        {/* Asset Class */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Tipo de Activo</label>
          <select
            name="asset_class"
            value={activeCriteria.asset_class}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="equity">Equity (NYSE/NASDAQ)</option>
            <option value="crypto">Cripto (Binance)</option>
            <option value="both">Ambos</option>
          </select>
        </div>
      </div>

      {/* Save Modal Placeholder */}
      {showSaveModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Guardar Preset</h3>
            <form onSubmit={handleSave}>
              <input
                autoFocus
                type="text"
                placeholder="Nombre del preset (ej: Momentum Growth)"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                style={{ ...inputStyle, marginBottom: '16px', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
};

const checkboxLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none',
};

const rangeStyle: React.CSSProperties = {
  width: '100%',
  accentColor: 'var(--color-primary)',
};

const valueDisplay: React.CSSProperties = {
  fontSize: '12px',
  fontFamily: '"IBM Plex Mono", monospace',
  color: 'var(--color-primary)',
  fontWeight: 700,
  textAlign: 'right',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const modalContent: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: '8px',
  padding: '20px',
  width: '320px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
};
