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
