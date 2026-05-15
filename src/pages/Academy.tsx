import { useState } from 'react'
import { Book, Target, ShieldAlert, Clock, BarChart3, Download } from 'lucide-react'
import { STRATEGIES, GLOSSARY } from '../data/strategies'

export default function Academy() {
  const [selectedId, setSelectedId] = useState(STRATEGIES[0]?.id || '')
  const strategy = STRATEGIES.find(s => s.id === selectedId) || STRATEGIES[0]

  if (!strategy) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        No hay estrategias disponibles.
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Book size={24} className="text-primary" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>
            ACADEMIA DE ESTRATEGIAS
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Manuales tácticos y reglas de oro para operar con disciplina.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        {/* Sidebar de Estrategias */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{
                textAlign: 'left',
                padding: '1rem',
                borderRadius: '8px',
                background: selectedId === s.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
                border: `1px solid ${selectedId === s.id ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                color: selectedId === s.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '4px' }}>{s.title}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{s.target_market}</div>
            </button>
          ))}

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px dashed rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)', marginBottom: '8px' }}>
              <ShieldAlert size={14} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>REGLA DE ORO</span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              "El mercado puede permanecer irracional más tiempo del que tú puedes permanecer solvente." — Gestiona siempre el riesgo.
            </p>
          </div>
        </aside>

        {/* Contenido de la Estrategia */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>
              {strategy.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{strategy.description}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="academy-stat">
                <BarChart3 size={14} />
                <span>Capital: {strategy.capital_req}</span>
              </div>
              <div className="academy-stat">
                <ShieldAlert size={14} />
                <span>Riesgo: {strategy.risk_per_trade}</span>
              </div>
              <div className="academy-stat">
                <Clock size={14} />
                <span>Mercado: {strategy.target_market}</span>
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Setups */}
            <section>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Setups Válidos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {strategy.setups.map((setup, i) => (
                  <div key={i} className="academy-setup">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>{setup.name}</span>
                      <span style={{ fontSize: '0.65rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>{setup.timeframe}</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {setup.rules.map((rule, ri) => (
                        <li key={ri} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--color-primary)' }}>•</span> {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Reglas de Disciplina */}
            <section>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reglas Irrompibles
              </h3>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {strategy.rules.map((rule, i) => (
                    <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Target size={14} style={{ color: 'var(--color-loss)', marginTop: '2px', flexShrink: 0 }} />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <a 
                  href={`/estrategias_manuales/${selectedId === 'intraday' ? 'Estrategia_Intraday.pdf' : 'Estrategia_Swing.pdf'}`} 
                  download 
                  className="btn-primary" 
                  style={{ width: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <Download size={14} />
                  Descargar PDF Completo
                </a>
              </div>
            </section>
          </div>

          {/* Glosario */}
          <section className="card" style={{ marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.02)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
              Glosario de Términos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {GLOSSARY.map((item, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item.term}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.def}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        .academy-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-elevated);
          padding: 8px 12px;
          border-radius: 6px;
        }
        .academy-setup {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 1rem;
          border-radius: 12px;
        }
      `}</style>
    </div>
  )
}
