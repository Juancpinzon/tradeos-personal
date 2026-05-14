// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/AppShell.tsx — Shell principal de la aplicación
// Layout: Sidebar fijo a la izquierda + área de contenido con scroll
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../hooks/useAuth'

export default function AppShell() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((c) => !c)}
        user={user}
        onSignOut={signOut}
        pendingPostMortems={3}
      />

      <ToastContainer />

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}

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
      pointerEvents: 'none'
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
          animation: 'toastIn 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: t.color }}>{t.title}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{t.message}</div>
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateX(100%); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      ))}
    </div>
  )
}
