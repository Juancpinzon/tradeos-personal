// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanForm.tsx
// Formulario principal de configuración del plan de vuelo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { LayoutGrid, Globe, Bitcoin, Info } from 'lucide-react'
import { FlightPlanRules } from './FlightPlanRules'
import { FlightPlanChecklist } from './FlightPlanChecklist'
import { FlightPlanCandidates } from './FlightPlanCandidates'
import { FlightPlanSummary } from './FlightPlanSummary'
import { FlightPlanCandidateModal } from './FlightPlanCandidateModal'
import { FlightPlanSwing } from './FlightPlanSwing'
import type { FlightPlan, FlightPlanCandidate, Position } from '../../types'

interface Props {
  plan: FlightPlan | null
  lastPlan?: FlightPlan | null
  positions: Position[]
  onInit: (market: 'NYSE' | 'crypto' | 'both') => void
  onUpdate: (updates: Partial<FlightPlan>) => void
  onAddCandidate: (candidate: Partial<FlightPlanCandidate>) => void
  onDeleteCandidate: (id: string) => void
  onNavigateToResearch: (symbol: string) => void
  isInitializing?: boolean
}

export function FlightPlanForm({ 
  plan, 
  lastPlan, 
  positions,
  onInit, 
  onUpdate, 
  onAddCandidate,
  onDeleteCandidate,
  onNavigateToResearch,
  isInitializing 
}: Props) {
  const [showSummary, setShowSummary] = useState(false)
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  
  if (!plan) {
    return (
      <div className="fp-init">
        <div className="fp-init__header">
          <h2 className="fp-init__title">PREPARAR PLAN DE VUELO</h2>
          <p className="fp-init__desc">Seleccioná el mercado en el que vas a operar hoy para comenzar.</p>
        </div>

        <div className="fp-init__options">
          <button className="fp-init-card" onClick={() => onInit('NYSE')} disabled={isInitializing}>
            <Globe className="fp-init-card__icon" />
            <span className="fp-init-card__label">NYSE / NASDAQ</span>
            <span className="fp-init-card__hint">Stocks & ETFs</span>
          </button>
          <button className="fp-init-card" onClick={() => onInit('crypto')} disabled={isInitializing}>
            <Bitcoin className="fp-init-card__icon" />
            <span className="fp-init-card__label">CRIPTO</span>
            <span className="fp-init-card__hint">Binance Spot</span>
          </button>
          <button className="fp-init-card" onClick={() => onInit('both')} disabled={isInitializing}>
            <LayoutGrid className="fp-init-card__icon" />
            <span className="fp-init-card__label">AMBOS</span>
            <span className="fp-init-card__hint">Multimercado</span>
          </button>
        </div>

        {lastPlan?.daily_lesson && (
          <div className="fp-init__lesson">
            <div className="fp-init__lesson-header">
              <Info size={14} />
              <span>LECCIÓN DE LA SESIÓN ANTERIOR</span>
            </div>
            <p className="fp-init__lesson-text">"{lastPlan.daily_lesson}"</p>
          </div>
        )}

        <style>{`
          .fp-init {
            max-width: 600px;
            margin: 60px auto;
            text-align: center;
          }
          .fp-init__title {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
            color: var(--text-primary);
          }
          .fp-init__desc {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 40px;
          }
          .fp-init__options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .fp-init-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .fp-init-card:hover:not(:disabled) {
            border-color: var(--color-primary);
            background: var(--bg-hover);
            transform: translateY(-2px);
          }
          .fp-init-card__icon {
            width: 32px;
            height: 32px;
            color: var(--color-primary);
          }
          .fp-init-card__label {
            font-weight: 700;
            font-size: 0.9rem;
          }
          .fp-init-card__hint {
            font-size: 0.7rem;
            color: var(--text-muted);
          }
          .fp-init__lesson {
            margin-top: 60px;
            padding: 20px;
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.1);
            border-radius: 12px;
            text-align: left;
          }
          .fp-init__lesson-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--color-profit);
            margin-bottom: 8px;
          }
          .fp-init__lesson-text {
            font-style: italic;
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.5;
          }
        `}</style>
      </div>
    )
  }

  const handleChecklistToggle = (key: string) => {
    const newItems = { ...plan.checklist_items, [key]: !plan.checklist_items[key] }
    onUpdate({ checklist_items: newItems })
  }

  return (
    <div className="fp-form">
      <div className="fp-form__layout">
        
        {/* Columna Izquierda: Contexto y Reglas */}
        <div className="fp-form__col">
          <div className="fp-print-actions no-print">
            <button className="fp-btn fp-btn--secondary" onClick={() => window.print()}>
              📥 EXPORTAR PDF (PRO)
            </button>
          </div>

          <section className="fp-section">
            <h3 className="fp-section-title">CONTEXTO DEL DÍA</h3>
            <div className="fp-context-grid">
              <div className="fp-field">
                <label>SPY Close Ayer</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={plan.spy_close_yesterday || ''} 
                  onChange={e => onUpdate({ spy_close_yesterday: parseFloat(e.target.value) })}
                />
              </div>
              <div className="fp-field">
                <label>Nivel VIX</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={plan.vix_level || ''} 
                  onChange={e => onUpdate({ vix_level: parseFloat(e.target.value) })}
                />
              </div>
              <div className="fp-field">
                <label>Bias del Mercado</label>
                <select 
                  value={plan.market_bias || ''} 
                  onChange={e => onUpdate({ market_bias: e.target.value as any })}
                >
                  <option value="neutral">Neutral</option>
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                </select>
              </div>
            </div>
            
            <div className="fp-field fp-field--full" style={{ marginTop: '12px' }}>
              <label>Noticias Relevantes</label>
              <textarea 
                rows={2}
                value={plan.pre_market_news || ''}
                onChange={e => onUpdate({ pre_market_news: e.target.value })}
                placeholder="CPI a las 8:30, Apple reporta al cierre..."
              />
            </div>
          </section>

          <section className="fp-section">
            <FlightPlanRules 
              maxDailyLoss={plan.max_daily_loss}
              maxOperations={plan.max_operations}
              marketBias={plan.market_bias}
            />
          </section>

          <section className="fp-section">
            <FlightPlanSwing positions={positions} />
          </section>

          <section className="fp-section">
            <FlightPlanChecklist 
              items={plan.checklist_items}
              onToggle={handleChecklistToggle}
            />
          </section>
        </div>

        {/* Columna Derecha: Candidatos */}
        <div className="fp-form__col">
          <FlightPlanCandidates 
            candidates={plan.candidates || []}
            onAdd={() => setShowCandidateModal(true)}
            onDelete={onDeleteCandidate}
            onNavigateToResearch={onNavigateToResearch}
          />
          
          <div className="fp-summary-teaser">
            <h3 className="fp-section-title">CIERRE DE SESIÓN</h3>
            <p className="fp-summary-teaser__desc">
              Al finalizar tu jornada de trading, completa el resumen para registrar tu PnL, 
              estado emocional y la lección del día.
            </p>
            <button className="fp-btn fp-btn--secondary" onClick={() => setShowSummary(true)}>CERRAR SESIÓN</button>
          </div>
        </div>

      </div>

      {showSummary && (
        <FlightPlanSummary 
          plan={plan} 
          onSave={onUpdate} 
          onClose={() => setShowSummary(false)} 
        />
      )}

      {showCandidateModal && (
        <FlightPlanCandidateModal 
          onAdd={onAddCandidate} 
          onClose={() => setShowCandidateModal(false)} 
        />
      )}

      <style>{`
        .fp-form {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        .fp-form__layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
        }
        @media (max-width: 1000px) {
          .fp-form__layout { grid-template-columns: 1fr; }
        }
        .fp-form__col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .fp-section {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px;
        }
        .fp-context-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .fp-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fp-field label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .fp-field input, .fp-field select, .fp-field textarea {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 0.85rem;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .fp-field input:focus, .fp-field select:focus, .fp-field textarea:focus {
          border-color: var(--color-primary);
        }
        .fp-summary-teaser {
          margin-top: auto;
          padding: 24px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          text-align: center;
        }
        .fp-summary-teaser__desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 12px 0 20px;
          line-height: 1.5;
        }
        .fp-btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .fp-btn--secondary {
          background: var(--bg-elevated);
          border-color: var(--border-subtle);
          color: var(--text-primary);
        }
        .fp-btn--secondary:hover {
          background: var(--bg-hover);
          border-color: var(--color-primary);
        }

        @page {
          size: A4 landscape;
          margin: 15mm 20mm 15mm 20mm;
        }

        @media print {
          .no-print, #sidebar-toggle, .fp-summary-teaser, .fp-init__options, .nav-link, aside, header {
            display: none !important;
          }
          * {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .fp-form {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            min-width: 0 !important;
          }
          .fp-form__layout {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .fp-form__col {
            min-width: 0 !important;
            overflow: hidden !important;
          }
          .fp-section {
            border: 1px solid #ddd !important;
            background: white !important;
            page-break-inside: avoid !important;
            padding: 10px 12px !important;
            margin-bottom: 10px !important;
            border-radius: 4px !important;
          }
          .fp-section-title {
            font-size: 10px !important;
            font-weight: 700 !important;
            color: #333 !important;
            border-bottom: 1.5px solid #333 !important;
            margin-bottom: 8px !important;
            padding-bottom: 4px !important;
          }
          /* Tabla de contexto: primera columna fija 160px */
          .fp-context-grid {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .fp-context-grid .fp-field {
            display: table-row !important;
          }
          .fp-context-grid .fp-field label {
            display: table-cell !important;
            width: 160px !important;
            min-width: 160px !important;
            max-width: 160px !important;
            padding: 4px 8px 4px 0 !important;
            vertical-align: middle !important;
            font-weight: 600 !important;
            color: #555 !important;
            white-space: nowrap !important;
          }
          .fp-context-grid .fp-field input,
          .fp-context-grid .fp-field select {
            display: table-cell !important;
            width: auto !important;
            padding: 3px 6px !important;
            border: 1px solid #ccc !important;
            color: black !important;
            background: white !important;
          }
          .fp-field--full label { color: #555 !important; }
          .fp-field label { color: #666 !important; }
          .fp-field input, .fp-field select, .fp-field textarea {
            border: 1px solid #ccc !important;
            color: black !important;
            background: white !important;
            padding: 3px 6px !important;
          }
          .fp-progress-bar-bg { border: 1px solid #ddd !important; }
          .fp-progress-bar-fill { background: #3b82f6 !important; }
          /* Evitar overflow de texto largo */
          input, select, textarea, p, span, label {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
        }
      `}</style>
    </div>
  )
}
