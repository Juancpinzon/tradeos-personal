// ─────────────────────────────────────────────────────────────────────────────
// src/components/trading/OrderForm.tsx
// Formulario de orden: terminal profesional con RiskCalculator integrado.
// Inputs con borde sutil → ilumina en --color-primary al focusear.
// Botón "Revisar orden" abre ConfirmOrderModal. NUNCA ejecuta directamente.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import RiskCalculator from "./RiskCalculator";
import { useSymbolSearch } from "../../hooks/useSymbolSearch";
import { useFlightPlan } from "../../hooks/useFlightPlan";
import { useTradingStore } from "../../stores/tradingStore";
import { formatCurrency, formatPercent } from "../../lib/formatters";
import type { UserSettings } from "../../types";

// ─────────────────────────────────────────────────────────────────────────────

export interface OrderDraft {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit";
  qty: number;
  limit_price: number | null;
  stop_loss: number | null;
  target: number | null;
  estimated_price: number | null;
}

interface OrderFormProps {
  initialSymbol?: string;
  currentPrice?: number | null;
  totalEquity: number;
  userSettings: UserSettings;
  onReviewOrder: (draft: OrderDraft) => void;
}

type ValidationErrors = Partial<Record<keyof OrderDraft, string>>;

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderForm({
  initialSymbol = "",
  currentPrice = null,
  totalEquity,
  userSettings,
  onReviewOrder,
}: OrderFormProps) {
  const [symbol, setSymbol] = useState(initialSymbol.toUpperCase());
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] =
    useState<OrderDraft["order_type"]>("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [_companyName, setCompanyName] = useState("");
  const [assetClass, setAssetClass] = useState<"equity" | "crypto">("equity");
  const { suggestions, isLoading: isSearching } = useSymbolSearch(symbol);
  const { plan } = useFlightPlan();

  // Zustand Store synchronization
  const { 
    setSymbol: setStoreSymbol, 
    setStopLossPrice, 
    setTargetPrice 
  } = useTradingStore();

  // Sync to store when symbol changes locally
  useEffect(() => {
    setStoreSymbol(symbol);
  }, [symbol, setStoreSymbol]);

  // Sync stop loss to store in real time
  useEffect(() => {
    const sl = parseFloat(stopLoss);
    setStopLossPrice(isNaN(sl) || sl <= 0 ? null : sl);
  }, [stopLoss, setStopLossPrice]);

  // Sync target to store in real time
  useEffect(() => {
    const tg = parseFloat(target);
    setTargetPrice(isNaN(tg) || tg <= 0 ? null : tg);
  }, [target, setTargetPrice]);

  // Sync symbol si cambia desde afuera (watchlist click)
  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol.toUpperCase());
  }, [initialSymbol]);

  useEffect(() => {
    if (!symbol) setCompanyName("");
  }, [symbol]);

  // Reset stop loss and target inputs (and store values) when the symbol changes
  useEffect(() => {
    setStopLoss("");
    setTarget("");
    setStopLossPrice(null);
    setTargetPrice(null);
  }, [symbol, setStopLossPrice, setTargetPrice]);

  // Auto-cálculo de stop sugerido cuando cambia qty, precio o dirección
  useEffect(() => {
    const qtyNum = parseFloat(qty);
    if (
      !currentPrice ||
      currentPrice <= 0 ||
      !qty ||
      isNaN(qtyNum) ||
      qtyNum <= 0
    )
      return;
    if (totalEquity <= 0) return;
    const riskBudget = totalEquity * (userSettings.risk_per_trade_pct / 100);
    const stopDist = riskBudget / qtyNum;
    const suggested =
      side === "buy" ? currentPrice - stopDist : currentPrice + stopDist;
    if (suggested > 0) {
      setStopLoss(suggested.toFixed(2));
      setErrors((prev) => ({ ...prev, stop_loss: undefined }));
    }
  }, [qty, currentPrice, side, totalEquity, userSettings.risk_per_trade_pct]);

  // Display de riesgo real bajo el campo stop loss
  const riskDisplay = useMemo(() => {
    const sl = parseFloat(stopLoss);
    const q = parseFloat(qty);
    if (!stopLoss || isNaN(sl) || sl <= 0) return null;
    if (!qty || isNaN(q) || q <= 0) return null;
    if (!currentPrice || currentPrice <= 0) return null;
    const dist = side === "buy" ? currentPrice - sl : sl - currentPrice;
    if (dist <= 0) return null;
    const riskReal = dist * q;
    const budget = totalEquity * (userSettings.risk_per_trade_pct / 100);
    const riskPct = totalEquity > 0 ? (riskReal / totalEquity) * 100 : 0;
    return { riskReal, riskPct, exceedsBudget: riskReal > budget };
  }, [
    stopLoss,
    qty,
    currentPrice,
    side,
    totalEquity,
    userSettings.risk_per_trade_pct,
  ]);

  // Precio estimado para la orden
  const estimatedPrice =
    orderType === "market"
      ? currentPrice
      : limitPrice
        ? parseFloat(limitPrice)
        : currentPrice;

  // Valores parseados para RiskCalculator
  const entryPriceNum = estimatedPrice ?? null;
  const stopLossNum = stopLoss ? parseFloat(stopLoss) : null;
  const targetNum = target ? parseFloat(target) : null;

  function validate(): boolean {
    const errs: ValidationErrors = {};

    if (!symbol.trim()) {
      errs.symbol = "Símbolo requerido";
    }

    const qtyNum = parseFloat(qty);
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) {
      errs.qty = "Cantidad debe ser mayor a 0";
    }

    if (orderType === "limit" || orderType === "stop_limit") {
      const lp = parseFloat(limitPrice);
      if (!limitPrice || isNaN(lp) || lp <= 0) {
        errs.limit_price = "Precio límite requerido";
      }
    }

    if (!stopLoss) {
      errs.stop_loss = "Stop loss obligatorio para calcular riesgo";
    } else {
      const sl = parseFloat(stopLoss);
      if (isNaN(sl) || sl <= 0) {
        errs.stop_loss = "El stop loss debe ser mayor a $0";
      } else {
        const ep = entryPriceNum;
        if (ep) {
          const invalid = side === "buy" ? sl >= ep : sl <= ep;
          if (invalid) {
            errs.stop_loss = `Stop loss debe estar ${side === "buy" ? "por debajo" : "por encima"} del precio de entrada`;
          }
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleReview() {
    if (!validate()) return;

    const draft: OrderDraft = {
      symbol: symbol.trim().toUpperCase(),
      side,
      order_type: orderType,
      qty: parseFloat(qty),
      limit_price: limitPrice ? parseFloat(limitPrice) : null,
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      target: target ? parseFloat(target) : null,
      estimated_price: estimatedPrice,
    };

    onReviewOrder(draft);
  }

  // Marea de Correlación check
  const correlationWarning = useMemo(() => {
    if (assetClass !== "crypto" || side !== "buy") return null;
    if (!plan) return null;

    const isBearish =
      plan.market_bias === "bearish" || plan.spy_trend_sma50 === "below";
    if (isBearish) {
      return {
        title: "MAREA DE CORRELACIÓN (PRO)",
        message:
          "SPY está en tendencia bajista. Históricamente, las compras de Cripto fallan más en este contexto.",
      };
    }
    return null;
  }, [assetClass, side, plan]);

  // Usa qty del RiskCalculator si el usuario no escribió nada todavía
  function handleUseSuggestedQty(suggested: number) {
    if (!qty) setQty(String(suggested));
  }

  const showLimitPrice = orderType === "limit" || orderType === "stop_limit";

  return (
    <div className="order-form">
      <div className="order-form__header">
        <span className="order-form__title">NUEVA ORDEN</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            className="input-base"
            style={{
              fontSize: "0.6rem",
              padding: "2px 4px",
              height: "20px",
              width: "auto",
            }}
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value as any)}
          >
            <option value="equity">EQUITY</option>
            <option value="crypto">CRIPTO</option>
          </select>
          <span className="order-form__mode badge badge-paper">PAPER</span>
        </div>
      </div>

      <div className="order-form__body">
        {/* Symbol & Name Split */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}
        >
          {/* Symbol */}
          <div className="form-field" style={{ position: "relative" }}>
            <label className="form-label" htmlFor="of-symbol">
              SÍMBOLO
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="of-symbol"
                className={`input-base input-mono ${errors.symbol ? "input-error" : ""}`}
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setErrors((p) => ({ ...p, symbol: undefined }));
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="AAPL..."
                spellCheck={false}
                autoCapitalize="characters"
              />
              {isSearching && (
                <div
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <Loader2
                    size={12}
                    className="animate-spin"
                    color="var(--text-muted)"
                  />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown (Absolute to the whole row or just symbol?) */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions" style={{ width: "300px" }}>
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    className="search-suggestion-item"
                    onClick={() => {
                      setSymbol(s.symbol);
                      setCompanyName(s.name);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="suggestion-symbol">{s.symbol}</span>
                    <span className="suggestion-name">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
            {errors.symbol && (
              <span className="form-error">{errors.symbol}</span>
            )}
          </div>
        </div>

        {/* Side toggle */}
        <div className="form-field">
          <label className="form-label">DIRECCIÓN</label>
          <div className="side-toggle">
            <button
              id="of-side-buy"
              className={`side-toggle__btn side-toggle__btn--buy ${side === "buy" ? "active" : ""}`}
              onClick={() => setSide("buy")}
              type="button"
            >
              <TrendingUp size={13} />
              COMPRA
            </button>
            <button
              id="of-side-sell"
              className={`side-toggle__btn side-toggle__btn--sell ${side === "sell" ? "active" : ""}`}
              onClick={() => setSide("sell")}
              type="button"
            >
              <TrendingDown size={13} />
              VENTA
            </button>
          </div>
        </div>

        {/* Order type */}
        <div className="form-field">
          <label className="form-label" htmlFor="of-order-type">
            TIPO DE ORDEN
          </label>
          <div className="select-wrapper">
            <select
              id="of-order-type"
              className="input-base"
              value={orderType}
              onChange={(e) =>
                setOrderType(e.target.value as OrderDraft["order_type"])
              }
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
        </div>

        {/* Limit price (conditional) */}
        {showLimitPrice && (
          <div className="form-field">
            <label className="form-label" htmlFor="of-limit-price">
              PRECIO LÍMITE
            </label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">$</span>
              <input
                id="of-limit-price"
                className={`input-base input-mono input-with-prefix ${errors.limit_price ? "input-error" : ""}`}
                type="number"
                step="0.01"
                min="0"
                value={limitPrice}
                onChange={(e) => {
                  setLimitPrice(e.target.value);
                  setErrors((p) => ({ ...p, limit_price: undefined }));
                }}
                placeholder="0.00"
              />
            </div>
            {errors.limit_price && (
              <span className="form-error">{errors.limit_price}</span>
            )}
          </div>
        )}

        {/* Quantity */}
        <div className="form-field">
          <label className="form-label" htmlFor="of-qty">
            CANTIDAD (ACCIONES)
          </label>
          <input
            id="of-qty"
            className={`input-base input-mono ${errors.qty ? "input-error" : ""}`}
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              setErrors((p) => ({ ...p, qty: undefined }));
            }}
            placeholder="Qty sugerida por el calculador →"
          />
          {errors.qty && <span className="form-error">{errors.qty}</span>}
        </div>

        {/* Stop loss */}
        <div className="form-field">
          <label className="form-label" htmlFor="of-stop-loss">
            STOP LOSS{" "}
            <span style={{ color: "var(--color-loss)", fontSize: "0.6rem" }}>
              OBLIGATORIO
            </span>
          </label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">$</span>
            <input
              id="of-stop-loss"
              className={`input-base input-mono input-with-prefix ${errors.stop_loss ? "input-error" : ""}`}
              type="number"
              step="0.01"
              min="0"
              value={stopLoss}
              onChange={(e) => {
                setStopLoss(e.target.value);
                setErrors((p) => ({ ...p, stop_loss: undefined }));
              }}
              placeholder="0.00"
            />
          </div>
          {errors.stop_loss && (
            <span className="form-error">{errors.stop_loss}</span>
          )}
          {riskDisplay && !errors.stop_loss && (
            <div className="stop-risk-info">
              <span className="stop-risk-info__main font-mono">
                Riesgo máximo: {formatCurrency(riskDisplay.riskReal)} (
                {formatPercent(riskDisplay.riskPct, false)} del portafolio)
              </span>
              {riskDisplay.exceedsBudget && (
                <div className="stop-risk-info__warning">
                  <AlertTriangle size={11} />
                  Este stop supera tu límite de riesgo por operación (
                  {userSettings.risk_per_trade_pct}%)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Target (optional) */}
        <div className="form-field">
          <label className="form-label" htmlFor="of-target">
            TARGET{" "}
            <span style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>
              OPCIONAL — para R/R
            </span>
          </label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">$</span>
            <input
              id="of-target"
              className="input-base input-mono input-with-prefix"
              type="number"
              step="0.01"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Separador */}
        <div className="form-divider" />

        {/* Risk Calculator integrado */}
        <RiskCalculator
          entryPrice={entryPriceNum}
          stopLoss={stopLossNum}
          target={targetNum}
          totalEquity={totalEquity}
          riskPct={userSettings.risk_per_trade_pct}
          maxPositionPct={userSettings.max_position_size_pct}
          side={side}
        />

        {/* Link para usar qty sugerida */}
        {entryPriceNum && stopLossNum && stopLossNum > 0 && (
          <UseSuggestedQtyLink
            entryPrice={entryPriceNum}
            stopLoss={stopLossNum}
            totalEquity={totalEquity}
            riskPct={userSettings.risk_per_trade_pct}
            side={side}
            onUse={handleUseSuggestedQty}
          />
        )}

        {/* Marea de Correlación Warning */}
        {correlationWarning && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                color: "var(--color-loss)",
                fontSize: "0.65rem",
                fontWeight: 800,
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertTriangle size={12} /> {correlationWarning.title}
            </div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--text-secondary)",
                lineHeight: 1.3,
              }}
            >
              {correlationWarning.message}
            </p>
          </div>
        )}

        {/* Botón revisar */}
        <button
          id="of-review-btn"
          className={`order-form__submit ${side === "buy" ? "btn-buy" : "btn-sell"}`}
          onClick={handleReview}
          type="button"
        >
          {side === "buy" ? (
            <TrendingUp size={15} />
          ) : (
            <TrendingDown size={15} />
          )}
          REVISAR ORDEN
        </button>
      </div>

      <style>{`
        .order-form {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .order-form__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-default);
          background: rgba(255,255,255,0.02);
        }
        .order-form__title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }
        .order-form__mode {
          font-size: 0.6rem;
        }
        .order-form__body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .form-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .form-error {
          font-size: 0.68rem;
          color: var(--color-loss);
        }
        .form-hint {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
        .form-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 2px 0;
        }
        .input-mono {
          font-family: "IBM Plex Mono", monospace !important;
          font-size: 0.82rem !important;
        }
        .input-error {
          border-color: var(--color-loss) !important;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.12) !important;
        }
        .input-prefix-wrap {
          position: relative;
        }
        .input-prefix {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8rem;
          color: var(--text-muted);
          pointer-events: none;
          z-index: 1;
        }
        .input-with-prefix {
          padding-left: 24px !important;
        }
        .stop-risk-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 1px;
        }
        .stop-risk-info__main {
          font-size: 0.68rem;
          color: var(--text-muted);
        }
        .stop-risk-info__warning {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.68rem;
          color: var(--color-warning);
          font-weight: 500;
        }
        .select-wrapper {
          position: relative;
        }
        .select-wrapper select {
          appearance: none;
          cursor: pointer;
          padding-right: 32px;
        }
        .select-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .side-toggle {
          display: flex;
          gap: 0;
          border: 1px solid var(--border-default);
          border-radius: 6px;
          overflow: hidden;
        }
        .side-toggle__btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border: none;
          background: var(--bg-elevated);
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
        }
        .side-toggle__btn--buy.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-profit);
        }
        .side-toggle__btn--sell.active {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-loss);
        }
        .side-toggle__btn:first-child {
          border-right: 1px solid var(--border-default);
        }
        .order-form__submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: opacity 150ms ease, transform 80ms ease;
          margin-top: 4px;
        }
        .order-form__submit:active {
          transform: scale(0.985);
        }
        .btn-buy {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-profit);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .btn-buy:hover {
          background: rgba(16, 185, 129, 0.22);
        }
        .btn-sell {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-loss);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .btn-sell:hover {
          background: rgba(239, 68, 68, 0.22);
        }
        .search-suggestions {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          z-index: 100;
          max-height: 200px;
          overflow-y: auto;
        }
        .search-suggestion-item {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 120ms;
          border-bottom: 1px solid var(--border-subtle);
        }
        .search-suggestion-item:last-child { border-bottom: none; }
        .search-suggestion-item:hover {
          background: var(--bg-hover);
        }
        .suggestion-symbol {
          font-family: "IBM Plex Mono", monospace;
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--color-primary);
          min-width: 50px;
        }
        .suggestion-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: enlace para usar qty sugerida
// ─────────────────────────────────────────────────────────────────────────────

function UseSuggestedQtyLink({
  entryPrice,
  stopLoss,
  totalEquity,
  riskPct,
  side,
  onUse,
}: {
  entryPrice: number;
  stopLoss: number;
  totalEquity: number;
  riskPct: number;
  side: "buy" | "sell";
  onUse: (qty: number) => void;
}) {
  const stopDistance =
    side === "buy" ? entryPrice - stopLoss : stopLoss - entryPrice;
  if (stopDistance <= 0) return null;

  const riskBudget = totalEquity * (riskPct / 100);
  const suggested = Math.floor(riskBudget / stopDistance);
  if (suggested <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => onUse(suggested)}
      style={{
        background: "none",
        border: "none",
        color: "var(--color-primary)",
        fontSize: "0.7rem",
        cursor: "pointer",
        textDecoration: "underline",
        textAlign: "left",
        padding: 0,
      }}
    >
      ← Usar qty sugerida ({suggested} acciones)
    </button>
  );
}
