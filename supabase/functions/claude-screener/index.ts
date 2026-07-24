// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/claude-screener/index.ts
// Screener: universo filtrado en SQL → enriquecimiento acotado → Claude scoring
//
// Pipeline (CLAUDE.md Flujo 6): los criterios se aplican sobre TODO el universo
// en la base de datos y solo los que pasan se enriquecen/puntúan. El recorte por
// liquidez ocurre DESPUÉS del filtrado, nunca antes — de lo contrario el screener
// queda reducido a los 30 tickers más líquidos de USA (mega-caps y ETFs).
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
  fetched_at: string;
}

interface UniverseRow {
  symbol: string;
  name: string;
  exchange: string;
  asset_class: string;
  market_cap: number | null;
  price: number | null;
  volume_avg_30d: number | null;
  sector: string | null;
  industry: string | null;
  revenue_growth_pct: number | null;
  eps_next_positive: boolean | null;
  synced_at: string;
}

interface FilterBreakdown {
  universo_base: number;
  evaluados: number;
  growth_sin_dato: number;
  growth_insuficiente: number;
  eps_descartados: number;
  ath_sin_dato: number;
  ath_lejos: number;
  rsi_descartados: number;
  rsi_omitido: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// RSI semanal (Wilder, 14 períodos) desde barras 1Week de Alpaca
// ─────────────────────────────────────────────────────────────────────────────

function wilderRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

async function fetchWeeklyRsi(
  symbols: string[],
  alpacaKey: string,
  alpacaSecret: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (symbols.length === 0) return map;
  try {
    const start = new Date(Date.now() - 420 * 24 * 3600 * 1000).toISOString();
    // deno-lint-ignore no-explicit-any
    const allBars: Record<string, any[]> = {};
    let pageToken: string | null = null;
    let pages = 0;
    do {
      const url =
        `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbols.join(",")}` +
        `&timeframe=1Week&start=${start}&limit=10000&adjustment=split&feed=iex` +
        (pageToken ? `&page_token=${pageToken}` : "");
      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
      });
      if (!res.ok) {
        console.warn(`[RSI] Alpaca weekly bars HTTP ${res.status} — se omite RSI`);
        return map;
      }
      const body = await res.json();
      for (const [sym, arr] of Object.entries(body.bars ?? {})) {
        // deno-lint-ignore no-explicit-any
        allBars[sym] = [...(allBars[sym] ?? []), ...(arr as any[])];
      }
      pageToken = body.next_page_token ?? null;
      pages++;
    } while (pageToken && pages < 4);

