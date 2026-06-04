# Estado del sistema SIAGRD Meta
## Última actualización: 2026-06-04
## Agente activo: Checkpoint Semana 3

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

### En progreso 🔄
- Agente 5: App Ciudadana (PWA + nativa)

### Pendiente ⏳
- Agente 5: App Ciudadana (PWA + nativa)
- Agente 6: Seguridad, CI/CD y Observabilidad
- Integración y pruebas de campo

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
- TWILIO_* — SMS fallback (pay-per-use)
