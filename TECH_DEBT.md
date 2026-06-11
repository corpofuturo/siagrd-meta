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
**Impacto**: Notificaciones de alerta solo por Push FCM

## DT-005 — Generacion de PDF de Informe de Cierre
**Archivo**: backend/src/routes/informes.ts — POST /incidentes/:id/informe/firmar
**Estado**: No implementado — el endpoint firma con SHA-256 pero no genera PDF
**Requiere**: Libreria pesada (puppeteer, pdfkit, jsPDF server-side) o servicio externo
**Opciones evaluadas**:
  - puppeteer: +10 MB imagen Docker, requiere Chromium en Railway
  - @react-pdf/renderer: viable pero requiere SSR setup
  - Servicio externo (HTML→PDF API): costo operativo
**Impacto**: El informe firmado existe en BD con hash de integridad; no hay PDF descargable
**Activar cuando**: Se defina presupuesto o se elija libreria en sprint de cierre v2
