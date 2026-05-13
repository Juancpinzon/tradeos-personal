// supabase/functions/alpaca-proxy/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

function mapAlpacaStatus(s: string): string {
  if (s === "filled") return "filled";
  if (["canceled", "expired", "replaced"].includes(s)) return "cancelled";
  if (["rejected", "stopped", "suspended"].includes(s)) return "rejected";
  if (s === "partially_filled") return "partially_filled";
  if (["new", "accepted", "pending_new", "accepted_for_bidding"].includes(s)) return "accepted";
  return "pending";
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseSvcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/alpaca-proxy");
  const subPath = pathParts[1] ?? "/";

  // ── GET /debug — sin auth ─────────────────────────────────────────────────
  if (req.method === "GET" && subPath === "/debug") {
    return jsonResponse({
      fn_running: true,
      supabase_url_set: !!supabaseUrl,

      service_role_set: !!supabaseSvcKey,
      alpaca_key_set: !!Deno.env.get("ALPACA_API_KEY"),
      sub_path: subPath,
    });
  }

  // ── Auth (manual JWT decode) ──────────────────────────────────────────────
  const rawToken =
    req.headers.get("x-user-token") ??
    url.searchParams.get("token") ??
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const authHeader = rawToken ? `Bearer ${rawToken}` : "";
  if (!authHeader) return errJson("Missing authorization header", 401);

  let userId: string;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("invalid jwt");
    const raw = parts[1];
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/") + "====".slice((4 - raw.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.sub) throw new Error("no sub");
    userId = payload.sub as string;
    console.log("userId:", userId.substring(0, 8));
  } catch (e) {
    return errJson("Invalid token: " + String(e), 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseSvcKey);

  const { data: settings } = await adminClient
    .from("user_settings")
    .select("alpaca_mode, risk_per_trade_pct")
    .eq("id", userId)
    .maybeSingle();

  const alpacaMode = settings?.alpaca_mode ?? "paper";

  const alpacaKey = Deno.env.get("ALPACA_API_KEY");
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY");

  if (!alpacaKey || !alpacaSecret) {
    return errJson("Alpaca API keys not configured.", 503);
  }

  const baseUrl = "https://paper-api.alpaca.markets";
  const alpacaHeaders = {
    "APCA-API-KEY-ID": alpacaKey,
    "APCA-API-SECRET-KEY": alpacaSecret,
    "Content-Type": "application/json",
  };

  try {
    // ── GET /account ──────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/account") {
      const res = await fetch(`${baseUrl}/v2/account`, {
        headers: alpacaHeaders,
      });
      const data = await res.json();
      if (!res.ok) return errJson(data?.message ?? "Alpaca error", res.status);

      const equity = parseFloat(data.equity ?? "0");
      const cash = parseFloat(data.cash ?? "0");
      const buyingPower = parseFloat(data.buying_power ?? "0");
      const lastEquity = parseFloat(data.last_equity ?? data.equity ?? "0");
      const pnlToday = equity - lastEquity;

      await adminClient.from("equity_snapshots").insert({
        user_id: userId,
        broker: "alpaca",
        equity,
        cash,
        buying_power: buyingPower,
      });

      return jsonResponse({
        equity,
        cash,
        buying_power: buyingPower,
        pnl_today: pnlToday,
        pnl_today_pct: lastEquity > 0 ? (pnlToday / lastEquity) * 100 : 0,
        mode: alpacaMode,
      });
    }

    // ── GET /positions ────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/positions") {
      const res = await fetch(`${baseUrl}/v2/positions`, {
        headers: alpacaHeaders,
      });
      const data = await res.json();
      if (!res.ok) return errJson(data?.message ?? "Alpaca error", res.status);

      const rawPositions = data as AlpacaPosition[];
      const totalEquity = rawPositions.reduce(
        (sum, p) => sum + parseFloat(p.market_value ?? "0"),
        0,
      );

      const positions = rawPositions.map((p) => ({
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

      await adminClient
        .from("positions")
        .delete()
        .eq("user_id", userId)
        .eq("broker", "alpaca");
      if (positions.length > 0) {
        await adminClient
          .from("positions")
          .insert(positions.map((p) => ({ ...p, user_id: userId })));
      }

      return jsonResponse(positions);
    }

    // ── GET /orders ───────────────────────────────────────────────────────
    if (req.method === "GET" && subPath === "/orders") {
      const status = url.searchParams.get("status") ?? "all";
      const limit = url.searchParams.get("limit") ?? "50";
      const res = await fetch(
        `${baseUrl}/v2/orders?status=${status}&limit=${limit}&direction=desc`,
        { headers: alpacaHeaders },
      );
      const data = await res.json();
      if (!res.ok) return errJson(data?.message ?? "Alpaca error", res.status);
      return jsonResponse(data);
    }

    // ── GET /orders/:id ───────────────────────────────────────────────────
    if (req.method === "GET" && subPath.startsWith("/orders/")) {
      const brokerOrderId = subPath.slice("/orders/".length);
      if (!brokerOrderId) return errJson("Order ID requerido");

      const res = await fetch(`${baseUrl}/v2/orders/${brokerOrderId}`, {
        headers: alpacaHeaders,
      });
      const data = await res.json();
      if (!res.ok) return errJson(data?.message ?? "Alpaca error", res.status);

      // Sync status + fill data to our DB
      const mappedStatus = mapAlpacaStatus(data.status ?? "");
      await adminClient
        .from("orders")
        .update({
          status: mappedStatus,
          filled_qty: data.filled_qty ? parseFloat(data.filled_qty) : null,
          filled_avg_price: data.filled_avg_price
            ? parseFloat(data.filled_avg_price)
            : null,
          filled_at: data.filled_at ?? null,
        })
        .eq("broker_order_id", brokerOrderId)
        .eq("user_id", userId);

      return jsonResponse(data);
    }

    // ── POST /orders ──────────────────────────────────────────────────────
    if (req.method === "POST" && subPath === "/orders") {
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
        risk_amount,
        portfolio_weight_at_order,
        stop_loss_price,
        target_price,
        risk_reward_ratio,
      } = body;
      if (!symbol) return errJson("symbol requerido");
      if (!side || !["buy", "sell"].includes(side))
        return errJson("side inválido");
      if (!order_type) return errJson("order_type requerido");
      if (!qty || qty <= 0) return errJson("qty debe ser > 0");
      if (!stop_loss_price || stop_loss_price <= 0)
        return errJson("stop_loss_price es obligatorio");

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
      )
        alpacaPayload.limit_price = String(limit_price);
      if ((order_type === "stop" || order_type === "stop_limit") && stop_price)
        alpacaPayload.stop_price = String(stop_price);

      const alpacaRes = await fetch(`${baseUrl}/v2/orders`, {
        method: "POST",
        headers: alpacaHeaders,
        body: JSON.stringify(alpacaPayload),
      });
      const alpacaOrder = await alpacaRes.json();
      if (!alpacaRes.ok)
        return errJson(
          alpacaOrder?.message ?? `Alpaca error ${alpacaRes.status}`,
          alpacaRes.status,
        );

      const { data: savedOrder, error: dbError } = await adminClient
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
          status: mapAlpacaStatus(alpacaOrder.status ?? ""),
          asset_class:
            alpacaOrder.asset_class === "crypto" ? "crypto" : "equity",
          submitted_at: alpacaOrder.submitted_at ?? new Date().toISOString(),
          risk_amount: risk_amount ?? null,
          portfolio_weight_at_order: portfolio_weight_at_order ?? null,
          stop_loss_price: stop_loss_price ?? null,
          target_price: target_price ?? null,
          risk_reward_ratio: risk_reward_ratio ?? null,
        })
        .select()
        .single();

      if (dbError) console.error("DB insert error:", dbError);
      return jsonResponse(
        { order: savedOrder, alpaca_order: alpacaOrder },
        201,
      );
    }

    // ── DELETE /orders/:id ────────────────────────────────────────────────
    if (req.method === "DELETE" && subPath.startsWith("/orders/")) {
      const brokerOrderId = subPath.slice("/orders/".length);
      if (!brokerOrderId) return errJson("Order ID requerido");

      const alpacaRes = await fetch(`${baseUrl}/v2/orders/${brokerOrderId}`, {
        method: "DELETE",
        headers: alpacaHeaders,
      });

      if (!alpacaRes.ok) {
        const data = await alpacaRes.json().catch(() => ({}));
        return errJson(
          (data as { message?: string })?.message ??
            `Alpaca error ${alpacaRes.status}`,
          alpacaRes.status,
        );
      }

      await adminClient
        .from("orders")
        .update({ status: "cancelled" })
        .eq("broker_order_id", brokerOrderId)
        .eq("user_id", userId);

      return jsonResponse({ cancelled: true });
    }

    return errJson("Not found", 404);
  } catch (e) {
    console.error("alpaca-proxy error:", e);
    return errJson("Error interno del servidor", 500);
  }
});

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
  risk_amount?: number;
  portfolio_weight_at_order?: number;
  stop_loss_price?: number;
  target_price?: number;
  risk_reward_ratio?: number;
}
