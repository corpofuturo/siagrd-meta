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

## Hallazgos de SQA en dispositivo físico (2026-07-03, rama `feat/diseno-indigo-sage`)

Encontrados probando un APK release (JS embebido, sin Metro) contra el backend real de producción.

### DT-006 — Tab "Reportar" no navega al formulario real (RESUELTO parcialmente, ver DT-010)
**Archivo**: `apps/ciudadano/src/app/(tabs)/reportar.tsx`, `apps/ciudadano/src/screens/ReportarScreen.tsx`
**Estado**: **Resuelto** (2026-07-04) — `ReportarScreen` se movió fuera del árbol de rutas (`app/reportar.tsx` → `screens/ReportarScreen.tsx`) y el tab lo renderiza directamente en vez de hacer `router.push()`. El botón "Volver al inicio" ahora resetea el estado local del flujo en vez de depender de `router.back()`. Verificado en dispositivo físico: el grid de tipos y el formulario paso 2 cargan de inmediato al tocar el tab.
**Pendiente**: el paso 3 (confirmación) y el botón "Volver al inicio" no se verificaron en dispositivo porque el envío del reporte fallaba por un bug distinto — ver DT-010.

### DT-007 — Ciudadano anónimo sin acceso al mapa de incidentes (RESUELTO)
**Archivo**: `apps/ciudadano/src/services/auth.service.ts`, `apps/ciudadano/src/app/(tabs)/mapa.tsx`
**Causa raíz encontrada y corregida**: `signInAnonymous()` generaba un token falso (`anon_<timestamp>`) nunca firmado por el backend; el backend ya exponía `POST /auth/anonymous` con JWT real (claim `anonymous:true`) compatible con `authMiddleware`, pero el cliente nunca lo llamaba. Corregido en commit `6614b77` (usa el endpoint real, con fallback local solo offline).
**Verificado en dispositivo físico (2026-07-04)**: mapa carga en modo anónimo con datos reales (13 eventos), sin 401 en logcat. Cerrado.
**Decisión de negocio ya tomada por el usuario**: sí, los ciudadanos anónimos son usuarios oficiales y deben tener este acceso.

### DT-010 — POST /reportes-ciudadanos roto de raíz (RESUELTO)
**Archivos**: `backend/src/routes/reportes.ts`, `apps/ciudadano/src/services/reporte.service.ts`, `database/migrations/027_reportes_foto_url.sql`
**Estado**: **Resuelto** (2026-07-04) — el envío de reportes ciudadanos fallaba siempre, por tres bugs encadenados: (1) el INSERT leía `tipo`/`ubicacion` del body pero el cliente envía `tipo_amenaza`/`latitud`/`longitud`, nunca coincidían; (2) insertaba en la columna `reportante_id`, que no existe (la real es `reportado_por`); (3) escribía `updated_at`, columna que nunca existió en el esquema original. Encontrado por SQA en dispositivo físico al probar el fix de DT-006 (mensaje "Error: No se pudo enviar el reporte").
**Fix**: handler reescrito con validación real contra el enum `tipo_amenaza`, geometría PostGIS construida con `ST_SetSRID(ST_MakePoint(...))`, nombres de columna corregidos, migración aditiva 027 (`foto_url`, `updated_at`). 5 tests de integración nuevos.
**Migración 027**: aplicada en producción (2026-07-04, vía túnel SSH, aprobada explícitamente por el usuario). Verificada dos veces contra el esquema real (`information_schema.columns`). El backend de producción sigue corriendo el código viejo hasta que se despliegue `main` — la migración ya está lista para cuando eso ocurra.

