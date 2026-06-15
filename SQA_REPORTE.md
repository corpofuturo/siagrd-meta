# SQA_REPORTE — Auditoría de Seguridad SATAM
**Fecha:** 2026-06-10  
**Alcance:** `backend/src/middleware/`, `backend/src/routes/`, `backend/src/services/storage.service.ts`  
**Rama:** main

---

## PROBLEMAS ENCONTRADOS Y CORREGIDOS

### SEC-01 · Path Traversal en descarga de archivos — CRÍTICO
**Archivo:** `routes/archivos.ts` — `GET /archivos/static/*`  
**Descripción:** La lógica original usaba `path.normalize + regex` para limpiar `../`, pero este patrón no protege contra variantes como `..%2F`, rutas absolutas (`/etc/passwd`) ni secuencias dobles (`....//`).  
**Corrección:** Reemplazado por `path.resolve()` seguido de verificación estricta de que el path resultante comience con `UPLOADS_DIR + path.sep`. Cualquier ruta fuera del directorio retorna 400.  
**Corrección adicional:** El endpoint no tenía autenticación — cualquier usuario anónimo podía descargar archivos. Se agregó `preHandler: authMiddleware`.

### SEC-02 · SQL Injection vía WKT en creación de incidente — ALTO
**Archivo:** `routes/incidentes.ts` — `POST /incidentes`  
**Descripción:** El campo `ubicacion` se construía como `ST_GeomFromText(${`POINT(${lng} ${lat})`}, 4326)`. Los valores `lng` y `lat` se interpolaban directamente en un string que luego se pasaba como argumento a `postgres.js`. Aunque `postgres.js` parametriza el string resultante, un atacante con valores como `1 1), injected_sql -- ` podría romper la WKT y provocar errores o comportamientos inesperados dependiendo del driver.  
**Corrección:** Reemplazado por `ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)` — los valores numéricos se pasan como parámetros separados. Se agregó validación de rangos (`lat ∈ [-90,90]`, `lng ∈ [-180,180]`) antes del INSERT.

### SEC-03 · JWT_SECRET con fallback hardcodeado — ALTO
**Archivo:** `routes/auth.ts` línea 8  
**Descripción:** `const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'`. Si por algún motivo `index.ts` no ejecuta su chequeo (tests, importación directa del módulo, etc.), `auth.ts` firmaba tokens con un secreto predecible.  
**Corrección:** El fallback fue eliminado. Ahora lanza `Error('[FATAL] JWT_SECRET env var is required')` en carga del módulo si la variable no está definida.

### SEC-04 · Endpoint `/auth/seed` sin protección — ALTO
**Archivo:** `routes/auth.ts`  
**Descripción:** `POST /auth/seed` era completamente público y funcionaba en producción. Cualquier actor podía invocar el endpoint y forzar la recreación de usuarios `admin/bombero` con contraseñas conocidas, reseteando sus roles.  
**Corrección:** Se agregó `preHandler: authMiddleware` + validación de rol `ADMIN` + bloqueo explícito en `NODE_ENV === 'production'` con `ForbiddenError`.

### SEC-05 · Endpoint `/health` expone topología interna en producción — MEDIO
**Archivo:** `routes/health.ts`  
**Descripción:** El endpoint público devolvía estado de DB, configuración Push, profundidad de cola de sync, versiones de servicios mock. Esta información facilita reconocimiento en un ataque dirigido.  
**Corrección:** En `NODE_ENV === 'production'` la respuesta se reduce a `{ status, response_ms, timestamp }`. El detalle completo se preserva solo en dev/staging.

---

## VERIFICACIONES OK (sin problema)

| # | Verificación | Detalle |
|---|---|---|
| V-01 | SQL injection general | Todas las queries usan `db\`...\`` con interpolación parametrizada de postgres.js. No se encontró concatenación de strings en SQL. |
| V-02 | IDOR en incidentes | `GET /incidentes/:id` y `PATCH /incidentes/:id` validan que `row.municipio_id === user.municipio_id` para roles no-ADMIN. |
| V-03 | IDOR en reportes | `GET /reportes-ciudadanos` acepta filtro `?municipio=` pero está restringido a roles CDGRD/CMGRD/SOCORRO/ADMIN. Roles de municipio sin privilegio no tienen acceso. |
| V-04 | Rate limiting en auth/login | `getRateLimitConfig` devuelve `{ max: 5, timeWindow: '15 minutes' }` para `/auth/login`. |
| V-05 | Rate limiting en reportes públicos | `POST /reportes-ciudadanos` tiene rate limit diferenciado: 3/hora anónimos (por IP), 10/hora autenticados (por token). |
| V-06 | Secrets en logs | `logger.ts` tiene `redact: { paths: ['req.headers.authorization', 'payload.cedula', 'payload.coordenadas'] }`. No se encontraron `logger.info` con tokens o passwords en el código. |
| V-07 | Whitelist de extensiones en upload | `POST /archivos/upload` valida MIME contra lista blanca (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`) Y verifica magic bytes del buffer. `storage.service.ts` además usa `file-type` para validación MIME real. |
| V-08 | XSS — Content-Type | Fastify serializa automáticamente objetos JSON con `Content-Type: application/json`. No se encontraron respuestas con `reply.type('text/html')` ni interpolación de contenido de usuario en HTML. |
| V-09 | CORS restrictivo en producción | Origen limitado a `*.gov.co` y `*.vps.app` en producción. |
| V-10 | Helmet habilitado | HSTS, CSP y demás headers de seguridad activados vía `@fastify/helmet`. |
| V-11 | Coordenadas validadas en endpoints geoespaciales | `GET /incidentes/cercanos` y `GET /cerca` validan rangos numéricos y limitan `radio_km` a 200. |
| V-12 | Tamaño de archivo limitado | Límite de 10 MB en `@fastify/multipart` (global) y en el handler de upload (buffer check). |

---

## DEUDA TÉCNICA DE SEGURIDAD (no corregido automáticamente)

| # | Item | Riesgo | Recomendación |
|---|---|---|---|
| D-01 | Refresh tokens sin revocación | MEDIO | Los refresh tokens (30d) no se almacenan en DB, por lo que no pueden revocarse al logout. Implementar tabla `refresh_tokens` con columna `revocado`. |
| D-02 | `/auth/anonymous` sin rate limit | BAJO | `POST /auth/anonymous` no tiene rate limit específico (cae en el global 200/min). Un atacante puede generar tokens anónimos en masa. Aplicar `{ max: 30, timeWindow: '1 hour' }` por IP. |
| D-03 | Contraseña mínima 6 caracteres | BAJO | `POST /auth/register` requiere solo 6 caracteres. Recomendado mínimo 8 con al menos un carácter especial o número. |
| D-04 | `GET /alertas` completamente público | INFO | Expone todas las alertas activas e históricas sin autenticación. Aceptable por diseño (alertas ciudadanas), pero conviene documentar la decisión explícitamente. |
| D-05 | `GET /health` sin autenticación (producción) | INFO | Ahora devuelve respuesta mínima en prod, pero sigue siendo público. VPS requiere que sea público para su healthcheck. Documentado como riesgo aceptado. |
| D-06 | Usuarios demo con contraseñas débiles en `seedDemoUsers` (index.ts) | MEDIO | `index.ts` hace seed con `password: 'admin'` y `password: 'bombero'` en arranque si los usuarios no existen. Este seed corre en todos los entornos. Limitar a `NODE_ENV !== 'production'` o eliminar. |

---

*Generado por auditoría automatizada con Claude Code — revisar D-06 con prioridad antes del próximo despliegue a producción.*
