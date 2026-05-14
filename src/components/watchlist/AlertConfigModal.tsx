import { useState } from 'react';
import { X, Bell, Info } from 'lucide-react';
import type { WatchlistItem } from '../../types';

interface Props {
  item: WatchlistItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, above: number | null, below: number | null) => void;
}

export function AlertConfigModal({ item, isOpen, onClose, onSave }: Props) {
  const [above, setAbove] = useState<string>(item.alert_price_above?.toString() || '');
  const [below, setBelow] = useState<string>(item.alert_price_below?.toString() || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(
      item.id,
      above ? parseFloat(above) : null,
      below ? parseFloat(below) : null
    );
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Alertas de Precio: {item.symbol}</h3>
          </div>
          <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Notificar si sube sobre:</label>
            <div style={{ position: 'relative' }}>
              <span style={currencyPrefix}>$</span>
              <input
                type="number"
                value={above}
                onChange={(e) => setAbove(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Notificar si baja de:</label>
            <div style={{ position: 'relative' }}>
              <span style={currencyPrefix}>$</span>
              <input
                type="number"
                value={below}
                onChange={(e) => setBelow(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={previewBoxStyle}>
            <Info size={14} color="var(--color-primary)" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {above || below 
                ? `Recibirás una notificación si ${item.symbol} ${above ? `sube de $${above}` : ''}${above && below ? ' o ' : ''}${below ? `baja de $${below}` : ''}.`
                : 'Configurá un nivel de precio para activar las alertas.'}
            </span>
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>Cancelar</button>
          <button onClick={handleSave} style={saveButtonStyle}>Guardar Alertas</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: '12px',
  width: '360px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer'
};

const contentStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '6px',
  padding: '10px 12px 10px 24px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: '"IBM Plex Mono", monospace',
  outline: 'none'
};

const currencyPrefix: React.CSSProperties = {
  position: 'absolute',
  left: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  fontSize: '14px'
};

const previewBoxStyle: React.CSSProperties = {
  background: 'rgba(59, 130, 246, 0.05)',
  border: '1px solid rgba(59, 130, 246, 0.1)',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start'
};

const footerStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: 'rgba(255, 255, 255, 0.02)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  borderTop: '1px solid var(--border-default)'
};

const cancelButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer'
};

const saveButtonStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer'
};
