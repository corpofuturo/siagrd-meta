# SIAGRD — Despliegue en DigitalOcean Droplet

## Requisitos

- Ubuntu 22.04 LTS (mínimo 2 GB RAM / 2 vCPUs)
- Dominio apuntado: `api.tudominio.com` y `panel.tudominio.com`
- Acceso root o usuario con sudo

---

## 1. Preparar el servidor

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose plugin
apt install -y docker-compose-plugin

# Instalar Nginx y Certbot
apt install -y nginx certbot python3-certbot-nginx
```

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/tu-org/siagrd.git /opt/siagrd
cd /opt/siagrd
```

---

## 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Completar **todos** los `CHANGE_ME` con valores reales:
- `POSTGRES_PASSWORD` — contraseña fuerte (mín. 20 chars)
- `REDIS_PASSWORD` — contraseña fuerte
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — generar con `openssl rand -hex 64`
- `CORS_ORIGINS` — reemplazar `tudominio.com` con el dominio real
- `NEXT_PUBLIC_API_URL` — URL pública del backend

---

## 4. Levantar servicios de datos primero

```bash
docker compose --env-file .env up -d postgres redis
# Esperar ~20s a que postgres esté ready
docker compose logs postgres
```

---

## 5. Aplicar migraciones

```bash
# Conectar al postgres del contenedor y aplicar migrations
cat database/migrations/*.sql | docker compose exec -T postgres \
  psql -U siagrd -d siagrd
```

---

## 6. Construir y levantar todos los servicios

```bash
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d
docker compose ps
```

---

## 7. Configurar Nginx

```bash
# Reemplazar tudominio.com con el dominio real en nginx.conf
sed -i 's/tudominio.com/mi-dominio.com/g' infra/nginx.conf

cp infra/nginx.conf /etc/nginx/conf.d/siagrd.conf
nginx -t
systemctl reload nginx
```

---

## 8. Obtener certificados SSL

```bash
certbot --nginx -d api.mi-dominio.com -d panel.mi-dominio.com \
  --email admin@corpofuturo.org --agree-tos --no-eff-email
```

Certbot modifica automáticamente `/etc/nginx/conf.d/siagrd.conf` con las rutas SSL. Recargar nginx:

```bash
systemctl reload nginx
```

---

## 9. Smoke test

```bash
curl https://api.mi-dominio.com/api/v1/health
# Esperado: {"status":"ok","..."}

curl -I https://panel.mi-dominio.com
# Esperado: HTTP/2 200
```

---

## 10. Deploy automático

```bash
chmod +x infra/deploy.sh

# Editar el script y reemplazar tudominio.com si aplica
# Ejecutar para actualizar:
./infra/deploy.sh
```

Para automatizar con cron:
```bash
# Ejecutar deploy a las 3am todos los días (si hay cambios)
0 3 * * * cd /opt/siagrd && git fetch origin && git diff --quiet HEAD origin/main || ./infra/deploy.sh >> /var/log/siagrd-deploy.log 2>&1
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f panel-web

# Reiniciar un servicio
docker compose restart backend

# Ver estado
docker compose ps

# Actualizar solo el backend
docker compose build --no-cache backend && docker compose up -d backend
```

---

## Variables de entorno requeridas en producción

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `POSTGRES_PASSWORD` | Contraseña de la base de datos |
| `REDIS_URL` | Cadena de conexión Redis |
| `REDIS_PASSWORD` | Contraseña de Redis |
| `JWT_SECRET` | Secreto de firma JWT (≥64 chars) |
| `CORS_ORIGINS` | Orígenes permitidos (coma-separados) |
| `NEXT_PUBLIC_API_URL` | URL pública del backend |

**Nunca subir `.env` al repositorio.** Ya está en `.gitignore`.
