# Setup de Produccion — SIAGRD

## Prerequisitos

- Cuenta en Supabase (plan Pro recomendado para backups automaticos)
- Proyecto en Firebase con FCM habilitado
- Cuenta en VPS
- Cuenta en Vercel
- Repositorio en GitHub con los secrets configurados

---

## 1. Supabase Setup

1. Crear nuevo proyecto en https://supabase.com → "New project".
   - Nombre: `siagrd-produccion`
   - Password BD: generar con gestor de contrasenas (minimo 32 chars)
   - Region: us-east-1 (o la mas cercana a Colombia disponible)

2. En el proyecto creado, ir a SQL Editor y ejecutar las migraciones:
   ```
   database/migrations/001_initial.sql
   database/migrations/002_postgis.sql
   (y siguientes en orden)
   ```

3. Habilitar Row Level Security (RLS) en todas las tablas con datos sensibles.

4. Copiar los valores de Settings → API:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (guardar en gestor de secretos, no en texto plano)
   - `anon` key → `SUPABASE_ANON_KEY`

5. En Settings → Database, copiar la connection string → `DATABASE_URL`.

6. Configurar backups: Settings → Database → Backups → Enable Point-in-Time Recovery.

---

## 2. Firebase Setup

1. Crear proyecto en https://console.firebase.google.com → "Add project".
   - Nombre: `siagrd-produccion`
   - Google Analytics: opcional

2. Habilitar Cloud Messaging (FCM): Build → Cloud Messaging.

3. Generar cuenta de servicio: Project Settings → Service accounts → "Generate new private key".
   - Descargar JSON
   - Extraer `private_key` → `FIREBASE_PRIVATE_KEY`
   - Extraer `client_email` → `FIREBASE_CLIENT_EMAIL`
   - Extraer `project_id` → `FIREBASE_PROJECT_ID`
   - Eliminar el archivo JSON de forma segura

4. Copiar el Server Key de FCM (legacy) si se usa API v1:
   Cloud Messaging → Web configuration → Server key → `FCM_SERVER_KEY`

---

## 3. VPS Deploy (Backend)

1. Crear cuenta y nuevo proyecto en https://

2. Conectar repositorio de GitHub: New Project → Deploy from GitHub repo → seleccionar `siagrd`.

3. VPS detectara el `docker-compose.yml` en la raiz y usara el Dockerfile de `backend/`.

4. Configurar variables de entorno en VPS → Variables:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_ANON_KEY=eyJ...
   FIREBASE_PROJECT_ID=siagrd-produccion
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@siagrd-produccion.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   SENTRY_DSN=https://xxx@sentry.io/xxx
   JWT_SECRET=<generar 64 chars random>
   ```

5. Hacer el primer deploy: VPS → Deployments → "Deploy now".

6. Asignar dominio: Settings → Domains → Generate domain o configurar dominio personalizado.

7. Verificar: `curl https://api.satam.corpofuturo.org/health`

---

## 4. Vercel Deploy (Panel Web)

1. Crear cuenta en https://vercel.com e importar el repositorio de GitHub.

2. Configurar proyecto:
   - Framework: Next.js
   - Root directory: `apps/panel-web`
   - Build command: `cd ../.. && pnpm build:panel-web`
   - Output directory: `.next`

3. Variables de entorno en Vercel → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_API_URL=https://api.satam.corpofuturo.org
   ```

4. El archivo `apps/panel-web/vercel.json` ya incluye los security headers necesarios.

5. Asignar dominio personalizado si aplica: Settings → Domains.

---

## 5. GitHub Secrets

Ir a repositorio → Settings → Secrets and variables → Actions → New repository secret.

Agregar los siguientes secrets:

| Secret | Descripcion |
|--------|------------|
| `VPS_SSH_KEY (GitHub Secret)| Token de VPS (Account → Tokens) |
| `VERCEL_TOKEN` | Token de Vercel (Account → Settings → Tokens) |
| `VERCEL_ORG_ID` | ID de organizacion Vercel (vercel.com/account) |
| `VERCEL_PROJECT_ID` | ID del proyecto Vercel (proyecto → Settings) |
| `EXPO_TOKEN` | Token de Expo para EAS Build |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo si CI necesita acceso admin a BD |

---

## 6. Verificacion Final

Una vez completados los pasos anteriores, ejecutar las siguientes verificaciones:

### Health check
```bash
curl https://<dominio-api>/health
# Esperado: {"status":"ok","timestamp":"..."}
```

### Login en panel web
1. Abrir `https://<dominio-vercel>` en el navegador.
2. Ingresar con usuario administrador.
3. Verificar que el dashboard carga correctamente.

### Crear incidente de prueba
1. Desde el panel web, crear un nuevo incidente con datos de prueba.
2. Verificar que aparece en la lista de incidentes.
3. Verificar que el registro quedo en Supabase: Table Editor → incidentes.

### Emitir alerta de prueba
1. Desde el panel web (usuario con rol CDGRD o ADMIN), crear una alerta de prueba.
2. Verificar que la notificacion push llega a un dispositivo de prueba con la app socorro instalada.
3. Verificar que la alerta aparece en el endpoint publico `GET /alertas`.

### Verificar CI/CD
1. Hacer un push a la rama `develop`.
2. Verificar que el pipeline de GitHub Actions pasa todos los jobs (lint, test, security, build).
3. Hacer merge a `main` y verificar que se ejecutan los jobs de deploy.
