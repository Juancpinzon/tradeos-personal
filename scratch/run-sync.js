async function run() {
  const url = "https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/screener-universe-sync";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs";

  console.log("Invocando el sync del universe en:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`
      }
    });
    console.log("Status de respuesta:", res.status);
    const data = await res.json();
    console.log("Respuesta del sync:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error al invocar el sync:", err);
  }
}

run();
