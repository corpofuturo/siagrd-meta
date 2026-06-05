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
- **Descripción**: No hay validación de MIME type en el endpoint de upload de archivos. Se acepta cualquier tipo de archivo; la única restricción es tamaño (10 MB). Permite subir ejecutables, HTML con scripts, SVG maliciosos o documentos con macros.
- **Impacto**: Riesgo ALTO de almacenamiento de archivos maliciosos en Supabase Storage con posible ejecución o distribución desde la plataforma.
- **Fix requerido**:
  ```ts
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!ALLOWED_MIME.includes(data.mimetype)) {
    throw new ValidationError(`Tipo de archivo no permitido: ${data.mimetype}`);
  }
  ```
  Complementar con validación de magic bytes del buffer (no confiar solo en Content-Type del cliente).
- **Detectado por**: Auditoría SEC sesión 2026-06-05 (Hallazgo 4)
- **Bloqueante para producción**: **Sí**
- **Bloqueante para desarrollo/pruebas**: No

## DT-005
- **Componente**: backend/src/middleware/auth.ts
- **Descripción**: Cuando un usuario está autenticado en Supabase Auth pero no tiene registro en la tabla `profiles`, el middleware asigna rol `CIUDADANO` silenciosamente (`profile?.rol ?? 'CIUDADANO'`). No se registra ningún warning ni se lanza error.
- **Impacto**: Inconsistencias de datos pasan desapercibidas; usuarios sin perfil obtienen acceso con el rol menos privilegiado sin traza de auditoría.
- **Fix recomendado**: Lanzar `ForbiddenError('Perfil no encontrado')` si `profile` es null, o al menos `logger.warn` con el user.id.
- **Detectado por**: Auditoría SEC sesión 2026-06-05 (Hallazgo 2)
- **Bloqueante para producción**: No (RLS en BD protege igualmente)
- **Bloqueante para desarrollo/pruebas**: No

## DT-006
- **Componente**: database/functions/generate_incident_code() (migrations/003_functions_triggers.sql)
- **Descripción**: La función usa `COUNT(*) + 1` para generar códigos de incidente. Bajo carga concurrente hay condición de carrera: dos inserts simultáneos pueden generar el mismo código.
- **Impacto**: Colisión de códigos de incidente bajo carga alta; puede causar errores de constraint o duplicados silenciosos.
- **Fix recomendado**: Reemplazar con una secuencia PostgreSQL (`CREATE SEQUENCE incident_code_seq`).
- **Detectado por**: Auditoría SEC sesión 2026-06-05 (Hallazgo 10)
- **Bloqueante para producción**: No (riesgo bajo en volumen esperado del Meta)
- **Bloqueante para desarrollo/pruebas**: No
