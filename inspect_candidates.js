import { exec } from 'child_process';

async function run() {
  console.log("Querying database directly for top 30 universe rows...");
  const queryCmd = `supabase db query --linked "SELECT symbol, name, price, market_cap, revenue_growth_pct, eps_next_positive, synced_at FROM public.screener_universe ORDER BY market_cap DESC LIMIT 30;"`;
  exec(queryCmd, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
  });
}

run();
