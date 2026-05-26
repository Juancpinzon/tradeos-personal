// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio (Alpaca + Binance)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from "react";
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

  const since = new Date();
  since.setDate(since.getDate() - 30); // Dynamic range: last 30 days from new Date()

  const { data, error } = await supabase
    .from("equity_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .in("broker", ["alpaca", "total"])
    .gte("snapshot_at", since.toISOString())
    .order("snapshot_at", { ascending: false })
    .limit(2000);

  if (error) throw new Error(error.message);

  // Deduplicate to one snapshot per day (keep the latest of each day), then sort ascending for chart
  const byDay = new Map<string, EquitySnapshot>();
  for (const row of (data ?? []) as EquitySnapshot[]) {
    const day = row.snapshot_at.slice(0, 10); // "YYYY-MM-DD"
    if (!byDay.has(day)) byDay.set(day, row);  // first item = most recent (DESC order)
  }
  return Array.from(byDay.values()).reverse(); // ascending for chart
}

async function fetchSymbolNames(symbols: string[]): Promise<Record<string, string>> {
  if (symbols.length === 0) return {};
  const { data, error } = await supabase
    .from("screener_universe")
    .select("symbol, name")
    .in("symbol", symbols);
  
  if (error) return {};
  return (data ?? []).reduce((acc, curr) => ({
    ...acc,
    [curr.symbol]: curr.name
  }), {} as Record<string, string>);
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

  const allSymbols = useMemo(() => {
    const set = new Set([
      ...(alpacaPositionsQuery.data ?? []).map(p => p.symbol),
      ...(binanceQuery.data?.positions ?? []).map(p => p.symbol)
    ]);
    return Array.from(set).sort();
  }, [alpacaPositionsQuery.data, binanceQuery.data?.positions]);

  const namesQuery = useQuery({
    queryKey: ["portfolio", "names", allSymbols],
    queryFn: () => fetchSymbolNames(allSymbols),
    staleTime: 24 * 60 * 60 * 1000, // 24h
    enabled: allSymbols.length > 0,
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
    name: namesQuery.data?.[pos.symbol],
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
    name:      namesQuery.data?.[pos.symbol],
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
