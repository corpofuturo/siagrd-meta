# ROADMAP.md — SIAGRD Meta (SATAM)

## Visión

Sistema de Alertas Tempranas de Amenazas Múltiples para el Departamento del Meta: gestión de incidentes, alertas, damnificados y organismos de socorro, con panel web y app ciudadana, en producción real sobre VPS Contabo.

## Hito 1 — Fase 0: Seguridad

> Orden pedido explícitamente por el usuario. **Todos los ítems de seguridad crítica ya están resueltos y verificados** — este hito documenta el estado real, no un plan a futuro.

| Tarea | Estado | Responsable | Notas |
|---|---|---|---|
| SEC-002/DT-004 — JWT legible vía `document.cookie` (prioridad máxima) | **Hecho** | `security-auditor` | Resuelto 2026-07-03: cookie httpOnly `siagrd_token` + `useCurrentUser()`. Ver `docs/DEUDA_TECNICA.md` DT-006. Queda `siagrd_access` legible como transición hasta migrar ~30 call sites menores (no crítico: no es la vía de auth real, es una lectura de conveniencia para UI) |
| SEC-001/DT-001 — `seedDemoUsers` crea admin/admin al arrancar | **Hecho** (ya lo estaba antes de esta sesión) | `security-auditor` | Verificado: gateado por `NODE_ENV !== 'production'` + requiere rol ADMIN vía `authMiddleware`, no se ejecuta al iniciar el servidor |
| DT-003 — HTTPS con certbot | **Hecho** (ya lo estaba) | `infra-hardening` | Nginx + certbot activo en producción, verificado con curl real |
| SEC-004 — Rate limiting en producción | **Hecho** (ya lo estaba) | `infra-hardening` | `@fastify/rate-limit` global (200/min) + límites específicos en login/alertas/archivos/reportes |
| SEC-003 — Validación MIME completa | **Hecho** (ya lo estaba) | `security-auditor` | Whitelist + magic bytes reales en `archivos.ts`, no solo `Content-Type` declarado |

**Pendiente real de este hito:** ninguno de los 5 bloqueantes originales sigue abierto. Antes de declarar el Hito 1 cerrado, `security-auditor` debe hacer una pasada completa de verificación (no solo confiar en este resumen) y `sqa-backend` debe confirmar que la suite de tests (126/126 al 2026-07-03) sigue verde.

## Hito 2 — Deuda funcional no bloqueante

DT-002, DT-005 a DT-012 (numeración de `ARQUITECTURA.md`, ver tabla completa en `TECH_DEBT.md`). Estado real verificado 2026-07-03: **10 de 11 resueltos**, incluido ARQ-DT-008 (endpoints de usuarios por comité, cerrado hoy). Queda solo:

| ID | Descripción | Estado |
|---|---|---|
| ARQ-DT-007 | `GET /api/v1/geo/departamento` — existe un endpoint similar (`/municipios/geojson`) pero no el contrato exacto | Parcial (menor) |

## Deuda de integración externa (bloqueada por decisión humana)

Ver `BLOCKERS.md`: IDEAM y SGC en mock, requieren convenio interinstitucional — no es trabajo técnico pendiente, es una gestión que le corresponde al usuario/la organización.

## Próximos hitos (a definir con el usuario)

No se propone un Hito 3 sin que el usuario indique la prioridad real del proyecto — evitar repetir el error de planear fases completas (como el roadmap de 10 fases descartado el 2026-07-03) sin verificar primero qué es lo que el negocio necesita ahora.
