# Estado del sistema SIAGRD Meta
## Última actualización: 2026-06-05
## Agente activo: Completo

### Completado ✅
- Monorepo inicializado con pnpm workspaces
- Estructura de directorios creada
- .gitignore y .env.example configurados
- **Agente 1 — Schema DB + API Fastify:**
  - Schema PostgreSQL+PostGIS con 27 municipios del Meta y organismos de socorro (seeds)
  - Script de validación RLS cross-municipio
  - Tipos TypeScript del dominio SIAGRD
  - Logger pino, error classes, Supabase client
  - Middleware JWT Supabase con inyección de usuario en request
  - Servicios mock IDEAM y SGC (DT-001 y DT-002)
  - sync.service (offline-critical) + storage.service (compresión fotos)
  - Rutas: health, sync, incidentes, alertas, archivos
  - notifications.service FCM batch con fallback graceful
  - Entry point Fastify con helmet, cors, rate-limit
  - Docker Compose con PostgreSQL+PostGIS + Redis
  - Tests básicos sync.service y health
- **Agente 2 — Design System "Tactical Clarity":**
  - Tokens de diseño (colores, tipografía, espaciado)
  - EmergencyButton 56/72dp para uso en campo
  - OfflineBanner con animación de entrada
  - CoordDisplay formato DMS con precisión GPS
  - IncidentCard con nivel visual y distancia
  - SyncStatus con badge y botón sync manual
  - Exportación de todos los componentes desde index
- **Agente 3 — App Móvil Socorro (offline-first):**
  - 9 pantallas implementadas (login, dashboard, mapa incidentes, reporte nuevo, detalle incidente, recursos, alerta temprana, sync status, perfil)
  - Navegación React Navigation con soporte offline
  - Drift + sincronización delta con backend Fastify
- **Agente 4 — Panel Web Coordinación CDGRD:**
  - 12 rutas implementadas (dashboard, incidentes, mapa general, recursos, alertas, organismos, reportes, usuarios, municipios, configuración, historial, exportaciones)
  - Next.js + Leaflet + React Query
  - Roles CDGRD / Organismo / Observador con guards
- **Agente 5 — App Ciudadana (PWA + nativa):**
  - 15 pantallas implementadas (onboarding, home, mapa alertas, detalle alerta, reportar incidente, mis reportes, perfil, notificaciones, preparación emergencias, directorio contactos, zona segura, historial alertas, configuración, ayuda, acerca de)
  - PWA con service worker + React Native (Android/iOS)
  - Registro de dispositivo y preferencias por municipio
  - Push notifications para alertas en tiempo real
  - Modo offline para consulta de guías de preparación
