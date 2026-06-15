# Despliegue — SATAM / SIAGRD

**VPS:** 13.140.174.122 (Contabo, Ubuntu 22.04)
**Subdominio API:** https://api.satam.corpofuturo.org → puerto 127.0.0.1:3000
**Subdominio Panel:** https://satam.corpofuturo.org → puerto 127.0.0.1:3001
**Stack:** Node.js (Fastify) + Next.js panel + PostgreSQL/PostGIS + Docker

---

## Credenciales y secretos

| Variable | Descripción |
|---|---|
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL |
| `JWT_SECRET` / `SECRET_KEY` | Clave JWT del backend |

El `.env` real está en `/srv/siagrd/.env` (o en la raíz del proyecto en el VPS). **Nunca en git.**

---

## Estructura en el VPS

```
/srv/siagrd/  (o ~/siagrd/)
├── .env                    # Secretos reales (NO en git)
├── docker-compose.yml      # Compose de producción
├── backend/                # API Fastify (Node.js)
├── apps/panel-web/         # Panel Next.js
└── infra/
    ├── nginx.conf          # Config Nginx (referencia)
    └── deploy.sh           # Script de redeploy

/etc/nginx/conf.d/siagrd.conf    # Config activa en Nginx
/etc/letsencrypt/live/api.satam.corpofuturo.org/
/etc/letsencrypt/live/satam.corpofuturo.org/
```

---

## Primer despliegue (desde cero)

### 1. Desde PowerShell — subir el código
```powershell
cd D:\Jota\Desa\SIAGRD
Compress-Archive -Path * -DestinationPath siagrd.zip -Force
scp -i "$HOME\.ssh\corpofuturo_deploy" siagrd.zip root@13.140.174.122:/tmp/siagrd.zip
```

### 2. En el VPS — extraer
```bash
mkdir -p /srv/siagrd && cd /srv/siagrd
unzip -o /tmp/siagrd.zip && rm /tmp/siagrd.zip
```

### 3. Crear el .env
```bash
nano /srv/siagrd/.env
```

### 4. Nginx y SSL
```bash
# Config temporal HTTP para certbot
cat > /etc/nginx/conf.d/siagrd.conf << 'EOF'
server { listen 80; server_name api.satam.corpofuturo.org satam.corpofuturo.org; location / { return 200 "ok"; } }
EOF
nginx -t && nginx -s reload

# Obtener certificados (dos subdominios)
certbot --nginx -d api.satam.corpofuturo.org -d satam.corpofuturo.org

# Config final
cp /srv/siagrd/infra/nginx.conf /etc/nginx/conf.d/siagrd.conf
nginx -t && nginx -s reload
```

### 5. Levantar contenedores
```bash
cd /srv/siagrd
docker compose --env-file .env up -d --build
```

### 6. Verificar
```bash
curl https://api.satam.corpofuturo.org/api/v1/health
```

---

## Actualizar código (flujo normal de desarrollo)

### Opción A — usando el script incluido (si tienes git en el VPS)
```bash
cd /srv/siagrd
bash infra/deploy.sh
```

### Opción B — subiendo ZIP desde PowerShell
```powershell
cd D:\Jota\Desa\SIAGRD
Compress-Archive -Path * -DestinationPath siagrd.zip -Force
scp -i "$HOME\.ssh\corpofuturo_deploy" siagrd.zip root@13.140.174.122:/tmp/siagrd.zip
```

```bash
# En el VPS
cd /srv/siagrd
unzip -o /tmp/siagrd.zip && rm /tmp/siagrd.zip
docker compose --env-file .env up -d --build
```

---

## Comandos útiles en el VPS

```bash
# Ver logs del backend
docker compose -f /srv/siagrd/docker-compose.yml logs -f backend

# Ver logs del panel
docker compose -f /srv/siagrd/docker-compose.yml logs -f panel-web

# Estado de contenedores
docker compose -f /srv/siagrd/docker-compose.yml ps

# Reiniciar sin rebuild
docker compose -f /srv/siagrd/docker-compose.yml restart backend panel-web

# Healthcheck
curl http://localhost:3000/api/v1/health
```

---

## DNS requerido

| Registro | Nombre | IP |
|---|---|---|
| A | api.satam | 13.140.174.122 |
| A | satam | 13.140.174.122 |
