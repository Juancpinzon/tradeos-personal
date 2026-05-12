// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio
//
// Llama a la Edge Function alpaca-proxy con fetch explícito + token de sesión.
// React Query cachea 30s y refetch en background cada 60s.
// El snapshot de equity se guarda en DB dentro de la Edge Function /account.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountSummary, Position, EquitySnapshot } from '../types'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export interface UsePortfolioReturn {
  account: AccountSummary | null
  positions: Position[]
  equitySnapshots: EquitySnapshot[]
  isLoading: boolean
  isSyncing: boolean
  error: Error | null
  refetch: () => void
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function alpacaGet<T>(path: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Iniciá sesión nuevamente.')
  }

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/alpaca-proxy${path}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const json = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const msg = (json['error'] as string | undefined) ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json as unknown as T
}

// ─── fetchers ────────────────────────────────────────────────────────────────

async function fetchAccount(): Promise<AccountSummary> {
  const data = await alpacaGet<AccountSummary & { mode: string }>('/account')
  return { ...data, broker: 'alpaca' }
}

async function fetchPositions(): Promise<Position[]> {
  const data = await alpacaGet<Position[]>('/positions')
  return data
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

  if (error) throw new Error(error.message)
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
    retry: 1,
  })

  const positionsQuery = useQuery({
    queryKey: ['portfolio', 'positions'],
    queryFn: fetchPositions,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })

  const snapshotsQuery = useQuery({
    queryKey: ['portfolio', 'snapshots'],
    queryFn: fetchEquitySnapshots,
    staleTime: 60_000,
    enabled: accountQuery.isSuccess,
    retry: 1,
  })

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }, [queryClient])

  const isLoading = accountQuery.isPending || positionsQuery.isPending
  const isSyncing = (accountQuery.isFetching || positionsQuery.isFetching) && !isLoading
  const error = accountQuery.error ?? positionsQuery.error ?? null

  // Recalcular portfolio_weight_pct usando equity total de la cuenta (incluye cash)
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
    error,
    refetch,
  }
}
