# Deuda Técnica — SATAM
**Generado:** 2026-06-10  
**Ciclo:** Sprint final — ciclo de vida, chat, notificaciones, informes, SQA  
**Rama:** main · commit bcfd952

---

## STOP-1 — Requieren cuentas externas (no automatizable)

Estas integraciones no pueden activarse con código. Requieren gestión administrativa.

### WhatsApp Meta Cloud API
- **Archivo:** `backend/src/services/notifications.service.ts` — canal `WHATSAPP`
- **Estado:** Stub implementado — el canal existe en BD, el código llama al endpoint de Meta, pero sin credenciales válidas retorna error silencioso y no envía.
- **Variables Railway:** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_RECIPIENT_PHONE`
- **Pasos:** Crear cuenta Meta Business → verificar número colombiano → crear y aprobar templates de emergencia (proceso 2–5 días hábiles con Meta)
- **Contacto:** business.whatsapp.com

### Telegram Bot
- **Archivo:** `backend/src/services/notifications.service.ts` — canal `TELEGRAM`
- **Estado:** Stub implementado — el código envía a `api.telegram.org/bot{TOKEN}/sendMessage`. Sin `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` configurados en Railway, no envía.
- **Variables Railway:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- **Pasos:** Registrar bot en @BotFather (5 minutos, gratuito) → obtener token → crear canal/grupo → obtener chat ID → configurar en Railway
- **Este es el canal más fácil de activar.**

### Twilio (SMS masivo)
- **Estado:** No implementado en este ciclo — mencionado en roadmap
- **Requiere:** Cuenta Twilio → número colombiano → verificación regulatoria MINTIC para SMS masivo
- **Variables Railway:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

### Firebase Cloud Messaging (Push)
- **Estado:** Integración implementada y funcional. Requiere proyecto Firebase real con credenciales.
- **Variables Railway:** `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Alerta:** FCM legacy API está deprecada en 2025. El código debe migrar a HTTP v1 API antes del lanzamiento productivo.

---

## STOP-2 — Variables Railway pendientes de configurar

Ver `RAILWAY_VARS.md` para lista completa con descripciones.

Variables mínimas para arrancar en producción:
- `DATABASE_URL` — PostgreSQL Railway
- `JWT_SECRET` — mínimo 32 caracteres
- `FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_JSON` — para push notifications
- `NODE_ENV=production`

