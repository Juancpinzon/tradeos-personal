// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/MarketPulse.tsx — Ticker de precios en tiempo real
// Usa el mismo patrón fetch que useMarketData (/alpaca-proxy/quote/:symbol)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface PulseItem {
  symbol: string
  price:  number
  change: number
}

const SYMBOLS = ['SPY', 'QQQ', 'PLTR', 'NVDA']
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function MarketPulse() {
  const [items, setItems] = useState<PulseItem[]>(
    SYMBOLS.map((s) => ({ symbol: s, price: 0, change: 0 }))
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (!token) return

        const results = await Promise.allSettled(
          SYMBOLS.map(async (symbol): Promise<PulseItem> => {
            const res = await fetch(
              `${SUPABASE_URL}/functions/v1/alpaca-proxy/quote/${symbol}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!res.ok) return { symbol, price: 0, change: 0 }
            const data = await res.json() as { price?: number; change_pct?: number }
            return {
              symbol,
              price:  data.price      ?? 0,
              change: data.change_pct ?? 0,
            }
          })
        )

        const next: PulseItem[] = results.map((r, i) =>
          r.status === 'fulfilled'
            ? r.value
            : { symbol: SYMBOLS[i] ?? '', price: 0, change: 0 }
        )

        // Solo actualizar si al menos un precio es real (> 0)
        if (next.some((n) => n.price > 0)) {
          setItems(next)
          setLoaded(true)
        }
      } catch (err) {
        console.error('[MarketPulse] fetch error:', err)
      }
    }

    void fetchPulse()
    const iv = setInterval(() => void fetchPulse(), 30_000)
    return () => clearInterval(iv)
  }, [])

  // No mostrar el ticker hasta tener datos reales
  if (!loaded) return null

  // Duplicar para scroll infinito continuo
  const track = [...items, ...items]

  return (
    <div className="market-pulse">
      <div className="market-pulse__track">
        {track.map((item, i) => (
          <div key={i} className="pulse-item">
            <span className="pulse-item__symbol">{item.symbol}</span>
            <span className="pulse-item__price">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`pulse-item__change ${item.change >= 0 ? 'up' : 'down'}`}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .market-pulse {
          background: rgba(255,255,255,0.02);
          border-top: 1px solid var(--border-subtle);
          padding: 8px 0;
          overflow: hidden;
          white-space: nowrap;
          position: relative;
        }
        .market-pulse__track {
          display: inline-flex;
          gap: 24px;
          animation: mpMarquee 25s linear infinite;
          will-change: transform;
        }
        .market-pulse__track:hover {
          animation-play-state: paused;
        }
        .pulse-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          padding: 0 4px;
        }
        .pulse-item__symbol {
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .pulse-item__price  { color: var(--text-primary); }
        .pulse-item__change.up   { color: var(--color-profit); }
        .pulse-item__change.down { color: var(--color-loss);   }

        @keyframes mpMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
