// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/RiskCalculator.tsx
// Calculadora de riesgo en tiempo real: qty sugerida, capital en riesgo, R/R
// Todo en font-mono. Reactivo a cada cambio de input.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { AlertTriangle, TrendingDown, Target, Percent, DollarSign } from 'lucide-react'
import { formatCurrency, formatPercent, formatQty } from '../../lib/formatters'

// ─────────────────────────────────────────────────────────────────────────────

export interface RiskCalculatorProps {
  entryPrice: number | null
  stopLoss: number | null
  target: number | null
  totalEquity: number
  riskPct: number          // risk_per_trade_pct — ej: 2 = 2%
  maxPositionPct: number   // max_position_size_pct — ej: 15 = 15%
  side: 'buy' | 'sell'
}

interface CalcResult {
  suggestedQty: number | null
  capitalAtRisk: number | null
  capitalAtRiskPct: number | null
  positionValue: number | null
  positionPct: number | null
  rrRatio: number | null
  stopDistance: number | null
  stopDistancePct: number | null
  exceedsMaxPosition: boolean
}

function calculate(props: RiskCalculatorProps): CalcResult {
  const { entryPrice, stopLoss, target, totalEquity, riskPct, maxPositionPct, side } = props

  // Necesitamos mínimo: precio de entrada, stop, equity y riskPct > 0
  if (!entryPrice || !stopLoss || totalEquity <= 0 || riskPct <= 0) {
    return {
      suggestedQty: null,
      capitalAtRisk: null,
      capitalAtRiskPct: null,
      positionValue: null,
      positionPct: null,
      rrRatio: null,
      stopDistance: null,
      stopDistancePct: null,
      exceedsMaxPosition: false,
    }
  }

  // Distancia al stop (siempre positiva)
  const stopDistance = side === 'buy'
    ? entryPrice - stopLoss
    : stopLoss - entryPrice

  if (stopDistance <= 0) {
    return {
      suggestedQty: null,
      capitalAtRisk: null,
      capitalAtRiskPct: null,
      positionValue: null,
      positionPct: null,
      rrRatio: null,
      stopDistance: null,
      stopDistancePct: null,
      exceedsMaxPosition: false,
    }
  }

  const stopDistancePct = (stopDistance / entryPrice) * 100

  // Qty sugerida: (equity * riskPct/100) / distanciaAlStop
  const riskBudget = totalEquity * (riskPct / 100)
  const suggestedQty = Math.floor(riskBudget / stopDistance)

  if (suggestedQty <= 0) {
    return {
      suggestedQty: 0,
      capitalAtRisk: 0,
      capitalAtRiskPct: 0,
      positionValue: 0,
      positionPct: 0,
      rrRatio: null,
      stopDistance,
      stopDistancePct,
      exceedsMaxPosition: false,
    }
  }

  const capitalAtRisk = suggestedQty * stopDistance
  const capitalAtRiskPct = (capitalAtRisk / totalEquity) * 100
  const positionValue = suggestedQty * entryPrice
  const positionPct = (positionValue / totalEquity) * 100

  // R/R ratio: (target - entry) / (entry - stop)
  let rrRatio: number | null = null
  if (target !== null && target > 0) {
    const reward = side === 'buy'
      ? target - entryPrice
      : entryPrice - target
    if (reward > 0 && stopDistance > 0) {
      rrRatio = reward / stopDistance
    }
  }

  const exceedsMaxPosition = positionPct > maxPositionPct

  return {
    suggestedQty,
    capitalAtRisk,
    capitalAtRiskPct,
    positionValue,
    positionPct,
    rrRatio,
    stopDistance,
    stopDistancePct,
    exceedsMaxPosition,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RiskCalculator(props: RiskCalculatorProps) {
  const calc = useMemo(() => calculate(props), [
    props.entryPrice,
    props.stopLoss,
    props.target,
    props.totalEquity,
    props.riskPct,
    props.maxPositionPct,
    props.side,
  ])

  const isReady = calc.suggestedQty !== null && calc.suggestedQty > 0

  return (
    <div className="risk-calculator">
      <div className="risk-calculator__header">
        <TrendingDown size={13} />
        <span>RISK CALCULATOR</span>
        <span className="risk-calculator__badge">
          {props.riskPct}% POR OPERACIÓN
        </span>
      </div>

      {!props.entryPrice && (
        <div className="risk-calculator__empty">
          Ingresá precio de entrada y stop loss para calcular
        </div>
      )}

      {props.entryPrice && !props.stopLoss && (
        <div className="risk-calculator__empty">
          Stop loss requerido para calcular riesgo
        </div>
      )}

      {props.entryPrice && props.stopLoss && calc.stopDistance !== null && calc.stopDistance <= 0 && (
        <div className="risk-calculator__error">
          <AlertTriangle size={12} />
          Stop loss inválido — debe estar por {props.side === 'buy' ? 'debajo' : 'arriba'} del precio de entrada
        </div>
      )}

      {isReady && (
        <div className="risk-calculator__grid">
          {/* Qty sugerida */}
          <div className="risk-row">
            <div className="risk-row__label">
              <Target size={11} />
              Qty sugerida
            </div>
            <div className="risk-row__value font-mono">
              {formatQty(calc.suggestedQty!)}
            </div>
          </div>

          {/* Posición total */}
          <div className="risk-row">
            <div className="risk-row__label">
              <DollarSign size={11} />
              Valor posición
            </div>
            <div className="risk-row__value font-mono">
              {formatCurrency(calc.positionValue!)}
              <span className="risk-row__sub">
                {formatPercent(calc.positionPct!, false)} del portafolio
              </span>
            </div>
          </div>

          {/* Capital en riesgo */}
          <div className="risk-row risk-row--highlight">
            <div className="risk-row__label">
              <AlertTriangle size={11} />
              Capital en riesgo
            </div>
            <div className="risk-row__value font-mono risk-row__value--loss">
              {formatCurrency(calc.capitalAtRisk!)}
              <span className="risk-row__sub">
                {formatPercent(calc.capitalAtRiskPct!, false)} del equity
              </span>
            </div>
          </div>

          {/* Stop distance */}
          <div className="risk-row">
            <div className="risk-row__label">
              <Percent size={11} />
              Dist. al stop
            </div>
            <div className="risk-row__value font-mono" style={{ color: 'var(--color-warning)' }}>
              -{calc.stopDistancePct!.toFixed(2)}%
              <span className="risk-row__sub">
                {formatCurrency(calc.stopDistance!)} por acción
              </span>
            </div>
          </div>

          {/* R/R ratio */}
          {calc.rrRatio !== null && (
            <div className="risk-row">
              <div className="risk-row__label">
                <Target size={11} />
                R/R ratio
              </div>
              <div
                className="risk-row__value font-mono"
                style={{ color: calc.rrRatio >= 2 ? 'var(--color-profit)' : calc.rrRatio >= 1 ? 'var(--color-warning)' : 'var(--color-loss)' }}
              >
                1:{calc.rrRatio.toFixed(2)}
                {calc.rrRatio >= 2 && <span style={{ color: 'var(--color-profit)', fontSize: '0.65rem', marginLeft: '4px' }}>✓ BUENO</span>}
                {calc.rrRatio < 1 && <span style={{ color: 'var(--color-loss)', fontSize: '0.65rem', marginLeft: '4px' }}>⚠ BAJO</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advertencia si supera max position size */}
      {calc.exceedsMaxPosition && (
        <div className="risk-calculator__warning">
          <AlertTriangle size={13} />
          <div>
            <strong>POSICIÓN EXCEDE EL MÁXIMO</strong>
            <span>
              {formatPercent(calc.positionPct!, false)} del portafolio supera el límite de {formatPercent(props.maxPositionPct, false)}.
              Reducí la qty o ajustá tu configuración de riesgo.
            </span>
          </div>
        </div>
      )}

      <style>{`
        .risk-calculator {
          background: var(--bg-base);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          overflow: hidden;
        }
        .risk-calculator__header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(59, 130, 246, 0.06);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-primary);
        }
        .risk-calculator__badge {
          margin-left: auto;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 0.6rem;
          color: var(--color-primary);
        }
        .risk-calculator__empty {
          padding: 16px 12px;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
        }
        .risk-calculator__error {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          font-size: 0.72rem;
          color: var(--color-loss);
          background: rgba(239, 68, 68, 0.06);
        }
        .risk-calculator__grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .risk-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle);
          gap: 8px;
        }
        .risk-row:last-child {
          border-bottom: none;
        }
        .risk-row--highlight {
          background: rgba(239, 68, 68, 0.04);
        }
        .risk-row__label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: var(--text-muted);
          min-width: 100px;
        }
        .risk-row__value {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          text-align: right;
        }
        .risk-row__value--loss {
          color: var(--color-loss);
        }
        .risk-row__sub {
          font-size: 0.65rem;
          font-weight: 400;
          color: var(--text-muted);
          font-family: "IBM Plex Mono", monospace;
        }
        .risk-calculator__warning {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.08);
          border-top: 1px solid rgba(245, 158, 11, 0.2);
          color: var(--color-warning);
          font-size: 0.72rem;
        }
        .risk-calculator__warning svg {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .risk-calculator__warning div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .risk-calculator__warning strong {
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .risk-calculator__warning span {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
