const url = "https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/alpaca-proxy";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

// Dummy JWT header + payload containing "sub" claim
const dummyHeader = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const dummyPayload = "eyJzdWIiOiI0NTRiNWRmZC0xMjM0LTU2NzgtYWJjZC0xMjM0NTY3ODkwYWIifQ";
const dummySignature = "dummy";
const dummyToken = `${dummyHeader}.${dummyPayload}.${dummySignature}`;

async function run() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "x-user-token": dummyToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "/bars",
        params: {
          symbol: "PLTR",
          timeframe: "1Day",
          limit: 3,
          start: "2026-05-01T00:00:00Z" // explicit start date for weekend historical query
        }
      })
    });

    const json = await res.json();
    console.log("STATUS:", res.status);
    console.log("RESPONSE:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

run();
