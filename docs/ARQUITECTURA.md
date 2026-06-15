# Arquitectura SIAGRD Meta

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIAGRD META                               │
│              Sistema de Gestión del Riesgo — Meta, CO           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐
│  App Socorro │  │  Panel Web   │  │  App Ciudad. │  │  IDEAM   │
│  (RN+Expo)   │  │  (Next.js14) │  │ (RN+Expo+PWA)│  │  (mock)  │
│  Offline-72h │  │  CDGRD Meta  │  │  1M usuarios │  │  SGC mock│
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘
       │                 │                  │               │
       └─────────────────┼──────────────────┼───────────────┘
                         │  HTTPS + JWT      │
                    ┌────▼──────────────────▼────┐
                    │     API Fastify + Node.js   │
                    │     backend/ (VPS Contabo (13.140.174.122))  │
                    │  ┌─────────────────────┐    │
                    │  │ Auth middleware      │    │
                    │  │ Rate limiting        │    │
                    │  │ Audit logging        │    │
                    │  └─────────────────────┘    │
                    │  Routes:                     │
                    │  POST /sync  ← crítico       │
                    │  POST /archivos/upload       │
                    │  GET/POST /incidentes        │
                    │  GET/POST /alertas           │
                    │  POST /alertas/:id/emitir    │
                    │  GET /health                 │
                    └────────────┬────────────────┘
                                 │
              ┌──────────────────┼────────────────────┐
              │                  │                     │
    ┌─────────▼──────┐  ┌───────▼────────┐  ┌────────▼───────┐
    │   PostgreSQL      │  │  Redis Redis │  │    Notificaciones    │
    │   PostgreSQL    │  │  (caché/rate)  │  │    Push (push)  │
    │   + PostGIS     │  │  Plan gratuito │  │    Gratis      │
    │   + Auth        │  └────────────────┘  └────────────────┘
    │   + Storage     │
    │   + Realtime    │
    │   Plan Free     │
    └─────────────────┘

## Flujo offline (App Socorro)

  Campo sin señal
       │
  WatermelonDB (SQLite local)
  ← incidentes, actualizaciones, archivos
       │
  Cola de sync (sync_queue local)
       │
  Al recuperar señal → POST /sync
  ← server devuelve alertas_activas + incidentes_nuevos
       │
  WatermelonDB actualizado

## Roles de usuario

  ADMIN     → ve todo, puede hacer todo
  CDGRD     → coordinación departamental, emite alertas
  CMGRD     → coordinación municipal (solo su municipio)
  SOCORRO   → Bomberos/Defensa Civil/Cruz Roja (solo su municipio)
  CIUDADANO → ve alertas, reporta incidentes (solo lectura de alertas)

## Stack de costos (REGLA 5)

  VPS Contabo (13.140.174.122)    → backend API      → Gratis
  PostgreSQL       → BD + Auth + RTC  → Gratis (500MB)
  VPS         → panel-web        → Gratis
  Notificaciones (Telegram/WhatsApp)   → push             → Gratis
  Redis Redis  → caché            → Gratis
  GitHub Actions → CI/CD            → Gratis
  Sentry         → errores          → Gratis
  UptimeRobot    → uptime           → Gratis
  OSM + MapLibre → mapas            → Gratis
  ─────────────────────────────────────────────
  TOTAL                             → USD 0/mes
```
