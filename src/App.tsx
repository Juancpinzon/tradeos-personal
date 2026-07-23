// ─────────────────────────────────────────────────────────────────────────────
// src/App.tsx — Entrada principal: routing + auth guard
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'

// Layout
import AppShell    from './components/layout/AppShell'

// Pages
import Login       from './pages/Login'
import Dashboard   from './pages/Dashboard'
import Trading     from './pages/Trading'
import Research    from './pages/Research'
import Journal     from './pages/Journal'
import Screener    from './pages/Screener'
import FlightPlan  from './pages/FlightPlan'
import Academy     from './pages/Academy'
import History     from './pages/History'
import Manual      from './pages/Manual'
import Settings    from './pages/Settings'

// ── TanStack Query client ─────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   30_000,  // 30s — según CLAUDE.md §Flujo 1
      gcTime:      5 * 60_000, // 5 minutos en cache
      retry:       1,
      refetchOnWindowFocus: false,
    },
  },
})

// ── Auth Guard ────────────────────────────────────────────────────────────

function ProtectedRoutes() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          gap: '0.5rem',
        }}
      >
        <LoadingDot />
        <LoadingDot style={{ animationDelay: '0.15s' }} />
        <LoadingDot style={{ animationDelay: '0.3s' }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index         element={<Dashboard />} />
        <Route path="trading"   element={<Trading />}   />
        <Route path="research"  element={<Research />}  />
        <Route path="journal"   element={<Journal />}   />
        <Route path="flight-plan" element={<FlightPlan />} />
        <Route path="academy"     element={<Academy />}    />
        <Route path="screener"    element={<Screener />}   />
        <Route path="history"   element={<History />}   />
        <Route path="manual"    element={<Manual />}    />
        <Route path="settings"  element={<Settings />}  />
      </Route>
    </Routes>
  )
}

// ── App root ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*"     element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Redirect logged-in users away from /login
function LoginRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}

// ── Loading dots animation ────────────────────────────────────────────────

function LoadingDot({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        animation: 'dotPulse 1.2s ease-in-out infinite',
        ...style,
      }}
    >
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
