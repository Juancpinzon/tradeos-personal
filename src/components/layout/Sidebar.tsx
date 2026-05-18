// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/Sidebar.tsx — Barra lateral colapsable
// Desktop: sticky, 220px expandido / 60px colapsado (solo íconos)
// Mobile:  fixed overlay drawer, slides in from left
// ─────────────────────────────────────────────────────────────────────────────

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  BookOpen,
  Target,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ClipboardList,
  GraduationCap,
  X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { MarketPulse } from './MarketPulse'

interface NavItem {
  to:    string
  label: string
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/trading',     label: 'Trading',       Icon: TrendingUp      },
  { to: '/research',    label: 'Research',      Icon: Search          },
  { to: '/journal',     label: 'Journal',       Icon: BookOpen        },
  { to: '/flight-plan', label: 'Plan de Vuelo', Icon: ClipboardList   },
  { to: '/academy',     label: 'Academia',      Icon: GraduationCap   },
  { to: '/screener',    label: 'Screener',      Icon: Target          },
  { to: '/history',     label: 'Historial',     Icon: History         },
  { to: '/settings',    label: 'Settings',      Icon: Settings        },
]

interface SidebarProps {
  isCollapsed:         boolean
  onToggle:            () => void
  user:                User | null
  onSignOut:           () => void
  pendingPostMortems?: number
  isMobile:            boolean
  isDrawerOpen:        boolean
  onDrawerClose:       () => void
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  user,
  onSignOut,
  pendingPostMortems = 0,
  isMobile,
  isDrawerOpen,
  onDrawerClose,
}: SidebarProps) {
  // On mobile: always full-width drawer (260px), ignore collapse state
  const desktopWidth = isCollapsed ? '60px' : '220px'
  const expanded = isMobile ? true : !isCollapsed

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        width: '260px',
        minWidth: '260px',
        maxWidth: '260px',
        height: '100vh',
        zIndex: 100,
        transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }
    : {
        width: desktopWidth,
        minWidth: desktopWidth,
        maxWidth: desktopWidth,
        position: 'sticky',
        top: 0,
        transition: 'width 200ms ease, min-width 200ms ease, max-width 200ms ease',
      }

  return (
    <aside
      className="no-print"
      style={{
        height: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        ...sidebarStyle,
      }}
    >
      {/* Header: Logo + PAPER badge + toggle/close button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'space-between' : 'center',
          padding: expanded ? '1rem 0.75rem' : '1rem 0',
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: '60px',
          gap: '0.5rem',
        }}
      >
        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1 }}>
            <span
              style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              Trade<span style={{ color: 'var(--color-primary)' }}>OS</span>
            </span>
            <span
              id="paper-badge"
              className="badge badge-paper"
              title="Modo paper trading — ninguna orden real se ejecuta"
            >
              PAPER
            </span>
          </div>
        )}

        {/* Collapsed PAPER badge (desktop only) */}
        {!expanded && !isMobile && (
          <span
            id="paper-badge-collapsed"
            title="Modo paper trading"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '16px',
              borderRadius: '3px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.5rem',
              fontWeight: 700,
              color: '#f59e0b',
              letterSpacing: '0.04em',
            }}
          >
            P
          </span>
        )}

        {/* Mobile: close (X) button; Desktop: collapse toggle */}
        {isMobile ? (
          <button
            onClick={onDrawerClose}
            aria-label="Cerrar menú"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        ) : (
          <button
            id="sidebar-toggle"
            onClick={onToggle}
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.backgroundColor = 'var(--bg-elevated)'
              el.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.backgroundColor = 'transparent'
              el.style.color = 'var(--text-muted)'
            }}
          >
            {isCollapsed
              ? <ChevronRight size={14} strokeWidth={2} />
              : <ChevronLeft  size={14} strokeWidth={2} />
            }
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav
        style={{
          flex: 1,
          padding: '0.75rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isJournal = to === '/journal'
          const showBadge = isJournal && pendingPostMortems > 0

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={isMobile ? onDrawerClose : undefined}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{
                justifyContent: expanded ? 'flex-start' : 'center',
                padding: expanded ? '0.5rem 0.75rem' : '0.5rem',
              }}
              title={expanded ? undefined : label}
            >
              {/* Icon wrapper — relative for collapsed dot badge */}
              <span style={{ flexShrink: 0, display: 'flex', position: 'relative' }}>
                <Icon size={18} strokeWidth={1.75} />
                {/* Collapsed badge: small dot overlay */}
                {showBadge && !expanded && (
                  <span
                    aria-label={`${pendingPostMortems} post-mortems pendientes`}
                    style={{
                      position:        'absolute',
                      top:             '-4px',
                      right:           '-4px',
                      minWidth:        '14px',
                      height:          '14px',
                      borderRadius:    '999px',
                      backgroundColor: '#f59e0b',
                      color:           '#0a0e17',
                      fontSize:        '0.5rem',
                      fontWeight:      700,
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      padding:         '0 2px',
                      lineHeight:      1,
                      fontFamily:      '"Syne", sans-serif',
                    }}
                  >
                    {pendingPostMortems > 9 ? '9+' : pendingPostMortems}
                  </span>
                )}
              </span>

              {/* Label + expanded badge */}
              {expanded && (
                <span style={{
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                  flex:         1,
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.375rem',
                }}>
                  {label}
                  {showBadge && (
                    <span
                      aria-label={`${pendingPostMortems} post-mortems pendientes`}
                      style={{
                        marginLeft:      'auto',
                        minWidth:        '18px',
                        height:          '18px',
                        borderRadius:    '999px',
                        backgroundColor: 'rgba(120,53,15,0.5)',
                        border:          '1px solid rgba(245,158,11,0.4)',
                        color:           '#fbbf24',
                        fontSize:        '0.6875rem',
                        fontWeight:      700,
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                        padding:         '0 5px',
                        lineHeight:      1,
                        fontFamily:      '"Syne", sans-serif',
                        flexShrink:      0,
                      }}
                    >
                      {pendingPostMortems > 9 ? '9+' : pendingPostMortems}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Market Pulse Ticker — only when expanded */}
      {expanded && <MarketPulse />}

      {/* Footer: email + logout */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '0.75rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {expanded && user?.email && (
          <p
            style={{
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              padding: '0 0.25rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.email}
          </p>
        )}
        <button
          id="sidebar-logout"
          onClick={onSignOut}
          title="Cerrar sesión"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: '0.625rem',
            padding: expanded ? '0.5rem 0.75rem' : '0.5rem',
            width: '100%',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 500,
            transition: 'background-color 150ms ease, color 150ms ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'
            el.style.color = '#ef4444'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.backgroundColor = 'transparent'
            el.style.color = 'var(--text-muted)'
          }}
        >
          <LogOut size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          {expanded && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
