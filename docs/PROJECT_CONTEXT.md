# PROJECT_CONTEXT.md — SIAGRD Meta (SATAM)

> Estado real verificado — última actualización 2026-07-06. Ver `CLAUDE.md` para las reglas de trabajo. La rama `feat/diseno-indigo-sage` descrita más abajo ya fue mergeada a `main` completa (PRs #9-#13) — ver `docs/sessions/SESSION-2026-07-04.md` para el cierre detallado y los pendientes reales.

## Qué es

Sistema de Alertas Tempranas de Amenazas Múltiples (SATAM) para el Departamento del Meta, Colombia. Gestión de incidentes, alertas, damnificados, organismos de socorro y comités de gestión del riesgo (CDGRD/CMGRD), con panel de administración web y app móvil ciudadana.

## Arquitectura real

- **Monorepo pnpm** (`node-linker=hoisted`): `backend/` (Fastify + TS + SQL puro vía `postgres.js`), `apps/panel-web` (Next.js 14), `apps/ciudadano` (RN/Expo — única app móvil activa), `apps/socorro` (deprecada, fusionada en ciudadano), `packages/ui` (design system compartido), `packages/types`, `packages/config`.
- **Producción**: VPS Contabo (`13.140.174.122`), Docker Compose (postgres/postgis + backend + panel-web) + Nginx (TLS via certbot). Ruta real en el servidor: `/opt/siagrd` (existió una copia obsoleta en `/srv/siagrd`, eliminada 2026-07-03).
- **URLs reales verificadas (2026-07-03)**: API en `https://api.satam.corpofuturo.org` (DNS ok). El panel-web está pensado para `https://panel.satam.corpofuturo.org` (así está en `infra/nginx.conf`) pero **ese registro DNS nunca se creó** — el panel en realidad se accede hoy en `https://satam.corpofuturo.org` (sin el prefijo `panel.`, que sí resuelve). Pendiente menor: crear el registro DNS correcto o ajustar `nginx.conf`/documentación al dominio real en uso.
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

Ver `TECH_DEBT.md` (raíz), `docs/DEUDA_TECNICA.md` y `BLOCKERS.md`. **Advertencia activa:** existen tres registros de deuda técnica con numeración DT-XXX independiente en este repo — no asumir a cuál se refiere un DT-XXX sin especificar el archivo. Dentro de `TECH_DEBT.md` mismo hay además dos numeraciones que conviven: `ARQ-DT-00X` (heredada de `ARQUITECTURA.md`, Hito 2, cerrada 16/16) y `DT-00X` nueva para hallazgos de SQA en dispositivo de la sesión 2026-07-04 — no son el mismo espacio de números.

## Sesión 2026-07-04 → 2026-07-06 — rama `feat/diseno-indigo-sage` (CERRADA, mergeada a `main`)

**Estado final**: mergeada completa a `main` vía PR #9, #10, #11, #12, #13 (todos cerrados). No queda rama abierta de esta sesión. Detalle completo en `docs/sessions/SESSION-2026-07-04.md`, incluyendo un incidente real de producción durante el deploy de PR #10 (contenedores Docker huérfanos, 502 temporal, reparado y verificado) y su procedimiento de recuperación. Lo que sigue en esta sección es el registro original de la rama en progreso — se conserva por el detalle de verificación, pero los "pendientes exactos" del final ya están resueltos salvo lo listado en la sesión.

**Verificado contra código (no contra lo que dicen los documentos):**

- **Hito 1 (Seguridad, `ROADMAP.md` dice 5/5)**: el propio `ROADMAP.md` (línea 19) ya trae la salvedad correcta — no darlo por cerrado sin una pasada de `security-auditor` + confirmación de `sqa-backend` de que la suite (126/126 al 2026-07-03) sigue verde. Esa verificación independiente **no se hizo en esta sesión**. No hay evidencia de código que contradiga el 5/5, pero sigue sin auditoría fresca.
- **Hito 2 (deuda funcional, `TECH_DEBT.md` dice 16/16)**: confirmado por lectura directa — ARQ-DT-006 (`/alcaldias`, 552 líneas reales), ARQ-DT-007 (`GET /api/v1/geo/departamento` real en `backend/src/routes/geo.ts`), ARQ-DT-010 (CI/CD real: `.github/workflows/deploy.yml` + `ci.yml` existen), ARQ-DT-011 (`/estadisticas`, 480 líneas reales) todos tienen código real detrás, no son afirmaciones vacías.
- **DT-006** (tab Reportar no navegaba) — resuelto parcialmente: `ReportarScreen` sacado del árbol de rutas, tab lo renderiza directo (commit `7cd11d4`). Pendiente: paso 3 (confirmación) y botón "Volver al inicio" sin verificar en dispositivo, bloqueado por el bug de DT-010 en su momento.
- **DT-007** (mapa 401 anónimo) — resuelto: `signInAnonymous()` ahora llama a `POST /auth/anonymous` real en vez de fabricar un token falso (commit `6614b77`). Verificado en dispositivo físico: mapa carga con datos reales, sin 401 en logcat.
- **DT-010** (`POST /reportes-ciudadanos` roto de raíz) — fix de código resuelto y commiteado (`43ac83b`): tres bugs de esquema encadenados (nombres de campo `tipo_amenaza`/`latitud`/`longitud` vs `tipo`/`ubicacion`; columna `reportado_por` en vez de `reportante_id`; columna `updated_at` que no existía). Incluye migración aditiva `database/migrations/027_reportes_foto_url.sql` y 5 tests de integración nuevos.
- **DT-011** (cola offline nunca sincroniza) — **abierto, sin implementar.** `apps/ciudadano/src/services/offline-queue.service.ts` tiene `encolarReporte()` pero la función `procesarCola()` descrita en el comentario de cabecera no existe en el archivo — nada reintenta el envío al recuperar señal. Viola el ciclo offline-first exigido en `CLAUDE.md` §12. Prioridad alta, delegar en `offline-sync-specialist`.

**Migración 027 — RECONCILIADO**: el agente de revisión de estado marcó esto como discrepancia porque `TECH_DEBT.md` commit `e03f020` decía "no aplicada aún" — correcto en ese momento. Después de ese commit, en la misma sesión, se abrió un túnel SSH a producción (`ssh -L 5434:172.18.0.2:5432 root@13.140.174.122`, aprobado explícitamente por el usuario) y se aplicó la migración. **Verificado dos veces contra `information_schema.columns` de la base real** (antes y después de un segundo túnel de confirmación): `foto_url` y `updated_at` existen en `reportes_ciudadanos` de producción. `TECH_DEBT.md` (commit `4e7ad0c`) ya quedó actualizado con este estado. Dar la migración por **aplicada en producción**.

**DT-012 (nuevo, 2026-07-04)** — hallazgo de `security-auditor`: `POST /reportes-ciudadanos` (público) aceptaba `foto_url` como cualquier string sin validar que viniera de una subida propia — vector de tracking/fingerprinting contra funcionarios vía `<img>` en el panel-web. Corregido (commit `4e7ad0c`): ahora exige el prefijo real de `/api/v1/archivos/static/`. Además se confirmó que la subida de foto en reportes ciudadanos nunca funcionó de punta a punta (cliente apunta a un endpoint/contrato que no existe para el caso anónimo) — documentado como deuda abierta, requiere diseño de endpoint nuevo.

**SQA post-fixes (2026-07-04, 4 agentes en paralelo tras los commits anteriores):**
- `security-auditor`: sin hallazgos críticos/altos. 1 medio (foto_url, ya corregido arriba). 1 bajo aceptado (bypass de rate-limit anónimo→autenticado forjando JWT sin firma verificada — impacto bajo, backpressure sigue existiendo).
- `sqa-backend`: 159/159 tests verdes (incluye 24 en `reportes.routes.test.ts`, ampliados de 5). Cobertura real de `reportes.ts` ~88% líneas (medida manualmente). **Hallazgo de infraestructura**: `vitest.config.ts` (`coverage.include`) excluye `src/routes/**` de la medición de cobertura de TODO el backend, no solo esta rama — el gate de "80% mínimo" nunca se verifica automáticamente para rutas. No corregido (cambiaría el gate de CI global), reportado para decisión aparte.
- `sqa-frontend`: `tsc --noEmit` limpio. Vitest de `packages/ui` 16/16. **Hallazgo de infraestructura**: `@playwright/test` no estaba instalado como dependencia real pese a existir `playwright.config.ts` — la suite E2E nunca pudo correr. Instalado como devDependency (commit pendiente). El único spec E2E existente (`dashboard.spec.ts`) es un **falso positivo**: nunca setea la cookie httpOnly real, así que en la práctica prueba la pantalla de login, no el dashboard — pendiente de fix del fixture. **Bug preexistente encontrado** (no introducido por la migración de paleta): el dashboard no colapsa bien a 360px (texto de "INCIDENTES ACTIVOS" cortado, botón "EMITIR ALERTA" recortado) — no genera scroll horizontal pero el layout está roto en mobile. Pendiente, no bloqueante para este merge, delegar en `ux-ui-designer`.
- Accesibilidad de login: labels correctos, foco visible con buen contraste.

**Riesgo activo**: el backend de producción en el VPS sigue con el código viejo (bug de reportes sin corregir) hasta que se mergee `main` y se despliegue — pero la migración 027 ya está aplicada, así que el deploy es seguro en cuanto a esquema.

**Pendientes exactos — ya resueltos, marcados solo por trazabilidad:**
1. ~~Verificar migración 027~~ — hecho, aplicada y confirmada en producción.
2. ~~Resolver archivos sin trackear~~ — quedaron como docs sueltos en `docs/`, no bloquearon el merge.
3. ~~Abrir PR y merge~~ — hecho, PR #9-#13, todos mergeados a `main`.
4. ~~Post-deploy: verificar envío de reportes contra producción real~~ — hecho vía `curl` (ver sesión 2026-07-04→06).

**Pendiente real que queda abierto** (ver `docs/sessions/SESSION-2026-07-04.md` para el detalle completo):
- Verificación en dispositivo físico (ADB) del flujo de reportar un incidente hasta el paso 3 de confirmación — no se pudo hacer por falta de celular conectado en la última sesión.
- DT-011 (offline sync), DT-012 (subida de foto en reportes), DT-013 (gap de cobertura en `vitest.config.ts`), DT-014 (falso positivo en `dashboard.spec.ts`), DT-015 (responsive del dashboard a 360px) — todo abierto en `TECH_DEBT.md`, ninguno bloqueante.
- Limpieza de código muerto detectada por `knip` (instalado esta sesión, no se limpió nada aún).
- Auditoría independiente de Hito 1 (Seguridad) sigue sin hacerse pese a que `ROADMAP.md` marca 5/5.
