// ─────────────────────────────────────────────────────────────────────────────
// ResearchPanel.tsx
// Layout dos columnas: análisis streaming (70%) | datos fuente sticky (30%)
// Cursor parpadeante al final del texto mientras llega el stream.
// Historial de análisis anteriores colapsable al pie.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KpiGrid } from "./KpiGrid";
import { TradingViewWidget } from "./TradingViewWidget";
import { PortfolioContextPanel } from "./PortfolioContextPanel";
import { useResearch } from "../../hooks/useResearch";
import { useSymbolSearch } from "../../hooks/useSymbolSearch";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import type { ResearchEntry } from "../../types";
import { formatDate } from "../../lib/formatters";
import { RotateCcw, ExternalLink, Copy, Download, Trash2 } from "lucide-react";
import { CosmicButton } from "@/components/ui/cosmic-button";
import { TextAnimate } from "@/components/ui/text-animate";

// ─────────────────────────────────────────────────────────────────────────────
// Estilos de Markdown compartidos
// ─────────────────────────────────────────────────────────────────────────────
const MD_HEADING_STYLE: React.CSSProperties = {
  fontFamily: "Syne, system-ui, sans-serif",
  fontWeight: 600,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--color-primary)",
  marginTop: "20px",
  marginBottom: "8px",
  paddingBottom: "4px",
  borderBottom: "1px solid var(--border-subtle)",
};

function renderAnalysis(text: string, isStreaming: boolean) {
  return (
    <div
      style={{
        fontSize: "13px",
        lineHeight: "1.7",
        color: "var(--text-primary)",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <div style={MD_HEADING_STYLE}>{children}</div>,
          h2: ({ children }) => <div style={MD_HEADING_STYLE}>{children}</div>,
          h3: ({ children }) => (
            <div style={{ ...MD_HEADING_STYLE, marginTop: "16px" }}>
              {children}
            </div>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
              {children}
            </em>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: "6px", marginTop: 0 }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                paddingLeft: "18px",
                marginBottom: "8px",
                marginTop: "4px",
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                paddingLeft: "18px",
                marginBottom: "8px",
                marginTop: "4px",
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: "3px" }}>{children}</li>
          ),
          code: ({ children }) => (
            <code
              style={{
                background: "var(--bg-elevated)",
                borderRadius: "3px",
                padding: "1px 5px",
                fontSize: "12px",
                fontFamily: '"IBM Plex Mono", monospace',
                color: "var(--color-primary)",
              }}
            >
              {children}
            </code>
          ),
          table: ({ children }) => (
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                marginBottom: "8px",
                fontSize: "12px",
              }}
            >
              {children}
            </table>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: "4px 8px",
                textAlign: "left",
                color: "var(--text-muted)",
                fontWeight: 600,
                fontSize: "10px",
                textTransform: "uppercase",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: "4px 8px",
                fontFamily: '"IBM Plex Mono", monospace',
                color: "var(--text-primary)",
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {isStreaming && <BlinkingCursor />}
    </div>
  );
}

function BlinkingCursor() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "2px",
        height: "14px",
        background: "var(--color-primary)",
        marginLeft: "2px",
        verticalAlign: "text-bottom",
        animation: "cursorBlink 0.9s ease-in-out infinite",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de historial colapsable
