# Decisiones Técnicas — SIAGRD Meta

## [2026-06-04] [monorepo] Decisión: pnpm workspaces en vez de Turborepo. Razón: menor complejidad de setup, suficiente para el tamaño del proyecto, sin costo adicional.

## [2026-06-04] [BD] Decisión: Usar PostGIS en PostgreSQL en vez de instancia PostgreSQL separada. Razón: PostgreSQL incluye PostGIS gratis, elimina una dependencia de infraestructura.

## [2026-06-04] [offline] Decisión: WatermelonDB en vez de MMKV o AsyncStorage para persistencia offline. Razón: WatermelonDB es SQLite nativo con sync incorporado, ideal para datos relacionales de incidentes.

## [2026-06-04] [mapas] Decisión: MapLibre GL + OpenStreetMap en vez de Mapbox o Google Maps. Razón: costo cero, REGLA 5 del proyecto (infraestructura USD 0 hasta 10.000 usuarios).

## [2026-06-04] [fotos] Decisión: JPEG en vez de WebP para compresión en React Native. Razón: WebP no tiene soporte completo en RN (DT documentada), JPEG con calidad 0.75 logra objetivo < 300KB.

## [2026-07-03] [roadmap] Se recibió ROADMAP_EJECUCION_v1.md con 10 fases de ejecución autónoma. Auditoría contra el código real mostró que varios ítems de la Fase 0 ya estaban resueltos o eran obsoletos: seedDemoUsers ya protegido (NODE_ENV + rol ADMIN, no se ejecuta al arrancar), HTTPS ya configurado en el VPS (certbot + nginx, ver infra/nginx.conf), helmet/rate-limit/CORS ya registrados en index.ts. Se ejecutó solo lo que faltaba realmente: registrar @fastify/websocket (DT-005). La migración de JWT a cookie httpOnly pura (DT-004 del roadmap / DT-006 de este repo) se dejó pendiente de decisión de arquitectura porque afecta la capa completa de fetch del panel-web y el middleware de auth del backend — no es un cambio mecánico de una tarde.
