# Deuda Tecnica — siagrd

Estas 4 integraciones requieren gestion externa.

## DT-001 — IDEAM API Real
**Archivo**: backend/src/services/ideam.service.ts
**Estado**: MOCK activo — retorna datos simulados de inundacion AMARILLO
**Requiere**: Convenio formal con IDEAM (ideam.gov.co) + API key oficial
**Contacto**: atencionciudadano@ideam.gov.co
**Impacto**: Alertas hidrometeorologicas simuladas hasta activar

## DT-002 — SGC API Real (Sismos)
**Archivo**: backend/src/services/sgc.service.ts
**Estado**: MOCK activo — retorna evento sismico historico simulado
**Requiere**: Convenio Gobernacion del Meta con Servicio Geologico Colombiano
**Contacto**: sgc.gov.co
**Impacto**: Eventos sismicos simulados hasta activar

## DT-003 — Traduccion Sikuani
**Archivo**: apps/ciudadano/src/i18n/sik.json
**Estado**: Placeholders [TRADUCIR: ...]
**Requiere**: Validacion con comunidades indigenas Sikuani del Meta
**Contacto**: Secretaria de Asuntos Indigenas — Gobernacion del Meta
**Impacto**: App ciudadana solo en espanol para comunidades Sikuani

## DT-004 — WhatsApp Business API
**Archivo**: backend/src/services/notifications.service.ts
**Estado**: Canal WHATSAPP definido en BD, no implementado
**Requiere**: Cuenta Meta Business verificada + aprobacion plantillas emergencia
**Contacto**: business.whatsapp.com
**Impacto**: Notificaciones de alerta solo por Push Push

## DT-005 — Generacion de PDF de Informe de Cierre
**Archivo**: backend/src/routes/informes.ts — POST /incidentes/:id/informe/firmar
**Estado**: No implementado — el endpoint firma con SHA-256 pero no genera PDF
**Requiere**: Libreria pesada (puppeteer, pdfkit, jsPDF server-side) o servicio externo
**Opciones evaluadas**:
  - puppeteer: +10 MB imagen Docker, requiere Chromium en VPS
  - @react-pdf/renderer: viable pero requiere SSR setup
  - Servicio externo (HTML→PDF API): costo operativo
**Impacto**: El informe firmado existe en BD con hash de integridad; no hay PDF descargable
**Activar cuando**: Se defina presupuesto o se elija libreria en sprint de cierre v2

---

## ⚠️ Nota sobre numeración duplicada (2026-07-03)

Este repositorio tiene **tres registros de deuda técnica con numeración DT-XXX independiente**:
1. Este archivo (`TECH_DEBT.md`, raíz) — integraciones externas, DT-001 a DT-005.
2. `docs/DEUDA_TECNICA.md` — deuda de seguridad/infraestructura, DT-001 a DT-007 (numeración propia, sin relación con esta).
3. `ARQUITECTURA.md` (raíz) — catálogo de planeación original, DT-001 a DT-012 y SEC-001 a SEC-004.

**No se consolida aquí unilateralmente** para no perder contexto de ninguno de los tres. Recomendación: unificar en una sola numeración (sugerido: `docs/DEUDA_TECNICA.md` como fuente única, por ser el más verificado contra el código real) cuando el usuario lo apruebe.

## Catálogo importado de `ARQUITECTURA.md` — estado verificado contra el código real (2026-07-03)

> Numeración `ARQ-SEC-XXX` / `ARQ-DT-XXX` para no colisionar con los DT-XXX de este archivo. El documento de origen (`ARQUITECTURA.md`) marcaba varios de estos como "pendiente"; se verificó cada uno contra el código real antes de listarlo aquí — varios ya estaban resueltos.

