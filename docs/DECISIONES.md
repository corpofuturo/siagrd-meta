# Decisiones Técnicas — SIAGRD Meta

## [2026-06-04] [monorepo] Decisión: pnpm workspaces en vez de Turborepo. Razón: menor complejidad de setup, suficiente para el tamaño del proyecto, sin costo adicional.

## [2026-06-04] [BD] Decisión: Usar PostGIS en Supabase en vez de instancia PostgreSQL separada. Razón: Supabase incluye PostGIS gratis, elimina una dependencia de infraestructura.

## [2026-06-04] [offline] Decisión: WatermelonDB en vez de MMKV o AsyncStorage para persistencia offline. Razón: WatermelonDB es SQLite nativo con sync incorporado, ideal para datos relacionales de incidentes.

## [2026-06-04] [mapas] Decisión: MapLibre GL + OpenStreetMap en vez de Mapbox o Google Maps. Razón: costo cero, REGLA 5 del proyecto (infraestructura USD 0 hasta 10.000 usuarios).

## [2026-06-04] [fotos] Decisión: JPEG en vez de WebP para compresión en React Native. Razón: WebP no tiene soporte completo en RN (DT documentada), JPEG con calidad 0.75 logra objetivo < 300KB.
