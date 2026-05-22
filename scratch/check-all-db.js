const supabaseUrl = "https://pzuuovhhubdpbphfwcvw.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

async function checkAll() {
  const tables = ['screener_universe', 'market_data_cache', 'fundamentals_cache'];
  
  for (const table of tables) {
    console.log(`--- Tabla: ${table} ---`);
    const resCount = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Prefer": "count=exact"
      }
    });
    const countRange = resCount.headers.get("content-range");
    console.log("Total filas:", countRange);

    const resData = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=5`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`
      }
    });
    const data = await resData.json();
    console.log("Muestra:", JSON.stringify(data, null, 2));
    console.log("\n");
  }
}

checkAll().catch(console.error);
