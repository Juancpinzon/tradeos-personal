// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Manual.tsx — Manual de usuario integrado
// Guía visual ilustrada. El CONTENIDO (prosa, pasos, callouts, tablas) vive en
// src/data/manualContent.tsx (fuente única compartida con el HelpPanel). Esta
// página solo aporta el chrome: índice lateral con scroll-spy, hero y headings.
// Fuente de prosa espejo (plano): docs/manual_usuario.md
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  SECTIONS,
  SECTION_BLOCKS,
  BLOCKS,
  ManualContentStyles,
  type ManualSection,
} from '../data/manualContent'

// ── Wrapper de sección (heading numerado + anchor para scroll-spy) ────────────

function Section({
  section,
  children,
}: {
  section: ManualSection
  children: ReactNode
}) {
  const Icon = section.icon
  return (
    <section className="m-section">
      <h2 id={section.id} className="m-h2">
        <span className="m-h2-icon"><Icon size={20} strokeWidth={2} /></span>
        <span className="m-h2-num">{section.num}</span>
        <span className="m-h2-label">{section.label}</span>
      </h2>
      {children}
    </section>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Manual() {
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const sections = useMemo(() => SECTIONS, [])
  const [activeId, setActiveId] = useState<string>(() => sections[0]?.id ?? '')

  // Scroll-spy: la sección cuyo heading cruza la banda superior queda activa
  useEffect(() => {
    const headings = sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-8% 0px -78% 0px', threshold: 0 },
    )
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [sections])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setActiveId(id)
  }

  // TOC — rail vertical (desktop) o chips horizontales sticky (mobile)
  const toc = (
    <nav
      aria-label="Índice del manual"
      className={isNarrow ? 'manual-toc manual-toc--chips no-print' : 'manual-toc no-print'}
      style={
        isNarrow
          ? {
              position: 'sticky',
              top: 0,
              zIndex: 40,
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-base)',
              borderBottom: '1px solid var(--border-subtle)',
            }
          : {
              position: 'sticky',
              top: '1.5rem',
              alignSelf: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
            }
      }
    >
      {!isNarrow && <div className="manual-toc-title">Índice</div>}
      {sections.map(section => {
        const isActive = section.id === activeId
        const Icon: LucideIcon = section.icon
        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`manual-toc-item${isActive ? ' active' : ''}`}
          >
            <span className="manual-toc-icon"><Icon size={15} strokeWidth={2} /></span>
            <span className="manual-toc-num">{section.num}</span>
            <span className="manual-toc-label">{section.label}</span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <div
      style={
        isNarrow
          ? { display: 'flex', flexDirection: 'column' }
          : {
              display: 'grid',
              gridTemplateColumns: '248px minmax(0, 1fr)',
              gap: '2.5rem',
              maxWidth: '1180px',
              padding: '1.5rem 2rem 4rem',
              width: '100%',
              boxSizing: 'border-box',
            }
      }
    >
      {toc}

      <article
        className="manual-md"
        style={{
          maxWidth: '820px',
          minWidth: 0,
          padding: isNarrow ? '1.25rem 1rem 4rem' : 0,
          boxSizing: 'border-box',
        }}
      >
        {/* ── Hero ── */}
        <header className="manual-hero">
          <span className="manual-hero-kicker">Guía operativa · TradeOS</span>
          <h1 className="manual-h1">Manual de Usuario</h1>
          <p className="manual-hero-lead">
            Este manual es para ti: ya tienes cuenta creada, sesión activa y experiencia en
            trading. Aquí no hay teoría de mercados ni instalación técnica, solo cómo usar TradeOS
            para dos objetivos concretos: <strong>generar opciones de inversión</strong>{' '}
            (Screener → Research → Plan de Vuelo) y <strong>operar acciones</strong>{' '}
            (Plan de Vuelo → Trading → Journal).
          </p>
        </header>

        {/* Intro (badge PAPER) — bloque compartido, se muestra antes de la sección 01 */}
        {BLOCKS['paper-mode']}

        {/* Secciones — cada una renderiza sus bloques desde la fuente única */}
        {sections.map(section => (
          <Section key={section.id} section={section}>
            {(SECTION_BLOCKS[section.id] ?? []).map(blockId => (
              <Fragment key={blockId}>{BLOCKS[blockId]}</Fragment>
            ))}
          </Section>
        ))}

        <p className="manual-footer no-print">
          TradeOS Personal · Manual de usuario · Las capturas de pantalla se omiten a propósito:
          cada nombre citado en <code>este formato</code> es el texto literal que vas a encontrar en
          la interfaz.
        </p>
      </article>

      {/* Estilos del contenido (compartidos con el HelpPanel) */}
      <ManualContentStyles />

      {/* Estilos de chrome de la página (índice, hero, headings, footer) */}
      <style>{`
        /* ── TOC: índice checklist de vuelo ─────────────────────────────── */
        .manual-toc-title {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 0.875rem 0.5rem;
        }
        .manual-toc-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.6875rem 0.875rem;
          border: none;
          border-left: 2px solid var(--border-subtle);
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          font-family: "Syne", system-ui, sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
        }
        .manual-toc-item:hover {
          color: var(--text-primary);
          background-color: var(--bg-surface);
        }
        .manual-toc-item:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
        }
        .manual-toc-item.active {
          border-left-color: var(--color-primary);
          color: var(--text-primary);
        }
        .manual-toc-icon {
          display: inline-flex;
          flex-shrink: 0;
          color: var(--text-muted);
          transition: color 150ms ease;
        }
        .manual-toc-item.active .manual-toc-icon { color: var(--color-primary); }
        .manual-toc-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: color 150ms ease;
        }
        .manual-toc-item.active .manual-toc-num {
          color: var(--color-primary);
          font-weight: 700;
        }
        .manual-toc-label { min-width: 0; }
        /* Chips horizontales en mobile */
        .manual-toc--chips .manual-toc-item {
          border: 1px solid var(--border-default);
          border-radius: 999px;
          padding: 0.5rem 0.875rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .manual-toc--chips .manual-toc-item.active {
          border-color: var(--color-primary);
          background-color: rgba(59, 130, 246, 0.1);
        }

        /* ── Hero ───────────────────────────────────────────────────────── */
        .manual-hero {
          margin-bottom: 1.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .manual-hero-kicker {
          display: inline-block;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: 0.625rem;
        }
        .manual-h1 {
          font-family: "Syne", system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.875rem;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0 0 0.875rem;
        }
        .manual-hero-lead {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--text-secondary);
          margin: 0;
        }
        .manual-hero-lead strong { color: var(--text-primary); font-weight: 700; }

        /* ── Secciones ──────────────────────────────────────────────────── */
        .m-section { scroll-margin-top: 4.5rem; }
        .m-h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: "Syne", system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.3125rem;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin: 3rem 0 1.25rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-subtle);
          scroll-margin-top: 4.5rem;
        }
        .m-h2-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          flex-shrink: 0;
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06));
          border: 1px solid rgba(59,130,246,0.3);
          color: var(--color-primary);
        }
        .m-h2-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--color-primary);
        }
        .m-h2-label { min-width: 0; }

        /* ── Footer ─────────────────────────────────────────────────────── */
        .manual-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.8125rem;
          line-height: 1.7;
          color: var(--text-muted);
        }

        @media (prefers-reduced-motion: reduce) {
          .manual-toc-item,
          .manual-toc-icon,
          .manual-toc-num { transition: none; }
        }
      `}</style>
    </div>
  )
}
