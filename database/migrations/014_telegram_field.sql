-- Migración 014: agregar campo telegram_chat_id a tabla profiles
-- Permite almacenar el chat_id de Telegram del usuario para envío de alertas

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Índice para búsqueda rápida de usuarios con Telegram configurado
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id
  ON profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
