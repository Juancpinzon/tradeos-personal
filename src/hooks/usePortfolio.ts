// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio
//
// Llama a la Edge Function alpaca-proxy para obtener datos reales de Alpaca paper.
// React Query cachea 30s y refetch en background cada 60s.
// El snapshot de equity se guarda en DB dentro de la Edge Function /account.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountSummary, Position, EquitySnapshot } from '../types'
import { supabase } from '../lib/supabase'

export interface UsePortfolioReturn {
  account: AccountSummary | null
  positions: Position[]
  equitySnapshots: EquitySnapshot[]
  isLoading: boolean
  isSyncing: boolean
  refetch: () => void
}

// ─── fetchers ────────────────────────────────────────────────────────────────

async function fetchAccount(): Promise<AccountSummary> {
  const { data, error } = await supabase.functions.invoke<AccountSummary>(
    'alpaca-proxy/account',
    { method: 'GET' },
  )
  if (error) throw error
  if (!data) throw new Error('No account data returned')
  return { ...data, broker: 'alpaca' }
}

async function fetchPositions(): Promise<Position[]> {
  const { data, error } = await supabase.functions.invoke<Position[]>(
    'alpaca-proxy/positions',
    { method: 'GET' },
  )
  if (error) throw error
  return data ?? []
}

async function fetchEquitySnapshots(): Promise<EquitySnapshot[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('equity_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('broker', 'alpaca')
    .order('snapshot_at', { ascending: true })
    .limit(90)

  if (error) throw error
  return (data ?? []) as EquitySnapshot[]
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function usePortfolio(): UsePortfolioReturn {
  const queryClient = useQueryClient()

  const accountQuery = useQuery({
    queryKey: ['portfolio', 'account'],
    queryFn: fetchAccount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions'],
    queryFn: fetchPositions,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const snapshotsQuery = useQuery({
    queryKey: ['portfolio', 'snapshots'],
    queryFn: fetchEquitySnapshots,
    staleTime: 60_000,
    enabled: accountQuery.isSuccess,
  })

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }, [queryClient])

  const isLoading = accountQuery.isLoading || positionsQuery.isLoading
  const isSyncing = (accountQuery.isFetching || positionsQuery.isFetching) && !isLoading

  // Recalcular portfolio_weight_pct usando el equity total de la cuenta (incluye cash)
  const equity = accountQuery.data?.equity ?? 0
  const positions: Position[] = (positionsQuery.data ?? []).map(pos => ({
    ...pos,
    portfolio_weight_pct: equity > 0
      ? (pos.market_value / equity) * 100
      : pos.portfolio_weight_pct,
  }))

  return {
    account: accountQuery.data ?? null,
    positions,
    equitySnapshots: snapshotsQuery.data ?? [],
    isLoading,
    isSyncing,
    refetch,
  }
}
