// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePortfolio.ts — Hook principal de portafolio
//
// Llama a la Edge Function alpaca-proxy con fetch explícito + token de sesión.
// React Query cachea 30s y refetch en background cada 60s.
// El snapshot de equity se guarda en DB dentro de la Edge Function /account.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountSummary, Position, EquitySnapshot } from "../types";
import { supabase } from "../lib/supabase";
import { normalizeBinanceBalance } from "../lib/binance";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface UsePortfolioReturn {
  account: AccountSummary | null;
  positions: Position[];
  equitySnapshots: EquitySnapshot[];
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  refetch: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function alpacaGet<T>(path: string): Promise<T> {
  let { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }

  if (!session?.access_token) {
    throw new Error("No hay sesión activa. Iniciá sesión nuevamente.");
  }

  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/alpaca-proxy${path}`, {
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

async function binanceGet<T>(path: string): Promise<T | { configured: false }> {
  let { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }

  if (!session?.access_token) return { configured: false };

  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/binance-proxy${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 503) return { configured: false };
    const json = await res.json().catch(() => ({}));
    if (json.configured === false) return { configured: false };
    return { configured: false }; 
  }
  
  return (await res.json()) as T;
}

// ─── fetchers ────────────────────────────────────────────────────────────────

async function fetchAccount(): Promise<AccountSummary & { binance_equity?: number }> {
  const alpaca = await alpacaGet<AccountSummary & { mode: string }>("/account");
  
  try {
    const binanceBalances = await binanceGet<any[]>("/balances");
    if (Array.isArray(binanceBalances)) {
      const pricesRaw = await binanceGet<any[]>("/prices");
      const prices = Array.isArray(pricesRaw) ? pricesRaw : [];
      
      const binanceEquity = binanceBalances.reduce((sum, b) => {
        if (b.asset === "USDT") return sum + b.free + b.locked;
        const p = prices.find(p => p.symbol === `${b.asset}USDT`);
        return sum + (b.free + b.locked) * (p ? parseFloat(p.price) : 0);
      }, 0);

      const binanceCash = binanceBalances.find(b => b.asset === "USDT")?.free ?? 0;

      return {
        ...alpaca,
        equity: alpaca.equity + binanceEquity,
        cash: alpaca.cash + binanceCash,
        binance_equity: binanceEquity,
        broker: "total"
      };
    }
  } catch (e) {
    console.warn("Error fetching Binance account:", e);
  }

  return { ...alpaca, broker: "alpaca" };
}

async function fetchPositions(): Promise<Position[]> {
  const alpacaPositions = await alpacaGet<Position[]>("/positions");
  
  try {
    const binanceBalances = await binanceGet<any[]>("/balances");
    if (Array.isArray(binanceBalances)) {
      const pricesRaw = await binanceGet<any[]>("/prices");
      const prices = Array.isArray(pricesRaw) ? pricesRaw : [];
      
      const binancePositions = binanceBalances
        .filter(b => b.asset !== "USDT") // Ignorar cash
        .map(b => {
          const p = prices.find(p => p.symbol === `${b.asset}USDT`);
          const price = p ? parseFloat(p.price) : 0;
          return normalizeBinanceBalance(b, price);
        })
        .filter(p => p.market_value > 1); // Solo posiciones con valor > $1

      return [...alpacaPositions, ...binancePositions];
    }
  } catch (e) {
    console.warn("Error fetching Binance positions:", e);
  }

  return alpacaPositions;
}

async function fetchEquitySnapshots(): Promise<EquitySnapshot[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("equity_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .eq("broker", "alpaca")
    .order("snapshot_at", { ascending: true })
    .limit(90);

  if (error) throw new Error(error.message);
  return (data ?? []) as EquitySnapshot[];
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function usePortfolio(): UsePortfolioReturn {
  const queryClient = useQueryClient();

  const accountQuery = useQuery({
    queryKey: ["portfolio", "account"],
    queryFn: fetchAccount,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const positionsQuery = useQuery({
    queryKey: ["portfolio", "positions"],
    queryFn: fetchPositions,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["portfolio", "snapshots"],
    queryFn: fetchEquitySnapshots,
    staleTime: 60_000,
    enabled: accountQuery.isSuccess,
    retry: 1,
  });

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  }, [queryClient]);

  const isLoading = accountQuery.isPending || positionsQuery.isPending;
  const isSyncing =
    (accountQuery.isFetching || positionsQuery.isFetching) && !isLoading;
  const error = accountQuery.error ?? positionsQuery.error ?? null;

  // Recalcular portfolio_weight_pct usando equity total de la cuenta (incluye cash)
  const equity = accountQuery.data?.equity ?? 0;
  const positions: Position[] = (positionsQuery.data ?? []).map((pos) => ({
    ...pos,
    portfolio_weight_pct:
      equity > 0 ? (pos.market_value / equity) * 100 : pos.portfolio_weight_pct,
  }));

  return {
    account: (accountQuery.data as AccountSummary) ?? null,
    positions,
    equitySnapshots: snapshotsQuery.data ?? [],
    isLoading,
    isSyncing,
    error,
    refetch,
  };
}
