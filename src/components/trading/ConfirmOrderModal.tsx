// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/ConfirmOrderModal.tsx
// Modal obligatorio antes de ejecutar cualquier orden.
// Fondo --bg-elevated, datos en tabla limpia, microanimación scale 0.97→1 150ms.
// Confirmar: verde si BUY, rojo si SELL. NUNCA omitir este modal.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { X, AlertTriangle, TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { formatCurrency, formatPercent, formatQty } from '../../lib/formatters'
import type { OrderDraft } from './OrderForm'
import type { UserSettings } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmOrderModalProps {
  draft: OrderDraft
  totalEquity: number
  portfolioWeightAtOrder: number | null  // % peso actual en el símbolo
  userSettings: UserSettings
  isSubmitting: boolean
  onConfirm: (tradeType: 'intraday' | 'swing') => void
  onCancel: () => void
  suggestedTradeType?: 'intraday' | 'swing' | null
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ConfirmOrderModal({
  draft,
  totalEquity,
  portfolioWeightAtOrder,
  userSettings,
  isSubmitting: isSubmittingProp,
  onConfirm,
  onCancel,
  suggestedTradeType,
}: ConfirmOrderModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [tradeType, setTradeType] = useState<'intraday' | 'swing' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Lock síncrono: bloquea un segundo submit en el mismo tick, antes de que
  // React vuelva a renderizar y aplique `disabled` (el estado por sí solo puede
  // leerse obsoleto en dos clicks rápidos). Solo se libera si la orden falla.
  const submitLockRef = useRef(false)

  useEffect(() => {
    if (suggestedTradeType) {
      setTradeType(suggestedTradeType)
    }
  }, [suggestedTradeType])

  // Reset local submitting when parent signals it's done (e.g. on error, modal stays open)
  useEffect(() => {
    if (!isSubmittingProp) {
      setIsSubmitting(false)
      submitLockRef.current = false
    }
  }, [isSubmittingProp])

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmittingProp && !isSubmitting) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isSubmittingProp, isSubmitting, onCancel])

  // Cerrar click fuera del modal
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !isSubmittingProp && !isSubmitting) onCancel()
  }

  // ── Calcular métricas ────────────────────────────────────────────────────

  const entryPrice = draft.estimated_price ?? draft.limit_price ?? 0
  const stopLoss = draft.stop_loss ?? 0
  const target = draft.target

  const stopDistance = draft.side === 'buy'
    ? entryPrice - stopLoss
    : stopLoss - entryPrice

  const capitalAtRisk = stopDistance > 0 ? draft.qty * stopDistance : null
  const capitalAtRiskPct = capitalAtRisk && totalEquity > 0
    ? (capitalAtRisk / totalEquity) * 100
    : null

  const positionValue = draft.qty * entryPrice
  const positionPct = totalEquity > 0 ? (positionValue / totalEquity) * 100 : 0

  const rrRatio = target && stopDistance > 0
    ? (() => {
        const reward = draft.side === 'buy' ? target - entryPrice : entryPrice - target
        return reward > 0 ? reward / stopDistance : null
      })()
    : null

  const exceedsMax = positionPct > userSettings.max_position_size_pct

  const isBuy = draft.side === 'buy'

  // Tipo de orden legible
  const orderTypeLabel: Record<OrderDraft['order_type'], string> = {
    market: 'Market',
    limit: 'Limit',
    stop: 'Stop',
    stop_limit: 'Stop Limit',
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar orden"
    >
      <div className={`modal-box ${(isSubmittingProp || isSubmitting) ? 'modal-box--submitting' : ''}`}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__left">
            {isBuy
              ? <TrendingUp size={15} style={{ color: 'var(--color-profit)' }} />
              : <TrendingDown size={15} style={{ color: 'var(--color-loss)' }} />
            }
            <span className="modal-header__title">CONFIRMAR ORDEN</span>
            <span className={`modal-header__side ${isBuy ? 'side-buy' : 'side-sell'}`}>
              {isBuy ? 'COMPRA' : 'VENTA'}
            </span>
          </div>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={isSubmittingProp || isSubmitting}
            aria-label="Cancelar"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabla de resumen */}
        <div className="modal-body">
          <table className="modal-table">
            <tbody>
              <tr>
                <td className="modal-table__label">Símbolo</td>
                <td className="modal-table__value font-mono">{draft.symbol}</td>
              </tr>
              <tr>
                <td className="modal-table__label">Tipo</td>
                <td className="modal-table__value">{orderTypeLabel[draft.order_type]}</td>
              </tr>
              <tr>
                <td className="modal-table__label">Cantidad</td>
                <td className="modal-table__value font-mono">{formatQty(draft.qty)} acciones</td>
              </tr>
              {entryPrice > 0 && (
                <tr>
                  <td className="modal-table__label">Precio estimado</td>
                  <td className="modal-table__value font-mono">{formatCurrency(entryPrice)}</td>
                </tr>
              )}
              {draft.order_type === 'market' && (
                <tr>
                  <td className="modal-table__label"></td>
                  <td className="modal-table__value" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                    Precio market al momento de ejecución
                  </td>
                </tr>
              )}
              <tr>
                <td className="modal-table__label">Valor posición</td>
                <td className="modal-table__value font-mono">
                  {entryPrice > 0 ? formatCurrency(positionValue) : '—'}
                  {positionPct > 0 && (
                    <span className="modal-table__sub">
                      {formatPercent(positionPct, false)} del portafolio
                    </span>
                  )}
                </td>
              </tr>
              {portfolioWeightAtOrder !== null && (
                <tr>
                  <td className="modal-table__label">Peso actual {draft.symbol}</td>
                  <td className="modal-table__value font-mono">
                    {formatPercent(portfolioWeightAtOrder, false)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="modal-table__label">Stop loss</td>
                <td className="modal-table__value font-mono" style={{ color: 'var(--color-warning)' }}>
                  {stopLoss > 0 ? formatCurrency(stopLoss) : '—'}
                  {stopDistance > 0 && (
                    <span className="modal-table__sub">
                      -{formatPercent((stopDistance / entryPrice) * 100, false)} desde entrada
                    </span>
                  )}
                </td>
              </tr>
              {target && target > 0 && (
                <tr>
                  <td className="modal-table__label">Target</td>
                  <td className="modal-table__value font-mono" style={{ color: 'var(--color-profit)' }}>
                    {formatCurrency(target)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Sección de riesgo */}
          {capitalAtRisk !== null && (
            <div className="modal-risk">
              <div className="modal-risk__header">
                <Shield size={12} />
                ANÁLISIS DE RIESGO
              </div>
              <div className="modal-risk__grid">
                <div className="modal-risk__item">
                  <span className="modal-risk__label">
                    {draft.side === 'sell' ? 'Posición protegida' : 'Capital en riesgo'}
                  </span>
                  <span className="modal-risk__value font-mono" style={{ color: draft.side === 'sell' ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                    {formatCurrency(capitalAtRisk)}
                    {draft.side === 'sell' ? (
                      <span className="modal-risk__sub">Esta orden protege tu posición existente</span>
                    ) : (
                      capitalAtRiskPct !== null && (
                        <span className="modal-risk__sub">{formatPercent(capitalAtRiskPct, false)} del equity</span>
                      )
                    )}
                  </span>
                </div>
                {rrRatio !== null && (
                  <div className="modal-risk__item">
                    <span className="modal-risk__label">R/R ratio</span>
                    <span
                      className="modal-risk__value font-mono"
                      style={{ color: rrRatio >= 2 ? 'var(--color-profit)' : rrRatio >= 1 ? 'var(--color-warning)' : 'var(--color-loss)' }}
                    >
                      1:{rrRatio.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advertencia de posición excesiva */}
          {exceedsMax && (
            <div className="modal-warning">
              <AlertTriangle size={14} />
              <div>
                <strong>LÍMITE DE POSICIÓN EXCEDIDO</strong>
                <p>
                  Esta orden representa el {formatPercent(positionPct, false)} del portafolio,
                  superando tu límite configurado de {formatPercent(userSettings.max_position_size_pct, false)}.
                  Considerá reducir la cantidad antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* Selector obligatorio de trade_type */}
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            marginTop: '8px',
            marginBottom: '4px'
          }}>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08rem', marginBottom: '8px' }}>
              TIPO DE OPERACIÓN <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['intraday', 'swing'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTradeType(type)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${tradeType === type ? (type === 'intraday' ? 'var(--color-primary)' : '#a855f7') : 'var(--border-default)'}`,
                    backgroundColor: tradeType === type ? (type === 'intraday' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)') : 'transparent',
                    color: tradeType === type ? (type === 'intraday' ? 'var(--color-primary)' : '#c084fc') : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {type === 'intraday' ? 'INTRADAY' : 'SWING'}
                </button>
              ))}
            </div>
            {!tradeType && (
              <span style={{ display: 'block', fontSize: '0.62rem', color: '#ef4444', marginTop: '6px' }}>
                Seleccioná el tipo de trade para habilitar la confirmación
              </span>
            )}
          </div>

          {/* Modo paper */}
          <div className="modal-paper-notice">
            <span className="badge badge-paper">PAPER TRADING</span>
            <span>Esta orden se ejecutará en modo simulación</span>
          </div>
        </div>

        {/* Footer — botones */}
        <div className="modal-footer">
          <button
            id="modal-cancel-btn"
            className="modal-btn modal-btn--cancel"
            onClick={onCancel}
            disabled={isSubmittingProp || isSubmitting}
            type="button"
          >
            Cancelar
          </button>
          <button
            id="modal-confirm-btn"
            className={`modal-btn ${isBuy ? 'modal-btn--buy' : 'modal-btn--sell'}`}
            onClick={() => {
              // submitLockRef bloquea de forma síncrona el doble submit; el
              // chequeo de estado cubre el re-render posterior.
              if (submitLockRef.current || !tradeType || isSubmitting || isSubmittingProp) return
              submitLockRef.current = true
              setIsSubmitting(true)
              onConfirm(tradeType)
            }}
            disabled={isSubmittingProp || isSubmitting || !tradeType}
            type="button"
          >
            {(isSubmittingProp || isSubmitting) ? (
              <>
                <span className="modal-spinner" />
                Enviando...
              </>
            ) : (
              <>
                {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                Confirmar {isBuy ? 'Compra' : 'Venta'}
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: overlayIn 150ms ease-out;
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-box {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          animation: modalIn 150ms ease-out;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-box--submitting {
          pointer-events: none;
          opacity: 0.85;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-default);
          background: rgba(255,255,255,0.02);
        }
        .modal-header__left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-header__title {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }
        .modal-header__side {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .side-buy {
          background: rgba(16, 185, 129, 0.12);
          color: var(--color-profit);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .side-sell {
          background: rgba(239, 68, 68, 0.12);
          color: var(--color-loss);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 150ms ease, background 150ms ease;
        }
        .modal-close:hover:not(:disabled) {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .modal-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-table {
          width: 100%;
          border-collapse: collapse;
        }
        .modal-table tr {
          border-bottom: 1px solid var(--border-subtle);
        }
        .modal-table tr:last-child {
          border-bottom: none;
        }
        .modal-table__label {
          padding: 7px 0;
          font-size: 0.72rem;
          color: var(--text-muted);
          width: 45%;
          vertical-align: top;
        }
        .modal-table__value {
          padding: 7px 0;
          font-size: 0.82rem;
          color: var(--text-primary);
          font-weight: 500;
          vertical-align: top;
        }
        .modal-table__sub {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          font-family: "IBM Plex Mono", monospace;
          margin-top: 2px;
          font-weight: 400;
        }
        .modal-risk {
          background: rgba(239, 68, 68, 0.04);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 6px;
          overflow: hidden;
        }
        .modal-risk__header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          background: rgba(239, 68, 68, 0.06);
          border-bottom: 1px solid rgba(239, 68, 68, 0.12);
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-loss);
        }
        .modal-risk__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .modal-risk__item {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-right: 1px solid rgba(239, 68, 68, 0.1);
        }
        .modal-risk__item:last-child {
          border-right: none;
        }
        .modal-risk__label {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .modal-risk__value {
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .modal-risk__sub {
          font-size: 0.62rem;
          color: var(--text-muted);
          font-family: "IBM Plex Mono", monospace;
          font-weight: 400;
        }
        .modal-warning {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 6px;
          color: var(--color-warning);
        }
        .modal-warning svg { flex-shrink: 0; margin-top: 1px; }
        .modal-warning strong {
          display: block;
          font-size: 0.65rem;
          letter-spacing: 0.07em;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .modal-warning p {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .modal-paper-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .modal-footer {
          display: flex;
          gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid var(--border-default);
          background: rgba(255,255,255,0.01);
        }
        .modal-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: opacity 150ms ease, transform 80ms ease;
          border: 1px solid transparent;
        }
        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .modal-btn:not(:disabled):active { transform: scale(0.985); }
        .modal-btn--cancel {
          background: var(--bg-hover);
          color: var(--text-secondary);
          border-color: var(--border-default);
          flex: 0 0 38%;
        }
        .modal-btn--cancel:hover:not(:disabled) {
          color: var(--text-primary);
        }
        .modal-btn--buy {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-profit);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .modal-btn--buy:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.25);
        }
        .modal-btn--sell {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-loss);
          border-color: rgba(239, 68, 68, 0.35);
        }
        .modal-btn--sell:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }
        .modal-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
