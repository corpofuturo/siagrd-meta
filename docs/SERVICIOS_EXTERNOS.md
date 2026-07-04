# SERVICIOS_EXTERNOS.md — SIAGRD Meta

> Referencia detallada de servicios externos. `CLAUDE.md` solo tiene la regla corta; el detalle vive aquí.

## Servicios externos YA APROBADOS (no requieren nueva autorización)

| Servicio | Uso |
|---|---|
| Sentry | Monitoreo de errores backend/frontend (si está integrado — verificar antes de asumir) |
| Firebase Cloud Messaging (FCM) | Push notifications a la app móvil |
| Expo Push | Push notifications vía Expo Push Service |
| Telegram Bot API | Notificaciones a organismos de socorro (`telegram.service.ts`) |
| WhatsApp Business API | Notificaciones ciudadanas (`whatsapp.service.ts`) |
| IDEAM (mock) | Alertas hidrometeorológicas — API real no documentada públicamente, mock activo en dev (`ideam.service.ts`) |
| SGC (mock) | Eventos sísmicos — requiere convenio institucional, mock activo (`sgc.service.ts`) |

Cualquier servicio externo **no** listado aquí (Redis, MinIO, un ORM, un nuevo proveedor de mapas, etc.) sigue la regla general de `CLAUDE.md`: se propone citando `docs/OPCIONES-FUTURAS.md`, se justifica, y se espera aprobación explícita antes de integrarlo.

## Servicios eliminados permanentemente — NUNCA reintroducir

Railway, Supabase, Netlify, Vercel, Upstash. Firebase/FCM fue eliminado y luego reintroducido solo como Firebase Cloud Messaging para push (ver tabla de arriba) — no confundir con Firebase Auth/Firestore/Hosting, que siguen fuera del stack.
