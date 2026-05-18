// ─────────────────────────────────────────────────────────────────────────────
// src/components/flight-plan/FlightPlanClosedView.tsx
// Vista de solo-lectura para una sesión ya cerrada + acción de crear plan de mañana
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  CheckCircle2,
  TrendingUp,
  Target,
  Brain,
  Heart,
  ListChecks,
  ChevronRight,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import { formatCurrency } from "../../lib/formatters";
import type { FlightPlan } from "../../types";

interface Props {
  plan: FlightPlan;
  tomorrowPlanExists: boolean;
  isCreatingTomorrow: boolean;
  onCreateTomorrow: (market: FlightPlan["market"]) => Promise<void>;
}

const EMOTION_LABEL: Record<
  NonNullable<FlightPlan["emotional_state_close"]>,
  string
> = {
  satisfied: "😌 Satisfecho / En paz",
  neutral: "😐 Neutral",
  frustrated: "😤 Frustrado",
  anxious: "😰 Ansioso",
  overexcited: "🤩 Eufórico",
};

const FOLLOWED_LABEL: Record<
  NonNullable<FlightPlan["followed_plan"]>,
  { label: string; color: string }
> = {
  yes: { label: "Sí, al 100%", color: "var(--color-profit)" },
  partial: { label: "Parcialmente", color: "var(--color-warning)" },
  no: { label: "No lo seguí", color: "var(--color-loss)" },
};

const MARKET_LABEL: Record<FlightPlan["market"], string> = {
  NYSE: "NYSE / NASDAQ",
  crypto: "Cripto",
  both: "Multimercado",
};

