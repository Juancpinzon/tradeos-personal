const supabaseUrl = "https://pzuuovhhubdpbphfwcvw.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

async function diagnose() {
  const symbols = ['PLTR', 'META', 'GOOGL', 'NFLX', 'AMD'];
  const symbolsStr = symbols.map(s => `'${s}'`).join(',');

  console.log("=== DIAGNÓSTICO DE PRECIOS EN LA BASE DE DATOS ===\n");

  for (const table of ['screener_universe', 'market_data_cache', 'fundamentals_cache']) {
    console.log(`--- Tabla: ${table} ---`);
    try {
      const url = `${supabaseUrl}/rest/v1/${table}?symbol=in.(${symbols.join(',')})&select=*`;
      const res = await fetch(url, {
        headers: {
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`
        }
      });
      if (!res.ok) {
        console.log(`Error al consultar ${table}: ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      if (data.length === 0) {
        console.log("No se encontraron registros.");
      } else {
        data.forEach(row => {
          console.log(`  Símbolo: ${row.symbol.padEnd(5)} | Precio: $${String(row.price).padEnd(8)} | Actualizado en: ${row.fetched_at || row.synced_at || 'N/A'}`);
        });
      }
    } catch (err) {
      console.error(`Error en ${table}:`, err);
    }
    console.log();
  }
}

diagnose().catch(console.error);
