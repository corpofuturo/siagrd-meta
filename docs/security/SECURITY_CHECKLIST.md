# Checklist de Seguridad Pre-Producción — SIAGRD Meta

## Backend
- [ ] NODE_ENV=production en VPS
- [ ] DEBUG=false (verificar que no hay console.log con datos sensibles)
- [ ] CORS solo permite *.gov.co y localhost está eliminado
- [ ] Rate limiting: login 5/15min, upload 50/h, emitir_alerta 10/h — VERIFICAR valores actuales
- [ ] Todos los endpoints protegidos con authMiddleware excepto: /health, /auth/login, /auth/refresh
- [ ] JWT access_token expira en ≤15 min — VERIFICAR
- [ ] Service role key (SUPABASE_SERVICE_ROLE_KEY) NUNCA llega al cliente móvil o browser
- [ ] Logs no contienen: contraseñas, tokens, cédulas, coordenadas GPS de personas

## Base de datos
- [ ] RLS habilitado en: profiles, incidentes, actualizaciones_incidente, alertas, archivos, reportes_ciudadanos, damnificados, recursos_organismo
- [ ] audit_log: sin política DELETE ni UPDATE (verificar con: SELECT * FROM pg_policies WHERE tablename='audit_log')
- [ ] Backup automático de Supabase activo (Dashboard → Settings → Backups)
- [ ] No hay datos de prueba (cédulas reales, nombres reales) en producción

## Apps móviles
- [ ] JWT almacenado en expo-secure-store, NO en AsyncStorage
- [ ] No hay console.log en código de producción (metro bundler strip logs)
- [ ] No hay SUPABASE_SERVICE_ROLE_KEY en el bundle (verificar con: grep -r 'service_role' apps/)
- [ ] EAS Build en modo release (no development)

## Panel web
- [ ] No hay tokens hardcodeados en el código fuente
- [ ] Content-Security-Policy configurado en next.config.ts
- [ ] Vercel Preview URLs requieren autenticación (si hay datos reales en preview)

## CI/CD
- [ ] Secrets no están en logs de GitHub Actions
- [ ] pnpm audit --audit-level=high → 0 vulnerabilidades altas/críticas
- [ ] Branch protection en main: require PR + CI verde + 1 review
