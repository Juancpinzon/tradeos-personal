// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/claude-screener/index.ts
// Screener: universo filtrado → Claude scoring
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function okJson(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Types matching DB schema
// ─────────────────────────────────────────────────────────────────────────────

interface FundamentalsRow {
  symbol: string;
  eps_current: number | null;
  eps_next_estimate: number | null;
  eps_growth_next_pct: number | null;
  revenue_growth_pct: number | null;
  pe_ratio: number | null;
  next_earnings_date: string | null;
  next_earnings_estimate_eps: number | null;
  price: number | null;
  market_cap: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  price_change_pct_1d: number | null;
  volume: number | null;
  name: string | null;
  rsi_weekly: number | null;
  fetched_at: string;
}

interface UniverseRow {
  symbol: string;
  name: string;
  exchange: string;
  asset_class: string;
  market_cap: number;
  price: number;
  volume_avg_30d: number;
  sector: string | null;
  industry: string | null;
  revenue_growth_pct: number | null;
  eps_next_positive: boolean | null;
  synced_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errJson("Missing Authorization header", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) return errJson("Unauthorized", 401);

    const supabase = createClient(supabaseUrl, supabaseSvc);

    // deno-lint-ignore no-explicit-any
    let body: { criteria: any };
    try {
      body = await req.json();
    } catch {
      return errJson("Invalid JSON body");
    }

    const { criteria } = body;
    if (!criteria) return errJson("criteria is required");

    // ── Step 0: Check if screener_universe is empty ──────────────────────────────
    const { count, error: countError } = await supabase
      .from("screener_universe")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[Screener] Error checking universe count:", countError);
      return errJson(
        `Failed to check universe status: ${countError.message}`,
        500,
      );
    }

    if (count === 0 || count === null) {
      console.warn(
        "[Screener] screener_universe is empty. Returning universe_not_synced error.",
      );
      return errJson("universe_not_synced", 400);
    }

    // ── Step A: Query screener_universe ─────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    let query: any = supabase.from("screener_universe").select("*");

    if (criteria.symbol_query) {
      query = query.or(
        `symbol.ilike.%${criteria.symbol_query}%,name.ilike.%${criteria.symbol_query}%`,
      );
    }
    if (criteria.market_cap_min)
      query = query.gte("market_cap", criteria.market_cap_min);
    if (criteria.price_min) query = query.gte("price", criteria.price_min);
    if (criteria.volume_avg_min)
      query = query.gte("volume_avg_30d", criteria.volume_avg_min);
    if (criteria.asset_class && criteria.asset_class !== "both") {
      query = query.eq("asset_class", criteria.asset_class);
    }
    if (criteria.revenue_growth_min_pct)
      query = query.gte("revenue_growth_pct", criteria.revenue_growth_min_pct);
    if (criteria.eps_next_positive) query = query.eq("eps_next_positive", true);

    const { data: universe, error: universeError } = await query.limit(200);
    if (universeError)
      return errJson(`Universe query error: ${universeError.message}`, 500);

    console.log(
      "[A] Universe count:",
      universe?.length ?? 0,
      "| criteria:",
      JSON.stringify(criteria),
    );

    if (!universe || universe.length === 0) {
      return okJson({
        summary:
          "No se encontraron candidatos que cumplan los filtros técnicos iniciales.",
        results: [],
        total_candidates_evaluated: 0,
        total_passed_filters: 0,
      });
    }

    const totalEvaluated = (universe as UniverseRow[]).length;
    const symbols = (universe as UniverseRow[]).map((u) => u.symbol);

    // ── Step B: Fundamentals cache (read-only — screener-universe-sync popula esto) ──
    const { data: cachedFunds } = await supabase
      .from("fundamentals_cache")
      .select("*")
      .in("symbol", symbols);

    const cacheMap = new Map<string, FundamentalsRow>(
      (cachedFunds as FundamentalsRow[] | null)?.map((f) => [f.symbol, f]) ||
        [],
    );

    // Fetch fundamentals for symbols missing week_52_high (sequential, 500ms delay)
    const toFetch = symbols.filter((sym: string) => {
      const cached = cacheMap.get(sym);
      if (!cached) return true;
      if (!cached.week_52_high) return true;
      return false;
    });

    for (const sym of toFetch.slice(0, 5)) {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/fmp-proxy/market-data/${sym}`,
          { headers: { Authorization: authHeader } },
        );
        if (res.ok) {
          const { data } = await res.json();
          if (data) cacheMap.set(sym, data as FundamentalsRow);
        }
      } catch (e) {
        console.error(`[B] Error fetching fundamentals for ${sym}:`, e);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(
      "[B] Cache hits:",
      cacheMap.size,
      "| fetched:",
      Math.min(toFetch.length, 15),
      "| still missing:",
      Math.max(toFetch.length - 15, 0),
    );

    // ── Step C: Limitar candidatos para Claude ──────────────────────────────────
    const candidates = (universe as UniverseRow[])
      .sort((a, b) => {
        const aGrowth =
          cacheMap.get(a.symbol)?.revenue_growth_pct ??
          a.revenue_growth_pct ??
          0;
        const bGrowth =
          cacheMap.get(b.symbol)?.revenue_growth_pct ??
          b.revenue_growth_pct ??
          0;
        return bGrowth - aGrowth;
      })
      .slice(0, 15);
    console.log(
      "[C] Candidates:",
      candidates.length,
      "| symbols:",
      candidates.map((c) => c.symbol).join(","),
    );

    // ── Step D: Portfolio context ───────────────────────────────────────────────
    const { data: positions } = await supabase
      .from("positions")
      .select("symbol, portfolio_weight_pct")
      .eq("user_id", user.id);

    const portfolioInfo =
      positions?.map(
        (p: { symbol: string; portfolio_weight_pct: number | null }) => ({
          symbol: p.symbol,
          portfolio_weight_pct: p.portfolio_weight_pct,
        }),
      ) || [];

    // ── Step E: Claude scoring ──────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const candidateData = candidates.map((c: UniverseRow) => {
      const f = cacheMap.get(c.symbol);
      const price = f?.price ?? c.price;
      const w52h = f?.week_52_high ?? null;
      const athDistancePct =
        w52h != null && price != null && w52h > 0
          ? ((price - w52h) / w52h) * 100
          : null;
      return {
        symbol: c.symbol,
        name: c.name,
        price,
        market_cap: f?.market_cap ?? c.market_cap,
        revenue_growth_pct: f?.revenue_growth_pct ?? c.revenue_growth_pct,
        ath_distance_pct: athDistancePct,
        rsi_weekly: f?.rsi_weekly ?? null,
        eps_next_estimate: f?.eps_next_estimate ?? null,
        next_earnings_date: f?.next_earnings_date ?? null,
      };
    });

    const prompt = `Tengo estos ${candidateData.length} candidatos que pasaron los filtros del screener:
${JSON.stringify(candidateData, null, 2)}

Mi portafolio actual: ${JSON.stringify(portfolioInfo, null, 2)}

Para cada candidato asignale un score de 0-100 y escribí una nota de máximo 2 líneas en español.
Luego un resumen ejecutivo de máximo 3 oraciones sobre los mejores resultados considerando mi portafolio.

Respondé SOLO en JSON con este formato exacto (sin markdown, sin backticks):
{"summary":"...","items":[{"symbol":"...","score":85,"ai_note":"..."}]}`;

    console.log("[E] Sending to Claude:", candidateData.length, "candidates");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      system:
        "Eres un analista de inversiones experto. Respondes SOLO en formato JSON válido, sin markdown.",
      messages: [{ role: "user", content: prompt }],
    });

    // deno-lint-ignore no-explicit-any
    let aiResult: { summary: string; items: any[] };
    try {
      const content = response.content[0]?.text ?? "";
      const clean = content.replace(/```json\n?|\n?```/g, "").trim();
      aiResult = JSON.parse(clean);
    } catch (e) {
      console.error("Error parsing Claude response:", e);
      return errJson("Error procesando la respuesta de la IA", 500);
    }

    // ── Step F: Combine & Save ──────────────────────────────────────────────────
    const portfolioSymbols = new Set(
      positions?.map((p: { symbol: string }) => p.symbol) || [],
    );

    // deno-lint-ignore no-explicit-any
    const finalItems = aiResult.items.map((item: any) => {
      const candidate = candidateData.find((c) => c.symbol === item.symbol);
      return {
        ...candidate,
        score: item.score,
        ai_note: item.ai_note,
        already_in_portfolio: portfolioSymbols.has(item.symbol),
        already_in_watchlist: false,
      };
    });

    const screenerResult = {
      user_id: user.id,
      criteria,
      results: finalItems,
      total_candidates_evaluated: totalEvaluated,
      total_passed_filters: candidates.length,
      ai_summary: aiResult.summary,
      run_at: new Date().toISOString(),
    };

    const { data: savedResult, error: saveError } = await supabase
      .from("screener_results")
      .insert(screenerResult)
      .select()
      .single();

    if (saveError) console.error("Error saving screener results:", saveError);

    return okJson({ ...screenerResult, id: savedResult?.id });
  } catch (e) {
    console.error("[Screener Global Error]:", e);
    return errJson(e instanceof Error ? e.message : String(e), 500);
  }
});