// ─────────────────────────────────────────────────────────────────────────────
function HistoryPanel({
  entries,
  onSelect,
  onDelete,
  onDeleteAll,
}: {
  entries: ResearchEntry[];
  onSelect: (e: ResearchEntry) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        borderTop: "1px solid var(--border-default)",
        marginTop: "24px",
        paddingTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "11px",
            fontFamily: "Syne, system-ui, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: 0,
          }}
        >
          <span
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
              display: "inline-block",
            }}
          >
            ›
          </span>
          Análisis anteriores ({entries.length})
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteAll();
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-loss)",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: 0.7,
            transition: "opacity 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          ELIMINAR TODO
        </button>
      </div>

      {open && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "stretch",
              }}
            >
              <button
                onClick={() => onSelect(entry)}
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 150ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border-default)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "var(--color-primary)",
                      }}
                    >
                      {entry.symbol}
                    </span>
                    {entry.data_used?.name &&
                      entry.data_used.name !== entry.symbol && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {entry.data_used.name}
                        </span>
                      )}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {entry.query.length > 70
                      ? entry.query.slice(0, 70) + "…"
                      : entry.query}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    marginLeft: "12px",
                  }}
                >
                  {formatDate(entry.created_at)}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Eliminar análisis de ${entry.symbol}?`)) {
                    onDelete(entry.id);
                  }
                }}
                title="Eliminar análisis"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "6px",
                  padding: "0 10px",
                  cursor: "pointer",
                  color: "var(--color-loss)",
                  transition: "all 150ms",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.borderColor = "var(--color-loss)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResearchPanel principal
// ─────────────────────────────────────────────────────────────────────────────

export function ResearchPanel() {
  const [symbolInput, setSymbolInput] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const analysisRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: "6px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
    zIndex: 100,
    maxHeight: "200px",
    overflowY: "auto",
    width: "240px",
  };

  const suggestionItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    transition: "background 120ms",
    borderBottom: "1px solid var(--border-subtle)",
  };

  const {
    analyzeSymbol,
    streamingText,
    isStreaming,
    isLoading,
    error,
    currentSnapshot,
    currentPortfolioCtx,
    currentSymbol,
    history,
    loadHistoryEntry,
    deleteHistoryEntry,
    deleteAllHistory,
    reset,
  } = useResearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions } = useSymbolSearch(symbolInput || companyNameInput);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sym = searchParams.get("symbol");
    if (sym) {
      setSymbolInput(sym.toUpperCase());
    }
  }, [searchParams]);

  // Reset name if symbol cleared
  useEffect(() => {
    if (!symbolInput && !companyNameInput) {
      setCompanyNameInput("");
    }
  }, [symbolInput, companyNameInput]);

  // Auto-scroll al final mientras llega el stream
  useEffect(() => {
    if (isStreaming && analysisRef.current) {
      analysisRef.current.scrollTop = analysisRef.current.scrollHeight;
    }
  }, [streamingText, isStreaming]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let sym = symbolInput.trim().toUpperCase();

    // Si no hay símbolo pero hay nombre, intentar resolver desde sugerencias
    if (!sym && companyNameInput.trim() && suggestions.length > 0) {
      const bestMatch = suggestions[0];
      if (bestMatch) {
        sym = bestMatch.symbol;
        setSymbolInput(sym);
        setCompanyNameInput(bestMatch.name);
      }
    }

    const q =
      queryInput.trim() ||
      `Analizá ${sym}: ¿conviene mantener o hay mejor momento para entrar?`;
    if (sym) {
      analyzeSymbol(sym, q);
      setShowSuggestions(false);
    }
  }

  const hasResult = streamingText.length > 0;
  const displaySymbol = currentSymbol ?? symbolInput.toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "16px",
      }}
    >
      {/* ── Barra de input ──────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "120px 240px 1fr",
            gap: "10px",
            width: "100%",
          }}
        >
          {/* Símbolo */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "4px",
                display: "block",
                textTransform: "uppercase",
              }}
            >
              SÍMBOLO
            </label>
            <input
              ref={symbolRef}
              type="text"
              value={symbolInput}
              onChange={(e) => {
                setSymbolInput(e.target.value.toUpperCase());
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="AAPL..."
              maxLength={15}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                padding: "9px 12px",
                fontSize: "14px",
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 700,
                width: "100%",
                outline: "none",
                letterSpacing: "0.06em",
                transition: "border-color 150ms",
              }}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ ...dropdownStyle, width: "360px" }}>
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    style={suggestionItemStyle}
                    onClick={() => {
                      setSymbolInput(s.symbol);
                      setCompanyNameInput(s.name);
                      setShowSuggestions(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                        fontSize: "12px",
                      }}
                    >
                      {s.symbol}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nombre de Compañía */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "4px",
                display: "block",
                textTransform: "uppercase",
              }}
            >
              NOMBRE DE COMPAÑÍA
            </label>
            <input
              type="text"
              value={companyNameInput}
              onChange={(e) => {
                setCompanyNameInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Nombre de empresa..."
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                padding: "9px 12px",
                fontSize: "13px",
                fontFamily: "Syne, system-ui, sans-serif",
                width: "100%",
                outline: "none",
                transition: "border-color 150ms",
              }}
            />
          </div>

          {/* Query */}
          <div style={isMobile ? { gridColumn: "span 2" } : undefined}>
            <label
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: "4px",
                display: "block",
                textTransform: "uppercase",
              }}
            >
              ¿QUÉ QUIERES SABER?
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="¿Conviene mantener? ¿Hay catalizadores próximos?"
                rows={1}
                style={{
                  width: "100%",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  padding: "9px 12px",
                  fontSize: "13px",
                  fontFamily: "Syne, system-ui, sans-serif",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.5",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-primary)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-default)";
                }}
              />
              {/* Preguntas rápidas */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {[
                  "¿Niveles técnicos clave para hoy? Stop, target y setup para Plan de Vuelo.",
                  "¿Conviene mantener o hay mejor momento para entrar?",
                  "¿Es pullback comprable o cambio de tendencia?",
                  "¿Mantengo o cierro? ¿Ajusto el stop?",
                  "¿Conviene entrar antes o después de earnings?",
                  "¿Hay setup válido hoy o esperamos?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQueryInput(q)}
                    style={{
                      background: queryInput === q ? "rgba(59,130,246,0.15)" : "var(--bg-elevated)",
                      border: `1px solid ${queryInput === q ? "rgba(59,130,246,0.5)" : "var(--border-default)"}`,
                      borderRadius: "4px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontFamily: "Syne, system-ui, sans-serif",
                      color: queryInput === q ? "var(--color-primary)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 120ms",
                      lineHeight: "1.4",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (queryInput !== q) {
                        e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (queryInput !== q) {
                        e.currentTarget.style.borderColor = "var(--border-default)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              </div>

              {/* Botón */}
              <CosmicButton
                as="button"
                type="submit"
                disabled={
                  (!symbolInput.trim() && !companyNameInput.trim()) ||
                  isLoading ||
                  isStreaming
                }
                className="shrink-0"
              >
                {isLoading || isStreaming ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <LoadingSpinner />
                    Analizando…
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🔍</span>
                    Analizar
                  </span>
                )}
              </CosmicButton>
            </div>
          </div>
        </div>
      </form>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "var(--color-loss)",
          }}
        >
          ⚠️ {error}
        </div>
      )}
      {/* ── Barra de acciones — siempre visible cuando hay resultado ───────── */}
      {hasResult && !isLoading && !isStreaming && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              navigator.clipboard.writeText(streamingText);
              alert("Análisis copiado al portapapeles");
            }}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          >
            <Copy size={14} /> Copiar
          </button>

          <button
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([streamingText], { type: "text/plain" });
              element.href = URL.createObjectURL(file);
              element.download = `research_${currentSymbol || "analysis"}.txt`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          >
            <Download size={14} /> Descargar
          </button>

          <button
            onClick={() => {
              reset();
              setSymbolInput("");
              setQueryInput("");
              setTimeout(() => symbolRef.current?.focus(), 0);
            }}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-default)")
            }
          >
            <RotateCcw size={14} /> Nuevo Análisis
          </button>
        </div>
      )}

      {/* ── Layout: dos columnas en desktop, columna única en mobile ─────── */}
      {hasResult || isLoading ? (
        <div
          style={isMobile ? {
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          } : {
            display: "flex",
            gap: "16px",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Análisis streaming */}
          <div
            ref={analysisRef}
            style={isMobile ? undefined : {
              flex: "0 0 70%",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                padding: isMobile ? "16px" : "20px 24px",
                minHeight: "200px",
              }}
            >
              {isLoading && !hasResult ? (
                <SkeletonLoader />
              ) : (
                renderAnalysis(streamingText, isStreaming)
              )}
            </div>

            {/* Historial */}
            <HistoryPanel
              entries={history}
              onSelect={loadHistoryEntry}
              onDelete={deleteHistoryEntry}
              onDeleteAll={deleteAllHistory}
            />
          </div>

          {/* Datos fuente + TradingView */}
          <div
            style={isMobile ? {
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            } : {
              flex: "0 0 calc(30% - 16px)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowY: "auto",
              position: "relative",
            }}
          >
            {/* Sticky wrapper (desktop only) */}
            <div
              style={{
                position: isMobile ? undefined : "sticky",
                top: 0,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Header de datos fuente */}
              <div
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    fontFamily: "Syne, system-ui, sans-serif",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>DATOS FUENTE</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          color: "var(--color-primary)",
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {displaySymbol}
                      </span>
                      {currentSnapshot?.name &&
                        currentSnapshot.name !== displaySymbol && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--text-muted)",
                              fontWeight: 500,
                              textAlign: "right",
                            }}
                          >
                            {currentSnapshot.name}
                          </span>
                        )}
                    </div>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${displaySymbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en TradingView"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--text-muted)",
                        transition: "color 150ms",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--color-primary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-muted)")
                      }
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {currentSnapshot ? (
                  <KpiGrid data={currentSnapshot} symbol={displaySymbol} />
                ) : (
                  <SkeletonKpi />
                )}
              </div>

              {/* Posición del usuario */}
              {currentPortfolioCtx && (
                <PortfolioContextPanel
                  context={currentPortfolioCtx}
                  symbol={displaySymbol}
                />
              )}

              {/* TradingView chart */}
              <div
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  padding: "2px",
                }}
              >
                <TradingViewWidget symbol={displaySymbol} height={280} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState />
          </div>

          {history.length > 0 && (
            <div
              style={{
                maxWidth: "800px",
                width: "100%",
                margin: "0 auto",
                padding: "0 20px 40px 20px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontFamily: "Syne, system-ui, sans-serif",
                  marginBottom: "16px",
                  textAlign: "center",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
                }}
              >
                Análisis Recientes
              </div>
              <HistoryPanel
                entries={history}
                onSelect={loadHistoryEntry}
                onDelete={deleteHistoryEntry}
                onDeleteAll={deleteAllHistory}
              />
            </div>
          )}
        </div>
      )}

      {/* Keyframes globales — inyectados inline una vez */}
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes earningsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-componentes de soporte
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "12px",
        height: "12px",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

function SkeletonLoader() {
  const lines = [80, 60, 100, 70, 90, 50, 85, 65, 75, 40];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {lines.map((w, i) => (
        <div
          key={i}
          style={{
            height: i % 4 === 0 ? "10px" : "13px",
            width: `${w}%`,
            borderRadius: "4px",
            background:
              "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            marginTop: i % 4 === 0 && i > 0 ? "8px" : 0,
          }}
        />
      ))}
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "52px",
            borderRadius: "6px",
            background:
              "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  const suggestions = ["AAPL", "NVDA", "MSFT", "BTC"];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ fontSize: "40px", opacity: 0.4 }}>🔍</div>

      <TextAnimate
        text="Ingresá un símbolo y consultá al Research Agent"
        type="calmInUp"
        style={{
          fontSize: "14px",
          fontFamily: "Syne, system-ui, sans-serif",
          fontWeight: 600,
          color: "var(--text-secondary)",
          justifyContent: "center",
          textAlign: "center",
          maxWidth: "360px",
        }}
      />

      <TextAnimate
        text="Análisis con fundamentales FMP + técnicos Alpaca + tu exposición en el portafolio"
        type="fadeInUp"
        delay={0.4}
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          justifyContent: "center",
          textAlign: "center",
          maxWidth: "420px",
        }}
      />

      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {suggestions.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.3, ease: "easeOut" }}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "11px",
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 700,
              color: "var(--text-secondary)",
              display: "inline-block",
            }}
          >
            {s}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
