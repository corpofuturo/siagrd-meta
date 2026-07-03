# PROJECT_CONTEXT.md — SIAGRD Meta (SATAM)

> Estado real verificado — 2026-07-03. Ver `CLAUDE.md` para las reglas de trabajo.

## Qué es

Sistema de Alertas Tempranas de Amenazas Múltiples (SATAM) para el Departamento del Meta, Colombia. Gestión de incidentes, alertas, damnificados, organismos de socorro y comités de gestión del riesgo (CDGRD/CMGRD), con panel de administración web y app móvil ciudadana.

## Arquitectura real

- **Monorepo pnpm** (`node-linker=hoisted`): `backend/` (Fastify + TS + SQL puro vía `postgres.js`), `apps/panel-web` (Next.js 14), `apps/ciudadano` (RN/Expo — única app móvil activa), `apps/socorro` (deprecada, fusionada en ciudadano), `packages/ui` (design system compartido), `packages/types`, `packages/config`.
- **Producción**: VPS Contabo (`13.140.174.122`), Docker Compose (postgres/postgis + backend + panel-web) + Nginx (TLS via certbot). Ruta real en el servidor: `/opt/siagrd` (existió una copia obsoleta en `/srv/siagrd`, eliminada 2026-07-03).
- **Despliegue**: push a `main` → GitHub Actions (`deploy.yml`) → SSH → `git pull` + `docker compose up -d --build`. Backup diario de PostgreSQL vía cron en el VPS.

## Actores/roles

`ADMIN`, `CDGRD` (departamental), `CMGRD` (municipal), `SOCORRO` (organismos), `CIUDADANO` (app pública). Autorización siempre en `backend/src/middleware/auth.ts` (`authMiddleware`, `requireRole`), nunca solo en la UI.

## Máquina de estados de incidentes (verificada en código)

`PENDIENTE → CONFIRMADO → EN_CURSO → CONTROLADO → CERRADO`, con `CANCELADO` y `FALSO_POSITIVO` como estados terminales alternativos. Ver `backend/src/routes/incidentes.ts` (`ESTADOS_VALIDOS`) — no asumir otros valores sin leer el código primero (hubo un caso de un test que usaba `'ATENDIDO'`, que nunca existió en el enum).

## Autenticación

JWT (access 8h, refresh 30d con rotación y lista negra de revocados). Dos formas de presentar el token, ambas válidas en `authMiddleware`:
- **App móvil**: `Authorization: Bearer <token>`.
- **Panel-web**: cookie httpOnly `siagrd_token` (Domain=`.corpofuturo.org` en prod), enviada automáticamente por un parche de `window.fetch` en `apps/panel-web/src/lib/api.ts` que agrega `credentials: 'include'` a las llamadas al backend. `getToken()` es un no-op deprecado por compatibilidad con ~30 call sites que aún lo importan. El usuario actual se obtiene con `useCurrentUser()` (`GET /api/v1/auth/me`), no decodificando el JWT en el cliente.

## Flujo offline (app ciudadano)

Reportes y cambios de estado se guardan localmente primero y entran a una cola de sincronización (`apps/ciudadano/src/services/`). Fotos se comprimen en JPEG calidad 0.75 (decisión ya tomada, ver `docs/DECISIONES.md`).

## Notificaciones

Cola durable procesada cada 30s (`backend/src/services/notifications.service.ts`), canales: push (Expo/FCM), Telegram, WhatsApp Business.

## Gotchas del entorno de desarrollo (Windows)

- **Docker Desktop debe estar corriendo** para levantar Postgres local (`localhost:5433`) — si está apagado, el backend local falla con `CONNECT_TIMEOUT 127.0.0.1:5433`.
- **`node-linker=hoisted`**: los binarios (`next`, `tsx`, etc.) viven en el `node_modules` raíz del monorepo, no en `node_modules/<paquete>/node_modules/.bin/`. Si `node_modules` se corrompe (paquete con carpeta vacía en el store de pnpm), la solución es borrar `node_modules` completo y `pnpm install` de nuevo — parchear el store a mano no funciona de forma confiable.
- **App móvil**: build siempre con Android Studio local + celular conectado por ADB (USB debugging). Nunca EAS Build.
- **Celular de pruebas**: se conecta y detecta con `adb devices`; Android Studio ya está configurado en el entorno de desarrollo.

## Decisiones activas relevantes

Ver `docs/DECISIONES.md` para el registro completo. Puntos clave: PostGIS en vez de PostgreSQL+servicio geoespacial separado; MapLibre+OSM en vez de Mapbox/Google (costo cero); WatermelonDB para persistencia offline; JPEG 0.75 para fotos (WebP sin soporte completo en RN).

## Deuda técnica y bloqueos

Ver `TECH_DEBT.md` (raíz), `docs/DEUDA_TECNICA.md` y `BLOCKERS.md`. **Advertencia activa:** existen tres registros de deuda técnica con numeración DT-XXX independiente en este repo — no asumir a cuál se refiere un DT-XXX sin especificar el archivo.
