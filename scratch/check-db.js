const supabaseUrl = "https://pzuuovhhubdpbphfwcvw.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

async function check() {
  console.log("Consultando conteo de screener_universe...");
  const resCount = await fetch(`${supabaseUrl}/rest/v1/screener_universe?select=count`, {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Prefer": "count=exact"
    }
  });
  console.log("Count status:", resCount.status);
  const countRange = resCount.headers.get("content-range");
  console.log("Content-Range:", countRange);

  console.log("\nObteniendo primeros 10 elementos de screener_universe...");
  const resData = await fetch(`${supabaseUrl}/rest/v1/screener_universe?select=*&limit=10`, {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`
    }
  });
  const data = await resData.json();
  console.log("Data sample:", JSON.stringify(data, null, 2));
}

check().catch(console.error);
