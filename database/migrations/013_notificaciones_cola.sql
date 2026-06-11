-- Migración 013: Cola durable de notificaciones con idempotencia y reintento
-- Agrega campos necesarios para el worker de cola de notificaciones

ALTER TABLE notificaciones
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS canal canal_notificacion NOT NULL DEFAULT 'PUSH',
  ADD COLUMN IF NOT EXISTS nivel TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS municipios_ids TEXT[],
  ADD COLUMN IF NOT EXISTS total_tokens INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enviados INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallidos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reintentos SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_detalle TEXT,
  ADD COLUMN IF NOT EXISTS procesado_at TIMESTAMPTZ;

-- Restricción de unicidad para idempotencia (solo sobre filas con key definida)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_idempotency_key
  ON notificaciones (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Índice para el worker: notificaciones pendientes listas para procesar
CREATE INDEX IF NOT EXISTS idx_notificaciones_cola
  ON notificaciones (estado, next_retry_at)
  WHERE estado = 'PENDIENTE';
