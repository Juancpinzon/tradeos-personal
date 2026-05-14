// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio (Alpaca + Binance)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountSummary, Position, EquitySnapshot } from "../types";
import { supabase } from "../lib/supabase";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface UsePortfolioReturn {
  account: AccountSummary | null;       // total combinado
  alpacaEquity: number;
  binanceEquity: number;
  positions: Position[];                // posiciones de ambos brokers
  equitySnapshots: EquitySnapshot[];
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getSession() {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }
  return session;
}

async function edgeFetch<T>(path: string): Promise<T> {
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error("No hay sesión activa. Iniciá sesión nuevamente.");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (json["error"] as string | undefined) ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as unknown as T;
}

// ─── response types ───────────────────────────────────────────────────────────

interface BinanceProxyResponse {
  configured: boolean;
  positions: Position[];
  equity: number;
  cash: number;
  buying_power: number;
}

// ─── fetchers ────────────────────────────────────────────────────────────────

async function fetchAlpacaAccount(): Promise<AccountSummary> {
  const data = await edgeFetch<AccountSummary & { mode: string }>("alpaca-proxy/account");
  return { ...data, broker: "alpaca" };
}

async function fetchAlpacaPositions(): Promise<Position[]> {
  return edgeFetch<Position[]>("alpaca-proxy/positions");
}

async function fetchBinancePositions(): Promise<BinanceProxyResponse> {
  const session = await getSession();
  if (!session?.access_token) {
    return { configured: false, positions: [], equity: 0, cash: 0, buying_power: 0 };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/binance-proxy/positions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  const json = await res.json() as BinanceProxyResponse;
  // binance-proxy devuelve { configured: false } cuando las keys no están — no es un error
  return json;
}

async function fetchEquitySnapshots(): Promise<EquitySnapshot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("equity_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .in("broker", ["alpaca", "total"])
    .order("snapshot_at", { ascending: true })
    .limit(90);

  if (error) throw new Error(error.message);
  return (data ?? []) as EquitySnapshot[];
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function usePortfolio(): UsePortfolioReturn {
  const queryClient = useQueryClient();

  const alpacaAccountQuery = useQuery({
    queryKey: ["portfolio", "alpaca", "account"],
    queryFn: fetchAlpacaAccount,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const alpacaPositionsQuery = useQuery({
    queryKey: ["portfolio", "alpaca", "positions"],
    queryFn: fetchAlpacaPositions,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const binanceQuery = useQuery({
    queryKey: ["portfolio", "binance"],
    queryFn: fetchBinancePositions,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["portfolio", "snapshots"],
    queryFn: fetchEquitySnapshots,
    staleTime: 60_000,
    enabled: alpacaAccountQuery.isSuccess,
    retry: 1,
  });

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  }, [queryClient]);

  const isLoading = alpacaAccountQuery.isPending || alpacaPositionsQuery.isPending;
  const isSyncing =
    (alpacaAccountQuery.isFetching ||
      alpacaPositionsQuery.isFetching ||
      binanceQuery.isFetching) &&
    !isLoading;
  const error = alpacaAccountQuery.error ?? alpacaPositionsQuery.error ?? null;

  const alpacaEquity  = alpacaAccountQuery.data?.equity ?? 0;
  const binanceData   = binanceQuery.data;
  const binanceEquity = binanceData?.equity ?? 0;
  const totalEquity   = alpacaEquity + binanceEquity;

  // Posiciones Alpaca — portfolio_weight_pct relativo al total global
  const alpacaPositions: Position[] = (alpacaPositionsQuery.data ?? []).map((pos) => ({
    ...pos,
    portfolio_weight_pct:
      totalEquity > 0 ? (pos.market_value / totalEquity) * 100 : pos.portfolio_weight_pct,
  }));

  // Posiciones Binance — ya normalizadas por la Edge Function
  const binancePositions: Position[] = (
    binanceData?.configured && Array.isArray(binanceData.positions)
      ? binanceData.positions
      : []
  ).map((pos) => ({
    ...pos,
    id:        (pos.id ?? `bnb-${pos.symbol}`),
    user_id:   (pos.user_id ?? ""),
    synced_at: (pos.synced_at ?? new Date().toISOString()),
    created_at:(pos.created_at ?? new Date().toISOString()),
    portfolio_weight_pct:
      totalEquity > 0 ? (pos.market_value / totalEquity) * 100 : 0,
  }));

  const positions: Position[] = [...alpacaPositions, ...binancePositions];

  // AccountSummary total
  const alpacaAcc = alpacaAccountQuery.data;
  const account: AccountSummary | null = alpacaAcc
    ? {
        equity:        totalEquity,
        cash:          alpacaAcc.cash + (binanceData?.cash ?? 0),
        buying_power:  alpacaAcc.buying_power + (binanceData?.buying_power ?? 0),
        pnl_today:     alpacaAcc.pnl_today,
        pnl_today_pct: alpacaAcc.pnl_today_pct,
        broker:        "total",
        mode:          alpacaAcc.mode,
      }
    : null;

  return {
    account,
    alpacaEquity,
    binanceEquity,
    positions,
    equitySnapshots: snapshotsQuery.data ?? [],
    isLoading,
    isSyncing,
    error,
    refetch,
  };
}
