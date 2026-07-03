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

## DT-006 (abierto)
- **Componente**: apps/panel-web/src/lib/api.ts, apps/panel-web/src/app/api/auth/login/route.ts
- **Descripción**: El JWT viaja en una cookie `siagrd_access` con `httpOnly: false` a propósito, porque el backend (`api.satam.corpofuturo.org`) solo acepta `Authorization: Bearer` y está en un dominio distinto al panel (`panel.satam.corpofuturo.org`) — una cookie httpOnly del panel no llegaría al backend en fetch directo desde el navegador. Migrar a httpOnly puro requiere: (a) que el backend acepte cookie de sesión además de Bearer, o (b) proxyar todo `apiFetch` a través de rutas API de Next.js que adjunten el Bearer server-side leyendo la cookie httpOnly. Ambas opciones tocan la capa de fetch completa del panel-web y el middleware de auth del backend.
- **Impacto**: Un XSS en panel-web podría leer `document.cookie` y robar el access token (ventana de 7 días, `expires_in` real del backend es 8h pero el panel lo extiende a 7 días vía refresh)
- **Bloqueante para producción**: No es explotable sin un XSS previo (CSP + React mitigan bastante), pero es defensa en profundidad pendiente
- **Bloqueante para desarrollo/pruebas**: No
- **Pendiente de decisión**: requiere elegir entre (a) o (b) antes de implementar — ver docs/DECISIONES.md
