// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio
//
// MODO DEMO: retorna datos de mockData.ts directamente.
// TODO: reemplazar mock por llamada a alpaca-proxy cuando las keys estén disponibles.
//
// La estructura del retorno es idéntica a la que usaría con datos reales,
// permitiendo un reemplazo limpio sin cambiar los componentes que consumen este hook.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import type { AccountSummary, Position, EquitySnapshot } from '../types'
import { MOCK_ACCOUNT, MOCK_POSITIONS, MOCK_EQUITY_SNAPSHOTS } from '../lib/mockData'

export interface UsePortfolioReturn {
  account: AccountSummary | null
  positions: Position[]
  equitySnapshots: EquitySnapshot[]
  isLoading: boolean
  isSyncing: boolean
  refetch: () => void
}

export function usePortfolio(): UsePortfolioReturn {
  const [isSyncing, setIsSyncing] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [account, setAccount] = useState<AccountSummary | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [equitySnapshots, setEquitySnapshots] = useState<EquitySnapshot[]>([])

  const loadMockData = useCallback(() => {
    // TODO: reemplazar mock por llamada a alpaca-proxy cuando las keys estén disponibles.
    // Ejemplo futuro:
    //   const { data } = await supabase.functions.invoke('alpaca-proxy', {
    //     body: { endpoint: '/account' }
    //   })

    // Calcular portfolio_weight_pct para cada posición usando el equity total
    const equity = MOCK_ACCOUNT.equity
    const positionsWithWeight: Position[] = MOCK_POSITIONS.map((pos) => ({
      ...pos,
      portfolio_weight_pct: (pos.market_value / equity) * 100,
    }))

    setAccount(MOCK_ACCOUNT)
    setPositions(positionsWithWeight)
    setEquitySnapshots(MOCK_EQUITY_SNAPSHOTS)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Simular carga inicial
    loadMockData()

    // Simular isSyncing: true por 1.5s al montar, luego false
    const syncTimer = setTimeout(() => {
      setIsSyncing(false)
    }, 1500)

    return () => clearTimeout(syncTimer)
  }, [loadMockData])

  const refetch = useCallback(() => {
    setIsSyncing(true)
    loadMockData()
    // Simular sync de 1.5s
    setTimeout(() => setIsSyncing(false), 1500)
  }, [loadMockData])

  return {
    account,
    positions,
    equitySnapshots,
    isLoading,
    isSyncing,
    refetch,
  }
}
