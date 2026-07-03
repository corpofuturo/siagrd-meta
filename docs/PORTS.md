# PORTS.md — Registro de puertos SIAGRD Meta

> Verificado contra `docker-compose.yml`, `infra/nginx.conf` y `backend/.env` — 2026-07-03.
> Un puerto no registrado aquí es un bug.

| Servicio | Puerto interno | Puerto expuesto | Entorno | Fecha |
|---|---|---|---|---|
| Backend (Fastify) | 3000 | `127.0.0.1:3000` (solo local al VPS, Nginx proxea) | Producción | 2026-06 |
| Panel-web (Next.js) | 3001 | `127.0.0.1:3001` (solo local al VPS, Nginx proxea) | Producción | 2026-06 |
| PostgreSQL/PostGIS | 5432 | No expuesto (solo red interna Docker `siagrd-net`) | Producción | 2026-06 |
| Nginx | 80 / 443 | Público — único punto de entrada | Producción | 2026-06 |
| Backend (dev local) | 3000 | `localhost:3000` | Desarrollo | — |
| Panel-web (dev local) | 3001 (o el indicado en `next dev --port`) | `localhost:<puerto>` | Desarrollo | — |
| PostgreSQL (dev local) | 5433 | `localhost:5433` (ver `backend/.env` → `DATABASE_URL`) | Desarrollo | — |

## Notas

- En producción, ningún servicio expone puertos directamente al exterior salvo Nginx (80/443) — verificado en `docker-compose.yml`: `ports: ['127.0.0.1:3000:3000']` y `['127.0.0.1:3001:3001']`.
- El desarrollo local requiere Docker Desktop corriendo para levantar Postgres en `5433`; si Docker Desktop está apagado, el backend local falla con `CONNECT_TIMEOUT 127.0.0.1:5433` (no es un bug de la app).
- **No hay pm2 en el VPS** — verificado con `which pm2` (no instalado). El backend corre dentro de su contenedor Docker.