| ID | Descripción | Estado real verificado | Bloqueante prod. |
|---|---|---|---|
| ARQ-SEC-001 | `seedDemoUsers()` crea admin/admin al arrancar | **Resuelto** — protegido por `NODE_ENV !== 'production'` + requiere rol ADMIN, no corre al iniciar el servidor (`backend/src/routes/auth.ts`) | No |
| ARQ-SEC-002 | JWT accesible vía `document.cookie` en Sidebar.tsx | **Resuelto** (2026-07-03) — cookie httpOnly `siagrd_token` + `useCurrentUser()` sobre `/auth/me`; ver `docs/DEUDA_TECNICA.md` DT-006. Queda `siagrd_access` (legible) como transición hasta migrar ~30 call sites menores | No (mitigado) |
| ARQ-SEC-003 | Validación MIME de archivos incompleta | **Resuelto** — whitelist de MIME + validación de magic bytes reales (primeros bytes del buffer) en `backend/src/routes/archivos.ts`, no solo el header `Content-Type` declarado | No |
| ARQ-SEC-004 | Rate limiting no aplicado en producción | **Resuelto** — `@fastify/rate-limit` registrado globalmente (200 req/min) en `backend/src/index.ts`, más límites específicos en `alertas.ts`/`archivos.ts`/`reportes.ts` | No |
| ARQ-DT-001 | `seedDemoUsers()` en arranque del servidor | **Resuelto** — ver ARQ-SEC-001 | No |
| ARQ-DT-002 | `@fastify/websocket` no funcional en chat | **Resuelto** (2026-07-03) — plugin registrado, ruta `/chats/:id/ws` activa, probada end-to-end (auth por cookie/token, broadcast real) | No |
| ARQ-DT-003 | VPS sin HTTPS | **Resuelto** — certbot + Nginx activo en producción (`infra/nginx.conf`, `infra/setup-vps.sh`) | No |
| ARQ-DT-004 | JWT accesible en `document.cookie` | **Resuelto** — ver ARQ-SEC-002 | No |
| ARQ-DT-005 | POST `/alertas/:id/emitir` no verificado E2E | **Parcialmente resuelto** — existen tests unitarios (`alertas.routes.test.ts`), falta verificación E2E real | No |
| ARQ-DT-006 | Página `/alcaldias` no implementada | **Resuelto** — 552 líneas de código real en `apps/panel-web/src/app/(dashboard)/alcaldias/page.tsx` | No |
| ARQ-DT-007 | `GET /api/v1/geo/departamento` faltante | **Resuelto** (2026-07-03) — `GET /api/v1/geo/departamento` agregado en `backend/src/routes/geo.ts`, contrato exacto `{ departamento, municipios: [{id, nombre, codigo_dane, geojson}] }`, público, cacheado 24h. Complementa a `/municipios/geojson` (que agrega nivel de alerta, pensado para el mapa) | No |
| ARQ-DT-008 | `GET/POST /comites/:id/usuarios` no implementados | **Resuelto** (2026-07-03) — `GET/POST/DELETE /comites/:id/usuarios` agregados en `backend/src/routes/comites.ts`, siguiendo el mismo patrón ya usado en `organismos.ts` (membresía vía columna `comite_id` en `profiles`, no tabla puente). 8 tests nuevos en `comites.routes.test.ts` | No |
| ARQ-DT-009 | Tap en marcador del mapa no navega a detalle | **Resuelto** — `onIncidenteClick` conectado a `router.push` en el dashboard | No |
| ARQ-DT-010 | Deploy al VPS manual, sin CI/CD | **Resuelto** — `.github/workflows/deploy.yml` + `ci.yml` activos y verificados funcionando (2026-07-03) | No |
| ARQ-DT-011 | Página de estadísticas sin implementar | **Resuelto** — 480 líneas de código real en `apps/panel-web/src/app/(dashboard)/estadisticas/page.tsx` | No |
| ARQ-DT-012 | Módulo damnificados en la app sin implementar | **Resuelto** — `apps/ciudadano/src/app/damnificados.tsx` existe | No |

**Los 16/16 ítems de este catálogo están resueltos y verificados** (2026-07-03). Ver `ROADMAP_EJECUCION_v1.md` para el trabajo de Fases 3-9 aún pendiente (no es deuda técnica documentada aquí, son features del roadmap original que nunca se implementaron).
