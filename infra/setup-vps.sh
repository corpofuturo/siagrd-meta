#!/usr/bin/env bash
# setup-vps.sh — Deploy completo SIAGRD en VPS Contabo
# Uso: bash setup-vps.sh
# Ejecutar como root en Ubuntu 22.04 LTS recién instalado
set -euo pipefail

REPO_URL="https://github.com/corpofuturo/siagrd-meta.git"
INSTALL_DIR="/opt/siagrd"
DOMAIN="satam.corpofuturo.org"
API_DOMAIN="api.${DOMAIN}"
PANEL_DOMAIN="panel.${DOMAIN}"
EMAIL="gerente@corpofuturo.org"

echo "══════════════════════════════════════════════"
echo " SIAGRD — Setup VPS  $(date '+%Y-%m-%d %H:%M')"
echo "══════════════════════════════════════════════"

# ─── 1. Sistema base ──────────────────────────────
echo "[1/9] Actualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Docker ────────────────────────────────────
echo "[2/9] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
apt-get install -y -qq docker-compose-plugin

# ─── 3. Nginx + Certbot ───────────────────────────
echo "[3/9] Instalando Nginx y Certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx

# ─── 4. Clonar repo ───────────────────────────────
echo "[4/9] Clonando repositorio..."
if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR" && git pull origin main
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ─── 5. Generar secretos y .env ───────────────────
echo "[5/9] Generando secretos y .env..."

PG_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)

cat > .env << EOF
# ─── BASE DE DATOS ────────────────────────────────────────────────────────
DATABASE_URL=postgresql://siagrd:${PG_PASSWORD}@postgres:5432/siagrd
POSTGRES_DB=siagrd
POSTGRES_USER=siagrd
POSTGRES_PASSWORD=${PG_PASSWORD}

# ─── REDIS ────────────────────────────────────────────────────────────────
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ─── JWT ──────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# ─── BACKEND ──────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGINS=https://${PANEL_DOMAIN},https://${DOMAIN}

# ─── PANEL WEB ────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}

# ─── FIREBASE FCM (opcional — dejar vacío deshabilita push) ───────────────
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
EOF

echo "  .env generado con secretos seguros"

# ─── 6. Levantar postgres y redis ─────────────────
echo "[6/9] Levantando postgres y redis..."
docker compose --env-file .env up -d postgres redis

echo "  Esperando que postgres esté ready (30s)..."
sleep 30
docker compose exec -T postgres pg_isready -U siagrd -d siagrd || {
  echo "  Esperando 15s más..."
  sleep 15
}

# ─── 7. Migraciones ───────────────────────────────
echo "[7/9] Aplicando migraciones..."
cat database/migrations/*.sql | docker compose exec -T postgres \
  psql -U siagrd -d siagrd
echo "  Migraciones aplicadas"

# ─── 8. Build y levantar todos los servicios ──────
echo "[8/9] Construyendo y levantando servicios (puede tardar 5-10 min)..."
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d
docker compose ps

# Esperar backend
echo "  Esperando backend..."
for i in $(seq 1 18); do
  if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    echo "  Backend OK"
    break
  fi
  sleep 10
  if [ "$i" -eq 18 ]; then
    echo "  ERROR: Backend no respondió en 3 minutos"
    docker compose logs --tail=50 backend
    exit 1
  fi
done

# ─── 9. Nginx + SSL ───────────────────────────────
echo "[9/9] Configurando Nginx y SSL..."

# nginx.conf ya tiene satam.corpofuturo.org — copiar directo
cp infra/nginx.conf /etc/nginx/conf.d/siagrd.conf

# Config HTTP temporal para que certbot pueda validar (antes del SSL)
cat > /etc/nginx/conf.d/siagrd-temp.conf << 'NGINXTMP'
server {
    listen 80;
    server_name api.satam.corpofuturo.org panel.satam.corpofuturo.org satam.corpofuturo.org;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}
NGINXTMP

nginx -t && systemctl reload nginx

# Obtener certificados
certbot certonly --nginx \
  -d "${API_DOMAIN}" \
  -d "${PANEL_DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

# Activar config completa con SSL
rm -f /etc/nginx/conf.d/siagrd-temp.conf
nginx -t && systemctl reload nginx

# ─── Smoke test ───────────────────────────────────
echo ""
echo "══ Smoke test ══════════════════════════════════"
sleep 5
curl -sf "https://${API_DOMAIN}/api/v1/health" && echo " API OK" || echo " API no responde aún"
curl -sfI "https://${PANEL_DOMAIN}" 2>&1 | head -1 || echo " Panel no responde aún"

# ─── Guardar secretos en archivo seguro ───────────
SECRETS_FILE="/root/.siagrd-secrets.txt"
cat > "$SECRETS_FILE" << EOF
# SIAGRD — Secretos de producción ($(date '+%Y-%m-%d'))
# GUARDAR EN LUGAR SEGURO — NO compartir
POSTGRES_PASSWORD=${PG_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
EOF
chmod 600 "$SECRETS_FILE"

echo ""
echo "══════════════════════════════════════════════"
echo " Deploy completado exitosamente"
echo " API:   https://${API_DOMAIN}/api/v1/health"
echo " Panel: https://${PANEL_DOMAIN}"
echo " Secretos guardados en: ${SECRETS_FILE}"
echo "══════════════════════════════════════════════"
