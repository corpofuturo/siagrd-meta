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

## DT-006 (resuelto)
- **Componente**: backend/src/middleware/auth.ts, backend/src/index.ts, backend/src/routes/chat.ts, apps/panel-web/src/lib/api.ts, apps/panel-web/src/hooks/{useChat,useCurrentUser}.ts, Sidebar.tsx, chat/page.tsx, configuracion/page.tsx
- **Descripción**: El JWT viajaba en una cookie `siagrd_access` con `httpOnly: false`, leída por JS en 30+ archivos del panel-web (Authorization manual en cada fetch, y la URL del WebSocket de chat vía `?token=`).
- **Resuelto (2026-07-03)**:
  - Backend: `@fastify/cookie` registrado; `authMiddleware` acepta `Authorization: Bearer` (app móvil, sin cambios) **o** cookie httpOnly `siagrd_token`. La ruta WS `/chats/:id/ws` también acepta la cookie como fallback del `?token=` de query (la app móvil sigue usando query param).
  - Frontend: en vez de tocar cada uno de los 60+ `fetch()` directos, se centralizó en `lib/api.ts` un parche de `window.fetch` que agrega `credentials: 'include'` en toda request a `API_URL` — la cookie httpOnly viaja sola. `getToken()` quedó como no-op (`@deprecated`, retorna `null`) para no romper los `if (getToken()) headers.Authorization = ...` existentes (simplemente dejan de enviar el header, ya no hace falta).
  - Los 3 lugares que decodificaban el JWT en el cliente para leer usuario/rol (`Sidebar.tsx`, `chat/page.tsx`, `configuracion/page.tsx`) se migraron a un hook nuevo `useCurrentUser()` que llama `GET /api/v1/auth/me` (ya existía en el backend).
  - Se eliminó por completo la cookie `siagrd_access` (JS-readable) de login/refresh/logout.
  - **Bug adicional encontrado y corregido de paso**: la URL del WS de chat en `useChat.ts` apuntaba a `/ws/chats/:id/` (ruta inexistente) en vez de `/api/v1/chats/:id/ws` (la real) — el chat en tiempo real del panel nunca había conectado. También `tipo: 'NORMAL'` no coincidía con el enum del backend (`TEXTO|IMAGEN|ALERTA_OFICIAL|SISTEMA`) — corregido a `TEXTO`. Y `sendMessage` mandaba el mensaje por WS cuando estaba conectado, pero el backend ignora mensajes entrantes por WS (solo hace broadcast) — se corrigió para enviar siempre por POST, que es el canal canónico documentado en el propio `chat.ts`.
- **Probado end-to-end**: login real (`admin`/`admin`) → cookie → `GET /auth/me` → `GET /chats` → conexión WS solo con cookie (sin `?token=`) → `POST /mensajes` → broadcast recibido por WS. Build y typecheck limpios en backend y panel-web.
- **Bloqueante para producción**: No — ya resuelto

## DT-007 (abierto)
- **Componente**: tabla `municipios` (PostgreSQL/PostGIS)
- **Descripción**: La tabla tiene el catálogo completo de 1122 municipios de Colombia (DANE) con la columna `geom GEOMETRY(MULTIPOLYGON,4326)` e índice GIST ya definidos en el schema, pero **ningún registro tiene geometría cargada** (`count(geom) = 0` verificado en producción). El import de polígonos desde la fuente oficial (DANE/IGAC) nunca se ejecutó.
- **Impacto**: El endpoint `GET /api/v1/municipios/geojson` (nuevo, Fase 2) y cualquier capa de mapa que dependa de polígonos municipales devuelve `features: []` — degrada con gracia (no rompe el mapa, simplemente no muestra los polígonos) pero la funcionalidad de "colorear municipios por nivel de alerta" no tiene datos que mostrar.
- **Para resolver**: Importar shapefiles/GeoJSON oficiales del DANE o IGAC para los municipios del Meta (mínimo) y actualizar la columna `geom` vía `ST_GeomFromGeoJSON` o `shp2pgsql`.
- **Bloqueante para producción**: No (el mapa funciona con los puntos de incidentes, que sí tienen coordenadas)
- **Bloqueante para desarrollo/pruebas**: No
- **Bloqueante para desarrollo/pruebas**: No