    for (const [sym, arr] of Object.entries(allBars)) {
      const closes = arr
        .map((b) => b.c)
        .filter((c): c is number => typeof c === "number");
      const rsi = wilderRsi(closes, 14);
      if (rsi != null) map.set(sym.toUpperCase(), Math.round(rsi * 10) / 10);
    }
  } catch (e) {
    console.error("[RSI] Error calculando RSI semanal:", e);
  }
  return map;
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
    const alpacaKey = Deno.env.get("ALPACA_API_KEY");
    const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY");

    if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500);

    // deno-lint-ignore no-explicit-any
    let user: any = null;
    const isServiceRole = authHeader === `Bearer ${supabaseSvc}`;

    if (!isServiceRole) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseAuth.auth.getUser();
      if (authError || !authUser) return errJson("Unauthorized", 401);
      user = authUser;
    }

    const supabase = createClient(supabaseUrl, supabaseSvc);

    // deno-lint-ignore no-explicit-any
    let body: { criteria: any; user_id?: string };
    try {
      body = await req.json();
    } catch {
      return errJson("Invalid JSON body");
    }

    if (isServiceRole) {
      const userId = body.user_id || "88e3e6f6-e08f-4d13-8ec9-29ab0260df0f";
      user = { id: userId };
    }

    const { criteria } = body;
    if (!criteria) return errJson("criteria is required");

    // ── Step 0: universo vacío ────────────────────────────────────────────────
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
      console.warn("[Screener] screener_universe is empty.");
      return errJson("universe_not_synced", 400);
    }

    // ── Step 0b: si el universo está viejo, disparar sync SIN bloquear ───────
    // El sync completo tarda 1-2 min; esta corrida usa los datos actuales y la
    // siguiente ya encuentra el universo fresco. (Antes se esperaba con await y
    // el usuario pagaba esa latencia dentro del request.)
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count: staleCount } = await supabase
      .from("screener_universe")
      .select("*", { count: "exact", head: true })
      .lt("synced_at", staleThreshold.toISOString());

    if (staleCount && staleCount > 0) {
      console.log(
        `[Screener] ${staleCount} stale rows — disparando screener-universe-sync en background...`,
      );
      const syncPromise = fetch(
        `${supabaseUrl}/functions/v1/screener-universe-sync`,
        { headers: { Authorization: `Bearer ${supabaseAnon}` } },
      ).catch((e) =>
        console.error("[Screener] Error triggering screener-universe-sync:", e)
      );
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(syncPromise);
    }

    // ── Step A: filtrar TODO el universo en SQL ───────────────────────────────
    // deno-lint-ignore no-explicit-any
    const applyBaseFilters = (q: any) => {
      if (criteria.symbol_query) {
        // Sanitizar: coma/paréntesis/comillas rompen (o inyectan) filtros PostgREST
        const sq = String(criteria.symbol_query).replace(/[,()."'\\]/g, "");
        if (sq) {
          q = q.or(`symbol.ilike.%${sq}%,name.ilike.%${sq}%`);
        }
      }
      // Filas sin market cap conocido pasan este umbral: muchos nombres líquidos
      // entran al universo por dollar-volume y aún no tienen cap resuelto.
      if (criteria.market_cap_min) {
        q = q.or(
          `market_cap.gte.${criteria.market_cap_min},market_cap.is.null`,
        );
      }
      if (criteria.price_min) q = q.gte("price", criteria.price_min);
      if (criteria.price_max) q = q.lte("price", criteria.price_max);
      if (criteria.volume_avg_min) {
        q = q.gte("volume_avg_30d", criteria.volume_avg_min);
      }
      if (criteria.asset_class && criteria.asset_class !== "both") {
        q = q.eq("asset_class", criteria.asset_class);
      }
      return q;
    };

    const wantsGrowth = criteria.revenue_growth_min_pct != null;
    const wantsEps = !!criteria.eps_next_positive;
    const wantsRsi = criteria.rsi_weekly_min != null ||
      criteria.rsi_weekly_max != null;

    // Tamaño del universo que pasa los filtros base (para el desglose)
    const { count: universoBase } = await applyBaseFilters(
      supabase.from("screener_universe").select("*", {
        count: "exact",
        head: true,
      }),
    );

    // Candidatos estrictos: cumplen growth/EPS con dato conocido, en SQL.
    let strictQ = applyBaseFilters(supabase.from("screener_universe").select("*"));
    if (wantsGrowth) {
      strictQ = strictQ.gte("revenue_growth_pct", criteria.revenue_growth_min_pct);
    }
    if (wantsEps) strictQ = strictQ.eq("eps_next_positive", true);

    const { data: strictRowsRaw, error: universeError } = await strictQ
      .order("volume_avg_30d", { ascending: false, nullsFirst: false })
      .limit(200);
    if (universeError) {
      return errJson(`Universe query error: ${universeError.message}`, 500);
    }
    const strictRows = (strictRowsRaw ?? []) as UniverseRow[];

    const dollarVol = (r: UniverseRow) =>
      (r.price || 0) * (r.volume_avg_30d || 0);

    // Set de descubrimiento: símbolos líquidos con growth/EPS DESCONOCIDO (null).
    // Se resuelven on-the-fly (presupuesto acotado) para que la caché se sane
    // exactamente donde el screener mira. Solo si los estrictos son pocos.
    let discoveryRows: UniverseRow[] = [];
    if ((wantsGrowth || wantsEps) && strictRows.length < 15) {
      let dq = applyBaseFilters(supabase.from("screener_universe").select("*"));
      const unknownParts: string[] = [];
      if (wantsGrowth) unknownParts.push("revenue_growth_pct.is.null");
      if (wantsEps) unknownParts.push("eps_next_positive.is.null");
      dq = dq.or(unknownParts.join(","));
      // Lo que SÍ tiene dato debe seguir cumpliendo el criterio:
      if (wantsGrowth) {
        dq = dq.or(
          `revenue_growth_pct.is.null,revenue_growth_pct.gte.${criteria.revenue_growth_min_pct}`,
        );
      }
      if (wantsEps) {
        dq = dq.or("eps_next_positive.is.null,eps_next_positive.eq.true");
      }
      const { data: dRows } = await dq
        .order("volume_avg_30d", { ascending: false, nullsFirst: false })
        .limit(40);
      const strictSet = new Set(strictRows.map((r) => r.symbol));
      discoveryRows = ((dRows ?? []) as UniverseRow[])
        .filter((r) => !strictSet.has(r.symbol))
        .sort((a, b) => dollarVol(b) - dollarVol(a))
        .slice(0, 10);
    }

    const pipelineRows = [...strictRows, ...discoveryRows];
    const totalEvaluated = pipelineRows.length;
    console.log(
      `[A] Universo base: ${universoBase ?? "?"} | estrictos: ${strictRows.length} | descubrimiento: ${discoveryRows.length} | criteria: ${
        JSON.stringify(criteria)
      }`,
    );

    if (pipelineRows.length === 0) {
      const breakdown: FilterBreakdown = {
        universo_base: universoBase ?? 0,
        evaluados: 0,
        growth_sin_dato: 0,
        growth_insuficiente: 0,
        eps_descartados: 0,
        ath_sin_dato: 0,
        ath_lejos: 0,
        rsi_descartados: 0,
        rsi_omitido: false,
      };
      const summary =
        `Ningún activo del universo (${universoBase ?? 0} tras filtros base) cumple los criterios de crecimiento/EPS con datos conocidos. ` +
        `Probá bajar el mínimo de revenue growth o desactivar "EPS próximo positivo".`;
      const emptyResult = {
        user_id: user.id,
        criteria,
        results: [],
        total_candidates_evaluated: 0,
        total_passed_filters: 0,
        ai_summary: summary,
        run_at: new Date().toISOString(),
      };
      const { data: savedEmpty } = await supabase.from("screener_results")
        .insert(emptyResult).select().single();
      return okJson({
        ...emptyResult,
        id: savedEmpty?.id,
        filter_breakdown: breakdown,
      });
    }

    const symbols = pipelineRows.map((u) => u.symbol);

    // ── Step B: caché de fundamentales + resolución on-the-fly acotada ───────
    const { data: cachedFunds } = await supabase
      .from("fundamentals_cache")
      .select("*")
      .in("symbol", symbols);

    const cacheMap = new Map<string, FundamentalsRow>(
      (cachedFunds as FundamentalsRow[] | null)?.map((f) => [f.symbol, f]) ||
        [],
    );

    const now = Date.now();
    const TTL = 24 * 60 * 60 * 1000;
    const isStale = (sym: string) => {
      const cached = cacheMap.get(sym);
      if (!cached) return true;
      return now - new Date(cached.fetched_at).getTime() > TTL;
    };

    // Descubrimiento primero (necesitan dato para calificar), luego estrictos viejos.
    const toFetch = [
      ...discoveryRows.map((r) => r.symbol).filter(isStale),
      ...strictRows.map((r) => r.symbol).filter(isStale),
    ].slice(0, 20);

    console.log(
      `[B] Cache hits: ${cacheMap.size} | on-the-fly a resolver: ${toFetch.length}`,
    );

    for (const sym of toFetch) {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/fmp-proxy/fundamentals/${sym}`,
          { headers: { Authorization: authHeader } },
        );
        if (res.ok) {
          const resBody = await res.json();
          if (resBody.data) {
            cacheMap.set(sym, resBody.data as FundamentalsRow);
          }
        }
      } catch (e) {
        console.error(`[Screener] Error resolviendo fundamentales de ${sym}:`, e);
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    // ── Step C: construir candidatos y aplicar filtros (con desglose) ────────
    const counters = {
      growth_sin_dato: 0,
      growth_insuficiente: 0,
      eps_descartados: 0,
      ath_sin_dato: 0,
      ath_lejos: 0,
      rsi_descartados: 0,
    };

    const enriched = pipelineRows.map((c) => {
      const f = cacheMap.get(c.symbol);
      // El precio autoritativo viene de screener_universe (sync Alpaca delayed_sip);
      // fundamentals_cache.price es solo fallback secundario.
      const price = c.price ?? f?.price ?? null;
      const w52h = f?.week_52_high ?? null;
      const athDistancePct = w52h != null && price != null && w52h > 0
        ? ((price - w52h) / w52h) * 100
        : null;

      return {
        symbol: c.symbol,
        name: f?.name ?? c.name,
        price,
        market_cap: f?.market_cap ?? c.market_cap,
        revenue_growth_pct: f?.revenue_growth_pct ?? c.revenue_growth_pct ?? null,
        eps_next_estimate: f?.eps_next_estimate ?? f?.eps_current ?? null,
        pe_ratio: f?.pe_ratio ?? null,
        next_earnings_date: f?.next_earnings_date ?? null,
        ath_distance_pct: athDistancePct,
        rsi_weekly: null as number | null,
        volume_avg: c.volume_avg_30d ?? 0,
      };
    });

    let survivors = enriched.filter((c) => {
      if (wantsGrowth) {
        if (c.revenue_growth_pct == null) {
          counters.growth_sin_dato++;
          return false;
        }
        if (c.revenue_growth_pct < criteria.revenue_growth_min_pct) {
          counters.growth_insuficiente++;
          return false;
        }
      }
      if (wantsEps) {
        if (c.eps_next_estimate == null || c.eps_next_estimate <= 0) {
          counters.eps_descartados++;
          return false;
        }
      }
      if (criteria.ath_distance_max_pct != null) {
        if (c.ath_distance_pct == null) {
          counters.ath_sin_dato++;
          return false;
        }
        if (c.ath_distance_pct < criteria.ath_distance_max_pct) {
          counters.ath_lejos++;
          return false;
        }
      }
      return true;
    });

    // Orden por crecimiento y recorte de trabajo para la etapa RSI/Claude
    survivors = survivors
      .sort((a, b) => (b.revenue_growth_pct || 0) - (a.revenue_growth_pct || 0))
      .slice(0, 30);

    // ── Step C2: RSI semanal real (llena la columna y aplica el filtro) ──────
    let rsiOmitido = false;
    if (survivors.length > 0 && alpacaKey && alpacaSecret) {
      const rsiMap = await fetchWeeklyRsi(
        survivors.map((s) => s.symbol),
        alpacaKey,
        alpacaSecret,
      );
      if (rsiMap.size > 0) {
        for (const c of survivors) c.rsi_weekly = rsiMap.get(c.symbol) ?? null;
        // Persistir en market_data_cache para reuso (best-effort)
        await Promise.allSettled(
          [...rsiMap].map(([sym, rsi]) =>
            supabase.from("market_data_cache").update({ rsi_weekly: rsi }).eq(
              "symbol",
              sym,
            )
          ),
        );
      } else if (wantsRsi) {
        rsiOmitido = true;
      }
    } else if (wantsRsi) {
      rsiOmitido = true;
    }

    if (wantsRsi && !rsiOmitido) {
      survivors = survivors.filter((c) => {
        const r = c.rsi_weekly;
        if (r == null) {
          counters.rsi_descartados++;
          return false;
        }
        if (criteria.rsi_weekly_min != null && r < criteria.rsi_weekly_min) {
          counters.rsi_descartados++;
          return false;
        }
        if (criteria.rsi_weekly_max != null && r > criteria.rsi_weekly_max) {
          counters.rsi_descartados++;
          return false;
        }
        return true;
      });
    }

    const candidates = survivors.slice(0, 15);

    const breakdown: FilterBreakdown = {
      universo_base: universoBase ?? 0,
      evaluados: totalEvaluated,
      ...counters,
      rsi_omitido: rsiOmitido,
    };

    console.log(
      `[C] Sobreviven: ${candidates.length} de ${totalEvaluated} | desglose: ${
        JSON.stringify(breakdown)
      } | símbolos: ${candidates.map((c) => c.symbol).join(",")}`,
    );

    // ── Early return: sin candidatos no se llama a Claude ────────────────────
    if (candidates.length === 0) {
      const razones: string[] = [];
      if (counters.growth_sin_dato) {
        razones.push(`${counters.growth_sin_dato} sin dato de crecimiento aún`);
      }
      if (counters.growth_insuficiente) {
        razones.push(
          `${counters.growth_insuficiente} con crecimiento < ${criteria.revenue_growth_min_pct}%`,
        );
      }
      if (counters.eps_descartados) {
        razones.push(`${counters.eps_descartados} sin EPS positivo`);
      }
      if (counters.ath_sin_dato) {
        razones.push(`${counters.ath_sin_dato} sin dato de máximo 52s`);
      }
      if (counters.ath_lejos) {
        razones.push(`${counters.ath_lejos} demasiado lejos del ATH`);
      }
      if (counters.rsi_descartados) {
        razones.push(`${counters.rsi_descartados} fuera del rango de RSI`);
      }
      const summary =
        `Ningún candidato pasó los filtros: de ${totalEvaluated} evaluados (universo base: ${
          universoBase ?? 0
        }), ${razones.join(", ")}. ` +
        `Sugerencia: relajá el criterio más restrictivo y volvé a correr.`;

      const emptyResult = {
        user_id: user.id,
        criteria,
        results: [],
        total_candidates_evaluated: totalEvaluated,
        total_passed_filters: 0,
        ai_summary: summary,
        run_at: new Date().toISOString(),
      };
      const { data: savedEmpty, error: saveEmptyErr } = await supabase
        .from("screener_results").insert(emptyResult).select().single();
      if (saveEmptyErr) {
        console.error("Error saving empty screener result:", saveEmptyErr);
      }
      return okJson({
        ...emptyResult,
        id: savedEmpty?.id,
        filter_breakdown: breakdown,
      });
    }

    // ── Step D: contexto de portafolio ───────────────────────────────────────
    const { data: positions } = await supabase
      .from("positions")
      .select("symbol, portfolio_weight_pct")
      .eq("user_id", user.id);

    const portfolioInfo = positions?.map(
      (p: { symbol: string; portfolio_weight_pct: number | null }) => ({
        symbol: p.symbol,
        portfolio_weight_pct: p.portfolio_weight_pct,
      }),
    ) || [];

    // ── Step E: Claude scoring ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const candidateData = candidates.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      price: c.price,
      market_cap: c.market_cap,
      revenue_growth_pct: c.revenue_growth_pct,
      ath_distance_pct: c.ath_distance_pct,
      rsi_weekly: c.rsi_weekly,
      eps_next_estimate: c.eps_next_estimate,
      next_earnings_date: c.next_earnings_date,
      volume_avg: c.volume_avg,
    }));

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

    // ── Step F: combinar y guardar ───────────────────────────────────────────
    const portfolioSymbols = new Set(
      positions?.map((p: { symbol: string }) => p.symbol) || [],
    );

    // Ignorar ítems que Claude haya devuelto fuera de los candidatos reales
    // (evita filas sin symbol/price y mantiene honesto el contador).
    // deno-lint-ignore no-explicit-any
    const finalItems = (Array.isArray(aiResult.items) ? aiResult.items : [])
      // deno-lint-ignore no-explicit-any
      .filter((item: any) =>
        candidateData.some((c) => c.symbol === item.symbol)
      )
      // deno-lint-ignore no-explicit-any
      .map((item: any) => {
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
      total_passed_filters: finalItems.length,
      ai_summary: aiResult.summary,
      run_at: new Date().toISOString(),
    };

    const { data: savedResult, error: saveError } = await supabase
      .from("screener_results")
      .insert(screenerResult)
      .select()
      .single();

    if (saveError) console.error("Error saving screener results:", saveError);

    return okJson({
      ...screenerResult,
      id: savedResult?.id,
      filter_breakdown: breakdown,
    });
  } catch (e) {
    console.error("[Screener Global Error]:", e);
    return errJson(e instanceof Error ? e.message : String(e), 500);
  }
});
