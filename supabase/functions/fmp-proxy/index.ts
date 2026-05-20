// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/fmp-proxy/index.ts
// Fallback chain: FMP (detecta 403) → Alpha Vantage → Yahoo → null
// AV es fuente primaria cuando FMP retorna 403 (Legacy Endpoint en plan free)
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const AV_BASE = "https://www.alphavantage.co/query";
const YAHOO_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const ALPACA_DATA = "https://data.alpaca.markets/v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err("Missing Authorization header", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fmpKey = Deno.env.get("FMP_API_KEY");
  const avKey = Deno.env.get("ALPHA_VANTAGE_KEY");
  const alpacaKey = Deno.env.get("ALPACA_API_KEY");
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY");

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user) return err("Unauthorized", 401);

  const supabase = createClient(supabaseUrl, supabaseSvc);

  // ── Routing robusto ─────────────────────────────────────────────────────────
  // En producción Supabase puede entregar el path como:
  //   /functions/v1/fmp-proxy/fundamentals/PLTR  (local dev)
  //   /fmp-proxy/fundamentals/PLTR               (producción)
  // Usamos split para extraer lo que viene DESPUÉS de "fmp-proxy"
  const url = new URL(req.url);
  const pathname = url.pathname.split("/fmp-proxy").pop() ?? "/";
  const endpoint = pathname.split("/").filter(Boolean);

  console.log(
    `[fmp-proxy] method=${req.method} pathname=${url.pathname} → parsed=[${endpoint.join(",")}]`,
  );

  try {
    // GET /fundamentals/{symbol}
    if (endpoint[0] === "fundamentals" && endpoint[1]) {
      const symbol = endpoint[1].toUpperCase();
      if (!fmpKey) {
        // Sin FMP key: AV primero, Yahoo como fallback
        if (avKey) return await fetchAlphaVantage(symbol, supabase, avKey);
        return await fetchYahooFinance(symbol, supabase, null);
      }
      return await getFundamentals(symbol, supabase, fmpKey, avKey ?? null);
    }

    // GET /earnings-calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
    if (endpoint[0] === "earnings-calendar") {
      if (!fmpKey) return err("FMP_API_KEY not configured", 500);
      const from =
        url.searchParams.get("from") ?? new Date().toISOString().split("T")[0];
      const to = url.searchParams.get("to") ?? addDays(new Date(), 30);
      return await getEarningsCalendar(from, to, fmpKey);
    }

    // GET /market-data/{symbol} — Alpaca bars para 52w high/low + AV para fundamentales
    if (endpoint[0] === "market-data" && endpoint[1]) {
      const symbol = endpoint[1].toUpperCase();
      return await getMarketData(symbol, supabase, alpacaKey ?? null, alpacaSecret ?? null);
    }

    // GET /finviz/{symbol}  (ahora usa Yahoo Finance internamente)
    if (endpoint[0] === "finviz" && endpoint[1]) {
      const symbol = endpoint[1].toUpperCase();
      return await fetchYahooFinance(symbol, supabase, avKey ?? null);
    }

    console.warn(
      `[fmp-proxy] Unknown endpoint: [${endpoint.join(",")}] | full path: ${url.pathname}`,
    );
    return err("Unknown endpoint", 404);
  } catch (e) {
    console.error("fmp-proxy error:", e);
    return err("Internal server error", 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// getFundamentals — FMP con cache de 24h
// Si FMP retorna 403 (Legacy Endpoint), deriva a AV → Yahoo
// Endpoints free: /quote (price+52w), /key-metrics (EPS, PE), /analyst-estimates
// ─────────────────────────────────────────────────────────────────────────────

async function getFundamentals(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  fmpKey: string,
  avKey: string | null,
) {
  // 1. Cache
  const { data: cached } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .eq("symbol", symbol)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      console.log(`[FMP] Cache hit for ${symbol}`);
      return json({ source: "cache", data: cached });
    }
  }

  // 2. FMP /quote — detectar 403 antes de continuar
  const quoteRes = await fetch(`${FMP_BASE}/quote/${symbol}?apikey=${fmpKey}`);
  console.log(`[FMP] ${symbol} quote status: ${quoteRes.status}`);

  if (quoteRes.status === 403) {
    console.warn(`[FMP] 403 Legacy Endpoint para ${symbol} — derivando a AV`);
    if (avKey) return await fetchAlphaVantage(symbol, supabase, avKey);
    return await fetchYahooFinance(symbol, supabase, null);
  }

  const quoteRaw = await quoteRes.text();
  console.log(`[FMP] ${symbol} quote body (300): ${quoteRaw.substring(0, 300)}`);

  // 3. FMP /key-metrics y /analyst-estimates (en paralelo, solo si quote OK)
  const [metricsRes, estimatesRes] = await Promise.all([
    fetch(`${FMP_BASE}/key-metrics/${symbol}?limit=1&apikey=${fmpKey}`),
    fetch(`${FMP_BASE}/analyst-estimates/${symbol}?limit=1&apikey=${fmpKey}`),
  ]);
  const [metricsRaw, estimatesRaw] = await Promise.all([
    metricsRes.text(),
    estimatesRes.text(),
  ]);

  let quoteData, metricsData, estimatesData;
  try {
    quoteData = JSON.parse(quoteRaw);
    metricsData = JSON.parse(metricsRaw);
    estimatesData = JSON.parse(estimatesRaw);
  } catch (e) {
    console.error(`[FMP] JSON parse error for ${symbol}:`, e);
    if (avKey) return await fetchAlphaVantage(symbol, supabase, avKey);
    return await fetchYahooFinance(symbol, supabase, null);
  }

  const quote = Array.isArray(quoteData) ? quoteData[0] : null;
  const metrics = Array.isArray(metricsData) ? metricsData[0] : null;
  const estimates = Array.isArray(estimatesData) ? estimatesData[0] : null;

  if (!quote) {
    console.warn(`[FMP] No quote para ${symbol} — derivando a AV`);
    if (avKey) return await fetchAlphaVantage(symbol, supabase, avKey);
    return await fetchYahooFinance(symbol, supabase, null);
  }

  const epsNext = estimates?.estimatedEpsAvg ?? null;
  const epsCurr = quote.eps ?? metrics?.eps ?? null;
  const epsGrowthPct =
    epsNext && epsCurr && epsCurr !== 0
      ? ((epsNext - epsCurr) / Math.abs(epsCurr)) * 100
      : null;

  console.log(`[FMP] ${symbol} yearHigh=${quote.yearHigh} yearLow=${quote.yearLow}`);

  const payload = {
    symbol,
    eps_current: epsCurr,
    eps_next_estimate: epsNext,
    eps_growth_next_pct: epsGrowthPct,
    revenue_growth_pct: metrics?.revenueGrowth != null ? metrics.revenueGrowth * 100 : null,
    pe_ratio: quote.pe ?? metrics?.peRatio ?? null,
    next_earnings_date: quote.earningsAnnouncement
      ? quote.earningsAnnouncement.split("T")[0]
      : null,
    next_earnings_estimate_eps: epsNext,
    price: quote.price ?? null,
    market_cap: quote.marketCap ?? null,
    week_52_high: quote.yearHigh ?? null,
    week_52_low: quote.yearLow ?? null,
    price_change_pct_1d: quote.changesPercentage ?? null,
    volume: quote.volume ?? null,
    name: quote.name ?? symbol,
    fetched_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from("fundamentals_cache").upsert({
    symbol,
    eps_current: payload.eps_current,
    eps_next_estimate: payload.eps_next_estimate,
    eps_growth_next_pct: payload.eps_growth_next_pct,
    revenue_growth_pct: payload.revenue_growth_pct,
    pe_ratio: payload.pe_ratio,
    next_earnings_date: payload.next_earnings_date,
    next_earnings_estimate_eps: payload.next_earnings_estimate_eps,
    price: payload.price,
    market_cap: payload.market_cap,
    week_52_high: payload.week_52_high,
    week_52_low: payload.week_52_low,
    price_change_pct_1d: payload.price_change_pct_1d,
    volume: payload.volume,
    name: payload.name,
    fetched_at: new Date().toISOString(),
  });
  if (upsertErr) {
    console.error(`[FMP] Upsert error para ${symbol}:`, JSON.stringify(upsertErr));
  } else {
    console.log(`[FMP] Upsert OK para ${symbol} — week_52_high=${payload.week_52_high}`);
  }

  return json({ source: "fmp", data: payload });
}

// ─────────────────────────────────────────────────────────────────────────────
// getEarningsCalendar
// ─────────────────────────────────────────────────────────────────────────────

async function getEarningsCalendar(from: string, to: string, fmpKey: string) {
  const res = await fetch(
    `${FMP_BASE}/earning_calendar?from=${from}&to=${to}&apikey=${fmpKey}`,
  );
  const data = await res.json();
  return json({ source: "fmp", data });
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// getMarketData — Alpaca bars para price/week_52_high/week_52_low/volume
// ─────────────────────────────────────────────────────────────────────────────

async function getMarketData(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  alpacaKey: string | null,
  alpacaSecret: string | null,
) {
  // 1. Cache
  const { data: cached } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .eq("symbol", symbol)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      console.log(`[MarketData] Cache hit for ${symbol}`);
      return json({ source: "cache", data: cached });
    }
  }

  // 2. Alpaca: 252 daily bars → week_52_high, week_52_low, price, volume
  let w52h: number | null = null;
  let w52l: number | null = null;
  let currentPrice: number | null = null;
  let currentVolume: number | null = null;

  if (alpacaKey && alpacaSecret) {
    try {
      const barsUrl = `${ALPACA_DATA}/stocks/bars?symbols=${symbol}&timeframe=1Day&limit=252&adjustment=raw`;
      const barsRes = await fetch(barsUrl, {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
      });
      console.log(`[MarketData] Alpaca bars status for ${symbol}: ${barsRes.status}`);

      if (barsRes.ok) {
        const barsBody = await barsRes.json();
        const bars: { h: number; l: number; c: number; v: number }[] =
          barsBody.bars?.[symbol] ?? [];

        if (bars.length > 0) {
          w52h = Math.max(...bars.map((b) => b.h));
          w52l = Math.min(...bars.map((b) => b.l));
          currentPrice = bars[bars.length - 1].c;
          currentVolume = bars[bars.length - 1].v;
          console.log(
            `[MarketData] Alpaca ${symbol}: price=${currentPrice} 52h=${w52h} 52l=${w52l} bars=${bars.length}`,
          );
        } else {
          console.warn(`[MarketData] Alpaca returned 0 bars for ${symbol} — returning null`);
          return json({ source: "alpaca", data: null });
        }
      }
    } catch (e) {
      console.error(`[MarketData] Alpaca fetch error for ${symbol}:`, e);
    }
  }

  const payload = {
    symbol,
    price: currentPrice,
    week_52_high: w52h,
    week_52_low: w52l,
    volume: currentVolume,
    market_cap: null,
    eps_current: null,
    eps_next_estimate: null,
    eps_growth_next_pct: null,
    revenue_growth_pct: null,
    pe_ratio: null,
    next_earnings_date: null,
    next_earnings_estimate_eps: null,
    price_change_pct_1d: null,
    name: symbol,
    fetched_at: new Date().toISOString(),
  };

  // 4. Upsert — never overwrite valid 52w data with null
  const row: Record<string, unknown> = { ...payload };
  if (payload.week_52_high === null) delete row.week_52_high;
  if (payload.week_52_low === null) delete row.week_52_low;

  const { error: upsertErr } = await supabase
    .from("fundamentals_cache")
    .upsert(row, { onConflict: "symbol" });
  if (upsertErr) {
    console.error(`[MarketData] Upsert error for ${symbol}:`, JSON.stringify(upsertErr));
  } else {
    console.log(`[MarketData] Upsert OK for ${symbol} — week_52_high=${payload.week_52_high}`);
  }

  return json({ source: "alpaca+fundamentals", data: payload });
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchYahooFinance — fuente primaria cuando FMP falla
// Fix: retorna 200 con data:null en lugar de 502 cuando todo falla
// ─────────────────────────────────────────────────────────────────────────────

async function fetchYahooFinance(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  avKey: string | null,
) {
  // 1. Cache
  const { data: cached } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .eq("symbol", symbol)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      console.log(`[Yahoo] Cache hit for ${symbol}`);
      return json({ source: "cache", data: cached });
    }
  }

  // 2. Yahoo Finance
  const modules =
    "financialData,defaultKeyStatistics,earningsTrend,summaryDetail,calendarEvents,quoteType";
  const yahooUrl = `${YAHOO_BASE}/${symbol}?modules=${modules}&corsDomain=finance.yahoo.com`;
  console.log(`[Yahoo] Fetching ${symbol}`);

  let yahooOk = false;
  let payload: Record<string, unknown> | null = null;

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com",
      },
    });

    console.log(`[Yahoo] ${symbol} status: ${res.status}`);

    if (res.ok) {
      const body = await res.json();
      const result = body.quoteSummary?.result?.[0];

      if (result) {
        const stats = result.defaultKeyStatistics ?? {};
        const fin = result.financialData ?? {};
        const summary = result.summaryDetail ?? {};
        const trend = result.earningsTrend?.trend?.[0] ?? {};
        const calendar = result.calendarEvents?.earnings ?? {};
        const qType = result.quoteType ?? {};

        const epsCurr = stats.trailingEps?.raw ?? null;
        const epsNextVal = trend.earningsEstimate?.avg?.raw ?? null;
        const peRatio = summary.trailingPE?.raw ?? null;
        const revenueGrowth = fin.revenueGrowth?.raw
          ? fin.revenueGrowth.raw * 100
          : null;
        const earningsDate =
          calendar.earningsDate?.[0]?.fmt ?? trend.endDate ?? null;
        const epsGrowthPct =
          epsNextVal && epsCurr && epsCurr !== 0
            ? ((epsNextVal - epsCurr) / Math.abs(epsCurr)) * 100
            : null;

        const w52h =
          summary.fiftyTwoWeekHigh?.raw ??
          stats.fiftyTwoWeekHigh?.raw ??
          null;
        const w52l =
          summary.fiftyTwoWeekLow?.raw ??
          stats.fiftyTwoWeekLow?.raw ??
          null;

        console.log(
          `[Yahoo] ${symbol} 52w: high=${w52h} low=${w52l} | summaryDetail.fiftyTwoWeekHigh?.raw=${summary.fiftyTwoWeekHigh?.raw} | defaultKeyStatistics.fiftyTwoWeekHigh?.raw=${stats.fiftyTwoWeekHigh?.raw}`,
        );

        payload = {
          symbol,
          eps_current: epsCurr,
          eps_next_estimate: epsNextVal,
          eps_growth_next_pct: epsGrowthPct,
          revenue_growth_pct: revenueGrowth,
          pe_ratio: peRatio,
          next_earnings_date: earningsDate,
          next_earnings_estimate_eps: epsNextVal,
          price: fin.currentPrice?.raw ?? summary.previousClose?.raw ?? summary.regularMarketPrice?.raw ?? null,
          market_cap: summary.marketCap?.raw ?? null,
          week_52_high: w52h,
          week_52_low: w52l,
          price_change_pct_1d: null,
          volume: summary.volume?.raw ?? null,
          name: qType.longName ?? qType.shortName ?? symbol,
          fetched_at: new Date().toISOString(),
        };
        yahooOk = true;
        console.log(
          `[Yahoo] ${symbol} OK — PE=${peRatio}, EPS=${epsCurr}, Rev%=${revenueGrowth}`,
        );
      } else {
        console.warn(`[Yahoo] ${symbol} — no result in body`);
      }
    }
  } catch (e) {
    console.error(`[Yahoo] Fetch error for ${symbol}:`, e);
  }

  // 3. Fallback Alpha Vantage si Yahoo falló
  if (!yahooOk) {
    if (avKey) {
      console.log(`[Yahoo→AV] Fallback para ${symbol}`);
      return await fetchAlphaVantage(symbol, supabase, avKey);
    }
    // Sin AV key: retornar 200 con data:null para que el Research corra sin fundamentales
    // (no bloquear el análisis completo por falta de un dato)
    console.warn(`[Yahoo] ${symbol} sin datos y sin AV key — retornando null`);
    return json({ source: "yahoo", data: null }, 200);
  }

  // 4. Upsert cache — never overwrite week_52_high/low with null
  if (payload) {
    const baseRow: Record<string, unknown> = {
      symbol,
      eps_current: payload.eps_current,
      eps_next_estimate: payload.eps_next_estimate,
      eps_growth_next_pct: payload.eps_growth_next_pct,
      revenue_growth_pct: payload.revenue_growth_pct,
      pe_ratio: payload.pe_ratio,
      next_earnings_date: payload.next_earnings_date,
      next_earnings_estimate_eps: payload.next_earnings_estimate_eps,
      price: payload.price,
      market_cap: payload.market_cap,
      price_change_pct_1d: payload.price_change_pct_1d,
      volume: payload.volume,
      name: payload.name,
      fetched_at: new Date().toISOString(),
    };
    if (payload.week_52_high !== null) baseRow.week_52_high = payload.week_52_high;
    if (payload.week_52_low !== null) baseRow.week_52_low = payload.week_52_low;

    const { error: upsertErr } = await supabase
      .from("fundamentals_cache")
      .upsert(baseRow, { onConflict: "symbol" });
    if (upsertErr) {
      console.error(
        `[Yahoo] Upsert error for ${symbol}:`,
        JSON.stringify(upsertErr),
      );
    } else {
      console.log(
        `[Yahoo] Upsert OK for ${symbol} — week_52_high=${payload.week_52_high}`,
      );
    }
  }

  return json({ source: "yahoo", data: payload });
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchAlphaVantage — fallback final
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAlphaVantage(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  avKey: string,
) {
  console.log(`[AV] Fetching OVERVIEW + GLOBAL_QUOTE for ${symbol}`);

  const [overviewRes, quoteRes] = await Promise.all([
    fetch(`${AV_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${avKey}`),
    fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${avKey}`),
  ]);

  const [overviewBody, quoteBody] = await Promise.all([
    overviewRes.text(),
    quoteRes.text(),
  ]);

  let av: Record<string, string>;
  let gq: Record<string, string>;

  try {
    av = JSON.parse(overviewBody);
    const gqRaw = JSON.parse(quoteBody);
    gq = gqRaw["Global Quote"] ?? {};
  } catch {
    console.error("[AV] JSON parse error");
    return json({ source: "alpha_vantage", data: null }, 200);
  }

  if (!av.Symbol || av.Note || av.Information) {
    console.warn("[AV] Rate-limited or empty:", overviewBody.slice(0, 200));
    return json({ source: "alpha_vantage", data: null }, 200);
  }

  const n = (key: string) => {
    const v = parseFloat(av[key] ?? "");
    return isNaN(v) ? null : v;
  };

  const currentPrice = parseFloat(gq["05. price"] ?? "") || null;
  const changePctRaw = gq["10. change percent"]?.replace("%", "") ?? "";
  const priceChangePct1d = parseFloat(changePctRaw) || null;
  const currentVolume = parseFloat(gq["06. volume"] ?? "") || null;

  const payload = {
    symbol,
    eps_current: n("EPS"),
    eps_next_estimate: n("ForwardEPS"),
    eps_growth_next_pct: null,
    revenue_growth_pct: null,
    pe_ratio: n("PERatio"),
    next_earnings_date: av.NextEarningsDate ?? null,
    next_earnings_estimate_eps: n("ForwardEPS"),
    price: currentPrice,
    market_cap: n("MarketCapitalization"),
    week_52_high: n("52WeekHigh"),
    week_52_low: n("52WeekLow"),
    price_change_pct_1d: priceChangePct1d,
    volume: currentVolume,
    name: av.Name ?? symbol,
    fetched_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from("fundamentals_cache")
    .upsert(payload);
  if (upsertErr) {
    console.error(
      `[AV] Upsert error for ${symbol}:`,
      JSON.stringify(upsertErr),
    );
  } else {
    console.log(
      `[AV] Upsert OK for ${symbol} — week_52_high=${payload.week_52_high}`,
    );
  }

  return json({ source: "alpha_vantage", data: payload });
}
