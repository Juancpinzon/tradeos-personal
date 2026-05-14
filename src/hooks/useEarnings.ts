// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useEarnings.ts — Earnings próximos para posiciones + watchlist
// Llama a fmp-proxy/earnings-calendar y filtra por los símbolos del usuario.
// TTL de 6 horas (los earnings no cambian intraday).
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import type { EarningsEvent } from "../types";
import { supabase } from "../lib/supabase";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TTL_MS            = 6 * 60 * 60 * 1000; // 6 horas

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0] as string;
}

function mapReportTime(raw: string | undefined): EarningsEvent["report_time"] {
  if (raw === "bmo" || raw === "BMO") return "before_market";
  if (raw === "amc" || raw === "AMC") return "after_market";
  return "unknown";
}

// FMP earning_calendar item shape (subset)
interface FmpEarningItem {
  symbol: string;
  date: string;
  time?: string;
  eps?: number | null;
  epsEstimated?: number | null;
  revenue?: number | null;
  revenueEstimated?: number | null;
}

async function fetchEarnings(): Promise<EarningsEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Obtener símbolos de posiciones + watchlist del usuario
  const [posRes, watchRes] = await Promise.all([
    supabase.from("positions").select("symbol").eq("user_id", user.id),
    supabase.from("watchlist_items").select("symbol").eq("user_id", user.id),
  ]);

  const symbolSet = new Set<string>([
    ...((posRes.data ?? []).map((p) => p.symbol as string)),
    ...((watchRes.data ?? []).map((w) => w.symbol as string)),
  ]);

  if (symbolSet.size === 0) return [];

  // 2. Obtener sesión para llamar a fmp-proxy
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }
  if (!session?.access_token) return [];

  const today = new Date().toISOString().split("T")[0];
  const to    = addDays(30);

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/fmp-proxy/earnings-calendar?from=${today}&to=${to}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    },
  );

  if (!res.ok) return [];

  const json = (await res.json()) as { source: string; data: FmpEarningItem[] | null };
  const items = json.data ?? [];

  // 3. Filtrar por símbolos del usuario y normalizar
  const events: EarningsEvent[] = items
    .filter((item) => symbolSet.has(item.symbol))
    .map((item) => ({
      symbol:            item.symbol,
      report_date:       item.date,
      report_time:       mapReportTime(item.time),
      eps_estimate:      item.epsEstimated ?? undefined,
      eps_actual:        item.eps ?? undefined,
      revenue_estimate:  item.revenueEstimated ?? undefined,
      revenue_actual:    item.revenue ?? undefined,
      fetched_at:        new Date().toISOString(),
    }))
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());

  return events;
}

export interface UseEarningsReturn {
  events: EarningsEvent[];
  isLoading: boolean;
  error: Error | null;
}

export function useEarnings(): UseEarningsReturn {
  const query = useQuery({
    queryKey: ["earnings"],
    queryFn: fetchEarnings,
    staleTime: TTL_MS,
    refetchInterval: TTL_MS,
    retry: 1,
  });

  return {
    events:    query.data ?? [],
    isLoading: query.isPending,
    error:     query.error ?? null,
  };
}