Variables opcionales (activar según disponibilidad):
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` + `WHATSAPP_RECIPIENT_PHONE`

---

## STOP-3 — Migraciones SQL listas pero pendientes de ejecutar en producción

Las siguientes migraciones están en `database/migrations/` y deben ejecutarse en orden en la BD de producción Railway. **Hacer backup de PostgreSQL antes de ejecutar.**

```
011_webhook_deliveries.sql   — tabla de deliveries de webhooks
11_ciclo_vida_eventos.sql    — ciclo de vida 7 estados + tabla eventos
12_chat.sql                  — chat 3 canales (COORDINACION, OPERACIONAL, LOGISTICA)
013_notificaciones_cola.sql  — cola durable de notificaciones
014_telegram_field.sql       — campo telegram_chat_id en tabla usuarios
```

Orden de ejecución recomendado (respetar numeración):
1. `011_webhook_deliveries.sql`
2. `11_ciclo_vida_eventos.sql`
3. `12_chat.sql`
4. `013_notificaciones_cola.sql`
5. `014_telegram_field.sql`

Ejecutar con:
```bash
psql $DATABASE_URL -f database/migrations/011_webhook_deliveries.sql
psql $DATABASE_URL -f database/migrations/11_ciclo_vida_eventos.sql
# ... etc
```

---

## STOP-4 — Requieren build y prueba en dispositivo físico

Los siguientes cambios modifican UI en la app móvil y no pueden validarse solo en emulador:

- **Picker de municipios** (`apps/ciudadano/`) — reemplaza input de texto por selector nativo de municipios del Meta. Validar scroll, búsqueda y selección en Android físico.
- **Checkbox de autorización de foto** — nuevo campo de consentimiento en el formulario de reporte ciudadano. Validar accesibilidad y flujo de envío.
- **Chat en app ciudadano** — tab de chat implementado. Validar WebSocket en red móvil (3G/4G), reconexión automática y notificaciones push al recibir mensaje.

Reconstruir APK y reinstalar (ver `APK_BUILD.md`).

---

## Deuda técnica funcional

### DT-PDF — Generación de PDF para informes de cierre
- **Archivo:** `backend/src/routes/informes.ts` — `POST /incidentes/:id/informe/firmar`
- **Estado:** El endpoint firma el informe con SHA-256 + timestamp y almacena en BD. No genera PDF descargable.
- **Opciones evaluadas:**
  - `puppeteer`: +10 MB imagen Docker, requiere Chromium en Railway — viable pero costoso
  - `@react-pdf/renderer` SSR: requiere setup adicional
  - API externa HTML→PDF: costo operativo
- **Recomendación:** Microservicio separado en Railway con puppeteer, o integración con Google Docs API

### DT-FIRMA — Firma digital certificada de informes
- **Estado:** Solo hash SHA-256 + timestamp. No es firma electrónica certificada.
- **Requiere:** ECA acreditada colombiana (Certicámara, GSE, Andes SCD) bajo Ley 527/1999
- **Impacto:** Los informes tienen integridad verificable pero no validez jurídica plena

### DT-IDEAM — Integración real con IDEAM
- **Archivo:** `backend/src/services/ideam.service.ts`
- **Estado:** MOCK activo — retorna datos simulados de inundación AMARILLO
- **Requiere:** Convenio formal Gobernación del Meta con IDEAM (ideam.gov.co)
- **Contacto:** atencionciudadano@ideam.gov.co

### DT-SGC — Integración real con SGC (sismos)
- **Archivo:** `backend/src/services/sgc.service.ts`
- **Estado:** MOCK activo — retorna evento sísmico histórico simulado
- **Requiere:** Convenio Gobernación del Meta con Servicio Geológico Colombiano
- **Contacto:** sgc.gov.co

### DT-IGAC — Capas cartográficas IGAC
- **Estado:** No implementado
- **Requiere:** Acuerdo de uso de datos con IGAC
- **Impacto:** Mapa usa capas OpenStreetMap/Mapbox sin cartografía oficial colombiana

### DT-I18N — Traducción Sikuani
- **Archivo:** `apps/ciudadano/src/i18n/sik.json`
- **Estado:** Placeholders `[TRADUCIR: ...]`
- **Requiere:** Validación con comunidades Sikuani del Meta
- **Contacto:** Secretaría de Asuntos Indígenas — Gobernación del Meta

### DT-PREDICT — Análisis predictivo de eventos
- **Estado:** No implementado
- **Requiere:** Mínimo 2 años de datos históricos reales de incidentes del departamento
- **Tecnología sugerida:** pgvector + modelo ligero de clasificación

### DT-SYNC — Resolución UI de conflictos de sincronización
- **Estado:** Los conflictos de sync se acumulan en la tabla `sync_conflicts` sin poder resolverse desde el panel web
- **Impacto:** Operadores no pueden gestionar conflictos manualmente; se resuelven solo automáticamente o quedan pendientes

### DT-WATERMELON — Cifrado de BD local en apps de socorro
- **Estado:** WatermelonDB almacena datos locales sin cifrado
- **Impacto:** En un dispositivo de socorro comprometido, los datos de emergencia son legibles
- **Recomendación:** Integrar SQLite encryption via `@op-engineering/op-sqlite` con SQLCipher

---

## Deuda técnica de seguridad

Del `SQA_REPORTE.md` — items no corregidos automáticamente:

| ID | Item | Riesgo | Acción |
|----|------|--------|--------|
| D-01 | Refresh tokens sin revocación en BD | MEDIO | Implementar tabla `refresh_tokens` con columna `revocado` |
| D-02 | `/auth/anonymous` sin rate limit específico | BAJO | Aplicar `{ max: 30, timeWindow: '1 hour' }` por IP |
| D-03 | Contraseña mínima 6 caracteres | BAJO | Subir a 8 caracteres con al menos 1 número |
| D-06 | Seed de usuarios demo con contraseñas débiles corre en todos los entornos | MEDIO | Bloquear en `NODE_ENV === 'production'` — **prioridad antes del próximo despliegue** |

---

## Deuda técnica de infraestructura

### SLA y alta disponibilidad
- **Estado:** Railway free/hobby tier no garantiza uptime
- **Riesgo:** En una emergencia real, si Railway cae, SATAM no funciona
- **Recomendación:** Railway Pro (SLA 99.9%) o migrar a ECS/GKE para producción operativa real

### Plan de continuidad
- No existe plan documentado de qué hacer si Railway cae durante una emergencia activa
- Recomendación: definir procedimiento manual de respaldo + contactos de escalamiento

### Backup georredundante de PostgreSQL
- Railway hace snapshots diarios pero no hay backup en región diferente
- Para sistema de emergencias: replicación a S3 con pg_dump automático vía cron

### FCM legacy → HTTP v1 API
- La API legacy de Firebase Cloud Messaging fue deprecada en 2025
- Migrar antes del lanzamiento: `firebase-admin` SDK ya soporta v1, es cambio menor

### Tests de carga
- Existe `tests/load/` pero sin benchmark documentado ni baseline de performance
- Antes de lanzamiento real: ejecutar k6 y documentar límites (usuarios concurrentes, TPS)

---

## Cobertura de tests

**Objetivo definido en CLAUDE.md:** 80%  
**Estado actual estimado:** ~64%

Módulos backend sin tests unitarios:
- `src/routes/archivos.ts`
- `src/routes/damnificados.ts`
- `src/routes/recursos.ts`
- `src/routes/reportes.ts`
- `src/routes/sync.ts`

Módulos con tests existentes (ciclo actual):
- `src/routes/auth.ts` — tests de autenticación
- `src/routes/alertas.ts` — tests de alertas
- `src/routes/incidentes.ts` — tests de ciclo de vida
- `src/routes/chat.ts` — tests de chat y WebSocket
- `src/routes/webhooks.ts` — 9 tests (webhook routes)
- `src/routes/estadisticas.ts` — tests de estadísticas
- `src/routes/informes.ts` — tests de informes de cierre

---

## Módulos NO implementados en este ciclo

Para el roadmap de versiones futuras:

1. Gestión de albergues y puntos de encuentro
2. EDAN — Evaluación de Daños y Análisis de Necesidades (formato UNGRD)
3. PMU / Sala de crisis (Puesto de Mando Unificado)
4. Gestión de turnos y disponibilidad de personal de socorro
5. Logística de ayuda humanitaria (inventario, distribución)
6. Planes de contingencia / playbooks por tipo de evento
7. Integración UNGRD — reporte al sistema nacional de gestión del riesgo
8. Portal de transparencia y datos abiertos (Ley 1712/2014)
9. Chat en app móvil de socorro (Expo app)
10. Geocercas inversas — notificar por ubicación GPS actual, no municipio de registro

---

## Resumen ejecutivo

| Categoría | Items | Críticos |
|-----------|-------|---------|
| Cuentas externas (STOP-1) | 4 | 2 (FCM, WhatsApp) |
| Variables Railway (STOP-2) | 8 | 2 (DATABASE_URL, JWT_SECRET) |
| Migraciones pendientes (STOP-3) | 5 | 5 (todas requeridas) |
| Pruebas en dispositivo (STOP-4) | 3 | 1 (picker municipios) |
| Deuda funcional | 8 | 1 (PDF informes) |
| Deuda de seguridad | 4 | 1 (D-06 seed prod) |
| Deuda de infraestructura | 5 | 1 (FCM deprecation) |
| Módulos no implementados | 10 | 0 (roadmap futuro) |

**Bloqueantes para lanzamiento operativo real:** STOP-3 migraciones + D-06 seed en producción + FCM v1 migration.
