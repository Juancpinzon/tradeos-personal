async function run() {
  const url = 'https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/screener-universe-sync';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs';
  
  console.log("Triggering screener-universe-sync...");
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Status:", res.status);
    const body = await res.json();
    console.log("Sync output:");
    console.log(JSON.stringify({ ...body, logs: undefined }, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
