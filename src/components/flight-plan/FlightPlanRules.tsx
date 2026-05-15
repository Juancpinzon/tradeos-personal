// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanRules.tsx
// Visualización de reglas de gestión de riesgo del día
// ─────────────────────────────────────────────────────────────────────────────

import { AlertTriangle, ShieldCheck, Target } from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  maxDailyLoss?: number
  maxOperations: number
  marketBias?: string
}

export function FlightPlanRules({ maxDailyLoss, maxOperations, marketBias }: Props) {
  return (
    <div className="fp-rules">
      <h3 className="fp-section-title">REGLAS DE GESTIÓN DE RIESGO</h3>
      
      <div className="fp-rules__grid">
        {/* Max Loss */}
        <div className="fp-rule-card fp-rule-card--danger">
          <div className="fp-rule-card__icon">
            <AlertTriangle size={18} />
          </div>
          <div className="fp-rule-card__content">
            <span className="fp-rule-card__label">STOP DIARIO MÁXIMO</span>
            <span className="fp-rule-card__value">
              {maxDailyLoss ? formatCurrency(maxDailyLoss) : '--'}
            </span>
            <span className="fp-rule-card__hint">3% del capital intradía</span>
          </div>
        </div>

        {/* Max Operations */}
        <div className="fp-rule-card fp-rule-card--info">
          <div className="fp-rule-card__icon">
            <ShieldCheck size={18} />
          </div>
          <div className="fp-rule-card__content">
            <span className="fp-rule-card__label">OPERACIONES MÁXIMAS</span>
            <span className="fp-rule-card__value">{maxOperations}</span>
            <span className="fp-rule-card__hint">Calidad sobre cantidad</span>
          </div>
        </div>

        {/* Market Bias */}
        <div className="fp-rule-card fp-rule-card--bias">
          <div className="fp-rule-card__icon">
            <Target size={18} />
          </div>
          <div className="fp-rule-card__content">
            <span className="fp-rule-card__label">BIAS DEL MERCADO</span>
            <span className={`fp-rule-card__value fp-rule-card__value--${marketBias}`}>
              {marketBias?.toUpperCase() || 'NEUTRAL'}
            </span>
            <span className="fp-rule-card__hint">Sentimiento dominante</span>
          </div>
        </div>
      </div>

      <style>{`
        .fp-rules {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fp-rules__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .fp-rule-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 14px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .fp-rule-card__icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fp-rule-card--danger .fp-rule-card__icon {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-loss);
        }
        .fp-rule-card--info .fp-rule-card__icon {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
        }
        .fp-rule-card--bias .fp-rule-card__icon {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
        }
        .fp-rule-card__content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fp-rule-card__label {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .fp-rule-card__value {
          font-size: 1.1rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .fp-rule-card__value--bullish { color: var(--color-profit); }
        .fp-rule-card__value--bearish { color: var(--color-loss); }
        .fp-rule-card__hint {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
