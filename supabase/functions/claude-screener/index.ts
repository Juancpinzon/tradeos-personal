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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errJson("Missing Authorization header", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const fmpKey = Deno.env.get("FMP_API_KEY");

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

  let body: { criteria: any };
  try {
    body = await req.json();
  } catch {
    return errJson("Invalid JSON body");
  }

  const { criteria } = body;
  if (!criteria) return errJson("criteria is required");

  // ── Step A: Query screener_universe ─────────────────────────────────────────
  let query = supabase.from("screener_universe").select("*");

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

  const { data: universe, error: universeError } = await query.limit(200);
  if (universeError)
    return errJson(`Universe query error: ${universeError.message}`, 500);

  if (!universe || universe.length === 0) {
    return okJson({
      summary:
        "No se encontraron candidatos que cumplan los filtros técnicos iniciales.",
      results: [],
      total_candidates_evaluated: 0,
      total_passed_filters: 0,
    });
  }

  const totalEvaluated = universe.length;
  const symbols = universe.map((u) => u.symbol);
  console.log(
    `[SCREENER] Universe: ${universe.length} | Symbols: ${symbols.slice(0, 5).join(",")}`,
  );
  // ── Step B: Fundamentals cache ──────────────────────────────────────────────
  const { data: cachedFunds } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .in("symbol", symbols);

  const cacheMap = new Map(cachedFunds?.map((f) => [f.symbol, f]) || []);
  const now = new Date();
  const TTL = 24 * 60 * 60 * 1000;

  const missingSymbols = symbols.filter((sym) => {
    const cached = cacheMap.get(sym);
    if (!cached) return true;
    return now.getTime() - new Date(cached.fetched_at).getTime() > TTL;
  });

  if (missingSymbols.length > 0 && fmpKey) {
    const toFetch = missingSymbols.slice(0, 10);
    await Promise.all(
      toFetch.map(async (sym) => {
        try {
          const res = await fetch(
            `${supabaseUrl}/functions/v1/fmp-proxy/fundamentals/${sym}`,
            {
              headers: { Authorization: authHeader },
            },
          );
          if (res.ok) {
            const { data } = await res.json();
            if (data) cacheMap.set(sym, data);
          }
        } catch (e) {
          console.error(`Error fetching fundamentals for ${sym}:`, e);
        }
      }),
    );
  }
  console.log(
    `[SCREENER] Cache hits: ${cacheMap.size} | Missing: ${missingSymbols.length}`,
  );
  // ── Step C: Limitar candidatos para Claude ──────────────────────────────────
  // Priorizar por revenue_growth_pct descendente, máximo 10 para evitar timeout
  const candidates = universe
    .filter((u) => {
      const funds = cacheMap.get(u.symbol);
      const growth = funds?.revenue_growth_pct ?? u.revenue_growth_pct ?? 0;
      return growth > 0;
    })
    .sort((a, b) => {
      const aGrowth =
        cacheMap.get(a.symbol)?.revenue_growth_pct ?? a.revenue_growth_pct ?? 0;
      const bGrowth =
        cacheMap.get(b.symbol)?.revenue_growth_pct ?? b.revenue_growth_pct ?? 0;
      return bGrowth - aGrowth;
    })
    .slice(0, 10);
  console.log(`[SCREENER] Candidates after filter: ${candidates.length}`);
  // ── Step D: Portfolio context ───────────────────────────────────────────────
  const { data: positions } = await supabase
    .from("positions")
    .select("symbol, portfolio_weight_pct")
    .eq("user_id", user.id);

  const portfolioInfo =
    positions?.map((p) => ({
      symbol: p.symbol,
      portfolio_weight_pct: p.portfolio_weight_pct,
    })) || [];

  // ── Step E: Claude scoring ──────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const candidateData = candidates.map((c) => {
    const f = cacheMap.get(c.symbol);
    return {
      symbol: c.symbol,
      name: c.name,
      price: f?.price ?? c.price,
      market_cap: f?.market_cap ?? c.market_cap,
      revenue_growth_pct: f?.revenue_growth_pct ?? c.revenue_growth_pct,
      ath_distance_pct: f?.ath_distance_pct ?? null,
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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1500,
    system:
      "Eres un analista de inversiones experto. Respondes SOLO en formato JSON válido, sin markdown.",
    messages: [{ role: "user", content: prompt }],
  });

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
  const portfolioSymbols = new Set(positions?.map((p) => p.symbol) || []);

  const finalItems = aiResult.items.map((item) => {
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
});
