// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanChecklist.tsx
// Checklist pre-sesión: 9 puntos críticos para el enfoque
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, Circle } from 'lucide-react'

interface Props {
  items: Record<string, boolean>
  onToggle: (key: string) => void
}

const CHECKLIST_ITEMS = [
  { key: 'news', label: 'Revisar calendario económico (VIX, CPI, Fed, etc.)' },
  { key: 'spy', label: 'Verificar niveles clave de SPY/QQQ (Soporte/Resistencia)' },
  { key: 'positions', label: 'Revisar posiciones abiertas y ajustar stops si es necesario' },
  { key: 'setups', label: 'Validar setups técnicos de los candidatos del día' },
  { key: 'risk', label: 'Confirmar capital disponible y riesgo máximo diario' },
  { key: 'apis', label: 'Verificar conexión de APIs (Alpaca / Binance)' },
  { key: 'distractions', label: 'Eliminar distracciones (celular, ruido, redes sociales)' },
  { key: 'mindset', label: 'Estar en estado emocional neutral, enfocado y paciente' },
  { key: 'exit', label: 'Tener el plan de salida (Stop/Target) claro para cada trade' },
]

export function FlightPlanChecklist({ items, onToggle }: Props) {
  const completedCount = Object.values(items).filter(Boolean).length
  const progressPct = (completedCount / CHECKLIST_ITEMS.length) * 100

  return (
    <div className="fp-checklist">
      <div className="fp-checklist__header">
        <h3 className="fp-section-title">CHECKLIST PRE-SESIÓN</h3>
        <span className="fp-checklist__progress">{completedCount}/{CHECKLIST_ITEMS.length}</span>
      </div>

      <div className="fp-checklist__bar-bg">
        <div 
          className="fp-checklist__bar-fill" 
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="fp-checklist__items">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = items[item.key]
          return (
            <div 
              key={item.key} 
              className={`fp-checklist-item ${isDone ? 'fp-checklist-item--done' : ''}`}
              onClick={() => onToggle(item.key)}
            >
              {isDone ? (
                <CheckCircle2 size={16} className="fp-checklist-item__icon fp-checklist-item__icon--done" />
              ) : (
                <Circle size={16} className="fp-checklist-item__icon" />
              )}
              <span className="fp-checklist-item__label">{item.label}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        .fp-checklist {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px;
        }
        .fp-checklist__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .fp-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin: 0;
        }
        .fp-checklist__progress {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-primary);
        }
        .fp-checklist__bar-bg {
          height: 4px;
          background: var(--bg-elevated);
          border-radius: 2px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .fp-checklist__bar-fill {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.3s ease;
        }
        .fp-checklist__items {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fp-checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .fp-checklist-item:hover {
          background: var(--bg-hover);
          border-color: var(--border-subtle);
        }
        .fp-checklist-item--done {
          opacity: 0.6;
        }
        .fp-checklist-item__icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .fp-checklist-item__icon--done {
          color: var(--color-profit);
        }
        .fp-checklist-item__label {
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .fp-checklist-item--done .fp-checklist-item__label {
          text-decoration: line-through;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
