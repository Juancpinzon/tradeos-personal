const url = "https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/claude-screener";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

async function run() {
  // Simular criteria de Momentum Growth con modificaciones del screenshot:
  // - Market Cap Min: 2.9B
  // - Revenue Growth Min: 16%
  // - Precio Min: 5
  // - Asset Class: equity
  // - eps_next_positive: false (desmarcado en el screenshot)
  const criteria = {
    market_cap_min: 2900000000,
    revenue_growth_min_pct: 16,
    price_min: 5,
    asset_class: "equity",
    eps_next_positive: false
  };

  console.log("Invocando claude-screener con:", JSON.stringify(criteria, null, 2));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`
      },
      body: JSON.stringify({ criteria })
    });
    console.log("Status de respuesta:", res.status);
    const data = await res.json();
    console.log("Respuesta de claude-screener:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error al invocar claude-screener:", err);
  }
}

run();
