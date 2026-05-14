// supabase/functions/binance-proxy/index.ts
// Proxy a Binance Spot API. Devuelve posiciones normalizadas al mismo formato
// que alpaca-proxy para unificar en usePortfolio.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STABLECOINS = new Set(["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP", "FDUSD", "USDS"]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-user-token",
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

async function signQuery(query: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(query));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon   = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseSvc    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const binanceKey     = Deno.env.get("BINANCE_API_KEY");
  const binanceSecret  = Deno.env.get("BINANCE_SECRET_KEY");

  // Graceful: si no está configurado devolver estado vacío en lugar de error
  if (!binanceKey || !binanceSecret) {
    return jsonResponse({ configured: false, positions: [], equity: 0, cash: 0 });
  }

  const url     = new URL(req.url);
  const subPath = url.pathname.split("/binance-proxy")[1] ?? "/";

  // ── JWT validation via Supabase Auth ────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ??
    req.headers.get("x-user-token")?.replace(/^Bearer\s+/i, "").replace(/^/, "Bearer ");
  if (!authHeader) return errJson("Missing authorization", 401);

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !user) return errJson("Unauthorized", 401);

  const adminClient = createClient(supabaseUrl, supabaseSvc);
  const BASE = "https://api.binance.com";

  try {
    // ── GET /positions — balances spot normalizados al tipo Position ────────
    if (req.method === "GET" && subPath === "/positions") {
      const timestamp   = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature   = await signQuery(queryString, binanceSecret);

      const accountRes = await fetch(
        `${BASE}/api/v3/account?${queryString}&signature=${signature}`,
        { headers: { "X-MBX-APIKEY": binanceKey } },
      );
      const accountData = await accountRes.json();
      if (!accountRes.ok) return errJson(accountData.msg ?? "Binance error", accountRes.status);

      // Separar stablecoins (cash) de activos reales
      const rawBalances = (accountData.balances as Array<{ asset: string; free: string; locked: string }>)
        .map((b) => ({
          asset: b.asset,
          qty: parseFloat(b.free) + parseFloat(b.locked),
        }))
        .filter((b) => b.qty > 0);

      const stableBalance = rawBalances
        .filter((b) => STABLECOINS.has(b.asset))
        .reduce((sum, b) => sum + b.qty, 0);

      const cryptoBalances = rawBalances.filter((b) => !STABLECOINS.has(b.asset));

      if (cryptoBalances.length === 0) {
        return jsonResponse({ configured: true, positions: [], equity: stableBalance, cash: stableBalance });
      }

      // Fetchear precios en batch — Binance acepta ["BTCUSDT","ETHUSDT",...]
      const symbols = cryptoBalances.map((b) => `"${b.asset}USDT"`).join(",");
      const pricesRes = await fetch(`${BASE}/api/v3/ticker/price?symbols=[${symbols}]`);
      const pricesData = pricesRes.ok ? await pricesRes.json() as Array<{ symbol: string; price: string }> : [];

      const priceMap = new Map<string, number>();
      for (const p of pricesData) {
        // p.symbol = "BTCUSDT" → asset = "BTC"
        const asset = p.symbol.replace("USDT", "");
        priceMap.set(asset, parseFloat(p.price));
      }

      // Recuperar avg_entry_price guardados en DB para este usuario
      const { data: storedPositions } = await adminClient
        .from("positions")
        .select("symbol, avg_entry_price")
        .eq("user_id", user.id)
        .eq("broker", "binance");

      const storedPriceMap = new Map<string, number>();
      for (const sp of storedPositions ?? []) {
        storedPriceMap.set(sp.symbol as string, sp.avg_entry_price as number);
      }

      // Construir posiciones normalizadas
      const positions = cryptoBalances
        .map((b) => {
          const currentPrice = priceMap.get(b.asset) ?? 0;
          if (currentPrice === 0) return null; // activo sin precio en USDT, skip
          const marketValue     = b.qty * currentPrice;
          const avgEntry        = storedPriceMap.get(b.asset) ?? currentPrice;
          const unrealizedPnl   = (currentPrice - avgEntry) * b.qty;
          const unrealizedPnlPct = avgEntry > 0 ? ((currentPrice - avgEntry) / avgEntry) * 100 : 0;
          return {
            symbol: b.asset,
            qty: b.qty,
            avg_entry_price: avgEntry,
            current_price: currentPrice,
            market_value: marketValue,
            unrealized_pnl: unrealizedPnl,
            unrealized_pnl_pct: unrealizedPnlPct,
            portfolio_weight_pct: 0, // recalculado en usePortfolio con el total global
            side: "long",
            asset_class: "crypto",
            broker: "binance",
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      const cryptoEquity = positions.reduce((sum, p) => sum + p.market_value, 0);
      const totalEquity  = cryptoEquity + stableBalance;

      // Upsert posiciones en DB (replace binance positions)
      await adminClient.from("positions").delete().eq("user_id", user.id).eq("broker", "binance");
      if (positions.length > 0) {
        await adminClient.from("positions").insert(
          positions.map((p) => ({ ...p, user_id: user.id })),
        );
      }

      return jsonResponse({
        configured: true,
        positions,
        equity: totalEquity,
        cash: stableBalance,
        buying_power: stableBalance,
      });
    }

    // ── GET /price (Public) ─────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/price") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) return errJson("symbol requerido");
      const res = await fetch(`${BASE}/api/v3/ticker/price?symbol=${symbol}`);
      const data = await res.json();
      if (!res.ok) return errJson(data.msg ?? "Binance error", res.status);
      return jsonResponse(data);
    }

    return errJson("Not found", 404);
  } catch (e) {
    console.error("binance-proxy error:", e);
    return errJson("Internal error", 500);
  }
});
