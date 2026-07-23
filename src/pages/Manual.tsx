// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Manual.tsx — Manual de usuario integrado
// Renderiza docs/manual_usuario.md (fuente única de verdad, import ?raw) con
// el tema dark de TradeOS. Elemento-firma: índice "checklist de vuelo" con
// numeración mono 01–05, scroll-spy y anchors internos por sección.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, isValidElement } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMediaQuery } from '../hooks/useMediaQuery'
import manualRaw from '../../docs/manual_usuario.md?raw'

// ── Helpers de anchors ──────────────────────────────────────────────────────

interface ManualSection {
  id:    string
  label: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join('')
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    return nodeToText(props.children)
  }
  return ''
}

function extractSections(md: string): ManualSection[] {
  const sections: ManualSection[] = []
  for (const line of md.split('\n')) {
    const match = /^##\s+(.+)$/.exec(line)
    const title = match?.[1]?.trim()
    if (title) {
      sections.push({ id: slugify(title), label: title.replace(/^\d+\.\s*/, '') })
    }
  }
  return sections
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function Manual() {
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const sections = useMemo(() => extractSections(manualRaw), [])
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
      {sections.map((section, i) => {
        const isActive = section.id === activeId
        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`manual-toc-item${isActive ? ' active' : ''}`}
          >
            <span className="manual-toc-num">{String(i + 1).padStart(2, '0')}</span>
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
              gridTemplateColumns: '240px minmax(0, 1fr)',
              gap: '2.5rem',
              maxWidth: '1120px',
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
          maxWidth: '760px',
          minWidth: 0,
          padding: isNarrow ? '1.25rem 1rem 4rem' : 0,
          boxSizing: 'border-box',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <header className="manual-hero">
                <span className="manual-hero-kicker">Guía operativa · TradeOS</span>
                <h1 className="manual-h1">{children}</h1>
              </header>
            ),
            h2: ({ children }) => {
              const text = nodeToText(children)
              const match = /^(\d+)\.\s*(.*)$/.exec(text)
              const num = match?.[1]
              const rest = match?.[2] ?? text
              return (
                <h2 id={slugify(text)} className="manual-h2">
                  {num && <span className="manual-h2-num">{num.padStart(2, '0')}</span>}
                  <span>{rest}</span>
                </h2>
              )
            },
            table: ({ children }) => (
              <div className="manual-table-wrap">
                <table>{children}</table>
              </div>
            ),
          }}
        >
          {manualRaw}
        </ReactMarkdown>
      </article>

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
          font-size: 1.75rem;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0;
        }

        /* ── Secciones ──────────────────────────────────────────────────── */
        .manual-h2 {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          font-family: "Syne", system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin: 2.75rem 0 1rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
          scroll-margin-top: 4.5rem;
        }
        .manual-h2-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--color-primary);
        }

        /* ── Prosa ──────────────────────────────────────────────────────── */
        .manual-md p {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--text-secondary);
          margin: 0 0 0.875rem;
        }
        .manual-md strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        /* Párrafo que es solo un bold = sub-etiqueta de sección (idioma de la app) */
        .manual-md p > strong:only-child {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-primary);
          margin-top: 1.75rem;
        }
        .manual-md em {
          color: var(--text-primary);
          font-style: italic;
        }
        .manual-md code {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125em;
          color: var(--text-primary);
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 0.0625rem 0.375rem;
          overflow-wrap: break-word;
        }
        .manual-md ol,
        .manual-md ul {
          margin: 0 0 1rem;
          padding-left: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4375rem;
        }
        .manual-md li {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .manual-md ol > li::marker {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        .manual-md ul > li::marker {
          color: var(--color-primary);
        }
        .manual-md hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 2.5rem 0 1.25rem;
        }

        /* ── Tablas ─────────────────────────────────────────────────────── */
        .manual-table-wrap {
          overflow-x: auto;
          margin: 0 0 1.25rem;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background-color: var(--bg-surface);
        }
        .manual-md table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .manual-md th {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: left;
          color: var(--text-muted);
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid var(--border-default);
          white-space: nowrap;
        }
        .manual-md td {
          padding: 0.625rem 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: top;
          min-width: 8rem;
        }
        .manual-md tr:last-child td {
          border-bottom: none;
        }
        .manual-md td:first-child {
          color: var(--text-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .manual-toc-item,
          .manual-toc-num {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
