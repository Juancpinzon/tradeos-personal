import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Key, Shield, ShieldAlert, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Upload, FileText } from 'lucide-react';
import ImporterModal from '../components/importer/ImporterModal';

interface ImportSession {
  id: string;
  filename: string;
  total_rows: number;
  imported_rows: number;
  status: string;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [alpacaKeys, setAlpacaKeys] = useState({ key: '', secret: '', show: false });
  const [binanceKeys, setBinanceKeys] = useState({ key: '', secret: '', show: false });
  const [alpacaStatus, setAlpacaStatus] = useState<'none' | 'loading' | 'valid' | 'error'>('none');
  const [binanceStatus, setBinanceStatus] = useState<'none' | 'loading' | 'valid' | 'error'>('none');

  // Importer state
  const [importerOpen, setImporterOpen] = useState(false);
  const [importSessions, setImportSessions] = useState<ImportSession[]>([]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchImportSessions();
    }
  }, [user]);

  const fetchImportSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('import_sessions')
      .select('id, filename, total_rows, imported_rows, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setImportSessions(data as ImportSession[]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    if (data) setSettings(data);
    setLoading(false);
  };

  const saveSettings = async (updates: any) => {
    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', user?.id);
    
    if (!error) {
      setSettings({ ...settings, ...updates });
    }
  };

  const handleSaveApiKeys = async (broker: 'alpaca' | 'binance') => {
    const keys = broker === 'alpaca' ? alpacaKeys : binanceKeys;
    const setStatus = broker === 'alpaca' ? setAlpacaStatus : setBinanceStatus;
    
    if (!keys.key || !keys.secret) return;

    setStatus('loading');
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-api-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            broker,
            api_key: keys.key,
            secret_key: keys.secret
          })
        }
      );

      const result = await response.json();
      if (result.valid) {
        setStatus('valid');
        if (result.message) {
          // Las keys NO se guardan en la DB (principio irrompible #1):
          // informar dónde se configuran realmente (Secrets de Supabase).
          window.dispatchEvent(
            new CustomEvent('tradeos-toast', {
              detail: {
                title: 'Keys válidas',
                message: result.message,
                color: 'var(--color-primary)',
              },
            })
          );
        }
        if (broker === 'alpaca') setAlpacaKeys({ ...alpacaKeys, key: '', secret: '' });
        else setBinanceKeys({ ...binanceKeys, key: '', secret: '' });
      } else {
        setStatus('error');
        alert(`Error validando keys de ${broker}: ${result.error || 'Desconocido'}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (loading) return <div style={containerStyle}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Configuración</h1>

      <div style={gridStyle}>
        {/* API Keys Section */}
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Key size={18} color="var(--color-primary)" />
            <h2 style={cardTitleStyle}>API Keys (validación de conexión)</h2>
          </div>
          
          <div style={sectionContentStyle}>
            {/* Alpaca */}
            <div style={keyRowStyle}>
              <div style={keyLabelRow}>
                <span style={keyLabelStyle}>Alpaca (NYSE)</span>
                <StatusBadge status={alpacaStatus} />
              </div>
              <div style={inputGroupStyle}>
                <input
                  type={alpacaKeys.show ? "text" : "password"}
                  placeholder="API Key ID"
                  value={alpacaKeys.key}
                  onChange={e => setAlpacaKeys({ ...alpacaKeys, key: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type={alpacaKeys.show ? "text" : "password"}
                  placeholder="Secret Key"
                  value={alpacaKeys.secret}
                  onChange={e => setAlpacaKeys({ ...alpacaKeys, secret: e.target.value })}
                  style={inputStyle}
                />
                <button 
                  onClick={() => setAlpacaKeys({ ...alpacaKeys, show: !alpacaKeys.show })}
                  style={iconButtonStyle}
                >
                  {alpacaKeys.show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  onClick={() => handleSaveApiKeys('alpaca')}
                  disabled={alpacaStatus === 'loading'}
                  style={saveButtonStyle}
                >
                  {alpacaStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Guardar y Verificar'}
                </button>
              </div>
            </div>

            {/* Binance */}
            <div style={keyRowStyle}>
              <div style={keyLabelRow}>
                <span style={keyLabelStyle}>Binance (Cripto)</span>
                <StatusBadge status={binanceStatus} />
              </div>
              <div style={inputGroupStyle}>
                <input
                  type={binanceKeys.show ? "text" : "password"}
                  placeholder="API Key"
                  value={binanceKeys.key}
                  onChange={e => setBinanceKeys({ ...binanceKeys, key: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type={binanceKeys.show ? "text" : "password"}
                  placeholder="Secret Key"
                  value={binanceKeys.secret}
                  onChange={e => setBinanceKeys({ ...binanceKeys, secret: e.target.value })}
                  style={inputStyle}
                />
                <button 
                  onClick={() => setBinanceKeys({ ...binanceKeys, show: !binanceKeys.show })}
                  style={iconButtonStyle}
                >
                  {binanceKeys.show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  onClick={() => handleSaveApiKeys('binance')}
                  disabled={binanceStatus === 'loading'}
                  style={saveButtonStyle}
                >
                  {binanceStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Guardar y Verificar'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Management Section */}
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Shield size={18} color="var(--color-primary)" />
            <h2 style={cardTitleStyle}>Gestión de Riesgo</h2>
          </div>
          
          <div style={sectionContentStyle}>
            <div style={settingRowStyle}>
              <div style={settingTextContainer}>
                <span style={settingLabelStyle}>Riesgo por Operación (%)</span>
                <span style={settingDescStyle}>Capital máximo a arriesgar en un solo trade.</span>
              </div>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings?.risk_per_trade_pct || 2}
                  onChange={e => saveSettings({ risk_per_trade_pct: parseFloat(e.target.value) })}
                  style={sliderStyle}
                />
                <span style={sliderValueStyle}>{settings?.risk_per_trade_pct}%</span>
              </div>
            </div>

            <div style={settingRowStyle}>
              <div style={settingTextContainer}>
                <span style={settingLabelStyle}>Tamaño Máximo de Posición (%)</span>
                <span style={settingDescStyle}>Peso máximo de un activo en el portafolio.</span>
              </div>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={settings?.max_position_size_pct || 15}
                  onChange={e => saveSettings({ max_position_size_pct: parseFloat(e.target.value) })}
                  style={sliderStyle}
                />
                <span style={sliderValueStyle}>{settings?.max_position_size_pct}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Import History Section */}
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Upload size={18} color="var(--color-primary)" />
            <h2 style={cardTitleStyle}>Importar historial de operaciones</h2>
          </div>

          <div style={sectionContentStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                  Cargá operaciones previas desde Excel para alimentar el Journal con datos reales.
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Formato: <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>Ticker | Movimiento | Cantidad | Precio | Fecha</span>
                </p>
              </div>
              <button
                onClick={() => setImporterOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1.125rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--color-primary)',
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  color: 'var(--color-primary)',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                  fontFamily: '"Syne", sans-serif', whiteSpace: 'nowrap',
                  transition: 'background-color 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)')}
              >
                <FileText size={14} /> Importar desde Excel
              </button>
            </div>

            {importSessions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                  Importaciones anteriores
                </p>
                {importSessions.map(session => (
                  <div
                    key={session.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      gap: '1rem', flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <FileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.8125rem', color: 'var(--text-secondary)',
                        fontFamily: '"IBM Plex Mono", monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px',
                      }}>
                        {session.filename}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {session.imported_rows}/{session.total_rows} filas
                      </span>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700,
                        padding: '0.15rem 0.45rem', borderRadius: '0.25rem',
                        backgroundColor: session.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${session.status === 'completed' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        color: session.status === 'completed' ? '#10b981' : '#ef4444',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {session.status === 'completed' ? 'OK' : session.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(session.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trading Mode Section */}
        <section style={{ ...cardStyle, borderLeft: settings?.alpaca_mode === 'live' ? '4px solid var(--color-loss)' : '1px solid var(--border-default)' }}>
          <div style={cardHeaderStyle}>
            <ShieldAlert size={18} color={settings?.alpaca_mode === 'live' ? 'var(--color-loss)' : 'var(--color-primary)'} />
            <h2 style={cardTitleStyle}>Modo de Trading</h2>
          </div>
          
          <div style={sectionContentStyle}>
            <div style={{
              background: settings?.alpaca_mode === 'live' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 700, 
                  color: settings?.alpaca_mode === 'live' ? 'var(--color-loss)' : 'var(--color-profit)',
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {settings?.alpaca_mode === 'live' ? 'LIVE TRADING ACTIVADO' : 'PAPER TRADING ACTIVADO'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {settings?.alpaca_mode === 'live' 
                    ? 'Las órdenes se ejecutarán con dinero real en tu cuenta de Alpaca.' 
                    : 'Las órdenes se ejecutarán en un entorno simulado sin riesgo financiero.'}
                </div>
              </div>
              <button
                onClick={() => {
                  const newMode = settings.alpaca_mode === 'paper' ? 'live' : 'paper';
                  if (newMode === 'live' && !confirm('¿Estás SEGURO? Esto activará operaciones con DINERO REAL.')) return;
                  saveSettings({ alpaca_mode: newMode, live_trading_enabled: newMode === 'live' });
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: settings?.alpaca_mode === 'live' ? 'var(--color-loss)' : 'var(--color-profit)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cambiar a {settings?.alpaca_mode === 'paper' ? 'LIVE' : 'PAPER'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {importerOpen && (
        <ImporterModal
          onClose={() => {
            setImporterOpen(false);
            fetchImportSessions();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'none') return null;
  if (status === 'loading') return <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Verificando...</span>;
  if (status === 'valid') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-profit)', fontSize: '10px', fontWeight: 700 }}><CheckCircle2 size={12} /> CONECTADO</div>;
  return <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-loss)', fontSize: '10px', fontWeight: 700 }}><XCircle size={12} /> ERROR</div>;
}

const containerStyle: React.CSSProperties = {
  padding: '40px 24px',
  maxWidth: '900px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '32px'
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'Syne, system-ui, sans-serif',
  fontSize: '28px',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: '12px',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.02)'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const sectionContentStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const keyRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const keyLabelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const keyLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)'
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '6px',
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: '"IBM Plex Mono", monospace',
};

const iconButtonStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '6px',
  padding: '10px',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const saveButtonStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '0 16px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const settingRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '40px'
};

const settingTextContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flex: 1
};

const settingLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--text-primary)'
};

const settingDescStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)'
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '200px'
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: 'var(--color-primary)'
};

const sliderValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  fontFamily: '"IBM Plex Mono", monospace',
  color: 'var(--color-primary)',
  minWidth: '45px',
  textAlign: 'right'
};
