# TradeOS — Instrucciones de Migración Supabase

Ejecutar estas migrations en el Supabase SQL Editor en orden:

## Paso 1: 001_auth_setup.sql

Copia y pega el contenido de `supabase/migrations/001_auth_setup.sql` en el SQL Editor.

## Paso 2: 002_portfolio_tables.sql

Copia y pega el contenido de `supabase/migrations/002_portfolio_tables.sql` en el SQL Editor.

## Verificación

Después de ejecutar las migrations, verificar que existan estas tablas en `public`:
- `user_settings`
- `positions`
- `equity_snapshots`

Cada tabla debe tener RLS habilitado (el candado debe estar cerrado en el dashboard de Supabase).

## Variables de Entorno

El archivo `.env.local` ya contiene las variables correctas:
- `VITE_SUPABASE_URL` = URL del proyecto
- `VITE_SUPABASE_ANON_KEY` = Anon key pública (segura para el frontend)

Las API keys de Alpaca y Binance se configurarán en Supabase Vault en la Fase 2.
