import { useEffect } from "react";
import { ScreenerCriteriaForm } from "./ScreenerCriteriaForm";
import { ScreenerResultsTable } from "./ScreenerResultsTable";
import { useScreener } from "../../hooks/useScreener";
import { Layers, Zap } from "lucide-react";

export function ScreenerPanel() {
  const {
    lastResult,
    isRunning,
    presets,
    getPresets,
    loadPreset,
    activePresetId,
    savePreset,
  } = useScreener();

  useEffect(() => {
    const fetchAndSeed = async () => {
      const existing = await getPresets();
      if (existing.length === 0) {
        // Seed default presets
        const defaults = [
          {
            name: "Momentum Growth",
            criteria: {
              market_cap_min: 2000000000,
              revenue_growth_min_pct: 20,
              volume_avg_min: 200000,
              ath_distance_max_pct: -20,
              eps_next_positive: true,
              asset_class: "equity",
            },
          },
          {
            name: "Breakout Técnico",
            criteria: {
              market_cap_min: 1000000000,
              price_min: 10,
              ath_distance_max_pct: -10,
              rsi_weekly_min: 50,
              rsi_weekly_max: 70,
              eps_next_positive: true,
              asset_class: "equity",
            },
          },
        ];

        for (const d of defaults) {
          await savePreset(d.name, d.criteria as any);
        }
      }
    };
    fetchAndSeed();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar de Criterios */}
      <ScreenerCriteriaForm />

      {/* Área Principal de Resultados */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
        }}
      >
        {/* Header de Resultados */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--bg-elevated)",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-default)",
              }}
            >
              <Layers size={14} color="var(--text-muted)" />
              <select
                value={activePresetId || ""}
                onChange={(e) => {
                  const preset = presets.find((p) => p.id === e.target.value);
                  if (preset) loadPreset(preset);
                }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  colorScheme: "dark",
                }}
              >
                <option value="">Seleccionar Preset...</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {lastResult && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Zap size={14} color="var(--color-warning)" />
                {lastResult.total_passed_filters} resultados de{" "}
                {lastResult.total_candidates_evaluated} analizados
              </div>
            )}
          </div>
        </div>

        {/* Contenido de Resultados */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isRunning ? (
            <div style={emptyStateStyle}>
              <div style={pulseStyle}>
                <Zap size={32} color="var(--color-primary)" />
              </div>
              <h3
                style={{
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Ejecutando Análisis IA...
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  maxWidth: "400px",
                  textAlign: "center",
                }}
              >
                Estamos filtrando el universo de activos y consultando a Claude
                para encontrar las mejores oportunidades según tus criterios.
              </p>
              <div style={loadingBarStyle}>
                <div style={loadingProgressStyle} />
              </div>
            </div>
          ) : lastResult ? (
            <>
              {/* Resumen IA */}
              <div
                style={{
                  padding: "16px 24px",
                  background: "rgba(59, 130, 246, 0.05)",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    background: "var(--color-primary)",
                    borderRadius: "4px",
                    padding: "4px",
                    marginTop: "2px",
                  }}
                >
                  <Zap size={14} color="#fff" fill="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-primary)",
                      letterSpacing: "0.05em",
                      marginBottom: "4px",
                    }}
                  >
                    RESUMEN DE LA IA
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "var(--text-primary)",
                      fontStyle: "italic",
                    }}
                  >
                    "{lastResult.ai_summary}"
                  </div>
                </div>
              </div>

              {/* Tabla de Resultados */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <ScreenerResultsTable items={lastResult.results} />
              </div>
            </>
          ) : (
            <div style={emptyStateStyle}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Search size={32} color="var(--text-muted)" />
              </div>
              <h3
                style={{
                  fontSize: "18px",
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Configurá los criterios y hacé clic en Correr
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  maxWidth: "300px",
                  textAlign: "center",
                }}
              >
                El screener analizará miles de activos en tiempo real usando
                inteligencia artificial.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px",
};

const Search = ({ size, color }: { size: number; color: string }) => (
  <div
    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    <Zap size={size} color={color} />
  </div>
);

const pulseStyle: React.CSSProperties = {
  animation: "zapPulse 2s infinite ease-in-out",
  marginBottom: "20px",
};

const loadingBarStyle: React.CSSProperties = {
  width: "240px",
  height: "4px",
  background: "var(--bg-elevated)",
  borderRadius: "2px",
  marginTop: "24px",
  overflow: "hidden",
};

const loadingProgressStyle: React.CSSProperties = {
  height: "100%",
  background: "var(--color-primary)",
  width: "30%",
  borderRadius: "2px",
  animation: "loadingSlide 2s infinite ease-in-out",
};

// Keyframes
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes zapPulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes loadingSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
`;
document.head.appendChild(styleSheet);
