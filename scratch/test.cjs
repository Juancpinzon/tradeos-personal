const https = require('https');

https.get('https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/alpaca-proxy/debug', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
}).on('error', err => console.log('Error:', err.message));
