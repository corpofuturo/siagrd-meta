# Plan de Recuperacion ante Desastres — SIAGRD

## Objetivos de recuperacion

| Metrica | Objetivo |
|---------|---------|
| RTO (Recovery Time Objective) | Menor a 4 horas |
| RPO (Recovery Point Objective) | Menor a 24 horas |

---

## Escenario 1: API Backend caida

**RTO objetivo:** 10 minutos

**Sintomas:** Endpoints no responden, timeout en panel web, app socorro sin conexion.

**Pasos de recuperacion:**

1. Verificar estado del servicio en VPS Dashboard → Deployments.
2. Si el ultimo deploy fallo: hacer "Rollback" al deploy anterior en VPS.
3. Si el servicio esta caido sin deploy reciente: en VPS, click "Restart service".
4. Verificar variables de entorno en VPS → Variables (puede haber quedado vacia alguna).
5. Monitorear logs en tiempo real: VPS → Deployments → Logs.
6. Confirmar recuperacion: `curl https://api.siagrd.corpofuturo.org/health` debe retornar `{"status":"ok"}`.
7. Notificar a usuarios si la interrupcion supero 5 minutos.

**Escalada:** Si no se recupera en 10 minutos, contactar soporte de VPS y notificar al responsable tecnico.

---

## Escenario 2: Base de datos corrupta o inaccesible

**RTO objetivo:** 2 horas

**Sintomas:** Errores 500 en API, logs muestran fallo de conexion a Supabase, datos inconsistentes.

**Pasos de recuperacion:**

1. Verificar estado de Supabase en https://status.supabase.com — si es incidente de plataforma, esperar y monitorear.
2. Si es problema de configuracion: verificar `DATABASE_URL` en VPS Variables.
3. Acceder a Supabase Dashboard → Database → Backups.
4. Identificar el ultimo backup valido (Supabase hace backups diarios automaticos en plan Pro).
5. Iniciar restauracion desde Supabase Dashboard → Point-in-time recovery si esta disponible.
6. Una vez restaurada la BD, reiniciar el servicio backend en VPS.
7. Ejecutar verificacion de integridad: revisar conteos en tablas criticas (incidentes, alertas, usuarios).
8. Si hay datos perdidos del dia: recuperar desde reportes en papel o registros manuales del CDGRD.
9. Documentar datos perdidos (RPO real) y notificar al coordinador.

**Escalada:** Si Supabase no responde en 30 minutos, contactar soporte premium de Supabase con ticket urgente.

---

## Escenario 3: FCM falla (notificaciones push no llegan)

**RTO objetivo:** N/A — hay fallback automatico

**Sintomas:** Alertas emitidas pero ciudadanos no reciben push notifications, logs muestran error FCM.

**Pasos de recuperacion:**

1. Verificar estado de Firebase en https://status.firebase.google.com.
2. Si es incidente de Firebase: el sistema debe continuar operando — las alertas se guardan en BD.
3. Reenviar alertas pendientes usando el endpoint `POST /alertas/:id/reenviar`.
4. Comunicar al equipo operativo que esten atentos a canales alternativos (radio, llamada directa).
5. Una vez Firebase recuperado: revisar y limpiar cola de mensajes duplicados si los hubo.

---

## Escenario 4: Falla del sistema completo

**RTO objetivo:** 4-6 horas

**Sintomas:** API caida, panel web inaccesible, app socorro sin conexion, posible compromiso de seguridad.

**Pasos de recuperacion:**

1. **Evaluacion inicial (0-30 min):**
   - Verificar si es incidente de seguridad: revisar logs de VPS y Supabase audit log.
   - Si hay sospecha de compromiso: revocar todos los secretos siguiendo `SECRET_ROTATION.md`.
   - Notificar al responsable tecnico y gerente.

2. **Contencion (30-60 min):**
   - Poner el sistema en modo mantenimiento si es posible.
   - Preservar logs actuales exportandolos desde VPS y Supabase.

3. **Recuperacion de infraestructura (1-3 h):**
   - Provisionar nuevo ambiente en VPS desde el ultimo Dockerfile en git.
   - Restaurar BD desde el ultimo backup valido en Supabase.
   - Configurar variables de entorno nuevas (secretos rotados si aplica).

4. **Verificacion (3-4 h):**
   - Ejecutar health checks en todos los endpoints.
   - Verificar autenticacion, creacion de incidentes, emision de alertas y sync movil.
   - Hacer prueba de punta a punta con usuario de prueba.

5. **Comunicacion:**
   - Notificar a coordinadores del CDGRD y municipios afectados.
   - Documentar el incidente completo para el informe post-mortem.

---

## Contactos tecnicos

| Rol | Nombre | Contacto |
|-----|--------|---------|
| Responsable tecnico principal | Por designar | Por definir |
| Responsable tecnico suplente | Por designar | Por definir |
| Gerencia Corpofuturo | John Jairo Velasquez Ortiz | gerente@corpofuturo.org |
| Soporte VPS | - | https://
| Soporte Supabase | - | https://supabase.com/support |
| Soporte Firebase | - | https://firebase.google.com/support |
