// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanSummary.tsx
// Panel de cierre de sesión: PnL, Lección y Estado Emocional
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { X, Save, TrendingUp, TrendingDown, Target, Brain } from 'lucide-react'
import type { FlightPlan } from '../../types'

interface Props {
  plan: FlightPlan
  onSave: (updates: Partial<FlightPlan>) => Promise<void> | void
  onClose: () => void
}

export function FlightPlanSummary({ plan, onSave, onClose }: Props) {
  const [pnl, setPnl] = useState(plan.pnl_total?.toString() || '')
  const [won, setWon] = useState(plan.trades_won.toString())
  const [lost, setLost] = useState(plan.trades_lost.toString())
  const [lesson, setLesson] = useState(plan.daily_lesson || '')
  const [followed, setFollowed] = useState<FlightPlan['followed_plan']>(plan.followed_plan || 'yes')
  const [emotion, setEmotion] = useState<FlightPlan['emotional_state_close']>(plan.emotional_state_close || 'satisfied')

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        pnl_total: parseFloat(pnl) || 0,
        trades_won: parseInt(won) || 0,
        trades_lost: parseInt(lost) || 0,
        daily_lesson: lesson.trim(),
        followed_plan: followed,
        emotional_state_close: emotion
      })
      onClose()
    } catch (err) {
      console.error('[FlightPlanSummary] handleSave error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fp-summary-overlay">
      <div className="fp-summary-modal">
        <div className="fp-summary-modal__header">
          <div>
            <h2 className="fp-summary-modal__title">CIERRE DE SESIÓN</h2>
            <p className="fp-summary-modal__subtitle">Registrá los resultados finales de hoy</p>
          </div>
          <button className="fp-summary-modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="fp-summary-modal__body">
          {/* Resultados Numéricos */}
          <div className="fp-summary-grid">
            <div className="fp-field">
              <label><TrendingUp size={12} /> PnL Total del Día</label>
              <input 
                type="number" 
                step="0.01" 
                value={pnl} 
                onChange={e => setPnl(e.target.value)}
                placeholder="$ 0.00"
                className="font-mono"
              />
            </div>
            <div className="fp-field">
              <label><Target size={12} /> Trades Ganados</label>
              <input 
                type="number" 
                value={won} 
                onChange={e => setWon(e.target.value)}
              />
            </div>
            <div className="fp-field">
              <label><TrendingDown size={12} /> Trades Perdidos</label>
              <input 
                type="number" 
                value={lost} 
                onChange={e => setLost(e.target.value)}
              />
            </div>
          </div>

          {/* Lección y Plan */}
          <div className="fp-field">
            <label><Brain size={12} /> Lección del Día (Obligatorio)</label>
            <textarea 
              rows={3}
              value={lesson}
              onChange={e => setLesson(e.target.value)}
              placeholder="¿Qué aprendiste hoy? ¿Qué error no querés repetir?"
            />
          </div>

          <div className="fp-summary-grid">
            <div className="fp-field">
              <label>¿Seguiste tu plan?</label>
              <select value={followed} onChange={e => setFollowed(e.target.value as any)}>
                <option value="yes">Sí, al 100%</option>
                <option value="partial">Parcialmente</option>
                <option value="no">No lo seguí</option>
              </select>
            </div>
            <div className="fp-field">
              <label>Estado Emocional al Cierre</label>
              <select value={emotion} onChange={e => setEmotion(e.target.value as any)}>
                <option value="satisfied">Satisfecho / En Paz</option>
                <option value="neutral">Neutral</option>
                <option value="frustrated">Frustrado</option>
                <option value="anxious">Ansioso</option>
                <option value="overexcited">Eufórico</option>
              </select>
            </div>
          </div>
        </div>

        <div className="fp-summary-modal__footer">
          <button className="fp-btn fp-btn--secondary" onClick={onClose}>CANCELAR</button>
          <button
            className="fp-btn fp-btn--primary"
            onClick={handleSave}
            disabled={!lesson.trim() || isSaving}
          >
            <Save size={16} />
            {isSaving ? 'GUARDANDO...' : 'GUARDAR Y CERRAR'}
          </button>
        </div>
      </div>

      <style>{`
        .fp-summary-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .fp-summary-modal {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 540px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .fp-summary-modal__header {
          padding: 24px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .fp-summary-modal__title {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin: 0;
          color: var(--text-primary);
        }
        .fp-summary-modal__subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 4px 0 0;
        }
        .fp-summary-modal__close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .fp-summary-modal__body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .fp-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }
        .fp-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fp-field label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
        }
        .fp-field input, .fp-field select, .fp-field textarea {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
        }
        .fp-field input:focus, .fp-field select:focus, .fp-field textarea:focus {
          border-color: var(--color-primary);
        }
        .fp-summary-modal__footer {
          padding: 20px 24px;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          gap: 12px;
        }
        .fp-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .fp-btn--primary {
          background: var(--color-primary);
          border: none;
          color: white;
        }
        .fp-btn--primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .fp-btn--primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .fp-btn--secondary {
          background: transparent;
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
        }
        .fp-btn--secondary:hover {
          background: var(--bg-hover);
        }
      `}</style>
    </div>
  )
}
