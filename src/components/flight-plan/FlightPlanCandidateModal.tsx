// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanCandidateModal.tsx
// Modal para agregar/editar candidato manualmente
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import type { FlightPlanCandidate } from '../../types'

interface Props {
  onAdd: (candidate: Partial<FlightPlanCandidate>) => void
  onClose: () => void
}

export function FlightPlanCandidateModal({ onAdd, onClose }: Props) {
  const [symbol, setSymbol] = useState('')
  const [setup, setSetup] = useState('breakout')
  const [price, setPrice] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [thesis, setThesis] = useState('')

  const handleSave = () => {
    const p = parseFloat(price) || 0
    const s = parseFloat(stop) || 0
    const t = parseFloat(target) || 0
    
    // Calcular RR
    const risk = Math.abs(p - s)
    const reward = Math.abs(t - p)
    const rr = risk > 0 ? reward / risk : 0

    onAdd({
      symbol: symbol.toUpperCase(),
      setup_type: setup,
      current_price: p,
      stop_loss: s,
      target: t,
      risk_reward: rr,
      entry_thesis: thesis
    })
    onClose()
  }

  const isValid = symbol.trim() && stop && target

  return (
    <div className="fp-summary-overlay">
      <div className="fp-summary-modal">
        <div className="fp-summary-modal__header">
          <div>
            <h2 className="fp-summary-modal__title">AGREGAR CANDIDATO</h2>
            <p className="fp-summary-modal__subtitle">Definí el plan técnico para este activo</p>
          </div>
          <button className="fp-summary-modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="fp-summary-modal__body">
          <div className="fp-summary-grid">
            <div className="fp-field">
              <label>Símbolo</label>
              <input 
                value={symbol} 
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL..."
                className="font-mono"
              />
            </div>
            <div className="fp-field">
              <label>Tipo de Setup</label>
              <select value={setup} onChange={e => setSetup(e.target.value)}>
                <option value="breakout">Breakout</option>
                <option value="pullback">Pullback</option>
                <option value="reversal">Reversal</option>
                <option value="earnings_play">Earnings Play</option>
                <option value="range">Range</option>
              </select>
            </div>
          </div>

          <div className="fp-summary-grid">
            <div className="fp-field">
              <label>Precio de Entrada</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="fp-field">
              <label>Stop Loss</label>
              <input type="number" step="0.01" value={stop} onChange={e => setStop(e.target.value)} />
            </div>
            <div className="fp-field">
              <label>Target</label>
              <input type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
          </div>

          <div className="fp-field">
            <label>Tesis de Entrada</label>
            <textarea 
              rows={2}
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="¿Por qué este activo hoy?"
            />
          </div>
        </div>

        <div className="fp-summary-modal__footer">
          <button className="fp-btn fp-btn--secondary" onClick={onClose}>CANCELAR</button>
          <button className="fp-btn fp-btn--primary" onClick={handleSave} disabled={!isValid}>
            <Save size={16} />
            AGREGAR
          </button>
        </div>
      </div>
    </div>
  )
}
