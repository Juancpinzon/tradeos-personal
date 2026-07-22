-- ═══════════════════════════════════════════════════════════════════════════
-- 016: Cron diario del universo del screener (CLAUDE.md Flujo 6)
-- Invoca screener-universe-sync a las 12:00 UTC (≈ 8:00 AM ET en horario de
-- verano, 7:00 AM ET en invierno — siempre pre-market), de lunes a viernes.
-- Usa la anon key (pública, ya presente en el bundle del frontend): la función
-- valida el JWT en el gateway y no requiere usuario.
-- Con esto el sync sale del request interactivo del screener: el usuario ya no
-- paga la sincronización dentro de su corrida.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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
    timeout_milliseconds := 120000
  );
  $$
);
