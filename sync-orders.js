// sync-orders.js
// Este script obtiene las órdenes de Alpaca entre dos fechas y las inserta en Supabase.
// Debes rellenar tus claves antes de ejecutarlo.

import { createClient } from "@supabase/supabase-js";

// 1. RELLENA TUS CLAVES AQUÍ:
const SUPABASE_URL = "https://pzuuovhhubdpbphfwcvw.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs"; // La clave "service_role" (necesaria para saltar RLS)

const ALPACA_API_KEY = "PKUFEDOLWAUWJ56EXI3W3DQ2SY";
const ALPACA_SECRET_KEY = "QLWTnhAFuZ1miWEBw1c1Ppp44DE8GTkvZ7tcCs5zrCd";

const USER_ID = "88e3e6f6-e08f-4d13-8ec9-29ab0260df0f"; // El ID de tu usuario en Supabase (lo puedes ver en Auth -> Users)

const START_DATE = "2026-05-22T00:00:00Z"; // Desde cuando quieres sincronizar
const END_DATE = "2026-06-01T23:59:59Z"; // Hasta cuando

// -------------------------------------------------------------------------

function mapAlpacaStatus(s) {
  if (s === "filled") return "filled";
  if (["canceled", "expired", "replaced"].includes(s)) return "cancelled";
  if (["rejected", "stopped", "suspended"].includes(s)) return "rejected";
  if (s === "partially_filled") return "partially_filled";
  if (["new", "accepted", "pending_new", "accepted_for_bidding"].includes(s))
    return "accepted";
  return "pending";
}

async function run() {
  if (SUPABASE_URL.includes("[TU-PROYECTO]")) {
    console.error(
      "❌ ERROR: Debes rellenar las claves y el USER_ID en el archivo sync-orders.js",
    );
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(
    `📥 Obteniendo órdenes de Alpaca desde ${START_DATE} hasta ${END_DATE}...`,
  );

  // En Alpaca paper (cambiar baseUrl si es real)
  const baseUrl = "https://paper-api.alpaca.markets";
  const alpacaHeaders = {
    "APCA-API-KEY-ID": ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    "Content-Type": "application/json",
  };

  const params = new URLSearchParams({
    status: "all",
    limit: "500",
    direction: "desc",
    after: START_DATE,
    until: END_DATE,
  });

  const res = await fetch(`${baseUrl}/v2/orders?${params.toString()}`, {
    headers: alpacaHeaders,
  });
  const orders = await res.json();

  if (!res.ok) {
    console.error("❌ Error de Alpaca:", orders);
    return;
  }

  console.log(`✅ Se encontraron ${orders.length} órdenes en Alpaca.`);

  if (orders.length === 0) return;

  const { data: existingOrders, error: fetchErr } = await supabase
    .from('orders')
    .select('broker_order_id')
    .in('broker_order_id', orders.map(o => o.id));

  if (fetchErr) {
    console.error('❌ Error obteniendo órdenes existentes en Supabase:', fetchErr);
    return;
  }

  const existingIds = new Set(existingOrders.map(o => o.broker_order_id));
  const newOrders = orders.filter(o => !existingIds.has(o.id));

  console.log(`🔎 Se encontraron ${existingIds.size} órdenes que ya existen en Supabase. Faltan por sincronizar: ${newOrders.length}`);
  if (newOrders.length === 0) return;

  let insertCount = 0;
  
  for (const alpacaOrder of newOrders) {
    const payload = {
      user_id: USER_ID,
      broker_order_id: alpacaOrder.id,
      broker: 'alpaca',
      symbol: alpacaOrder.symbol,
      side: alpacaOrder.side,
      order_type: alpacaOrder.type,
      qty: parseFloat(alpacaOrder.qty),
      limit_price: alpacaOrder.limit_price ? parseFloat(alpacaOrder.limit_price) : null,
      stop_price: alpacaOrder.stop_price ? parseFloat(alpacaOrder.stop_price) : null,
      filled_qty: alpacaOrder.filled_qty ? parseFloat(alpacaOrder.filled_qty) : null,
      filled_avg_price: alpacaOrder.filled_avg_price ? parseFloat(alpacaOrder.filled_avg_price) : null,
      status: mapAlpacaStatus(alpacaOrder.status ?? ""),
      asset_class: alpacaOrder.asset_class === 'us_equity' ? 'equity' : 'crypto',
      submitted_at: alpacaOrder.submitted_at,
      filled_at: alpacaOrder.filled_at ?? null,
      risk_amount: null,
      portfolio_weight_at_order: null,
      stop_loss_price: null,
      target_price: null,
      risk_reward_ratio: null,
    };

    const { error } = await supabase.from('orders').insert(payload);
    
    if (error) {
      console.error(`❌ Error insertando orden ${alpacaOrder.id}:`, error.message);
    } else {
      insertCount++;
    }
  }

  console.log(
    `🎉 ¡Proceso terminado! Se sincronizaron ${insertCount} órdenes correctamente.`,
  );
}

run();
