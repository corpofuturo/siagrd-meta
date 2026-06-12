#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose --env-file .env"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

cd "$REPO_DIR"

echo "[$TIMESTAMP] Iniciando deploy SIAGRD..."

# 1. Actualizar código
git pull origin main

# 2. Reconstruir imágenes sin cache
$COMPOSE build --no-cache backend panel-web

# 3. Levantar servicios (postgres y redis ya corriendo)
$COMPOSE up -d --remove-orphans

# 4. Esperar a que el backend responda
echo "Esperando backend..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:3000/api/v1/health > /dev/null; then
    echo "Backend OK"
    break
  fi
  sleep 5
  if [ "$i" -eq 12 ]; then
    echo "ERROR: Backend no respondió en 60s"
    $COMPOSE logs --tail=50 backend
    exit 1
  fi
done

# 5. Limpiar imágenes huérfanas
docker image prune -f

echo "[$TIMESTAMP] Deploy completado."
