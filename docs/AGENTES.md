# AGENTES.md — Subagentes especializados de SIAGRD Meta

> Referencia detallada de `.claude/agents/`. `CLAUDE.md` solo enumera la lista corta y la regla de delegación; el detalle de cuándo usar cada uno vive aquí.

| Agente | Especialidad |
|---|---|
| `api-contract` | Contratos de API, versionado `/api/v1`, breaking changes |
| `data-visualizer` | Dashboards, gráficos, KPIs, exportación |
| `accessibility-expert` | WCAG 2.1/2.2 AA, a11y web y móvil |
| `mobile-rn-expert` | React Native/Expo, build local vía Android Studio |
| `realtime-specialist` | WebSockets (`@fastify/websocket`), sincronización en vivo |
| `map-gis-expert` | MapLibre GL, PostGIS, geoespacial |
| `incident-workflow` | Máquina de estados de incidentes/alertas, escalamiento CDGRD/CMGRD/JAL |
| `user-group-admin` | Usuarios, roles (ADMIN/CDGRD/CMGRD/SOCORRO/CIUDADANO), grupos, RBAC |
| `infra-hardening` | Docker Compose, Nginx, CI/CD, backups, VPS |
| `security-auditor` | Auditoría OWASP, dependencias, secretos |
| `sqa-backend` | QA de API Fastify: tests, cobertura, contratos |
| `sqa-frontend` | QA del panel-web: E2E (Playwright), regresión visual |
| `sqa-mobile` | QA de la app RN/Expo (tests de código) |
| `db-architect` | Esquema PostgreSQL/PostGIS, migraciones SQL puro, índices |
| `ux-ui-designer` | Sistema de diseño, tokens, fluidez, usabilidad |
| `tech-debt-manager` | Registro y pago de deuda técnica (`TECH_DEBT.md`) |
| `roadmap-manager` | Roadmap, hitos, priorización (`ROADMAP.md`) |
| `docs-writer` | Documentación técnica, ADRs, manuales |
| `offline-sync-specialist` | Offline-first de la app ciudadano, cola de sincronización |
| `signature-workflow` | Firmas en canvas si el producto lo requiere (verificar si aplica antes de asumir) |
| `sqa-device` | SQA en el celular físico conectado por ADB, adaptado a las pantallas de SATAM |
| `git-workflow` | Ramas, commits, PRs — nunca push directo a `main` |
| `context-keeper` | Contexto persistente entre sesiones (`docs/PROJECT_CONTEXT.md`) |
| `agent-factory` | Crea agentes/skills nuevos cuando el proyecto lo requiera |

**Sin `flutter-expert`** — este proyecto no usa Flutter, no crear ese agente ni instalar skills de Dart/Flutter.