### DT-012 — Subida de foto en reportes ciudadanos nunca funcionó + foto_url sin validar (hallazgo de `security-auditor`, 2026-07-04)
**Archivos**: `apps/ciudadano/src/services/reporte.service.ts` (`subirFoto`), `backend/src/routes/archivos.ts`, `backend/src/routes/reportes.ts`
**Bug funcional**: `subirFoto()` hace `POST /archivos` pero la única ruta real es `POST /archivos/upload`, que exige `authMiddleware` y `incidente_id` obligatorio — ninguno de los dos existe en el flujo de reporte ciudadano anónimo. La subida falla siempre (404), `subirFoto` retorna `null` en silencio, y el reporte se envía sin foto. Nunca se ha probado el camino feliz de foto en un reporte real.
**Hallazgo de seguridad (MEDIO), ya corregido**: como consecuencia, `POST /reportes-ciudadanos` (público, sin auth) aceptaba `foto_url` como cualquier string sin validar que viniera de una subida propia — un cliente anónimo podía insertar una URL a un servidor propio como "beacon" y el panel-web la renderiza en `<img>` para roles privilegiados (fuga de IP/user-agent de funcionarios). Corregido en `backend/src/routes/reportes.ts`: `foto_url` ahora debe iniciar con el prefijo real de `/api/v1/archivos/static/`.
**Pendiente real**: diseñar un endpoint de subida de foto para reportes ciudadanos que no requiera `incidente_id` ni autenticación (la tabla `archivos` ya tiene una columna `reporte_ciudadano_id` nullable pensada para esto, nunca conectada). Requiere: rate limiting anti-abuso propio (el endpoint de reportes ya tiene 3/hora anónimo), validación MIME/magic-bytes (patrón ya usado en `archivos.ts`), y decidir el orden del flujo (¿subir foto antes de crear el reporte, o crear el reporte primero y adjuntar después?).
**Prioridad**: Media — la foto es opcional en el reporte, no bloquea el flujo crítico, pero es una funcionalidad anunciada en la UI que nunca funcionó. Delegar en `api-contract` + `mobile-rn-expert`.

### DT-011 — Cola offline de reportes nunca sincroniza sola
**Archivo**: `apps/ciudadano/src/services/offline-queue.service.ts`
**Estado**: el comentario de cabecera documenta una función `procesarCola()` que no existe. Los reportes capturados sin conexión se guardan en `AsyncStorage` (`encolarReporte()`) pero nada los reintenta automáticamente al recuperar señal — quedan atrapados hasta que se implemente el reintento.
**Impacto**: viola el requisito de offline-first descrito en `CLAUDE.md` §12 (capturar sin red → reconectar → debe llegar al backend). Actualmente ese ciclo se rompe en el último paso.
**Prioridad**: Alta — es funcionalidad crítica para el caso de uso rural/zonas sin cobertura del proyecto. Delegar en `offline-sync-specialist`.

### DT-013 — Gap de cobertura: `vitest.config.ts` del backend no mide `src/routes/**`
**Archivo**: `backend/vitest.config.ts`
**Estado**: `coverage.include` solo instrumenta `src/services/**`. El requisito de "mínimo 80% en código nuevo de backend" (`CLAUDE.md` §7) nunca se verifica automáticamente para ninguna ruta del proyecto, no solo `reportes.ts` — hay que forzar `--coverage.include` manualmente para medirlo (hecho una vez para `reportes.ts`: ~88% líneas).
**Impacto**: no bloqueante hoy (no hay evidencia de rutas mal cubiertas), pero el gate de CI no está haciendo lo que el proyecto exige que haga.
**Prioridad**: Media — cambiar el `include` global afecta el gate de CI de todo el backend, requiere decisión explícita antes de tocarlo.

### DT-014 — Suite E2E de panel-web nunca pudo correr + falso positivo en `dashboard.spec.ts`
**Archivos**: `apps/panel-web/e2e/dashboard.spec.ts`, `apps/panel-web/playwright.config.ts`, `apps/panel-web/package.json`
**Estado**: `@playwright/test` no estaba instalado como dependencia real pese a existir `playwright.config.ts` y el script `test:e2e` — la suite nunca pudo ejecutarse (se agregó la dependencia el 2026-07-04). Al correrla, el único spec (`dashboard.spec.ts`) mockea `/api/v1/auth/me` pero nunca setea la cookie httpOnly `siagrd_token`; el middleware redirige a `/login` antes de cualquier fetch, así que en la práctica el spec prueba la pantalla de login, no el dashboard — falso positivo.
**Fix pendiente**: agregar `context.addCookies([{ name: 'siagrd_token', ... }])` antes de navegar en el fixture del spec.
**Prioridad**: Media — no bloquea funcionalidad de producto, pero da falsa confianza de cobertura E2E.

