// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/AppShell.tsx — Shell principal de la aplicación
// Desktop: sidebar fijo + área de contenido con scroll
// Mobile:  top bar con hamburger + drawer overlay + bottom navigation bar
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  BookOpen,
  Settings,
  Menu,
} from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useJournal } from '../../hooks/useJournal'
import { usePriceAlerts } from '../../hooks/usePriceAlerts'
import { useMediaQuery } from '../../hooks/useMediaQuery'

// Bottom nav — 5 most-used destinations
const BOTTOM_NAV = [
  { to: '/',          label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/trading',   label: 'Trading',   Icon: TrendingUp      },
  { to: '/research',  label: 'Research',  Icon: Search          },
  { to: '/journal',   label: 'Journal',   Icon: BookOpen        },
  { to: '/settings',  label: 'Settings',  Icon: Settings        },
]

export default function AppShell() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { entries } = useJournal()
  const isMobile = useMediaQuery('(max-width: 767px)')
  usePriceAlerts()

  const pendingCount = entries.filter(e => e.order_id && !e.outcome).length

  // Auto-close drawer when viewport goes desktop
  useEffect(() => {
    if (!isMobile) setIsDrawerOpen(false)
  }, [isMobile])

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Mobile backdrop — closes drawer on tap */}
      {isMobile && isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar (desktop: sticky collapsible; mobile: fixed overlay drawer) */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(c => !c)}
        user={user}
        onSignOut={signOut}
        pendingPostMortems={pendingCount}
        isMobile={isMobile}
        isDrawerOpen={isDrawerOpen}
        onDrawerClose={() => setIsDrawerOpen(false)}
      />

      <ToastContainer />

      {/* Main content column */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        {/* Mobile-only top bar */}
        {isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 1rem',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menú"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu size={18} />
            </button>
            <span
              style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Trade<span style={{ color: 'var(--color-primary)' }}>OS</span>
            </span>
            <span className="badge badge-paper" style={{ fontSize: '0.5rem' }}>
              PAPER
            </span>
          </div>
        )}

        {/* Scrollable page content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            paddingBottom: isMobile ? '56px' : '0',
          }}
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      {isMobile && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '56px',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 100,
          }}
        >
          {BOTTOM_NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                textDecoration: 'none',
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                fontSize: '0.5625rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
                transition: 'color 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

// ── Toast container (unchanged) ────────────────────────────────────────────

function ToastContainer() {
  const [toasts, setToasts] = useState<any[]>([])

  useEffect(() => {
    const handler = (e: any) => {
      const id = Math.random().toString(36).substr(2, 9)
      setToasts(prev => [...prev, { ...e.detail, id }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 5000)
    }
    window.addEventListener('tradeos-toast', handler)
    return () => window.removeEventListener('tradeos-toast', handler)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${t.color || 'var(--border-default)'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary)',
          minWidth: '240px',
          pointerEvents: 'auto',
          animation: 'toastIn 0.3s ease-out',
        }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: t.color }}>{t.title}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{t.message}</div>
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateX(100%); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      ))}
    </div>
  )
}
