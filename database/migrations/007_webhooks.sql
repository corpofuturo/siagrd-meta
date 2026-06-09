CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL,
  municipio_id UUID REFERENCES municipios(id),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  creado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_activo_eventos ON webhook_subscriptions USING GIN(eventos) WHERE activo = true;
