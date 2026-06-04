# Estado del sistema SIAGRD Meta
## Última actualización: 2026-06-04
## Agente activo: Inicialización

### Completado ✅
- Monorepo inicializado con pnpm workspaces
- Estructura de directorios creada
- .gitignore y .env.example configurados

### En progreso 🔄
- Agente 1: Schema de base de datos + API Fastify
- Agente 2: Design System "Tactical Clarity"

### Pendiente ⏳
- Agente 3: App Móvil Socorro (offline-first)
- Agente 4: Panel Web Coordinación (CDGRD)
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
