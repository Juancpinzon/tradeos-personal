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
