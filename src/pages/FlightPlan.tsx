// ─────────────────────────────────────────────────────────────────────────────
// src/pages/FlightPlan.tsx
// Página principal del Plan de Vuelo Diario
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlightPlan } from '../hooks/useFlightPlan'
import { usePortfolio } from '../hooks/usePortfolio'
import { FlightPlanForm } from '../components/flight-plan/FlightPlanForm'
import { Loader2 } from 'lucide-react'

export default function FlightPlan() {
  const navigate = useNavigate()
  const { 
    plan, 
    lastPlan, 
    isLoading: isPlanLoading, 
    initPlan, 
    updatePlan, 
    addCandidate,
    deleteCandidate, 
    isInitializing 
  } = useFlightPlan()

  const { positions, isLoading: isPortfolioLoading } = usePortfolio()

  const handleNavigateToResearch = useCallback((symbol: string) => {
    navigate(`/research?symbol=${symbol}`)
  }, [navigate])

  const isLoading = isPlanLoading || isPortfolioLoading

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="var(--color-primary)" size={40} />
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-title">PLAN DE VUELO</h1>
          <p className="page-subtitle">
            {plan 
              ? `Sesión del ${new Date(plan.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : 'Preparación pre-sesión'}
          </p>
        </div>
        {plan && (
          <div className="page-header__right">
            <span className={`badge ${plan.checklist_completed ? 'badge-success' : 'badge-warning'}`}>
              {plan.checklist_completed ? 'LISTO PARA DESPEGAR' : 'PRE-VUELO EN PROGRESO'}
            </span>
          </div>
        )}
      </header>

      <FlightPlanForm 
        plan={plan ?? null}
        lastPlan={lastPlan ?? null}
        positions={positions}
        onInit={initPlan}
        onUpdate={updatePlan}
        onAddCandidate={addCandidate}
        onDeleteCandidate={deleteCandidate}
        onNavigateToResearch={handleNavigateToResearch}
        isInitializing={isInitializing}
      />

      <style>{`
        .page-container {
          height: 100%;
          overflow-y: auto;
          background: var(--bg-base);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 32px 24px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
        }
        .page-title {
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin: 0;
          color: var(--text-primary);
        }
        .page-subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 4px 0 0;
          text-transform: capitalize;
        }
        .badge-warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-warning);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      `}</style>
    </div>
  )
}
