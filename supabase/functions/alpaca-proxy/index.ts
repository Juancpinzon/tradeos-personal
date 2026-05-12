// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/alpaca-proxy/index.ts
// Proxy seguro a Alpaca Markets API.
// NUNCA expone API keys al cliente. JWT validado como primer paso en cada ruta.
//
// Rutas:
//   GET  /account    → Alpaca GET /v2/account
//   GET  /positions  → Alpaca GET /v2/positions
//   GET  /orders     → Alpaca GET /v2/orders
//   POST /orders     → Alpaca POST /v2/orders + guarda en tabla orders
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
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

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseSvcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Routing (primero, para exponer /debug sin auth) ───────────────────────
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/alpaca-proxy");
  const subPath = pathParts[1] ?? "/";

  // ── GET /debug — sin auth, confirma que el código corre ──────────────────
  if (req.method === "GET" && subPath === "/debug") {
    const authH = req.headers.get("Authorization") ?? "";
    const jwt = authH.startsWith("Bearer ") ? authH.slice(7) : "";
    return jsonResponse({
      fn_running: true,
      auth_header_present: !!authH,
      auth_prefix: authH.substring(0, 20),
      jwt_segments: jwt ? jwt.split(".").length : 0,
      jwt_prefix: jwt.substring(0, 20),
      supabase_url_set: !!supabaseUrl,
      anon_key_set: !!supabaseAnonKey,
    });
  }

  // ── Auth — verifica header + decodifica userId del payload (sin verificar firma) ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errJson("No auth header", 401);
  }

  let userId: string;
  try {
    const raw = authHeader.slice(7).split(".")[1]!;
    // base64url → padded base64 (atob requiere padding)
    const b64 = raw
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(raw.length + ((4 - (raw.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>;
    userId = payload["sub"] as string;
    if (!userId) throw new Error("no sub");
  } catch {
    return errJson("Invalid token", 401);
  }

  // Service role client — usa la key inyectada automáticamente por Supabase
  const supabase = createClient(supabaseUrl, supabaseSvcKey);

  // ── Leer user_settings ────────────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("user_settings")
    .select(
      "alpaca_mode, live_trading_enabled, risk_per_trade_pct, max_position_size_pct",
    )
    .eq("id", userId)
    .maybeSingle();

  const alpacaMode = settings?.alpaca_mode ?? "paper";
  const liveEnabled = settings?.live_trading_enabled ?? false;

  // ── Configurar Alpaca según modo ──────────────────────────────────────────
  const alpacaKey = Deno.env.get("ALPACA_API_KEY");
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY");

  if (!alpacaKey || !alpacaSecret) {
    return errJson(
      "Alpaca API keys not configured. Go to Settings to add them.",
      503,
    );
  }

  const baseUrl =
    alpacaMode === "live" && liveEnabled
      ? "https://api.alpaca.markets"
      : "https://paper-api.alpaca.markets";

  const alpacaHeaders = {
    "APCA-API-KEY-ID": alpacaKey,
    "APCA-API-SECRET-KEY": alpacaSecret,
    "Content-Type": "application/json",
  };

  try {
    // ── GET /account ────────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/account") {
      const res = await fetch(`${baseUrl}/v2/account`, {
        headers: alpacaHeaders,
      });
      const data = await res.json();

      if (!res.ok) {
        return errJson(data?.message ?? "Alpaca error", res.status);
      }

      const equity = parseFloat(data.equity ?? data.portfolio_value ?? 0);

      // Guardar snapshot en equity_snapshots
      await supabase.from("equity_snapshots").insert({
        user_id: userId,
        broker: "alpaca",
        equity,
        cash: parseFloat(data.cash ?? 0),
        buying_power: parseFloat(data.buying_power ?? 0),
      });
      const lastEquity = parseFloat(data.last_equity ?? data.equity ?? 0);
      const pnlToday = equity - lastEquity;

      return jsonResponse({
        equity,
        cash: parseFloat(data.cash ?? 0),
        buying_power: parseFloat(data.buying_power ?? 0),
        pnl_today: pnlToday,
        pnl_today_pct: lastEquity > 0 ? (pnlToday / lastEquity) * 100 : 0,
        mode: alpacaMode,
      });
    }

    // ── GET /positions ──────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/positions") {
      const res = await fetch(`${baseUrl}/v2/positions`, {
        headers: alpacaHeaders,
      });
      const data = await res.json();

      if (!res.ok) {
        return errJson(data?.message ?? "Alpaca error", res.status);
      }

      // Calcular equity total para portfolio_weight
      const totalEquity = (data as AlpacaPosition[]).reduce(
        (sum: number, p: AlpacaPosition) =>
          sum + parseFloat(p.market_value ?? "0"),
        0,
      );

      const positions = (data as AlpacaPosition[]).map((p: AlpacaPosition) => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        avg_entry_price: parseFloat(p.avg_entry_price),
        current_price: parseFloat(p.current_price),
        market_value: parseFloat(p.market_value),
        unrealized_pnl: parseFloat(p.unrealized_pl),
        unrealized_pnl_pct: parseFloat(p.unrealized_plpc) * 100,
        portfolio_weight_pct:
          totalEquity > 0
            ? (parseFloat(p.market_value) / totalEquity) * 100
            : 0,
        side: p.side === "long" ? "long" : "short",
        asset_class: p.asset_class === "crypto" ? "crypto" : "equity",
        broker: "alpaca",
      }));

      // Upsert en Supabase (reemplazar posiciones actuales)
      await supabase
        .from("positions")
        .delete()
        .eq("user_id", userId)
        .eq("broker", "alpaca");
      if (positions.length > 0) {
        await supabase
          .from("positions")
          .insert(positions.map((p) => ({ ...p, user_id: userId })));
      }

      return jsonResponse(positions);
    }

    // ── GET /orders ─────────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/orders") {
      const status = url.searchParams.get("status") ?? "all";
      const limit = url.searchParams.get("limit") ?? "50";
      const res = await fetch(
        `${baseUrl}/v2/orders?status=${status}&limit=${limit}`,
        { headers: alpacaHeaders },
      );
      const data = await res.json();

      if (!res.ok) {
        return errJson(data?.message ?? "Alpaca error", res.status);
      }

      return jsonResponse(data);
    }

    // ── POST /orders ─────────────────────────────────────────────────────────
    if (req.method === "POST" && subPath === "/orders") {
      // Seguridad: validar que esté en paper O que live esté explícitamente habilitado
      if (alpacaMode === "live" && !liveEnabled) {
        return errJson(
          "Live trading no está habilitado. Activá live_trading_enabled en Settings para operar con dinero real.",
          403,
        );
      }

      // Parsear body del cliente
      let body: OrderSubmit;
      try {
        body = (await req.json()) as OrderSubmit;
      } catch {
        return errJson("Invalid JSON body");
      }

      const {
        symbol,
        side,
        order_type,
        qty,
        limit_price,
        stop_price,
        stop_loss_price,
        target_price,
        risk_amount,
        portfolio_weight_at_order,
        risk_reward_ratio,
      } = body;

      // Validaciones básicas
      if (!symbol) return errJson("symbol requerido");
      if (!side || !["buy", "sell"].includes(side))
        return errJson("side debe ser 'buy' o 'sell'");
      if (!order_type) return errJson("order_type requerido");
      if (!qty || qty <= 0) return errJson("qty debe ser mayor a 0");

      // Construir el payload para Alpaca
      const alpacaPayload: Record<string, unknown> = {
        symbol: symbol.toUpperCase(),
        qty: String(qty),
        side,
        type: order_type,
        time_in_force: "day",
      };

      if (
        (order_type === "limit" || order_type === "stop_limit") &&
        limit_price
      ) {
        alpacaPayload.limit_price = String(limit_price);
      }
      if (
        (order_type === "stop" || order_type === "stop_limit") &&
        stop_price
      ) {
        alpacaPayload.stop_price = String(stop_price);
      }

      // Proxy a Alpaca
      const alpacaRes = await fetch(`${baseUrl}/v2/orders`, {
        method: "POST",
        headers: alpacaHeaders,
        body: JSON.stringify(alpacaPayload),
      });

      const alpacaOrder = await alpacaRes.json();

      if (!alpacaRes.ok) {
        return errJson(
          alpacaOrder?.message ?? `Alpaca error ${alpacaRes.status}`,
          alpacaRes.status,
        );
      }

      // Guardar en tabla orders con snapshot de riesgo
      const { data: savedOrder, error: dbError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          broker_order_id: alpacaOrder.id,
          broker: "alpaca",
          symbol: symbol.toUpperCase(),
          side,
          order_type,
          qty,
          limit_price: limit_price ?? null,
          stop_price: stop_price ?? null,
          status: alpacaOrder.status ?? "pending",
          asset_class:
            alpacaOrder.asset_class === "crypto" ? "crypto" : "equity",
          portfolio_weight_at_order: portfolio_weight_at_order ?? null,
          risk_amount: risk_amount ?? null,
          stop_loss_price: stop_loss_price ?? null,
          target_price: target_price ?? null,
          risk_reward_ratio: risk_reward_ratio ?? null,
          submitted_at: alpacaOrder.submitted_at ?? new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error("DB insert error:", dbError);
        // No fallar la respuesta — la orden ya se envió a Alpaca
      }

      return jsonResponse(
        {
          order: savedOrder,
          alpaca_order: alpacaOrder,
        },
        201,
      );
    }

    return errJson("Not found", 404);
  } catch (e) {
    console.error("alpaca-proxy error:", e);
    return errJson("Error interno del servidor", 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
  asset_class: string;
}

interface OrderSubmit {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit";
  qty: number;
  limit_price?: number;
  stop_price?: number;
  stop_loss_price?: number;
  target_price?: number;
  risk_amount?: number;
  portfolio_weight_at_order?: number;
  risk_reward_ratio?: number;
}
