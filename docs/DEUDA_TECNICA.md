# Deuda Técnica — SIAGRD Meta

## DT-001
- **Componente**: backend/src/services/ideam.service.ts
- **Descripción**: Endpoint real del IDEAM aún no documentado públicamente
- **Impacto**: El sistema de alertas hidrometeorológicas usa datos simulados
- **Mock implementado**: Sí — genera alertas aleatorias realistas cada 30 min en DEV
- **Para resolver**: Contactar IDEAM (ideam.gov.co/contacto) y solicitar acceso API
- **Bloqueante para producción**: Sí
- **Bloqueante para desarrollo/pruebas**: No

## DT-002
- **Componente**: backend/src/services/sgc.service.ts
- **Descripción**: API del SGC (Servicio Geológico Colombiano) requiere convenio institucional
- **Impacto**: Datos sísmicos usan mock con historial público del SGC
- **Mock implementado**: Sí — devuelve eventos sísmicos de los últimos 30 días (datos públicos)
- **Para resolver**: Gestionar convenio institucional Gobernación Meta — SGC
- **Bloqueante para producción**: No (datos sísmicos en tiempo real son complementarios)
- **Bloqueante para desarrollo/pruebas**: No

## DT-003
- **Componente**: apps/ciudadano/src/i18n/sik.json
- **Descripción**: Traducción al Sikuani requiere validación con comunidad indígena del Meta
- **Impacto**: App ciudadana solo disponible en español inicialmente
- **Mock implementado**: Sí — archivo con placeholders [TRADUCIR: texto en español]
- **Para resolver**: Coordinar con Secretaría de Cultura del Meta y resguardos indígenas
- **Bloqueante para producción**: No (español es suficiente para lanzamiento v1)
- **Bloqueante para desarrollo/pruebas**: No

## DT-004
- **Componente**: backend/src/routes/archivos.ts
- **Descripción**: Falta de validación MIME en carga de archivos — cualquier tipo de archivo podía subirse
- **Impacto**: Riesgo de carga de ejecutables maliciosos disfrazados con extensión permitida
- **Mock implementado**: No aplica
- **Para resolver**: Whitelist MIME + validación magic bytes
- **Bloqueante para producción**: Sí
- **Bloqueante para desarrollo/pruebas**: No
- **Resuelto**: 2026-06-05 — whitelist MIME + validación magic bytes implementada

## DT-005
- **Componente**: backend/src/index.ts, backend/src/routes/chat.ts
- **Descripción**: `@fastify/websocket` estaba en package.json pero nunca registrado; la ruta `GET /chats/:id/ws` existía completa pero comentada
- **Impacto**: El chat operativo funcionaba solo con POST/GET (sin push en tiempo real)
- **Para resolver**: Registrar el plugin en `index.ts` y descomentar la ruta WS en `chat.ts`
- **Bloqueante para producción**: No (el chat funciona sin WS, solo sin tiempo real)
- **Bloqueante para desarrollo/pruebas**: No
- **Resuelto**: 2026-07-03 — plugin registrado globalmente, ruta `/api/v1/chats/:id/ws` activa y probada (auth por token, rechazo de chat inexistente con código 4004)

## DT-006 (parcialmente resuelto — backend listo, frontend pendiente)
- **Componente**: backend/src/middleware/auth.ts, backend/src/index.ts, apps/panel-web/src/app/api/auth/{login,refresh,logout}/route.ts, apps/panel-web/src/lib/api.ts + 30 archivos que usan `getToken()`
- **Descripción**: El JWT viajaba solo en una cookie `siagrd_access` con `httpOnly: false`, leída por JS (`getToken()`) para adjuntar `Authorization: Bearer` manualmente en cada fetch — usado en más de 30 archivos del panel-web (todas las páginas del dashboard, hooks de tiempo real, y la URL del WebSocket de chat vía `?token=`).
- **Resuelto en el backend (2026-07-03)**: `@fastify/cookie` instalado y registrado; `authMiddleware` ahora acepta `Authorization: Bearer` (app móvil, sin cambios) **o** la cookie httpOnly `siagrd_token` (nuevo). Probado: Bearer, cookie, y sin-token responden como se espera (200/200/401). El panel-web ya emite `siagrd_token` con `Domain=.corpofuturo.org` en prod, por lo que viaja automáticamente al backend en fetch directo desde el navegador — sin necesidad de proxyar por rutas de Next.js.
- **Pendiente**: migrar los 30+ call sites que usan `getToken()` + `Authorization` manual a `credentials: 'include'` (dejando que la cookie httpOnly viaje sola), y el WS de chat (`useChat.ts`) a autenticar por cookie en el handshake en vez de `?token=` en la URL — el backend tendría que leer `request.cookies.siagrd_token` también en la ruta WS de `chat.ts`. Se restauró temporalmente la cookie `siagrd_access` (JS-readable) en login/refresh para no romper esos 30+ archivos mientras se decide cuándo abordar la migración completa.
- **Impacto actual**: sin cambio de riesgo real todavía — `siagrd_access` sigue expuesta a XSS hasta completar la migración del frontend.
- **Bloqueante para producción**: No
- **Bloqueante para desarrollo/pruebas**: No
- **Siguiente paso**: sesión dedicada para migrar los 30+ archivos (cambio mecánico pero de alto volumen — no apto para hacerlo a mitad de otra tarea)
