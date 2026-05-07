// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Screener.tsx — Página de Screener IA
// Usa ScreenerPanel con mock data. En Fase 6 se conecta al hook useScreener.
// ─────────────────────────────────────────────────────────────────────────────

import ScreenerPanel from '../components/screener/ScreenerPanel'

export default function Screener() {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      <ScreenerPanel />
    </div>
  )
}
