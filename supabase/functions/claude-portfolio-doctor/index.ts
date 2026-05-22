// supabase/functions/claude-portfolio-doctor/index.ts
// Análisis holístico del portafolio completo usando Claude.
// No usa streaming — espera la respuesta completa y retorna JSON estructurado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function errJson(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon  = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseSvc   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey  = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500);

    // ── JWT validation ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errJson("Missing Authorization", 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return errJson("Unauthorized", 401);

    const adminClient = createClient(supabaseUrl, supabaseSvc);

    // ── a) Leer posiciones del usuario ───────────────────────────────────────
    const { data: positions, error: posErr } = await adminClient
      .from("positions")
      .select("*")
      .eq("user_id", user.id);

    if (posErr) return errJson("Error leyendo posiciones", 500);
    if (!positions || positions.length === 0) {
      return errJson("Sin posiciones abiertas para analizar", 400);
    }

    // ── b) Fundamentales cacheados para cada posición ────────────────────────
    const symbols = [...new Set(positions.map((p) => p.symbol as string))];
    const { data: fundamentals } = await adminClient
      .from("fundamentals_cache")
      .select("*")
      .in("symbol", symbols);

    const fundMap = new Map<string, Record<string, unknown>>();
    for (const f of fundamentals ?? []) {
      fundMap.set(f.symbol as string, f as Record<string, unknown>);
    }

    // ── c) Equity snapshots últimos 30 días ──────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: snapshots } = await adminClient
      .from("equity_snapshots")
      .select("equity, snapshot_at, broker")
      .eq("user_id", user.id)
      .gte("snapshot_at", thirtyDaysAgo)
      .order("snapshot_at", { ascending: true })
      .limit(60);

    const totalEquity = positions.reduce(
      (sum, p) => sum + (p.market_value as number),
      0,
    );

    // ── d) Construir prompt estructurado ─────────────────────────────────────

    const positionsSummary = positions.map((p) => {
      const f = fundMap.get(p.symbol as string);
      return {
        symbol: p.symbol,
        broker: p.broker,
        asset_class: p.asset_class,
        qty: p.qty,
        avg_entry_price: p.avg_entry_price,
        current_price: p.current_price,
        market_value: p.market_value,
        unrealized_pnl: p.unrealized_pnl,
        unrealized_pnl_pct: p.unrealized_pnl_pct,
        portfolio_weight_pct: totalEquity > 0
          ? ((p.market_value as number) / totalEquity) * 100
          : 0,
        fundamentals: f
          ? {
              eps_current: f.eps_current,
              eps_next_estimate: f.eps_next_estimate,
              eps_growth_next_pct: f.eps_growth_next_pct,
              revenue_growth_pct: f.revenue_growth_pct,
              pe_ratio: f.pe_ratio,
              next_earnings_date: f.next_earnings_date,
            }
          : null,
      };
    });

    const equityTrend = (snapshots ?? [])
      .filter((s) => s.broker === "total" || s.broker === "alpaca")
      .slice(-7)
      .map((s) => ({
        date: (s.snapshot_at as string).split("T")[0],
        equity: s.equity,
      }));

    const userPrompt = `Analizá este portafolio completo y devolvé ÚNICAMENTE un objeto JSON válido (sin markdown, sin bloques de código, solo el JSON).

PORTAFOLIO ACTUAL:
- Equity total: $${totalEquity.toFixed(2)}
- Posiciones: ${JSON.stringify(positionsSummary, null, 2)}
- Tendencia equity últimos 7 días: ${JSON.stringify(equityTrend)}

Devolvé exactamente este schema JSON:
{
  "risk_level": "Conservative" | "Moderate" | "Aggressive",
  "sections": [
    {
      "icon": "🎯",
      "title": "NIVEL DE RIESGO",
      "content": "justificación del nivel de riesgo en 2-3 oraciones"
    },
    {
      "icon": "📊",
      "title": "CONCENTRACIÓN",
      "content": "análisis de distribución por sector/activo"
    },
    {
      "icon": "🔗",
      "title": "CORRELACIÓN",
      "content": "posiciones que se mueven juntas y qué riesgo representa"
    },
    {
      "icon": "⚖️",
      "title": "POSICIONES DÉBILES",
      "content": "máximo 2 posiciones con datos fundamentales concretos",
      "recommendations": [{"symbol": "TICKER", "action": "Reducir exposición"}]
    },
    {
      "icon": "✂️",
      "title": "QUÉ RECORTARÍA",
      "content": "qué venderías y a qué precio",
      "recommendations": [{"symbol": "TICKER", "action": "Ver en Trading"}]
    },
    {
      "icon": "📈",
      "title": "QUÉ AMPLIARÍA",
      "content": "qué comprarías más y por qué",
      "recommendations": [{"symbol": "TICKER", "action": "Ver en Trading"}]
    },
    {
      "icon": "🚀",
      "title": "OPORTUNIDAD AUSENTE",
      "content": "qué sector o activo falta en este portafolio y por qué"
    }
  ]
}`;

    // ── e) Llamar Claude API ─────────────────────────────────────────────────
    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: "Sos un gestor de portafolio senior con 20 años de experiencia. Analizás portafolios de forma holística — no activo por activo sino como un sistema. Respondés en español. Sos directo, concreto y das recomendaciones accionables. IMPORTANTE: Devolvés ÚNICAMENTE JSON válido sin markdown ni texto adicional.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error("Claude API error:", err);
      return errJson("Error en Claude API", 502);
    }

    const claudeData = await claudeRes.json();
    const rawText = (claudeData.content?.[0]?.text as string | undefined) ?? "";

    // ── f) Parsear respuesta JSON de Claude ──────────────────────────────────
    let analysis: Record<string, unknown>;
    try {
      // Claude a veces envuelve en ```json ... ``` — limpiamos por las dudas
      const cleaned = rawText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      analysis = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (e) {
      console.error("JSON parse error from Claude:", e, "Raw:", rawText.slice(0, 500));
      return errJson("El análisis de Claude no pudo parsearse", 502);
    }

    // ── g) Guardar en research_entries ───────────────────────────────────────
    await adminClient.from("research_entries").insert({
      user_id: user.id,
      symbol: "PORTFOLIO",
      query: "Portfolio Doctor — análisis holístico",
      analysis: rawText,
      data_used: {
        total_equity: totalEquity,
        positions_count: positions.length,
        fetched_at: new Date().toISOString(),
      },
      portfolio_context: {
        has_position: true,
        total_portfolio_equity: totalEquity,
      },
      model: "claude-3-5-sonnet-20241022",
    });

    return jsonResponse({
      risk_level: analysis.risk_level ?? "Moderate",
      sections: analysis.sections ?? [],
      analysis_date: new Date().toISOString(),
    });
  } catch (e) {
    console.error("claude-portfolio-doctor error:", e);
    return errJson(e instanceof Error ? e.message : String(e), 500);
  }
});
