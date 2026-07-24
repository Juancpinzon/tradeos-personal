// ─────────────────────────────────────────────────────────────────────────────
// src/components/help/HelpPanel.tsx — Ayuda contextual por pantalla
// Botón (?) circular + panel lateral deslizante desde la derecha. El contenido
// se sirve desde la fuente única src/data/manualContent.tsx (los mismos bloques
// que renderiza /manual) — no se duplica texto.
// Cierre: botón X, tecla Escape y clic en el overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { HelpCircle, X, ArrowRight } from 'lucide-react'
import {
  HELP_TOPICS,
  BLOCKS,
  ManualContentStyles,
} from '../../data/manualContent'

const ANIM_MS = 260

export function HelpPanel({ topic }: { topic: string }) {
  const help = HELP_TOPICS[topic]

  const [open, setOpen]       = useState(false)   // intención lógica (abierto/cerrado)
  const [mounted, setMounted] = useState(false)   // presente en el DOM (para animar salida)
  const [entered, setEntered] = useState(false)   // clase de entrada aplicada
  const triggerRef   = useRef<HTMLButtonElement | null>(null)
  const closeRef     = useRef<HTMLButtonElement | null>(null)
  const openedOnce   = useRef(false)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Montaje / desmontaje con animación
  useEffect(() => {
    if (open) {
      setMounted(true)
      // permite que el DOM pinte el estado inicial antes de animar
      const raf = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
    if (!mounted) return
    const t = setTimeout(() => setMounted(false), reducedMotion ? 0 : ANIM_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Escape para cerrar + bloqueo de scroll del body mientras está abierto
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted])

  // Foco al panel al abrir
  useEffect(() => {
    if (entered) {
      openedOnce.current = true
      closeRef.current?.focus()
    }
  }, [entered])

  // Devolver el foco al trigger solo tras un cierre real (no en el montaje inicial)
  useEffect(() => {
    if (!mounted && openedOnce.current) {
      triggerRef.current?.focus()
      openedOnce.current = false
    }
  }, [mounted])

  if (!help) return null
  const TopicIcon = help.icon

  const panel = mounted
    ? createPortal(
        <div
          className="help-overlay"
          data-entered={entered ? 'true' : 'false'}
          onClick={() => setOpen(false)}
        >
          <aside
            className="help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-panel-title"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <header className="help-panel-head">
              <span className="help-panel-head-title">
                <span className="help-panel-head-icon">
                  <TopicIcon size={16} strokeWidth={2.25} />
                </span>
                <span id="help-panel-title">{help.title}</span>
              </span>
              <button
                ref={closeRef}
                type="button"
                className="help-panel-close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar ayuda"
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            {/* Contenido — bloques de la fuente única */}
            <div className="help-panel-scroll">
              <div className="manual-md help-content">
                {help.blocks.map(blockId => (
                  <Fragment key={blockId}>{BLOCKS[blockId]}</Fragment>
                ))}
              </div>

              <Link
                to="/manual"
                className="help-panel-full"
                onClick={() => setOpen(false)}
              >
                Ver manual completo
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            </div>
          </aside>

          {/* Estilos del contenido (compartidos con /manual) + estilos del panel */}
          <ManualContentStyles />
          <HelpPanelStyles reducedMotion={reducedMotion} />
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="help-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Ayuda: ${help.title}`}
        title="Ayuda de esta pantalla"
      >
        <HelpCircle size={20} strokeWidth={2} />
        <style>{`
          .help-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 999px;
            border: 1px solid var(--border-default);
            background-color: var(--bg-surface);
            color: var(--color-primary);
            cursor: pointer;
            box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.5);
            transition: background-color 150ms ease, color 150ms ease,
                        border-color 150ms ease, transform 150ms ease,
                        box-shadow 150ms ease;
          }
          .help-trigger:hover {
            background-color: var(--color-primary);
            border-color: var(--color-primary);
            color: #fff;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px -6px rgba(59, 130, 246, 0.6);
          }
          .help-trigger:focus-visible {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            .help-trigger { transition: background-color 150ms ease, color 150ms ease; }
            .help-trigger:hover { transform: none; }
          }
        `}</style>
      </button>
      {panel}
    </>
  )
}

// ── Estilos del panel (overlay + hoja lateral + link al manual) ───────────────

function HelpPanelStyles({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <style>{`
      .help-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        justify-content: flex-end;
        background-color: rgba(0, 0, 0, 0);
        transition: background-color ${reducedMotion ? '0ms' : `${ANIM_MS}ms`} ease;
      }
      .help-overlay[data-entered="true"] {
        background-color: rgba(0, 0, 0, 0.55);
      }
      .help-panel {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 400px;
        max-width: 92vw;
        height: 100%;
        background-color: var(--bg-base);
        border-left: 1px solid var(--border-default);
        box-shadow: -12px 0 32px -12px rgba(0, 0, 0, 0.7);
        transform: translateX(100%);
        transition: transform ${reducedMotion ? '0ms' : `${ANIM_MS}ms`} cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      }
      .help-overlay[data-entered="true"] .help-panel {
        transform: translateX(0);
      }
      .help-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-shrink: 0;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-subtle);
        background-color: var(--bg-surface);
      }
      .help-panel-head-title {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        min-width: 0;
        font-family: "Syne", system-ui, sans-serif;
        font-weight: 700;
        font-size: 0.9375rem;
        letter-spacing: -0.01em;
        color: var(--text-primary);
      }
      .help-panel-head-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        flex-shrink: 0;
        border-radius: 8px;
        background: linear-gradient(145deg, rgba(59,130,246,0.2), rgba(59,130,246,0.06));
        border: 1px solid rgba(59,130,246,0.3);
        color: var(--color-primary);
      }
      .help-panel-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        border-radius: 7px;
        border: 1px solid var(--border-default);
        background-color: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
      }
      .help-panel-close:hover {
        background-color: var(--bg-elevated);
        color: var(--text-primary);
        border-color: var(--border-default);
      }
      .help-panel-close:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 1px;
      }
      .help-panel-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 1.25rem;
      }
      /* Reset del primer elemento del contenido para que no arrastre margen superior */
      .help-content > .m-subhead:first-child,
      .help-content > .m-callout:first-child,
      .help-content > .m-flow:first-child { margin-top: 0; }
      .help-panel-full {
        display: inline-flex;
        align-items: center;
        gap: 0.4375rem;
        margin-top: 0.5rem;
        padding: 0.625rem 1rem;
        border-radius: 8px;
        border: 1px solid rgba(59, 130, 246, 0.4);
        background-color: rgba(59, 130, 246, 0.1);
        color: var(--color-primary);
        font-family: "Syne", system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 700;
        text-decoration: none;
        transition: background-color 150ms ease, border-color 150ms ease;
      }
      .help-panel-full:hover {
        background-color: rgba(59, 130, 246, 0.18);
        border-color: var(--color-primary);
      }
      .help-panel-full:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
    `}</style>
  )
}
