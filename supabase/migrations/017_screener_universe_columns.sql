-- ═══════════════════════════════════════════════════════════════════════════
-- 017: Formalizar columnas de screener_universe que existían solo en remoto
-- (drift detectado en verificación independiente del 2026-07-22: se agregaron
-- out-of-band y ninguna migración las creaba — un `db push` en un entorno
-- limpio rompería claude-screener y screener-universe-sync).
-- + Ampliar el timeout del cron del sync: la corrida completa puede superar
-- los 120s con proveedores lentos.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.screener_universe ADD COLUMN IF NOT EXISTS revenue_growth_pct numeric;
ALTER TABLE public.screener_universe ADD COLUMN IF NOT EXISTS eps_next_positive boolean;
ALTER TABLE public.screener_universe ADD COLUMN IF NOT EXISTS ath_distance_pct numeric;
ALTER TABLE public.screener_universe ADD COLUMN IF NOT EXISTS week_52_high numeric;
ALTER TABLE public.screener_universe ADD COLUMN IF NOT EXISTS week_52_low numeric;

-- cron.schedule con el mismo nombre actualiza el job existente (upsert)
SELECT cron.schedule(
  'screener-universe-sync-daily',
  '0 12 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://pzuuovhhubdpbphfwcvw.supabase.co/functions/v1/screener-universe-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dXVvdmhodWJkcGJwaGZ3Y3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjQ1MTUsImV4cCI6MjA5NDIwMDUxNX0.ep2FyLEnYKZfNumskai8jbipZSB1hMBW2w4ep6e6Xqs',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
