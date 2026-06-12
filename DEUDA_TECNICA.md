# Deuda Técnica — SIAGRD
> Actualizado: 2026-06-12

---

## 🔴 Crítico (bloquea funcionalidad core)

| # | Módulo | Descripción | Archivos |
|---|--------|-------------|----------|
| 1 | APK / Alertas | Confirmar POST `/alertas` end-to-end: modal abre OK, submit no verificado en BD | `apps/ciudadano/src/app/(tabs)/alertas.tsx` |
| 2 | APK / Alertas | Botón "Emitir" alerta existente (POST `/alertas/:id/emitir`) — activa y dispara push | `apps/ciudadano/src/app/(tabs)/alertas.tsx`, `backend/src/routes/alertas.ts` |
| 3 | Backend / Chat | WebSocket no instalado (`@fastify/websocket` falta) — chats en tiempo real no funcionan | `backend/package.json`, `backend/src/routes/chat.ts` |
| 4 | APK / Chat | Tipos de chat incompletos: faltan `COMUNICADO_OFICIAL` y `DIRECTO` (solo existe `GENERAL`) | `apps/ciudadano/src/app/(tabs)/chats.tsx`, `backend/src/routes/chat.ts` |

---

## 🟠 Alto (funcionalidad importante sin implementar)

| # | Módulo | Descripción | Archivos |
|---|--------|-------------|----------|
| 5 | Panel web | Página alcaldías faltante — no existe `/dashboard/alcaldias/page.tsx` | `apps/panel-web/src/app/(dashboard)/` |
| 6 | APK / Mapa | Tap en marker no navega a detalle del incidente | `apps/ciudadano/src/app/(tabs)/mapa.tsx` |
| 7 | APK / Damnificados | Pantalla no implementada — solo hay ruta placeholder | `apps/ciudadano/src/app/` |
| 8 | Backend | Endpoint `GET /departamentos` público faltante (árbol departamento-municipio) | `backend/src/routes/` |
| 9 | Backend / Comités | Endpoints `GET/POST /comites/:id/usuarios` faltantes | `backend/src/routes/comites.ts` |
| 10 | APK / Admin | Detalle editable de Organismo con lista de usuarios miembros | `apps/ciudadano/src/app/admin/organismos/` |
| 11 | APK / Admin | Detalle editable de Comité con lista de usuarios miembros | `apps/ciudadano/src/app/admin/comites/` |
| 12 | APK / Admin | Detalle editable de JAL con lista de usuarios miembros | `apps/ciudadano/src/app/admin/jal/` |

---

## 🟡 Medio (mejora importante)

| # | Módulo | Descripción | Archivos |
|---|--------|-------------|----------|
| 13 | APK / Admin | Asignación de usuarios a grupos (alcaldía, organismo, comité, JAL) desde la app | `apps/ciudadano/src/app/admin/` |
| 14 | APK / Panel | Vista árbol Departamento-Municipio con semáforo de riesgo | nuevo componente |
| 15 | Backend / Incidentes | Flujo de estado: PENDIENTE-EN_CURSO-CERRADO con auditoría | `backend/src/routes/incidentes.ts` |
| 16 | APK / Damnificados | Informe consolidado de mitigaciones por entidad | nuevo módulo |
| 17 | Panel web / JAL | Importación masiva de Juntas de Acción Comunal (CSV o bulk) | `apps/panel-web/` |
| 18 | APK / Chat | Chat directo CDGRD con director de cada cuerpo/JAL | `apps/ciudadano/src/app/(tabs)/chats.tsx` |

---

## 🔵 Infraestructura

| # | Descripción | Estado |
|---|-------------|--------|
| 19 | DNS `panel.satam.corpofuturo.org` a `13.140.174.122` | Pendiente acción en panel DNS |
| 20 | HTTPS en VPS (certbot + nginx) | Pendiente, requiere DNS primero |
| 21 | Redeploy automático en VPS al hacer push a main | No configurado, hoy es manual vía SSH |

---

## ✅ Resuelto (historial)

- Grupos HTTP 500 (gobernacion tabla nombre incorrecto)
- Expo Router crash organismos (archivo + directorio mismo nombre)
- 7 bugs QA del audit: tabla, seguridad rol en PATCH usuarios, columnas reportes corroborar, grupo_id NOT NULL, campo lider_nombre en APK, municipio_id UUID, tipo estado TypeScript
- Netlify removido completamente, todo apunta a VPS 13.140.174.122
- 29 alcaldías del Meta en BD
- FAB crear alerta para admin/CDGRD con modal completo
- Datos de ejemplo en BD (usuarios, organismos, comités, JAL, reportes)
- Alcaldías en menú admin del perfil
- Fix municipio_id en alcaldias.tsx (enviaba nombre en vez de UUID)
- VPS backend redespliegado con fix grupos
