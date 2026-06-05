# Guía de Rotación de Secretos — SIAGRD Meta

## Frecuencias de rotacion

| Secreto | Frecuencia | Ultimo cambio |
|---------|-----------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 90 dias | Registrar en bitacora |
| `FIREBASE_PRIVATE_KEY` | 180 dias | Registrar en bitacora |
| `RAILWAY_TOKEN` | 90 dias | Registrar en bitacora |

---

## SUPABASE_SERVICE_ROLE_KEY (cada 90 dias)

1. Ingresar a Supabase Dashboard → Proyecto SIAGRD → Settings → API.
2. Generar nueva `service_role` key desde la opcion "Roll API keys".
3. Actualizar el secret en Railway: Panel → Variables → `SUPABASE_SERVICE_ROLE_KEY`.
4. Actualizar el secret en GitHub: Settings → Secrets → `SUPABASE_SERVICE_ROLE_KEY`.
5. Actualizar el archivo `.env.production` local (si aplica) y NO commitear.
6. Hacer deploy de backend en Railway para aplicar el nuevo valor.
7. Verificar que el endpoint `/health` responda `200`.
8. Revocar la key anterior en Supabase una vez confirmada la nueva.
9. Registrar la rotacion en la bitacora de secretos (fecha, responsable).

---

## FIREBASE_PRIVATE_KEY (cada 180 dias)

1. Ingresar a Firebase Console → Proyecto SIAGRD → Configuracion del proyecto → Cuentas de servicio.
2. Generar nueva clave privada (boton "Generar nueva clave privada").
3. Descargar el archivo JSON y extraer `private_key` y `client_email`.
4. Actualizar en Railway: `FIREBASE_PRIVATE_KEY` y `FIREBASE_CLIENT_EMAIL`.
5. Actualizar en GitHub Secrets si se usan en CI.
6. Hacer deploy de backend.
7. Verificar envio de notificacion FCM de prueba.
8. Eliminar la cuenta de servicio anterior en Firebase Console.
9. Eliminar el archivo JSON descargado de forma segura (shred o equivalente).
10. Registrar en bitacora.

---

## RAILWAY_TOKEN (cada 90 dias)

1. Ingresar a Railway Dashboard → Account → Tokens.
2. Crear nuevo token con nombre descriptivo (ej: `siagrd-ci-2025-09`).
3. Actualizar en GitHub Secrets: Settings → Secrets → Actions → `RAILWAY_TOKEN`.
4. Ejecutar un pipeline de CI en una rama de prueba para verificar que el deploy funciona.
5. Revocar el token anterior en Railway Dashboard.
6. Registrar en bitacora.

---

## Protocolo en caso de compromiso

Si se sospecha o confirma que un secreto fue expuesto (log publico, repositorio, etc.):

1. **Revocar inmediatamente** el secreto comprometido en el proveedor correspondiente.
2. Generar nuevo secreto siguiendo los pasos anteriores de forma urgente.
3. Revisar logs de Railway, Supabase y Firebase para detectar accesos no autorizados en las ultimas 72 horas.
4. Notificar al responsable tecnico y al gerente de la organizacion.
5. Si hay datos personales comprometidos, activar el protocolo de notificacion bajo Ley 1581/2012 (SIC).
6. Documentar el incidente: fecha, secreto afectado, acciones tomadas, responsable.
7. Actualizar este documento con la fecha del incidente y medidas tomadas.

---

## Contacto responsable de secretos

- Responsable tecnico: administrador del proyecto SIAGRD
- Email organizacion: gerente@corpofuturo.org
