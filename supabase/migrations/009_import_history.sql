-- ─────────────────────────────────────────────────────────────────────────────
-- 009_import_history.sql — Tabla para trackear sesiones de importación
-- Fase 8: Importador de historial de operaciones desde Excel
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.import_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      text        NOT NULL,
  total_rows    integer     NOT NULL,
  imported_rows integer     NOT NULL DEFAULT 0,
  skipped_rows  integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'preview', 'importing', 'completed', 'failed')),
  errors        jsonb       DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

-- Row Level Security
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own imports"
  ON public.import_sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- Índices para consultas frecuentes
CREATE INDEX import_sessions_user_id_idx   ON public.import_sessions (user_id);
CREATE INDEX import_sessions_filename_idx  ON public.import_sessions (user_id, filename);
CREATE INDEX import_sessions_created_at_idx ON public.import_sessions (created_at DESC);
