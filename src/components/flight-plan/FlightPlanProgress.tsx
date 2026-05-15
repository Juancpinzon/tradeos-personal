import { CheckCircle2, Circle, Target } from 'lucide-react'
import type { FlightPlan } from '../../types'

interface Props {
  plan: FlightPlan
}

export function FlightPlanProgress({ plan }: Props) {
  const checklist = plan.checklist_items || {}
  const totalItems = Object.keys(checklist).length
  const completedItems = Object.values(checklist).filter(v => v === true).length
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  
  const hasCandidates = (plan.candidates?.length || 0) > 0
  const executedCandidates = plan.candidates?.filter(c => c.executed).length || 0

  return (
    <div className="fp-progress-widget">
      <div className="fp-progress-header">
        <Target size={16} className="text-primary" />
        <span className="fp-progress-title">PLAN DE VUELO: {plan.market?.toUpperCase()}</span>
        <span className="fp-progress-date">{plan.date}</span>
      </div>

      <div className="fp-progress-bar-container">
        <div className="fp-progress-bar-label">
          <span>Checklist de Pre-Sesión</span>
          <span>{completedItems}/{totalItems}</span>
        </div>
        <div className="fp-progress-bar-bg">
          <div className="fp-progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="fp-progress-stats">
        <div className="fp-stat-mini">
          <span className="fp-stat-mini__val">{plan.candidates?.length || 0}</span>
          <span className="fp-stat-mini__label">Candidatos</span>
        </div>
        <div className="fp-stat-mini">
          <span className="fp-stat-mini__val">{executedCandidates}</span>
          <span className="fp-stat-mini__label">Ejecutados</span>
        </div>
        <div className="fp-stat-mini">
          <span className="fp-stat-mini__val">{plan.max_operations || 0}</span>
          <span className="fp-stat-mini__label">Max Ops</span>
        </div>
      </div>

      {!hasCandidates && (
        <div className="fp-progress-hint">
          <Circle size={10} className="text-warning" />
          <span>No has definido candidatos para hoy aún.</span>
        </div>
      )}

      {progressPct === 100 && (
        <div className="fp-progress-hint text-profit">
          <CheckCircle2 size={12} />
          <span>¡Checklist completado! Estás listo para operar.</span>
        </div>
      )}

      <style>{`
        .fp-progress-widget {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fp-progress-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fp-progress-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.75rem;
          color: var(--text-primary);
          letter-spacing: 0.05em;
        }
        .fp-progress-date {
          margin-left: auto;
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .fp-progress-bar-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fp-progress-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .fp-progress-bar-bg {
          height: 6px;
          background: var(--bg-elevated);
          border-radius: 3px;
          overflow: hidden;
        }
        .fp-progress-bar-fill {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
        }
        .fp-progress-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .fp-stat-mini {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .fp-stat-mini__val {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .fp-stat-mini__label {
          font-size: 0.55rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
        }
        .fp-progress-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          color: var(--text-secondary);
          background: rgba(0,0,0,0.1);
          padding: 8px;
          border-radius: 6px;
        }
        .text-profit { color: var(--color-profit); }
        .text-warning { color: var(--color-warning); }
      `}</style>
    </div>
  )
}
