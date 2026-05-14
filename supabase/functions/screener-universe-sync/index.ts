import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALPACA_TRADE = "https://paper-api.alpaca.markets"

Deno.serve(async (req) => {
  // Sin JWT - autenticación vía service role (cron job)
  const authHeader = req.headers.get("Authorization")
  const expectedAuth = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  
  if (authHeader !== expectedAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const alpacaKey = Deno.env.get("ALPACA_API_KEY")
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY")

  if (!alpacaKey || !alpacaSecret) {
    return new Response(JSON.stringify({ error: "Alpaca keys not configured" }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseSvc)

  try {
    console.log("Fetching assets from Alpaca...")
    const response = await fetch(`${ALPACA_TRADE}/v2/assets?status=active&asset_class=us_equity`, {
      headers: {
        "APCA-API-KEY-ID": alpacaKey,
        "APCA-API-SECRET-KEY": alpacaSecret,
      }
    })

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`)
    }

    const assets = await response.json()
    console.log(`Received ${assets.length} assets from Alpaca`)

    // Filtros: NYSE/NASDAQ y que sean tradeables
    const filteredAssets = assets.filter((a: any) => 
      (a.exchange === "NYSE" || a.exchange === "NASDAQ") && 
      a.tradable === true &&
      a.shortable === true // Opcional, pero suele indicar activos más líquidos
    )

    console.log(`Filtered to ${filteredAssets.length} assets (NYSE/NASDAQ)`)

    // Upsert en batches de 500 para evitar límites de Postgres
    const batchSize = 500
    for (let i = 0; i < filteredAssets.length; i += batchSize) {
      const batch = filteredAssets.slice(i, i + batchSize).map((a: any) => ({
        symbol: a.symbol,
        name: a.name,
        exchange: a.exchange,
        asset_class: 'equity',
        synced_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from("screener_universe")
        .upsert(batch, { onConflict: "symbol" })

      if (error) {
        console.error(`Error upserting batch ${i / batchSize}:`, error)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: filteredAssets.length 
    }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error("Sync error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
