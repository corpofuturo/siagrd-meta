# OPCIONES-FUTURAS.md — Servicios y herramientas NO integrados en SIAGRD Meta

> Este archivo no agrega nada al stack. Es un catálogo de opciones evaluadas que requieren aprobación explícita del usuario antes de usarse.
>
> **Cómo usar:** cuando un agente detecte una necesidad que una de estas opciones resuelve, debe (1) citar la entrada, (2) explicar por qué el proyecto la necesita AHORA, (3) presentar la alternativa sin servicio nuevo, y (4) esperar el OK del usuario.
>
> **Ya aprobados — no están en este catálogo, ver `CLAUDE.md` §2.1:** Sentry, Firebase Cloud Messaging, Expo Push, Telegram Bot, WhatsApp Business, mocks de IDEAM/SGC.
> **Prohibido introducir sin aprobación explícita, aunque aparezcan aquí como "opción":** cualquier ORM (Prisma, TypeORM, Drizzle) — el proyecto usa SQL puro por decisión fija del usuario, no por falta de evaluación.

---

## 1. Monitoreo de errores en producción — verificar si Sentry ya está integrado

**Qué es:** captura automática de crashes/errores del backend Fastify, el panel-web y la app móvil, con stack trace y contexto.

**Estado:** Sentry está en la lista de servicios ya aprobados (§2.1 de `CLAUDE.md`), pero no se verificó en esta sesión si ya está *integrado* en el código o solo aprobado para integrarse. Antes de asumir que existe, `grep -r "sentry" backend/ apps/` para confirmar.

**Alternativa sin servicio nuevo:** logging estructurado con request-id (ya existe con Pino en el backend) + revisión manual de logs.

---

## 2. Redis — solo si se necesita tiempo real a múltiples instancias del backend

**Qué es:** channel layer / pub-sub para escalar `@fastify/websocket` (chat, notificaciones en vivo) a más de una instancia del backend.

**Cuándo se justifica:** solo si el backend deja de correr en una sola instancia Docker — hoy corre en un único contenedor, el WebSocket ya funciona con un mapa en memoria (`wsConnections`) sin necesitar Redis.

**Alternativa sin servicio nuevo:** mantener una sola instancia del backend (suficiente para el volumen actual) o polling/SSE si el volumen crece antes de escalar horizontalmente.

---

## 3. Storage de objetos (MinIO / S3) para fotos y evidencia

**Qué es:** almacenamiento compatible S3 para adjuntos (fotos de incidentes, evidencia).

**Cuándo se justifica:** cuando el volumen de media crece a decenas de GB o se necesita replicación entre servidores. Hoy el proyecto guarda archivos localmente (`UPLOADS_DIR`, ver `.env`) con validación de tipo real (magic bytes) en `backend/src/routes/archivos.ts`.

**Alternativa sin servicio nuevo:** filesystem local + volumen Docker + backup del volumen (coordinar con `infra-hardening`).

---

## 4. Distribución de la app y versión mínima obligatoria

**Qué es:** mecanismo para forzar actualización de la app SATAM cuando cambia el contrato de sincronización offline.

**Opción recomendada (sin servicio externo):** el backend expone un endpoint `/api/v1/app-version` con `{ version_minima, version_actual, url_apk }`; la app lo consulta al arrancar y bloquea con "actualización obligatoria" si está por debajo del mínimo. El APK se sirve desde el propio backend/Nginx — coherente con la decisión ya tomada de build local + instalación manual vía ADB (nunca EAS/OTA).

**Cuándo se justifica:** desde que haya un número significativo de celulares en campo. Es crítico en una app offline-first: una versión vieja sincronizando contra un contrato de API nuevo puede corromper datos silenciosamente.

---

## Plantilla para proponer una opción al usuario

```
Necesidad detectada: <qué problema apareció y evidencia>
Opción de OPCIONES-FUTURAS.md: <n.º y nombre>
Por qué ahora: <qué cambió en el proyecto>
Costo: <contenedores/servicios nuevos, dependencias, mantenimiento>
Alternativa sin servicio nuevo y su límite: <...>
Recomendación: <adoptar / esperar>
```

---

## 5. Servidores MCP adicionales — probar con cautela

Los MCP de GitHub, Playwright y Context7 se instalan en el bootstrap por ser oficiales y muy mantenidos (ver acciones manuales pendientes en el resumen del bootstrap). Cualquier MCP adicional (Docker, PostgreSQL, Android/ADB) se propone con la plantilla de este archivo antes de conectarse — verificando el repositorio en GitHub directamente (autor, estrellas, último commit), nunca desde directorios sin curaduría verificable. Un MCP de Android/ADB en particular daría control total del celular de pruebas — revisar el código fuente completo antes de conectarlo.