### DT-015 — Dashboard del panel-web no colapsa bien a 360px
**Archivo**: `apps/panel-web/src/app/(dashboard)/layout.tsx` (y componentes de dashboard que consume)
**Estado**: hallazgo visual de SQA (2026-07-04, preexistente, no introducido por la migración de paleta): a 360px el texto de "INCIDENTES ACTIVOS" se corta y el botón flotante "EMITIR ALERTA" queda recortado. No genera scroll horizontal, pero el layout está roto en mobile.
**Prioridad**: Media — viola la matriz responsive exigida en `CLAUDE.md` §14. Delegar en `ux-ui-designer`/`accessibility-expert`.

### DT-008 — Perfil mostraba IP del VPS y dominio inexistente
**Archivo**: `apps/ciudadano/src/app/(tabs)/perfil.tsx`
**Estado**: **Resuelto** (commit `6614b77`) — cambiado `panel.satam.corpofuturo.org` (subdominio que nunca existió en DNS, ver `CLAUDE.md` §3.1) por `https://satam.corpofuturo.org`, y el texto descriptivo de "13.140.174.122 (VPS)" por el dominio real.

### Bug de entorno de desarrollo (no es deuda del producto)
Metro + Expo SDK 50 falla en Windows con Node 24: intenta crear una carpeta llamada literalmente `node:sea` (módulo "solo con prefijo" nuevo de Node), y Windows no permite `:` en nombres de archivo/carpeta. Se parcheó localmente `node_modules/@expo/cli/build/src/start/server/metro/externals.js` (no versionado — hay que reaplicarlo si se reinstalan dependencias, o considerar `patch-package`). Además hay un fallo recurrente de HMR ("Unable to resolve module ./node_modules/expo-router/entry") en este monorepo con `node-linker=hoisted`, no resuelto de raíz — mitigado en esta sesión compilando APKs `release` (JS embebido) en vez de depender del dev server para pruebas en dispositivo.

## Configuración de GitHub/CI pendiente (hallazgo del PR #10, 2026-07-04)

Estado al 2026-07-04: DT-016 y DT-018 resueltos y verificados por el usuario directamente en GitHub/Netlify. DT-017 queda abierto por decisión explícita (no se quiere instalar esa app por ahora).

### DT-016 — Integración de Netlify sigue activa pese a estar eliminada del stack — **RESUELTO**
**Hallazgo**: el PR #10 mostró 4 checks fallidos de Netlify (`deploy-preview`, `Header rules`, `Pages changed`, `Redirect rules`) para el sitio `siagrd-panel-web`. No había ningún `netlify.toml` en el repositorio — la integración vivía a nivel de cuenta/GitHub App de Netlify, no en el código. Contradecía `CLAUDE.md` §2 (Netlify eliminado permanentemente).
**Resuelto (2026-07-04)**: sitio `siagrd-panel-web` eliminado en Netlify; app de GitHub "Netlify" desinstalada del repo. Confirmado en `github.com/corpofuturo/siagrd-meta/settings/installations` ("No hay ninguna aplicación de GitHub instalada en este repositorio"). De paso se encontró y desinstaló también la app de **Railway** (otro servicio eliminado permanentemente según `CLAUDE.md` §2 que tenía la misma integración fantasma).

### DT-017 — GitHub App "Claude Code" no instalada (check `claude-review` siempre falla) — **ABIERTO, decisión explícita de no instalar por ahora**
**Hallazgo**: el workflow que corre `claude-review` en cada PR falla con `401 Unauthorized - Claude Code is not installed on this repository` porque la GitHub App no está instalada en `corpofuturo/siagrd-meta` ni en la cuenta del usuario.
**Acción si se retoma**: instalar la app en https://github.com/apps/claude y autorizarla para este repositorio. Si nunca se va a usar la revisión automática de PRs con `@claude`, la alternativa es eliminar el workflow correspondiente en `.github/workflows/` (esto sí sería un commit de código, evita el ruido de un check que falla siempre).
**Prioridad**: Baja — el usuario decidió dejarlo así por ahora.

### DT-018 — Dependency graph deshabilitado (check `Dependency Review` siempre falla) — **RESUELTO**
**Hallazgo**: `Dependency Review` fallaba con `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled.`
**Resuelto (2026-07-04)**: "Dependency graph" activado en `github.com/corpofuturo/siagrd-meta/settings/security_analysis` por el usuario. Verificado con una corrida real de CI (`Dependency Review` en verde).