export function FlightPlanClosedView({
  plan,
  tomorrowPlanExists,
  isCreatingTomorrow,
  onCreateTomorrow,
}: Props) {
  const [tomorrowMarket, setTomorrowMarket] = useState<FlightPlan["market"]>(
    plan.market,
  );
  const [created, setCreated] = useState(tomorrowPlanExists);

  const pnl = plan.pnl_total ?? 0;
  const won = plan.trades_won ?? 0;
  const lost = plan.trades_lost ?? 0;
  const total = won + lost;
  const winRate = total > 0 ? Math.round((won / total) * 100) : null;

  const candidates = plan.candidates ?? [];
  const executedCount = candidates.filter((c) => c.executed).length;

  const followedInfo = plan.followed_plan
    ? FOLLOWED_LABEL[plan.followed_plan]
    : null;

  const handleCreateTomorrow = async () => {
    await onCreateTomorrow(tomorrowMarket);
    setCreated(true);
  };

  return (
    <div className="fpcv">
      {/* ── Header de estado ── */}
      <div className="fpcv__status-bar">
        <CheckCircle2 size={18} color="var(--color-profit)" />
        <span>
          Sesión del{" "}
          <strong>
            {new Date(plan.date + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </strong>{" "}
          — {MARKET_LABEL[plan.market]}
        </span>
        <span className="fpcv__status-chip">SESIÓN CERRADA</span>
      </div>

      <div className="fpcv__body">
        {/* ── Columna izquierda: métricas del día ── */}
        <div className="fpcv__col">
          {/* KPIs */}
          <section className="fpcv__card">
            <h3 className="fpcv__card-title">RESULTADOS DEL DÍA</h3>
            <div className="fpcv__kpi-grid">
              <div className="fpcv__kpi">
                <span className="fpcv__kpi-label">
                  <TrendingUp size={11} /> PnL TOTAL
                </span>
                <span
                  className={`fpcv__kpi-value font-mono ${pnl > 0 ? "profit" : pnl < 0 ? "loss" : "neutral"}`}
                >
                  {pnl > 0 ? "+" : ""}
                  {formatCurrency(pnl)}
                </span>
              </div>
              <div className="fpcv__kpi">
                <span className="fpcv__kpi-label">
                  <Target size={11} /> TRADES
                </span>
                <span className="fpcv__kpi-value font-mono">
                  <span className="profit">{won}W</span>
                  {" / "}
                  <span className="loss">{lost}L</span>
                </span>
              </div>
              {winRate !== null && (
                <div className="fpcv__kpi">
                  <span className="fpcv__kpi-label">WIN RATE</span>
                  <span
                    className={`fpcv__kpi-value font-mono ${winRate >= 50 ? "profit" : "loss"}`}
                  >
                    {winRate}%
                  </span>
                </div>
              )}
              {followedInfo && (
                <div className="fpcv__kpi">
                  <span className="fpcv__kpi-label">SEGUÍ EL PLAN</span>
                  <span
                    className="fpcv__kpi-value"
                    style={{ color: followedInfo.color }}
                  >
                    {followedInfo.label}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Estado emocional */}
          {plan.emotional_state_close && (
            <section className="fpcv__card">
              <h3 className="fpcv__card-title">
                <Heart size={12} /> ESTADO EMOCIONAL AL CIERRE
              </h3>
              <p className="fpcv__emotion">
                {EMOTION_LABEL[plan.emotional_state_close]}
              </p>
            </section>
          )}

          {/* Candidatos */}
          {candidates.length > 0 && (
            <section className="fpcv__card">
              <h3 className="fpcv__card-title">
                <ListChecks size={12} /> CANDIDATOS ({executedCount}/
                {candidates.length} ejecutados)
              </h3>
              <div className="fpcv__candidates">
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className={`fpcv__candidate ${c.executed ? "fpcv__candidate--executed" : ""}`}
                  >
                    <div className="fpcv__candidate-left">
                      <span className="fpcv__candidate-symbol">{c.symbol}</span>
                      <span className="fpcv__candidate-setup">
                        {c.setup_type}
                      </span>
                    </div>
                    <span
                      className={`fpcv__candidate-status ${c.executed ? "profit" : "neutral"}`}
                    >
                      {c.executed ? "EJECUTADO" : "NO EJECUTADO"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Columna derecha: lección + crear mañana ── */}
        <div className="fpcv__col">
          {/* Lección del día */}
          <section className="fpcv__card fpcv__card--lesson">
            <h3 className="fpcv__card-title">
              <Brain size={12} /> LECCIÓN DEL DÍA
            </h3>
            <blockquote className="fpcv__lesson">
              "{plan.daily_lesson}"
            </blockquote>
          </section>

          {/* Crear plan de mañana */}
          <section className="fpcv__card fpcv__card--tomorrow">
            <div className="fpcv__tomorrow-header">
              <CalendarPlus size={20} color="var(--color-primary)" />
              <div>
                <h3 className="fpcv__card-title" style={{ marginBottom: 2 }}>
                  PLAN DE MAÑANA
                </h3>
                <p className="fpcv__tomorrow-desc">
                  Preparate para la próxima sesión
                </p>
              </div>
            </div>

            {created ? (
              <div className="fpcv__tomorrow-done">
                <CheckCircle2 size={16} color="var(--color-profit)" />
                <span>Plan de mañana creado. Te espera cuando llegues.</span>
              </div>
            ) : (
              <>
                <div className="fpcv__field">
                  <label>Mercado del día siguiente</label>
                  <select
                    value={tomorrowMarket}
                    onChange={(e) =>
                      setTomorrowMarket(e.target.value as FlightPlan["market"])
                    }
                  >
                    <option value="NYSE">NYSE / NASDAQ</option>
                    <option value="crypto">Cripto</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
                <button
                  className="fpcv__btn-tomorrow"
                  onClick={handleCreateTomorrow}
                  disabled={isCreatingTomorrow}
                >
                  {isCreatingTomorrow ? (
                    <>
                      <Loader2 size={15} className="spin" /> CREANDO...
                    </>
                  ) : (
                    <>
                      <span>CREAR PLAN DE MAÑANA</span>
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </>
            )}
          </section>
        </div>
      </div>

      <style>{`
        .fpcv {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }
        .fpcv__status-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 10px;
          margin-bottom: 24px;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .fpcv__status-chip {
          margin-left: auto;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(107, 114, 128, 0.15);
          color: var(--text-muted);
          border: 1px solid rgba(107, 114, 128, 0.25);
        }
        .fpcv__body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .fpcv__body { grid-template-columns: 1fr; }
        }
        .fpcv__col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fpcv__card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 20px;
        }
        .fpcv__card--lesson {
          border-color: rgba(16, 185, 129, 0.15);
          background: rgba(16, 185, 129, 0.03);
        }
        .fpcv__card--tomorrow {
          border-color: rgba(59, 130, 246, 0.2);
          background: rgba(59, 130, 246, 0.03);
        }
        .fpcv__card-title {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
        }
        .fpcv__kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .fpcv__kpi {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fpcv__kpi-label {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
        }
        .fpcv__kpi-value {
          font-size: 1.15rem;
          font-weight: 700;
        }
        .fpcv__kpi-value.profit { color: var(--color-profit); }
        .fpcv__kpi-value.loss   { color: var(--color-loss);   }
        .fpcv__kpi-value.neutral{ color: var(--text-secondary); }
        .profit { color: var(--color-profit); }
        .loss   { color: var(--color-loss);   }
        .neutral{ color: var(--text-secondary); }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .fpcv__emotion {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0;
        }
        .fpcv__candidates {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fpcv__candidate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--bg-elevated);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          opacity: 0.7;
        }
        .fpcv__candidate--executed {
          opacity: 1;
          border-color: rgba(16, 185, 129, 0.2);
        }
        .fpcv__candidate-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .fpcv__candidate-symbol {
          font-weight: 700;
          font-size: 0.9rem;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-primary);
        }
        .fpcv__candidate-setup {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .fpcv__candidate-status {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.06em;
        }
        .fpcv__lesson {
          font-style: italic;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-primary);
          border-left: 3px solid var(--color-profit);
          padding-left: 14px;
          margin: 0;
        }
        .fpcv__tomorrow-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }
        .fpcv__tomorrow-desc {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
        }
        .fpcv__field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .fpcv__field label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .fpcv__field select {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          cursor: pointer;
        }
        .fpcv__field select:focus {
          border-color: var(--color-primary);
        }
        .fpcv__btn-tomorrow {
          width: 100%;
          padding: 13px 16px;
          background: var(--color-primary);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .fpcv__btn-tomorrow:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        .fpcv__btn-tomorrow:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .fpcv__tomorrow-done {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          font-size: 0.88rem;
          color: var(--color-profit);
          font-weight: 600;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
