async function test() {
  const symbol = "AAPL";
  const modules = "financialData,defaultKeyStatistics,earningsTrend,summaryDetail,calendarEvents,quoteType";
  const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}&corsDomain=finance.yahoo.com`;
  
  console.log("Fetching:", url);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com",
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body length:", text.length);
    console.log("Snippet:", text.substring(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
