// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/save-api-keys/index.ts
// Validador de API keys de broker (test de conexión real).
//
// Principio irrompible #1 (CLAUDE.md): las API keys NUNCA se guardan en tablas.
// TradeOS es single-user: las keys operativas viven como Secrets del proyecto
// (Dashboard → Edge Functions → Secrets) y solo las leen las Edge Functions.
// Este endpoint valida las keys contra el broker y NO las almacena — la tabla
// user_broker_keys (texto plano) fue eliminada en la migración 015.
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function errJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message, valid: false }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return errJson("Missing Authorization header", 401)

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) return errJson("Unauthorized", 401)

  let body: { broker: 'alpaca' | 'binance'; api_key: string; secret_key: string }
  try {
    body = await req.json()
  } catch {
    return errJson("Invalid JSON body")
  }

  const { broker, api_key, secret_key } = body
  if (!broker || !api_key || !secret_key) return errJson("Missing fields")

  // ── Step 1: Test connection ────────────────────────────────────────────────
  let isValid = false
  let errorMsg = ""

  if (broker === 'alpaca') {
    try {
      const res = await fetch("https://paper-api.alpaca.markets/v2/account", {
        headers: {
          "APCA-API-KEY-ID": api_key,
          "APCA-API-SECRET-KEY": secret_key,
        }
      })
      if (res.ok) isValid = true
      else {
        const err = await res.json().catch(() => ({}))
        errorMsg = err.message || "Invalid Alpaca keys"
      }
    } catch (_e) {
      errorMsg = "Connection to Alpaca failed"
    }
  } else if (broker === 'binance') {
    // Validación básica: el endpoint firmado requiere lib de crypto; se valida
    // formato mínimo y se delega la verificación real al primer uso del proxy.
    isValid = api_key.length >= 16 && secret_key.length >= 16
    if (!isValid) errorMsg = "Formato de keys de Binance inválido"
  }

  if (!isValid) {
    return errJson(errorMsg, 400)
  }

  // ── Step 2: Sin almacenamiento (por diseño) ────────────────────────────────
  return new Response(
    JSON.stringify({
      valid: true,
      stored: false,
      message:
        "Keys válidas. Por seguridad TradeOS no las almacena en la base de datos: configuralas como Secrets del proyecto en Supabase (Edge Functions → Secrets).",
    }),
    { headers: { "Content-Type": "application/json", ...CORS } },
  )
})