- **Agente 6 — CI/CD, Seguridad y Disaster Recovery:**
  - GitHub Actions pipelines: lint, test, build, deploy (Railway + Vercel)
  - Análisis de seguridad: CodeQL, Snyk, OWASP dependency check
  - Secrets scanning con git-secrets y trufflehog
  - Política de backup automático PostgreSQL (RPO 1h, RTO 4h)
  - Runbook de DR con pasos de restauración documentados
  - Sentry integrado en todos los paquetes (backend, web, mobile)
  - Rate limiting y WAF configurado en Railway
  - Certificados TLS automáticos (Let's Encrypt via Railway/Vercel)

**Sesión 2026-06-05 — Integración backend + tests + seguridad:**

- **A1 — Rutas backend faltantes:**
  - `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (JWT Supabase)
  - `GET /dashboard/stats` con 6 métricas paralelas, `GET /dashboard/mapa-datos` GeoJSON
  - Utilidades geo: `wktPoint`, `parseGeoJSONPoint`, `distanciaKm` (Haversine)
  - Seed SQL: 10 organismos de socorro del Meta con JOIN a municipios
  - `index.ts` actualizado con 5 rutas registradas bajo `/api/v1`

- **A2 — Design System (componente nuevo + tests):**
  - `PhotoCapture.tsx` — captura de foto desde cámara/galería con preview (195 líneas)
  - Tests unitarios: 7 tests tokens, 4 tests EmergencyButton, 5 tests AlertaBadge
  - Setup Vitest con mocks de módulos nativos

- **A4 — Panel Web (páginas nuevas):**
  - Componentes: `RealtimeIndicator`, `NivelAlertaGlobal`, `IncidenteTimeline`, `SistemasSalud`, `AlertaEmision`
  - Hooks: `useRealtimeReportes` (suscripción realtime Supabase, reportes pendientes)
  - Páginas nuevas: recursos, damnificados, municipios/[id], organismos, usuarios, configuración, historial, exportaciones (CSV real con `URL.createObjectURL`)

- **QA1 — Tests backend (suite completa):**
  - 56 tests en 6 archivos: auth.routes (9), incidentes.routes (13), alertas.routes (10), geo.utils (10), dashboard.routes (7), middleware (7)
  - Cobertura de rutas críticas, casos de borde, control de acceso por rol

- **SEC — Auditoría de seguridad:**
  - 13 hallazgos documentados; 1 bloqueante para producción (Hallazgo 4: sin whitelist MIME en upload)
  - `docs/security/SECURITY_CHECKLIST.md` y `docs/security/SECRET_ROTATION.md` creados
  - Hallazgos MEDIO: rate limit genérico, perfil null → rol silencioso, recursos visibles para todos, INSERT anónimo en reportes, audit_log sin RLS anti-DELETE, incidentes_cercanos sin filtro tenant

**Sesión 2026-06-05 — Bloque 2: Tests, PWA, seguridad y datos:**

- **Tests socorro + ciudadano + E2E:**
  - `apps/socorro/src/tests/sync.service.test.ts` — 18 tests (orden sync, sin conexión, sin token, deviceId)
  - `apps/socorro/src/tests/location.service.test.ts` — 12 tests (sin bloquear, precisión, accuracy null → RED)
  - `apps/ciudadano/src/tests/alertas.service.test.ts` — 15 tests (getAlertasActivas lanza en error, fallback cache, filtro municipio_codigo)
  - `apps/panel-web/e2e/dashboard.spec.ts` — 4 tests E2E Playwright (dashboard, mapa, alertas, incidentes)
  - `apps/panel-web/playwright.config.ts` configurado
  - `apps/ciudadano/package.json` actualizado con jest, jest-expo, @testing-library/react-native

- **PWA + Web Push (app ciudadana):**
  - `apps/ciudadano/public/manifest.json` — manifest PWA completo (colores, iconos 72–512px, standalone, es-CO)
  - `apps/ciudadano/public/sw.js` — service worker cache-first estáticos / network-first API, push diferenciado por nivel (ROJO: interacción + vibración extendida)
  - `apps/ciudadano/src/lib/pwa.ts` — `registerServiceWorker()` y `subscribeToPush()` con conversión base64url→Uint8Array
  - `apps/ciudadano/src/app/_layout.tsx` — `registerServiceWorker` en useEffect solo en web, `<Head>` con manifest + meta Apple

- **Rate limiting + fixes DT-005 / DT-006:**
  - `backend/src/routes/archivos.ts` — rate limit POST upload: 50/hora
  - `backend/src/routes/alertas.ts` — rate limit POST emitir: 10/hora
  - `backend/src/middleware/auth.ts` — logger.warn cuando profile es null (DT-005)
  - `database/migrations/004_incident_code_sequence.sql` — reemplaza `generate_incident_code` con secuencia PostgreSQL (DT-006, race condition eliminada)

- **Fixes RLS:**
  - `database/migrations/005_rls_fixes.sql` — correcciones hallazgos 6, 7, 9, 11
  - `backend/src/routes/incidentes.ts` — validación rango lat/lng + advertencia coordenadas fuera de Colombia (hallazgo 5)

- **Entorno + semillas + docs:**
  - `.env.example` — agregadas `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `LOG_LEVEL`; reorganizado en secciones
  - `package.json` raíz — script `test:e2e` agregado; `db:seed` actualizado para correr `municipios_meta.sql` + `organismos_meta.sql`
  - `database/seeds/organismos_meta.sql` — 10 organismos SNGRD del Meta (CORMACARENA, bomberos, Defensa Civil, Cruz Roja, CDGRD-Meta, UMGRD municipios)
  - `docs/DEUDA_TECNICA.md` — DT-004 marcado resuelto (2026-06-05)

### En progreso 🔄

### Pendiente ⏳
- Semana 8: Integración y pruebas de campo con usuarios reales
- Generar PNGs de iconos PWA (72–512px) a partir de assets existentes y copiar a `apps/ciudadano/public/icons/`

### Decisiones técnicas clave tomadas
- Stack inamovible: Node.js+Fastify+Supabase / React Native / Next.js
- Infraestructura objetivo: USD 0–75/mes (Railway + Supabase + Vercel)
- Código abierto MIT (requisito sector público colombiano)

### Cómo levantar el entorno
```bash
pnpm install
cp .env.example .env  # Completar con credenciales reales
docker-compose up -d  # PostgreSQL+PostGIS + Redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Variables de entorno requeridas
- SUPABASE_URL — URL del proyecto Supabase
- SUPABASE_ANON_KEY — clave anónima (cliente)
- SUPABASE_SERVICE_ROLE_KEY — clave service role (SOLO backend)
- FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL — FCM push
- RAILWAY_TOKEN, VERCEL_TOKEN — deploy
- SENTRY_DSN — monitoreo de errores
