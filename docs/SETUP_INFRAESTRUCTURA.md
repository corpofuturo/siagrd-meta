# Guía de Infraestructura Externa — SIAGRD Meta
**Paso a paso para configurar todos los servicios externos desde cero**

> Tiempo estimado total: 2–3 horas la primera vez.  
> Costo: $0/mes hasta ~10.000 usuarios.  
> Todo lo que se hace aquí es gratuito.

---

## Índice

1. [Supabase — Base de datos + Auth + Storage + Realtime](#1-supabase)
2. [Firebase — Notificaciones push (FCM)](#2-firebase)
3. [Railway — Hosting del backend](#3-railway)
4. [Vercel / Netlify — Hosting del panel web](#4-panel-web)
5. [Sentry — Monitoreo de errores](#5-sentry)
6. [UptimeRobot — Alertas de disponibilidad](#6-uptimerobot)
7. [GitHub Actions — Secrets para CI/CD](#7-github-secrets)
8. [Conectar todo: llenar el .env](#8-env-final)
9. [Verificar que funciona](#9-verificacion)

---

## 1. Supabase

> Supabase es la base de datos PostgreSQL + autenticación + storage + realtime del sistema.  
> Es el servicio más importante. Sin esto nada funciona.

### 1.1 Crear cuenta y proyecto

1. Ir a **[supabase.com](https://supabase.com)**
2. Clic en **Start your project** → registrarse con GitHub o email
3. Una vez dentro, clic en **New project**
4. Completar:
   - **Organization**: crear una nueva → nombre: `Corpofuturo` o `GobMeta`
   - **Project name**: `siagrd-meta`
   - **Database password**: generar una contraseña fuerte y **guardarla en un lugar seguro** (no se puede recuperar después)
   - **Region**: `South America (São Paulo)` — es la más cercana a Colombia
   - **Plan**: Free (suficiente para inicio)
5. Clic en **Create new project**
6. Esperar ~2 minutos mientras el proyecto se aprovisiona

### 1.2 Obtener las credenciales

1. En el proyecto, ir a **Settings** (ícono de engranaje, panel izquierdo) → **API**
2. Copiar y guardar estos tres valores:

```
Project URL        → esto es SUPABASE_URL
anon public        → esto es SUPABASE_ANON_KEY
service_role       → esto es SUPABASE_SERVICE_ROLE_KEY ⚠️ nunca en apps móviles ni panel web
```

> **Importante:** La `service_role` key tiene acceso total a la base de datos, ignora el RLS.
> Solo va en el backend (Railway). Nunca en el código del panel ni de las apps.

### 1.3 Habilitar extensiones PostGIS

1. Ir a **Database** → **Extensions**
2. Buscar `postgis` → activar con el toggle
3. Buscar `uuid-ossp` → activar con el toggle
4. Esperar ~30 segundos hasta que aparezcan como "Enabled"

### 1.4 Aplicar las migraciones (crear todas las tablas)

Las migraciones están en `database/migrations/`. Se aplican en orden.

1. Ir a **SQL Editor** en Supabase (ícono de terminal en el panel izquierdo)
2. Clic en **New query**
3. Abrir el archivo `database/migrations/001_initial_schema.sql` en tu computador
4. Copiar **todo** el contenido → pegarlo en el editor de Supabase → clic en **Run**
5. Debe aparecer un mensaje verde: "Success. No rows returned"
6. Repetir para cada archivo en este orden:
   - `002_rls_policies.sql`
   - `003_functions_triggers.sql`
7. Verificar que se crearon las tablas: ir a **Table Editor** — deben aparecer:
   `departamentos`, `municipios`, `veredas`, `organismos`, `profiles`, `incidentes`,
   `actualizaciones_incidente`, `archivos`, `alertas`, `notificaciones`,
   `reportes_ciudadanos`, `damnificados`, `sync_queue`, `audit_log`

### 1.5 Cargar los datos iniciales (seeds)

1. En **SQL Editor** → **New query**
2. Abrir `database/seeds/municipios_meta.sql` → copiar todo → pegar → **Run**
3. Repetir con `database/seeds/organismos_meta.sql`
4. Verificar: ir a **Table Editor** → tabla `municipios` → debe mostrar 27 filas
5. Verificar: tabla `organismos` → debe mostrar ~10 filas

### 1.6 Configurar autenticación

1. Ir a **Authentication** → **Providers**
2. En **Email**: verificar que está habilitado
3. Ir a **Authentication** → **URL Configuration**
4. En **Site URL**: poner `https://siagrd.meta.gov.co` (o el dominio real cuando lo tengas)
   - Por ahora puede quedar `http://localhost:3001` para desarrollo
5. En **Redirect URLs**: agregar:
   - `http://localhost:3001/**`
   - `https://siagrd.meta.gov.co/**`

### 1.7 Configurar Storage (para fotos de incidentes)

1. Ir a **Storage**
2. Clic en **New bucket**
3. Nombre: `incidentes`
4. **Public bucket**: NO (privado — las fotos solo las ven usuarios autorizados)
5. Clic en **Save**
6. Repetir para bucket `documentos`

### 1.8 Verificar que el Realtime está activo

1. Ir a **Database** → **Replication**
2. Verificar que las tablas `incidentes`, `alertas`, `reportes_ciudadanos` tienen Realtime habilitado
3. Si no: hacer clic en el toggle de cada una para activarlo

---

## 2. Firebase

> Firebase se usa solo para enviar notificaciones push (FCM) a los celulares.
> Es completamente gratuito sin límite de mensajes.

### 2.1 Crear proyecto

1. Ir a **[console.firebase.google.com](https://console.firebase.google.com)**
2. Iniciar sesión con una cuenta Google de Corpofuturo o GobMeta
3. Clic en **Agregar proyecto**
4. Nombre del proyecto: `siagrd-meta`
5. **Google Analytics**: desactivar (no lo necesitamos)
6. Clic en **Crear proyecto** → esperar ~1 minuto

### 2.2 Obtener la clave del servidor (para el backend)

1. En el proyecto de Firebase, ir a **Configuración del proyecto** (engranaje ⚙️ → Configuración del proyecto)
2. Ir a la pestaña **Cuentas de servicio**
3. Clic en **Generar nueva clave privada**
4. Se descarga un archivo `.json` con este contenido:

```json
{
  "type": "service_account",
  "project_id": "siagrd-meta",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@siagrd-meta.iam.gserviceaccount.com",
  ...
}
```

5. Del archivo JSON, copiar:
   - `project_id` → esto es `FIREBASE_PROJECT_ID`
   - `private_key` → esto es `FIREBASE_PRIVATE_KEY` (incluir las comillas y los `\n`)
   - `client_email` → esto es `FIREBASE_CLIENT_EMAIL`

> **Guardar ese archivo JSON en un lugar seguro y NUNCA subirlo a GitHub.**

### 2.3 Configurar para apps Android/iOS

1. En Firebase Console → **Descripción general del proyecto** → **Agregar app**
2. Seleccionar el ícono de Android
3. **Nombre del paquete Android**: `com.siagrd.socorro` (para app socorro)
4. Descargar `google-services.json` → guardar en `apps/socorro/`
5. Repetir para iOS: descargar `GoogleService-Info.plist` → guardar en `apps/socorro/ios/`
6. Repetir para app ciudadana: paquete `com.siagrd.ciudadano`

---

## 3. Railway

> Railway es donde vive el backend (la API). Es como un servidor en la nube, gratuito para este volumen.

### 3.1 Crear cuenta

1. Ir a **[railway.app](https://railway.app)**
2. **Login with GitHub** — usar la cuenta donde está el repositorio de SIAGRD

### 3.2 Crear el proyecto

1. Clic en **New Project**
2. Seleccionar **Deploy from GitHub repo**
3. Conectar la cuenta de GitHub si no está conectada
4. Buscar y seleccionar el repositorio `siagrd-meta`
5. Railway detectará el `railway.toml` automáticamente
6. Clic en **Deploy Now**

### 3.3 Configurar las variables de entorno en Railway

1. En el proyecto de Railway, clic en el servicio **siagrd-backend**
2. Ir a la pestaña **Variables**
3. Clic en **Raw Editor** (más fácil para pegar todo de una vez)
4. Pegar el siguiente bloque **con los valores reales** obtenidos en los pasos anteriores:

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
FIREBASE_PROJECT_ID=siagrd-meta
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@siagrd-meta.iam.gserviceaccount.com
SENTRY_DSN=tu-sentry-dsn
LOG_LEVEL=info
```

5. Clic en **Update Variables** — Railway hace redeploy automático

### 3.4 Obtener la URL del backend

1. Ir a la pestaña **Settings** del servicio
2. En **Networking** → **Public Networking** → clic en **Generate Domain**
3. Se genera una URL del tipo: `siagrd-backend-production.up.railway.app`
4. **Guardar esta URL** — es el `API_URL` que usarán el panel y las apps

### 3.5 Verificar que el backend está funcionando

Abrir en el navegador:
```
https://siagrd-backend-production.up.railway.app/api/v1/health
```

Debe responder algo como:
```json
{
  "status": "ok",
  "services": {
    "database": { "status": "ok", "latency_ms": 45 },
    "redis": { "status": "ok" },
    ...
  }
}
```

Si `database.status` es `"error"`: revisar que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están correctos en las variables de Railway.

### 3.6 Obtener el token para CI/CD

1. Ir a **[railway.app/account/tokens](https://railway.app/account/tokens)**
2. Clic en **Create Token**
3. Nombre: `github-actions-siagrd`
4. Copiar el token → esto es `RAILWAY_TOKEN`

---

## 4. Panel Web

> El panel web (dashboard CDGRD) se despliega en Netlify (ya está configurado el `netlify.toml`).

### 4.1 Crear cuenta en Netlify

1. Ir a **[netlify.com](https://netlify.com)**
2. **Sign up with GitHub**

### 4.2 Conectar el repositorio

1. Clic en **Add new site** → **Import an existing project**
2. Seleccionar **GitHub** → buscar `siagrd-meta`
3. En **Build settings**:
   - **Base directory**: `apps/panel-web`
   - **Build command**: Netlify leerá el `netlify.toml` automáticamente
   - **Publish directory**: `apps/panel-web/.next`
4. Clic en **Deploy site**

### 4.3 Variables de entorno en Netlify

1. Ir a **Site configuration** → **Environment variables**
2. Agregar:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_API_URL=https://siagrd-backend-production.up.railway.app
SENTRY_DSN=tu-sentry-dsn
```

3. Ir a **Deploys** → **Trigger deploy** → **Deploy site**

### 4.4 Dominio personalizado (cuando esté listo)

1. En Netlify → **Domain management** → **Add custom domain**
2. Ingresar: `siagrd.meta.gov.co`
3. Netlify genera el certificado SSL automáticamente (Let's Encrypt)
4. Configurar el DNS en el proveedor del dominio `meta.gov.co` apuntando a Netlify

---

## 5. Sentry

> Sentry captura los errores del sistema en tiempo real. Gratuito hasta 5.000 errores/mes.

### 5.1 Crear cuenta y proyecto

1. Ir a **[sentry.io](https://sentry.io)**
2. Registrarse → crear organización: `siagrd-meta`
3. Clic en **Create Project**
4. Seleccionar **Node.js** → nombre: `siagrd-backend` → clic en **Create Project**
5. Sentry muestra el `DSN` — se ve así:
   ```
   https://abc123def456@o123456.ingest.sentry.io/7654321
   ```
6. **Copiar ese DSN** → es `SENTRY_DSN`
7. Repetir para crear proyectos: `siagrd-panel-web` (Next.js) y `siagrd-apps` (React Native)

---

## 6. UptimeRobot

> Vigila que el sistema esté funcionando y envía un email si cae. Gratuito.

### 6.1 Configurar monitor

1. Ir a **[uptimerobot.com](https://uptimerobot.com)**
2. Registrarse con el email de Corpofuturo
3. Clic en **Add New Monitor**
4. Configurar:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `SIAGRD Backend`
   - **URL**: `https://siagrd-backend-production.up.railway.app/api/v1/health`
   - **Monitoring Interval**: 5 minutes
5. En **Alert Contacts**: agregar el email del administrador técnico
6. Clic en **Create Monitor**

---

## 7. GitHub Secrets

> Los secrets en GitHub permiten que el CI/CD (GitHub Actions) haga deploy automático
> al hacer push a `main`, sin exponer las credenciales en el código.

### 7.1 Agregar los secrets

1. Ir al repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clic en **New repository secret** para cada uno:

| Nombre del secret | Valor |
|---|---|
| `RAILWAY_TOKEN` | El token obtenido en el paso 3.6 |
| `NETLIFY_AUTH_TOKEN` | Ir a Netlify → User settings → Applications → New access token |
| `NETLIFY_SITE_ID` | Netlify → Site settings → General → Site ID |
| `SUPABASE_URL` | La URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | La service role key de Supabase |

### 7.2 Verificar que CI/CD funciona

1. Hacer cualquier cambio pequeño en el repo (ej: editar el README)
2. Hacer commit y push a `main`
3. Ir a la pestaña **Actions** en GitHub
4. Debe aparecer un workflow corriendo — verificar que pasa todos los pasos (verde)
5. Verificar que Railway hace redeploy automático

---

## 8. Llenar el .env local

Una vez que tengas todas las credenciales, crear el archivo `.env` local
(nunca en git — ya está en `.gitignore`):

```bash
# Copiar la plantilla
cp .env.example .env
```

Luego abrir `.env` y reemplazar cada `your-xxx` con el valor real:

```env
# ─── SUPABASE ─────────────────────────────────────────────
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── APPS MÓVILES ─────────────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── FIREBASE FCM ─────────────────────────────────────────
FIREBASE_PROJECT_ID=siagrd-meta
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@siagrd-meta.iam.gserviceaccount.com

# ─── DEPLOY ───────────────────────────────────────────────
RAILWAY_TOKEN=tu-railway-token
NETLIFY_AUTH_TOKEN=tu-netlify-token
NETLIFY_SITE_ID=tu-site-id

# ─── MONITOREO ────────────────────────────────────────────
SENTRY_DSN=https://tu-key@tu-org.ingest.sentry.io/tu-project

# ─── SERVIDOR ─────────────────────────────────────────────
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

> **Problema frecuente con FIREBASE_PRIVATE_KEY:**  
> La clave tiene saltos de línea (`\n`) literales. En el archivo `.env` deben ir
> entre comillas dobles tal como aparece arriba. Si da error, verificar que
> no se copió con saltos de línea reales en vez de `\n`.

---

## 9. Verificación final

Una vez configurado todo, ejecutar estos pasos en orden:

### 9.1 Verificar base de datos local

```bash
cd D:/Jota/Desa/siagrd
docker-compose up -d          # levantar PostgreSQL + Redis locales
pnpm db:migrate               # aplicar migraciones
pnpm db:seed                  # cargar municipios y organismos
```

Debe terminar sin errores.

### 9.2 Verificar backend local

```bash
pnpm dev
```

Abrir en el navegador: `http://localhost:3000/api/v1/health`

Debe mostrar:
```json
{ "status": "ok", "services": { "database": { "status": "ok" } } }
```

### 9.3 Verificar conexión con Supabase real

Cambiar en `.env` local:
```
NODE_ENV=production
SUPABASE_URL=https://tu-proyecto-real.supabase.co
```

Volver a ejecutar `pnpm dev` y verificar el `/health`.

### 9.4 Verificar panel web local

```bash
pnpm --filter panel-web dev
```

Abrir `http://localhost:3001` — debe cargar el login.

### 9.5 Checklist final antes de ir a producción

```
□ /api/v1/health responde "ok" en Railway
□ Las 27 municipios aparecen en la tabla municipios de Supabase
□ Se puede crear un usuario en Supabase Authentication
□ El usuario creado puede hacer login desde el panel web
□ UptimeRobot tiene el monitor configurado y en verde
□ GitHub Actions pasa todos los pasos en verde
□ El dominio siagrd.meta.gov.co apunta a Netlify (cuando esté asignado)
```

---

## Problemas comunes

### "Invalid API key" en el backend
→ Verificar que `SUPABASE_SERVICE_ROLE_KEY` en Railway es la `service_role`, no la `anon`.

### "relation does not exist" en los logs
→ Las migraciones no se aplicaron. Repetir el paso 1.4.

### Las notificaciones push no llegan
→ Verificar que `FIREBASE_PRIVATE_KEY` en Railway incluye los `\n` y las comillas.  
→ En Firebase Console verificar que el proyecto tiene FCM habilitado.

### El panel web carga en blanco
→ Revisar logs de Netlify → Deploy log → buscar errores de build.  
→ Verificar que `NEXT_PUBLIC_SUPABASE_URL` está configurado en Netlify.

### "permission denied for table" en Supabase
→ Las políticas RLS no se aplicaron. Ejecutar `002_rls_policies.sql` en el SQL Editor de Supabase.

---

*Última actualización: 2026-06-05*  
*Sistema: SIAGRD Meta — Departamento del Meta, Colombia*  
*Ley 1523 de 2012 — Sistema Nacional de Gestión del Riesgo*
