# SIAGRD Meta

**Sistema Integrado de Alertas Tempranas y Gestión del Riesgo**  
Departamento del Meta, Colombia — Ley 1523 de 2012

[![CI](https://github.com/corpofuturo/siagrd-meta/actions/workflows/ci.yml/badge.svg)](https://github.com/corpofuturo/siagrd-meta/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Productos

| Producto | Descripción | Estado |
|----------|-------------|--------|
| Panel Web CDGRD | Dashboard de coordinación para los 27 municipios | Beta - Listo para pruebas |
| App Socorro | React Native offline-first para Bomberos/Defensa Civil/Cruz Roja | Beta - Listo para pruebas |
| Motor de Alertas | Integración IDEAM + SGC, clasificación VERDE/AMARILLO/NARANJA/ROJO | Beta - Listo para pruebas |
| App Ciudadana | Android + iOS + PWA para 1.000.000 habitantes del Meta | Beta - Listo para pruebas |

## Desarrollo rápido

```bash
# Prerrequisitos: Node 20+, pnpm 9+, Docker
git clone https://github.com/corpofuturo/siagrd-meta
cd siagrd-meta
pnpm install
cp .env.example .env     # Completar con credenciales
docker-compose up -d     # PostgreSQL+PostGIS + Redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md)
- [Contexto y estado](docs/CONTEXTO.md)
- [Deuda técnica](docs/DEUDA_TECNICA.md)
- [Decisiones técnicas](docs/DECISIONES.md)

## Infraestructura

Costo objetivo: **USD 0/mes** hasta 10.000 usuarios.  
Stack: Railway + Supabase + Vercel + Firebase FCM + Upstash (todos gratuitos).

## Legal

Código abierto — obligatorio para software del sector público colombiano.  
Licencia: MIT. Ver [LICENSE](LICENSE).


<!-- CI/CD configurado con GitHub Actions - secrets OK -->
