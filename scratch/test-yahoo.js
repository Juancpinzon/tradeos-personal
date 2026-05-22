import fs from 'fs';

async function run() {
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'AMZN'];
  
  const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
    console.log('Fetching Yahoo Finance quotes for:', symbols);
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com",
      }
    });
    
    console.log('Yahoo Finance response status:', res.status);
    const body = await res.json();
    const results = body.quoteResponse?.result ?? [];
    console.log('Results count:', results.length);
    if (results.length > 0) {
      console.log('Sample item keys:', Object.keys(results[0]));
      console.log('Sample item price:', results[0].regularMarketPrice);
      console.log('Sample item marketCap:', results[0].marketCap);
      console.log('Sample item symbol:', results[0].symbol);
    } else {
      console.log('Raw body:', JSON.stringify(body, null, 2));
    }
  } catch (err) {
    console.error('Error fetching Yahoo Finance:', err);
  }
}

run();
