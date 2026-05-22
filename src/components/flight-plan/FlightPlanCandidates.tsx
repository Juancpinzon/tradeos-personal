// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanCandidates.tsx
// Gestión de los 3 candidatos principales del día
// ─────────────────────────────────────────────────────────────────────────────

import { Plus, Trash2, ExternalLink } from 'lucide-react'
import type { FlightPlanCandidate } from '../../types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  candidates: FlightPlanCandidate[]
  onAdd: () => void
  onDelete: (id: string) => void
  onNavigateToResearch: (symbol: string) => void
}

export function FlightPlanCandidates({ candidates, onAdd, onDelete, onNavigateToResearch }: Props) {
  const slots = [0, 1, 2]

  return (
    <div className="fp-candidates">
      <div className="fp-candidates__header">
        <h3 className="fp-section-title">CANDIDATOS DEL DÍA (MÁX. 3)</h3>
        <span className="fp-candidates__count">{candidates.length}/3</span>
      </div>

      <div className="fp-candidates__grid">
        {slots.map(i => {
          const candidate = candidates[i]
          
          if (!candidate) {
            return (
              <button 
                key={`empty-${i}`}
                className="fp-candidate-card fp-candidate-card--empty"
                onClick={onAdd}
                disabled={candidates.length >= 3}
              >
                <div className="fp-candidate-card__add-icon">
                  <Plus size={20} />
                </div>
                <span>Agregar Candidato</span>
              </button>
            )
          }

          return (
            <div key={candidate.id} className="fp-candidate-card">
              <div className="fp-candidate-card__header">
                <div className="fp-candidate-card__symbol-info">
                  <span className="fp-candidate-card__symbol">{candidate.symbol}</span>
                  <span className="fp-candidate-card__setup">
                    {candidate.setup_type.toUpperCase()} • {candidate.trade_type.toUpperCase()}
                  </span>
                </div>
                <div className="fp-candidate-card__actions">
                  <button 
                    className="fp-icon-btn" 
                    onClick={() => onNavigateToResearch(candidate.symbol)}
                    title="Ver en Research"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button 
                    className="fp-icon-btn fp-icon-btn--danger" 
                    onClick={() => onDelete(candidate.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="fp-candidate-card__thesis">
                {candidate.entry_thesis || 'Sin tesis definida...'}
              </div>

              <div className="fp-candidate-card__levels">
                <div className="fp-level">
                  <span className="fp-level__label">ENTRY</span>
                  <span className="fp-level__value">{formatCurrency(candidate.current_price || 0)}</span>
                </div>
                <div className="fp-level">
                  <span className="fp-level__label">STOP</span>
                  <span className="fp-level__value fp-level__value--stop">{formatCurrency(candidate.stop_loss)}</span>
                </div>
                <div className="fp-level">
                  <span className="fp-level__label">TARGET</span>
                  <span className="fp-level__value fp-level__value--target">{formatCurrency(candidate.target)}</span>
                </div>
              </div>

              <div className="fp-candidate-card__footer">
                <span className="fp-candidate-card__rr">
                  R/R: <strong>{candidate.risk_reward?.toFixed(2) || '0.00'}</strong>
                </span>
                {candidate.executed && (
                  <span className="badge badge-success">EJECUTADO</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .fp-candidates {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fp-candidates__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .fp-candidates__count {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .fp-candidates__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .fp-candidate-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          transition: border-color 0.2s ease;
        }
        .fp-candidate-card:hover {
          border-color: var(--border-default);
        }
        .fp-candidate-card--empty {
          border: 2px dashed var(--border-subtle);
          background: rgba(255,255,255,0.01);
          color: var(--text-muted);
          justify-content: center;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-height: 180px;
        }
        .fp-candidate-card--empty:hover:not(:disabled) {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: rgba(59, 130, 246, 0.05);
        }
        .fp-candidate-card--empty:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .fp-candidate-card__add-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-elevated);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fp-candidate-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .fp-candidate-card__symbol-info {
          display: flex;
          flex-direction: column;
        }
        .fp-candidate-card__symbol {
          font-size: 1.1rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .fp-candidate-card__setup {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--color-primary);
          letter-spacing: 0.05em;
        }
        .fp-candidate-card__actions {
          display: flex;
          gap: 6px;
        }
        .fp-icon-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-icon-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-default);
        }
        .fp-icon-btn--danger:hover {
          color: var(--color-loss);
          border-color: var(--color-loss);
          background: rgba(239, 68, 68, 0.1);
        }
        .fp-candidate-card__thesis {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-style: italic;
          line-height: 1.4;
          min-height: 2.8em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fp-candidate-card__levels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 10px;
          background: var(--bg-elevated);
          border-radius: 8px;
        }
        .fp-level {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .fp-level__label {
          font-size: 0.55rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .fp-level__value {
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .fp-level__value--stop { color: var(--color-loss); }
        .fp-level__value--target { color: var(--color-profit); }
        .fp-candidate-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .fp-candidate-card__rr {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .fp-candidate-card__rr strong {
          color: var(--text-primary);
          margin-left: 4px;
        }
      `}</style>
    </div>
  )
}
