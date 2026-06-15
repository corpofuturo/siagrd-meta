# SIAGRD META — PROMPT MAESTRO v2.0 PARA CLAUDE CODE
## Sistema Integrado de Alertas Tempranas y Gestión del Riesgo — Departamento del Meta, Colombia
## Versión: 2.0 | Junio 2026 | Multi-agente autónomo

---

# ╔══════════════════════════════════════════════════════════╗
# ║          LEY FUNDAMENTAL — LEER ANTES DE TODO           ║
# ║    Estas reglas tienen prioridad sobre cualquier otra   ║
# ╚══════════════════════════════════════════════════════════╝

## REGLA 1 — AUTONOMÍA TOTAL: nunca pares por decisiones técnicas

Trabajas de forma **completamente autónoma**. No preguntes al usuario sobre
decisiones técnicas, de diseño, de arquitectura ni de implementación.

Cuando encuentres ambigüedad o información faltante:
1. Toma la decisión más razonable y conservadora
2. Documenta la decisión en `docs/DECISIONES.md` con formato:
   ```
   [FECHA] [COMPONENTE] Decisión: X en vez de Y. Razón: Z.
   ```
3. Si la incógnita impacta funcionalidad que no puedes completar:
   registra en `docs/DEUDA_TECNICA.md` y CONTINÚA con el resto

**Solo detienes el trabajo y preguntas al usuario en estos 5 casos:**
```
STOP-1: Credenciales de producción reales que no están en .env.example
STOP-2: Datos personales de funcionarios reales que debas hardcodear
STOP-3: Decisión que cambia el stack completo (no un módulo, el stack entero)
STOP-4: Comportamiento del sistema contradice explícitamente la Ley 1523
STOP-5: Conflicto de seguridad que no tiene solución técnica sin input humano
```
Fuera de estos 5 casos: toma la decisión, documéntala, y sigue.

---

## REGLA 2 — DEUDA TÉCNICA: registrar y continuar, nunca bloquear

Cuando algo no se puede completar (falta de API key, endpoint externo no disponible,
diseño que necesita validación con usuarios reales), crea la entrada en deuda técnica
y genera un stub/mock funcional que permita continuar:

```markdown
# docs/DEUDA_TECNICA.md — formato obligatorio

## DT-001
- **Componente**: ideam.service.ts
- **Descripción**: Endpoint real del IDEAM aún no documentado públicamente
- **Impacto**: El sistema de alertas hidrometeorológicas usa datos simulados
- **Mock implementado**: Sí — genera alertas aleatorias realistas cada 30 min en DEV
- **Para resolver**: Contactar IDEAM (ideam.gov.co/contacto) y solicitar acceso API
- **Bloqueante para producción**: Sí
- **Bloqueante para desarrollo/pruebas**: No

## DT-002
- **Componente**: i18n/sikuani.json
- **Descripción**: Traducción al Sikuani requiere validación con comunidad indígena
- **Impacto**: App ciudadana solo disponible en español inicialmente
- **Mock implementado**: Sí — archivo de idioma con placeholders marcados como [TRADUCIR]
- **Para resolver**: Coordinar con Secretaría de Cultura del Meta
- **Bloqueante para producción**: No (español es suficiente para lanzamiento)
- **Bloqueante para desarrollo/pruebas**: No
```

---

## REGLA 3 — COMMITS CONTINUOS: cada cambio funcional = commit inmediato

**Frecuencia de commits**: Cada vez que un archivo queda funcional y sin errores de compilación.
No acumules cambios. Un commit = una unidad de trabajo completada.

**Formato de commit obligatorio** (Conventional Commits):
```
tipo(alcance): descripción en español

[cuerpo opcional con detalles]

[DT-XXX: si resuelve o crea deuda técnica]
```

**Tipos válidos:**
```
feat:     nueva funcionalidad
fix:      corrección de bug
schema:   cambio en base de datos
security: cambio de seguridad
perf:     mejora de performance
test:     tests
docs:     documentación
chore:    configuración, deps
```

**Ejemplos de commits bien formados:**
```bash
git commit -m "schema(db): agregar tabla incidentes con PostGIS y RLS"
git commit -m "feat(socorro): captura de foto con coordenadas GPS en EXIF"
git commit -m "feat(alertas): motor de clasificación VERDE/AMARILLO/NARANJA/ROJO"
git commit -m "security(auth): migrar JWT de AsyncStorage a SecureStore"
git commit -m "fix(sync): resolver conflicto last-write-wins en cola offline"
git commit -m "perf(mapa): virtualizar pins con más de 50 incidentes activos"
git commit -m "docs(dt): DT-003 SGC API requiere convenio institucional"
```

**Commits de checkpoint** (al terminar cada fase grande):
```bash
git commit -m "chore(checkpoint): Agente-1 Fase-2 API completa — 12 rutas, 0 errores TS"
git commit -m "chore(checkpoint): Agente-3 app socorro funciona offline 72h demostrado"
```

**NUNCA hacer:**
```bash
git commit -m "fix"               # Sin descripción
git commit -m "WIP"               # Código roto
git commit -m "cambios varios"    # Múltiples responsabilidades
```

---

## REGLA 4 — MEMORIA DE CONTEXTO: el sistema se documenta a sí mismo

Para que cualquier agente pueda reanudar el trabajo sin perder contexto,
el proyecto mantiene dos archivos vivos que se actualizan en cada commit:

### `docs/CONTEXTO.md` — actualizar en cada checkpoint
```markdown
# Estado del sistema SIAGRD Meta
## Última actualización: [timestamp]
## Agente activo: [nombre]

### Completado ✅
- [lista de módulos/features completados]

### En progreso 🔄
- [qué se está construyendo ahora]

### Pendiente ⏳
- [qué falta por hacer]

### Decisiones técnicas clave tomadas
- [resumen de DECISIONES.md relevantes]

### Cómo levantar el entorno
```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Variables de entorno requeridas
- [lista de vars con descripción, SIN valores reales]
```

### `docs/ARQUITECTURA.md` — actualizar cuando cambie la estructura
Diagrama ASCII del sistema, relaciones entre módulos, flujo de datos.
Cualquier agente puede leer este archivo y entender el sistema en 5 minutos.

---

## REGLA 5 — INFRAESTRUCTURA CERO COSTO: stack 100% gratuito hasta 10.000 usuarios

**Restricción económica crítica**: Este es un proyecto del sector público colombiano.
El costo de infraestructura en producción debe ser **USD 0/mes hasta 10.000 usuarios**
y **máximo USD 50/mes** a escala departamental completa (1M usuarios, 27 municipios).

### Stack económico aprobado (NO cambiar):

```
HOSTING BACKEND:   VPS Contabo (13.140.174.122) — Plan Starter gratuito (512MB RAM, 1GB disco)
                   Alternativa si se necesita más: Render.com (plan gratuito similar)
                   NUNCA: AWS, GCP, Azure — costos impredecibles para gobierno

BASE DE DATOS:     PostgreSQL — Plan Free (500MB, 2 proyectos, auth, storage, realtime)
                   Upgrade solo si supera 500MB: Plan Pro = USD 25/mes (suficiente)
                   PostGIS incluido en PostgreSQL gratis ✓

STORAGE ARCHIVOS:  PostgreSQL Storage — 1GB gratis, luego USD 0.021/GB
                   Comprimir fotos a <500KB antes de subir = importante

PUSH NOTIFICATIONS: Notificaciones Cloud Messaging — GRATIS ilimitado ✓
                    No usar OneSignal (límite en plan gratuito)

SMS FALLBACK:      WhatsApp Business API
                   (Meta for Developers — gratuito hasta 1000 conversaciones/mes)

CACHÉ/REDIS:       Redis — Plan gratuito 10.000 comandos/día
                   Si supera: USD 0.2 por 100.000 comandos (muy barato)

CI/CD:             GitHub Actions — GRATIS para repositorios públicos ✓
                   El repo DEBE ser público (código abierto = gobierno colombiano)

MONITOREO:         Sentry — Plan Developer gratuito (5.000 errores/mes) ✓
                   UptimeRobot — Plan gratuito (50 monitores, check cada 5 min) ✓

DOMINIO:           siagrd.meta.gov.co — La Gobernación ya tiene dominio gov.co
                   SSL: Let's Encrypt (gratuito, automático) ✓

TILES DE MAPA:     OpenStreetMap + tile.openstreetmap.org — GRATIS ✓
                   Para producción: Protomaps (tiles propios, sin costo de API)
                   NUNCA: Mapbox (USD 0.50/1000 tiles), Google Maps (costoso)

BUILDS MÓVILES:    Expo EAS Build — Plan gratuito (30 builds/mes)
                   Suficiente para desarrollo y releases mensuales

TOTAL ESTIMADO:    USD 0/mes en desarrollo
                   USD 0-25/mes en producción fase inicial
                   USD 25-75/mes con 100.000 usuarios activos
```

### Optimizaciones de costo obligatorias en el código:

```typescript
// 1. FOTOS: comprimir SIEMPRE antes de subir
// Máximo: 1200px lado mayor, calidad 0.75, formato WebP
// Target: < 300KB por foto (vs 3-8MB de una foto de smartphone)

// 2. QUERIES: nunca SELECT * — solo los campos que se necesitan
// Razón: PostgreSQL cobra por egreso de datos

// 3. REALTIME: solo suscribirse a cambios, no polling
// PostgreSQL Realtime es gratuito — pero no abrir más de 2 canales simultáneos por cliente

// 4. CACHÉ: cachear en WatermelonDB local todo lo que no cambie frecuentemente
// Municipios, zonas de riesgo, guías de autoprotección = cachear 24h

// 5. TILES DE MAPA: pre-cachear los tiles del Meta en primera carga
// El Meta son ~200 tiles a zoom 10 = ~4MB = se puede cachear completo offline
```

---

# ╔══════════════════════════════════════════════════════════╗
# ║              CONTEXTO GLOBAL DEL SISTEMA                ║
# ║         (Incluir en TODOS los agentes)                  ║
# ╚══════════════════════════════════════════════════════════╝

## Qué es SIAGRD Meta

Sistema de misión crítica para gestión de emergencias del departamento del Meta,
Colombia. Marco legal: Ley 1523 de 2012. Puede salvar vidas. La calidad no es opcional.

**4 productos que comparten backend común:**
1. Panel Web de Coordinación — CDGRD Meta (coordinadores, 27 alcaldías)
2. App Móvil de Socorro — React Native offline-first (Bomberos, Defensa Civil, Cruz Roja)
3. Motor de Alertas Tempranas — integrado con IDEAM y SGC
4. App Ciudadana — Android + iOS + PWA (1.000.000 habitantes del Meta)

## Contexto operacional
- Territorio: 85.770 km², 27 municipios, muchos con solo 2G o sin señal
- Usuarios en campo: voluntarios bajo estrés, con guantes, bajo la lluvia
- El sistema debe funcionar SIN internet por mínimo 72 horas
- Dispositivos objetivo: Android 8+, 4GB RAM, cámara trasera, GPS

## Stack (inamovible salvo STOP-3)

```
Backend:          Node.js + TypeScript + Fastify + PostgreSQL
Apps Móviles:     React Native 0.73+ con Expo SDK 50+
Panel Web:        Next.js 14 + TypeScript
Mapas:            MapLibre GL + OpenStreetMap (sin costo)
Base de datos:    PostgreSQL + PostGIS via PostgreSQL (gratis)
Offline móvil:    WatermelonDB (SQLite) + cola de sync
Push:             Notificaciones Cloud Messaging (gratis)
SMS fallback:     WhatsApp Business API
Auth:             PostgreSQL Auth — roles: ADMIN|CDGRD|CMGRD|SOCORRO|CIUDADANO
Storage:          PostgreSQL Storage (fotos comprimidas < 300KB)
Caché:            Redis Redis (plan gratuito)
Hosting:          VPS Contabo (13.140.174.122) (backend) + VPS (web) — ambos gratuitos
CI/CD:            GitHub Actions (gratis en repo público)
Monitoreo:        Sentry + UptimeRobot (ambos gratuitos)
Repo:             GitHub público (código abierto — requisito sector público Colombia)
Package manager:  pnpm workspaces (monorepo)
```

## Principios de arquitectura

1. **Offline-first**: Móvil nunca muestra "Error de conexión". Sync eventual.
2. **Seguridad**: RLS en todas las tablas. JWT en SecureStore. HTTPS siempre.
3. **GPS en todo**: Cada incidente/reporte/alerta lleva lat, lng, precisión_metros.
4. **Accesibilidad de campo**: Botones críticos mínimo 56×56dp. Contraste WCAG AA.
5. **Performance**: App móvil < 2s arranque en Android gama baja. Web LCP < 1.5s.
6. **Costo cero**: Infraestructura USD 0 hasta 10.000 usuarios (ver REGLA 5).

## Monorepo
```
siagrd-meta/
  apps/
    socorro/          # Agente 3 — App móvil organismos de socorro
    panel-web/        # Agente 4 — Dashboard CDGRD
    ciudadano/        # Agente 5 — App pública
  packages/
    ui/               # Agente 2 — Design system compartido
    types/            # Tipos TypeScript del dominio
    config/           # ESLint, TypeScript config compartida
  backend/            # Agente 1 — API + servicios
  database/           # Migraciones SQL
  docs/               # CONTEXTO.md, DEUDA_TECNICA.md, DECISIONES.md, ARQUITECTURA.md
  .github/workflows/  # Agente 6 — CI/CD
  docker-compose.yml
  package.json        # pnpm workspaces root
```

---

# ═══════════════════════════════════════════════════════════
# AGENTE 1 — ARQUITECTO DE DATOS Y BACKEND
# Especialidad: PostgreSQL+PostGIS, API Fastify, seguridad, sync offline
# Ejecutar: Semana 1, en paralelo con Agente 2
# ═══════════════════════════════════════════════════════════

## Rol y misión

Construyes los cimientos. Sin ti nada funciona. Cuando termines:
- Schema de BD completo con PostGIS y RLS
- API REST tipada con Fastify + Zod
- Sistema de autenticación por roles
- Endpoint de sync offline (el más crítico)
- Integración mock con IDEAM y SGC (con DT registrada)
- Docker compose para desarrollo local

## Fase 1: Schema de base de datos

Archivo: `database/migrations/001_initial_schema.sql`

Tablas requeridas con sus columnas exactas:

```sql
-- Extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE rol_usuario AS ENUM ('ADMIN','CDGRD','CMGRD','SOCORRO','CIUDADANO');
CREATE TYPE tipo_amenaza AS ENUM ('INUNDACION','REMOCION','SISMO','INCENDIO_FORESTAL','ACCIDENTE_VIA','DERRAME_HC','OTRO');
CREATE TYPE nivel_alerta AS ENUM ('VERDE','AMARILLO','NARANJA','ROJO');
CREATE TYPE estado_incidente AS ENUM ('ABIERTO','EN_ATENCION','CERRADO','FALSA_ALARMA');
CREATE TYPE tipo_archivo AS ENUM ('FOTO','VIDEO','DOCUMENTO','AUDIO');
CREATE TYPE canal_notificacion AS ENUM ('PUSH','SMS','EMAIL','WHATSAPP');
CREATE TYPE fuente_alerta AS ENUM ('IDEAM','SGC','CDGRD','SISTEMA');

-- Territorios
CREATE TABLE departamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL, codigo_dane CHAR(2) NOT NULL UNIQUE,
  geom GEOMETRY(MULTIPOLYGON,4326), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE municipios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL, codigo_dane CHAR(5) NOT NULL UNIQUE,
  departamento_id UUID REFERENCES departamentos(id),
  geom GEOMETRY(MULTIPOLYGON,4326),
  centroide GEOMETRY(POINT,4326),
  nivel_riesgo_inundacion SMALLINT DEFAULT 1 CHECK (nivel_riesgo_inundacion BETWEEN 1 AND 4),
  nivel_riesgo_remocion SMALLINT DEFAULT 1 CHECK (nivel_riesgo_remocion BETWEEN 1 AND 4),
  nivel_riesgo_sismico SMALLINT DEFAULT 1 CHECK (nivel_riesgo_sismico BETWEEN 1 AND 4),
  poblacion INT, area_km2 NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE veredas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL, municipio_id UUID REFERENCES municipios(id),
  geom GEOMETRY(MULTIPOLYGON,4326)
);

-- Organismos de socorro
CREATE TABLE organismos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('BOMBEROS','DEFENSA_CIVIL','CRUZ_ROJA','POLICIA','EJERCITO','OTRO')),
  municipio_id UUID REFERENCES municipios(id),
  telefono TEXT, email TEXT, activo BOOLEAN DEFAULT true,
  ubicacion GEOMETRY(POINT,4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE recursos_organismo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organismo_id UUID REFERENCES organismos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, nombre TEXT NOT NULL, descripcion TEXT,
  cantidad_total INT NOT NULL DEFAULT 1,
  cantidad_disponible INT NOT NULL DEFAULT 1,
  ubicacion GEOMETRY(POINT,4326),
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles de usuario (extiende auth.users de PostgreSQL)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL, apellido TEXT NOT NULL,
  cedula TEXT UNIQUE, telefono TEXT,
  rol rol_usuario NOT NULL DEFAULT 'CIUDADANO',
  organismo_id UUID REFERENCES organismos(id),
  municipio_id UUID REFERENCES municipios(id),
  foto_url TEXT, activo BOOLEAN DEFAULT true,
  device_tokens TEXT[] DEFAULT '{}',  -- Push tokens del dispositivo
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidentes
CREATE TABLE incidentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,  -- Generado: INC-2026-00001
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_amenaza tipo_amenaza NOT NULL,
  estado estado_incidente NOT NULL DEFAULT 'ABIERTO',
  nivel_alerta nivel_alerta NOT NULL DEFAULT 'AMARILLO',
  ubicacion GEOMETRY(POINT,4326) NOT NULL,
  precision_gps_metros NUMERIC(8,2),
  municipio_id UUID REFERENCES municipios(id),
  vereda_id UUID REFERENCES veredas(id),
  reportado_por UUID REFERENCES profiles(id),
  organismo_atendiendo UUID REFERENCES organismos(id),
  afectados_estimado INT,
  evacuados_estimado INT,
  descripcion_cierre TEXT,
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ,
  fuente_reporte TEXT DEFAULT 'APP_SOCORRO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE actualizaciones_incidente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incidente_id UUID REFERENCES incidentes(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES profiles(id),
  texto TEXT NOT NULL,
  ubicacion GEOMETRY(POINT,4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos adjuntos
CREATE TABLE archivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incidente_id UUID REFERENCES incidentes(id) ON DELETE SET NULL,
  reporte_ciudadano_id UUID,
  autor_id UUID REFERENCES profiles(id),
  tipo tipo_archivo NOT NULL DEFAULT 'FOTO',
  url TEXT NOT NULL,
  miniatura_url TEXT,
  tamano_bytes INT,
  coordenadas GEOMETRY(POINT,4326),
  metadatos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas tempranas
CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_amenaza NOT NULL,
  nivel nivel_alerta NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  instrucciones_ciudadano TEXT NOT NULL,
  instrucciones_socorro TEXT,
  municipios_afectados UUID[] NOT NULL DEFAULT '{}',
  geom_area GEOMETRY(POLYGON,4326),
  fuente fuente_alerta NOT NULL DEFAULT 'CDGRD',
  activa BOOLEAN DEFAULT true,
  inicio TIMESTAMPTZ DEFAULT NOW(),
  fin_estimado TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones enviadas
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alerta_id UUID REFERENCES alertas(id) ON DELETE CASCADE,
  canal canal_notificacion NOT NULL,
  destinatario_id UUID,
  destinatario_tipo TEXT NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ENVIADO','FALLIDO')),
  intentos SMALLINT DEFAULT 0,
  respuesta_proveedor JSONB,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reportes ciudadanos
CREATE TABLE reportes_ciudadanos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_amenaza NOT NULL DEFAULT 'OTRO',
  descripcion TEXT,
  ubicacion GEOMETRY(POINT,4326) NOT NULL,
  precision_gps_metros NUMERIC(8,2),
  municipio_id UUID REFERENCES municipios(id),
  reportado_por UUID REFERENCES profiles(id),
  anonimo BOOLEAN DEFAULT false,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','REVISADO','VINCULADO','DESCARTADO')),
  incidente_vinculado UUID REFERENCES incidentes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RUD — Registro Único de Damnificados
CREATE TABLE damnificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incidente_id UUID REFERENCES incidentes(id),
  nombre_jefe_hogar TEXT NOT NULL, cedula TEXT,
  municipio_id UUID REFERENCES municipios(id),
  vereda_id UUID REFERENCES veredas(id),
  direccion TEXT,
  num_personas INT NOT NULL DEFAULT 1,
  tiene_menores BOOLEAN DEFAULT false,
  tiene_discapacitados BOOLEAN DEFAULT false,
  tiene_adultos_mayores BOOLEAN DEFAULT false,
  ubicacion_actual GEOMETRY(POINT,4326),
  estado_atencion TEXT DEFAULT 'PENDIENTE'
    CHECK (estado_atencion IN ('PENDIENTE','EN_ALBERGUE','RETORNADO','REUBICADO')),
  ayuda_recibida JSONB DEFAULT '{}',
  registrado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cola de sincronización offline
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  registro_id UUID,
  payload JSONB NOT NULL,
  timestamp_local BIGINT NOT NULL,  -- epoch ms del dispositivo
  intentos SMALLINT DEFAULT 0,
  procesado BOOLEAN DEFAULT false,
  error_mensaje TEXT,
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (inmutable — sin DELETE, sin UPDATE)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL, operacion TEXT NOT NULL,
  registro_id UUID, usuario_id UUID,
  datos_anteriores JSONB, datos_nuevos JSONB,
  ip INET, user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES GEOESPACIALES (críticos para performance)
CREATE INDEX idx_municipios_geom ON municipios USING GIST(geom);
CREATE INDEX idx_municipios_centroide ON municipios USING GIST(centroide);
CREATE INDEX idx_incidentes_ubicacion ON incidentes USING GIST(ubicacion);
CREATE INDEX idx_incidentes_estado ON incidentes(estado);
CREATE INDEX idx_incidentes_municipio ON incidentes(municipio_id);
CREATE INDEX idx_incidentes_fecha ON incidentes(fecha_inicio DESC);
CREATE INDEX idx_alertas_activa ON alertas(activa) WHERE activa = true;
CREATE INDEX idx_alertas_nivel ON alertas(nivel);
CREATE INDEX idx_reportes_ubicacion ON reportes_ciudadanos USING GIST(ubicacion);
CREATE INDEX idx_sync_pendiente ON sync_queue(device_id, procesado) WHERE procesado = false;
CREATE INDEX idx_archivos_incidente ON archivos(incidente_id);
```

## Fase 2: RLS (Row Level Security)

Archivo: `database/migrations/002_rls_policies.sql`

```sql
-- Habilitar RLS en todas las tablas de datos
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actualizaciones_incidente ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_ciudadanos ENABLE ROW LEVEL SECURITY;
ALTER TABLE damnificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_organismo ENABLE ROW LEVEL SECURITY;
-- sync_queue y audit_log: acceso solo via service_role (sin RLS para usuario final)

-- Helper function: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role() RETURNS rol_usuario AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_municipio() RETURNS UUID AS $$
  SELECT municipio_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES: cada uno ve el suyo; ADMIN y CDGRD ven todos
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR get_user_role() IN ('ADMIN','CDGRD')
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- INCIDENTES: CDGRD ve todo; CMGRD y SOCORRO ven solo su municipio
CREATE POLICY "incidentes_select" ON incidentes FOR SELECT USING (
  get_user_role() IN ('ADMIN','CDGRD') OR
  municipio_id = get_user_municipio()
);
CREATE POLICY "incidentes_insert" ON incidentes FOR INSERT WITH CHECK (
  get_user_role() IN ('CDGRD','CMGRD','SOCORRO')
);
CREATE POLICY "incidentes_update" ON incidentes FOR UPDATE USING (
  get_user_role() IN ('ADMIN','CDGRD') OR
  (get_user_role() IN ('CMGRD','SOCORRO') AND municipio_id = get_user_municipio())
);

-- ALERTAS: todos leen; solo CDGRD y ADMIN escriben
CREATE POLICY "alertas_select_all" ON alertas FOR SELECT USING (true);
CREATE POLICY "alertas_insert_cdgrd" ON alertas FOR INSERT WITH CHECK (
  get_user_role() IN ('ADMIN','CDGRD')
);
CREATE POLICY "alertas_update_cdgrd" ON alertas FOR UPDATE USING (
  get_user_role() IN ('ADMIN','CDGRD')
);

-- DAMNIFICADOS: CIUDADANO no puede leer datos de otros
CREATE POLICY "damnificados_select" ON damnificados FOR SELECT USING (
  get_user_role() IN ('ADMIN','CDGRD') OR
  (get_user_role() IN ('CMGRD','SOCORRO') AND municipio_id = get_user_municipio())
);

-- AUDIT LOG: solo lectura para ADMIN; nadie puede escribir directamente
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (
  get_user_role() = 'ADMIN'
);
-- INSERT solo via trigger (service_role)
```

## Fase 3: API con Fastify

Estructura de archivos a crear:

```
backend/
  src/
    index.ts              # Entry point, registra plugins y rutas
    routes/
      auth.ts             # POST /auth/login, /auth/refresh, /auth/logout
      incidentes.ts       # GET/POST/PATCH /incidentes, GET /incidentes/cercanos
      alertas.ts          # GET/POST /alertas, POST /alertas/:id/emitir
      reportes.ts         # GET/POST /reportes-ciudadanos
      recursos.ts         # GET/PATCH /recursos
      archivos.ts         # POST /archivos/upload
      damnificados.ts     # CRUD /damnificados
      sync.ts             # POST /sync (el más crítico)
      health.ts           # GET /health
      dashboard.ts        # GET /dashboard/stats, /dashboard/mapa-datos
    middleware/
      auth.ts             # Verificar JWT PostgreSQL + inyectar user en request
      audit.ts            # Registrar en audit_log automáticamente
      rateLimit.ts        # Rate limits por ruta
    services/
      alerts.service.ts   # Emisión Push + SMS Twilio
      ideam.service.ts    # Integración IDEAM (mock en DEV — DT-001)
      sgc.service.ts      # Integración SGC (mock en DEV — DT-002)
      sync.service.ts     # Procesar cola sync_queue
      geo.service.ts      # ST_DWithin, ST_Contains, etc.
      storage.service.ts  # Upload a PostgreSQL Storage con compresión
      notifications.service.ts # Push batch + WhatsApp fallback
    types/
      domain.ts           # Tipos del dominio (Incidente, Alerta, Profile, etc.)
      api.ts              # Request/Response types
    utils/
      validators.ts       # Schemas Zod para todos los endpoints
      logger.ts           # Pino logger estructurado
      errors.ts           # Error classes tipados
      geo.ts              # Helpers geoespaciales
```

### Endpoint crítico: POST /sync

```typescript
// routes/sync.ts
// Este endpoint recibe eventos offline y los procesa en orden cronológico

interface SyncPayload {
  device_id: string;
  eventos: Array<{
    id: string;              // UUID local (para deduplicación)
    tabla: string;
    operacion: 'INSERT' | 'UPDATE' | 'DELETE';
    registro_id?: string;
    payload: Record<string, unknown>;
    timestamp_local: number; // epoch ms
  }>;
  last_sync_timestamp?: number;
}

interface SyncResponse {
  procesados: number;
  fallidos: Array<{ id: string; error: string }>;
  conflictos: Array<{ id: string; resolucion: string }>;
  server_timestamp: number;
  // Datos nuevos desde last_sync_timestamp para sincronizar al cliente
  incidentes_nuevos: Incidente[];
  alertas_activas: Alerta[];
}

// Regla de conflictos: last-write-wins por timestamp_local
// Si un registro fue modificado en el servidor DESPUÉS del timestamp_local del cliente:
// - Guardar ambas versiones en una tabla de conflictos_sync
// - Aplicar la versión del servidor
// - Notificar al cliente que hubo conflicto
// - Coordinador del CDGRD puede resolver manualmente
```

### Endpoint: POST /archivos/upload

```typescript
// Flujo optimizado para conexiones lentas (2G del Meta):
// 1. Recibir multipart (max 10MB)
// 2. Validar MIME type real con file-type (no extensión)
// 3. Comprimir imagen: max 1200px, calidad 75%, formato WebP
// 4. Generar miniatura: 300x300, calidad 60%, WebP
// 5. Extraer coordenadas GPS del EXIF si existen
// 6. Subir a PostgreSQL Storage: incidentes/{incidente_id}/{timestamp}.webp
// 7. Registrar en tabla archivos
// 8. Devolver URLs en < 5 segundos
// Si compresión falla: guardar original con warning en log
```

## Fase 4: Seeds de datos del Meta

Archivo: `database/seeds/municipios_meta.sql`

Los 27 municipios del Meta con código DANE y nivel de riesgo base:

```sql
-- Insertar departamento del Meta
INSERT INTO departamentos (nombre, codigo_dane) VALUES ('Meta', '50');

-- Los 27 municipios (centroides aproximados — refinar con datos IGAC reales)
-- formato: (nombre, codigo_dane, nivel_inundacion, nivel_remocion, nivel_sismico, poblacion)
INSERT INTO municipios (nombre, codigo_dane, departamento_id, centroide, nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico, poblacion)
SELECT m.nombre, m.dane, d.id, ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326), m.inun, m.remo, m.sism, m.pob
FROM (VALUES
  ('Villavicencio',    '50001', -73.6365, -4.1420,  2, 3, 2, 507260),
  ('Acacías',          '50006', -73.7634, -3.9886,  2, 3, 2, 77215),
  ('Barranca de Upía', '50110', -72.9667, -4.5833,  3, 1, 2, 12000),
  ('Cabuyaro',         '50124', -72.7833, -4.2833,  3, 1, 1, 7500),
  ('Castilla la Nueva','50150', -73.6742, -3.7942,  2, 2, 2, 17000),
  ('El Calvario',      '50223', -73.7000, -4.3500,  1, 4, 2, 4500),
  ('El Castillo',      '50226', -73.9333, -3.7667,  2, 3, 1, 8000),
  ('El Dorado',        '50245', -73.7000, -3.6667,  2, 3, 1, 6000),
  ('Fuente de Oro',    '50270', -73.6000, -3.4667,  3, 1, 1, 12000),
  ('Granada',          '50313', -73.7000, -3.5333,  3, 2, 1, 62000),
  ('Guamal',           '50318', -73.7667, -3.8833,  2, 3, 2, 19000),
  ('Mapiripán',        '50325', -73.0000, -2.8833,  4, 1, 1, 17000),
  ('Mesetas',          '50330', -74.0500, -3.3833,  2, 4, 1, 15000),
  ('La Macarena',      '50350', -73.7833, -2.1833,  3, 3, 1, 27000),
  ('Lejanías',         '50400', -74.0167, -3.5167,  2, 4, 1, 16000),
  ('Puerto Concordia', '50450', -72.7500, -2.6167,  4, 1, 1, 13000),
  ('Puerto Gaitán',    '50568', -72.0833, -4.3167,  3, 1, 1, 23000),
  ('Puerto Lleras',    '50577', -73.3833, -3.2667,  3, 1, 1, 13000),
  ('Puerto López',     '50573', -72.9667, -4.0833,  3, 1, 1, 33000),
  ('Puerto Rico',      '50590', -73.6833, -3.6833,  3, 2, 1, 23000),
  ('Restrepo',         '50606', -73.5667, -4.2500,  2, 3, 2, 17000),
  ('San Carlos de Guaroa','50680',-73.2667,-3.7167, 3, 1, 1, 9000),
  ('San Juan de Arama','50683', -73.8833, -3.3667,  2, 3, 1, 9000),
  ('San Juanito',      '50686', -73.6833, -4.4667,  1, 4, 3, 3000),
  ('San Martín',       '50689', -73.6833, -3.6833,  2, 2, 1, 24000),
  ('Uribe',            '50370', -74.3833, -3.2167,  2, 4, 1, 18000),
  ('Vistahermosa',     '50711', -73.7667, -3.1167,  2, 3, 1, 24000)
) AS m(nombre, dane, lng, lat, inun, remo, sism, pob)
CROSS JOIN departamentos d WHERE d.codigo_dane = '50';
```

## Fase 5: Docker y configuración

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=development
    env_file: .env
    depends_on: [postgres, redis]
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: pnpm dev

  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: siagrd_dev
      POSTGRES_USER: siagrd
      POSTGRES_PASSWORD: siagrd_dev_secret
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 50mb --maxmemory-policy allkeys-lru

volumes:
  postgres_data:
```

## Criterios de aceptación — Agente 1

- [ ] `pnpm db:migrate` ejecuta sin errores
- [ ] `pnpm db:seed` inserta los 27 municipios con PostGIS
- [ ] `pnpm test` cobertura > 80% en services/
- [ ] Usuario CMGRD de Villavicencio NO puede leer incidentes de Acacías (RLS verificado)
- [ ] POST /sync con 100 eventos procesa en < 3 segundos
- [ ] POST /archivos/upload con foto 5MB devuelve URL en < 5 segundos
- [ ] GET /health devuelve estado de DB, Redis, IDEAM mock, SGC mock
- [ ] `docker-compose up` levanta todo sin errores
- [ ] DT-001 (IDEAM) y DT-002 (SGC) documentadas con mocks funcionales

---

# ═══════════════════════════════════════════════════════════
# AGENTE 2 — DESIGN SYSTEM "TACTICAL CLARITY"
# Especialidad: Tokens visuales, componentes compartidos
# Ejecutar: Semana 1, en paralelo con Agente 1
# ═══════════════════════════════════════════════════════════

## Dirección estética: Industrial Operacional

Inspirado en: salas de control de emergencias, centros de despacho 911, 
sistemas SCADA de infraestructura crítica. Oscuro por defecto (turnos nocturnos).
Alto contraste. Densidad de información controlada. Sin decoración innecesaria.

NO es: Material Design, Bootstrap, startup tech, gradientes púrpura.
SÍ es: Denso, confiable, urgente cuando debe serlo, claro siempre.

Fuentes (cargar localmente — funciona offline):
- Display: **Barlow Condensed** (Bold/SemiBold) — fuerza, urgencia, legibilidad en dashboards
- Body: **IBM Plex Sans** (Regular/Medium) — técnica, legible en pantallas pequeñas  
- Mono: **IBM Plex Mono** — coordenadas GPS, timestamps, códigos de incidente

## Archivo: `packages/ui/src/tokens.ts`

```typescript
export const colors = {
  bg: {
    primary:   '#0A0E1A',  // Azul marino oscuro — fondo principal
    secondary: '#111827',  // Cards, panels
    tertiary:  '#1E2535',  // Inputs, filas de lista
    overlay:   'rgba(0,0,0,0.8)',
  },
  surface: { default: '#1E2535', elevated: '#252D3D', pressed: '#2D3748' },
  text: {
    primary:  '#F0F4FF',  // Casi blanco azulado — alta legibilidad
    secondary: '#8B9CC8', // Metadatos, timestamps
    disabled:  '#4A5568',
    inverse:   '#0A0E1A',
  },
  border: { default: '#2D3748', strong: '#4A5568', focus: '#3B82F6' },

  // Sistema de alertas — núcleo del diseño
  alerta: {
    verde:   { bg:'#052E16', surface:'#14532D', text:'#86EFAC', solid:'#16A34A', icon:'#4ADE80' },
    amarillo:{ bg:'#1C1700', surface:'#422006', text:'#FDE68A', solid:'#D97706', icon:'#FBBF24' },
    naranja: { bg:'#1C0A00', surface:'#431407', text:'#FDBA74', solid:'#EA580C', icon:'#F97316' },
    rojo:    { bg:'#1C0505', surface:'#450A0A', text:'#FCA5A5', solid:'#DC2626', icon:'#EF4444', pulse:'#FF0000' },
  },

  // Por tipo de amenaza (iconografía cromática)
  amenaza: {
    INUNDACION:      '#2563EB',
    REMOCION:        '#92400E',
    SISMO:           '#7C3AED',
    INCENDIO_FORESTAL:'#DC2626',
    ACCIDENTE_VIA:   '#D97706',
    DERRAME_HC:      '#374151',
    OTRO:            '#6B7280',
  },

  action: {
    primary:       '#2563EB',
    primary_hover: '#1D4ED8',
    danger:        '#DC2626',
    danger_hover:  '#B91C1C',
    success:       '#16A34A',
    warning:       '#D97706',
  },
  recurso: {
    disponible:    '#16A34A',
    ocupado:       '#D97706',
    fuera_servicio:'#DC2626',
    sin_datos:     '#6B7280',
  },
} as const;

export const typography = {
  family: { display: 'BarlowCondensed', body: 'IBMPlexSans', mono: 'IBMPlexMono' },
  size: { xs:11, sm:13, base:15, md:17, lg:20, xl:24, '2xl':30, '3xl':36, '4xl':48 },
  weight: { regular:'400', medium:'500', semibold:'600', bold:'700' },
} as const;

export const spacing = { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64 } as const;
export const radius = { sm:4, md:8, lg:12, xl:16, full:9999 } as const;

export const touch = {
  min: 44,         // WCAG mínimo
  standard: 56,    // Operaciones de campo
  emergency: 72,   // Botones SOS / activar alerta máxima
} as const;

export const animation = {
  fast: 150, normal: 250, slow: 400,
  // Pulso para alerta ROJA — comunica urgencia visualmente
  pulse_emergency: { duration: 800, easing: 'ease-in-out' },
} as const;
```

## Componentes a crear en `packages/ui/src/components/`

Cada componente: TypeScript estricto, funciona en RN y web, sin deps externas no aprobadas.

```typescript
// AlertaBadge.tsx — nivel con pulso animado en ROJO
interface Props { nivel: 'VERDE'|'AMARILLO'|'NARANJA'|'ROJO'; size?: 'sm'|'md'|'lg'; }

// AmenazaIcon.tsx — ícono SVG + color por tipo
interface Props { tipo: TipoAmenaza; size?: number; withLabel?: boolean; }

// EmergencyButton.tsx — botón grande para acciones críticas
interface Props { label: string; onPress: () => void; variant: 'danger'|'warning'|'primary'; size?: 'standard'|'emergency'; disabled?: boolean; loading?: boolean; }

// OfflineBanner.tsx — visible siempre cuando no hay red
interface Props { pendingCount: number; onSyncPress?: () => void; }

// CoordDisplay.tsx — coordenadas GPS en formato legible
interface Props { lat: number; lng: number; precision?: number; fuente?: 'GPS'|'MANUAL'|'RED'; }

// PhotoCapture.tsx — captura con GPS
interface Props { onCapture: (photo: { uri: string; coords: Coordenada; }) => void; }

// IncidentCard.tsx — card de incidente con nivel y distancia
interface Props { incidente: Incidente; distancia_km?: number; onPress: () => void; }

// NivelAlertaHeader.tsx — header que cambia de color con la alerta
interface Props { nivel: NivelAlerta; municipio: string; }

// SyncStatus.tsx — contador de pendientes + botón de sync manual
interface Props { pendientes: number; ultimo_sync?: Date; onSync: () => void; }
```

## Criterios de aceptación — Agente 2

- [ ] `packages/ui` compila en web y React Native sin errores
- [ ] AlertaBadge nivel ROJO anima con pulso visible
- [ ] OfflineBanner aparece en < 500ms al perder conexión
- [ ] Contraste de todos los textos > 4.5:1 (verificar con axe-core)
- [ ] Todos los elementos interactivos min 44×44dp
- [ ] Exporta correctamente: `import { AlertaBadge, EmergencyButton } from '@siagrd/ui'`

---

# ═══════════════════════════════════════════════════════════
# AGENTE 3 — APP MÓVIL SOCORRO (OFFLINE-FIRST)
# Especialidad: Expo, React Native, WatermelonDB, GPS, Cámara
# Ejecutar: Semana 3, depende de Agente 1 y 2
# ═══════════════════════════════════════════════════════════

## Rol

App de misión crítica para Bomberos, Defensa Civil y Cruz Roja del Meta.
Funciona perfectamente sin internet. Rápida. Imposible de confundir en campo.

## Regla de oro de esta app

**Desde que el usuario desbloquea el teléfono hasta que puede reportar una emergencia: máximo 3 toques.**

Si en algún momento el flujo requiere más de 3 toques para la acción más común
(crear incidente): rediseñar sin preguntar.

## Pantallas y flujo

```
HomeScreen
├── Header: NivelAlertaHeader (nivel departamental activo)
├── Botón flotante: "NUEVO INCIDENTE" (72dp, color según alerta)
├── Lista: últimos 10 incidentes del municipio del usuario
├── Badge: elementos en cola de sync
└── Indicador: estado de conexión (siempre visible)

NuevoIncidenteScreen [3 toques desde Home]
├── Toque 1: botón NUEVO INCIDENTE en Home
├── Toque 2: grid 2×3 de tipos de amenaza (íconos grandes, 72dp mínimo)
│   [INUNDACIÓN] [DESLIZAMIENTO] [SISMO]
│   [INCENDIO]   [ACCIDENTE VÍA] [OTRO]
└── Toque 3: pantalla GPS + confirmar
    ├── GPS se captura automáticamente al entrar
    ├── Mapa pequeño mostrando ubicación
    ├── Campos opcionales: descripción (voice-to-text si disponible), foto
    └── Botón "GUARDAR INCIDENTE" (grande, verde)
    → Guarda LOCALMENTE en WatermelonDB → encola sync → navega a detalle

IncidenteScreen
├── Header con nivel del incidente + código (INC-2026-00001)
├── Mapa con pin de ubicación
├── Timeline de actualizaciones (más reciente arriba)
├── Botón: "AGREGAR ACTUALIZACIÓN" (foto + texto)
├── Botón: "CERRAR INCIDENTE" (solo si rol lo permite)
└── Estado de sync de este incidente específico

MapaScreen
├── MapLibre full-screen modo oscuro
├── Pins coloreados por nivel de alerta
├── Botón flotante: filtros (por tipo, por municipio)
└── Tap en pin: mini-card con resumen → tap en card → IncidenteScreen

RecursosScreen
├── Lista de recursos del organismo del usuario
├── Cambiar disponibilidad: tap → toggle disponible/ocupado
└── Filtro: por tipo de recurso

SyncScreen
├── Contador de elementos pendientes
├── Lista de eventos en cola (tabla, operacion, timestamp)
├── Botón "SINCRONIZAR AHORA" (si hay conexión)
└── Historial de últimas sincronizaciones
```

## WatermelonDB Schema

```typescript
// apps/socorro/src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'incidentes',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'codigo', type: 'string' },
        { name: 'titulo', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'tipo_amenaza', type: 'string' },
        { name: 'estado', type: 'string' },
        { name: 'nivel_alerta', type: 'string' },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'altitud', type: 'number', isOptional: true },
        { name: 'precision_gps', type: 'number', isOptional: true },
        { name: 'municipio_id', type: 'string' },
        { name: 'afectados_estimado', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
        { name: 'updated_at_local', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'actualizaciones',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'incidente_id', type: 'string' },  // local o server_id
        { name: 'texto', type: 'string' },
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at_local', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'archivos_pendientes',
      columns: [
        { name: 'incidente_id', type: 'string' },
        { name: 'uri_local', type: 'string' },     // path en FileSystem de Expo
        { name: 'miniatura_uri', type: 'string', isOptional: true },
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'tamano_bytes', type: 'number', isOptional: true },
        { name: 'subido', type: 'boolean' },
        { name: 'error', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'alertas_cache',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'tipo', type: 'string' },
        { name: 'nivel', type: 'string' },
        { name: 'titulo', type: 'string' },
        { name: 'instrucciones_ciudadano', type: 'string' },
        { name: 'instrucciones_socorro', type: 'string', isOptional: true },
        { name: 'activa', type: 'boolean' },
        { name: 'cached_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'municipios_cache',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'nombre', type: 'string' },
        { name: 'nivel_riesgo_inundacion', type: 'number' },
        { name: 'nivel_riesgo_remocion', type: 'number' },
        { name: 'nivel_riesgo_sismico', type: 'number' },
        { name: 'cached_at', type: 'number' },
      ],
    }),
  ],
});
```

## Servicio de sincronización

```typescript
// apps/socorro/src/services/sync.service.ts
// Estrategia:
// TRIGGER 1: Al iniciar la app → intentar sync si hay conexión
// TRIGGER 2: Al crear/modificar registro → guardar local, encolar
// TRIGGER 3: Cada 60 segundos si hay conexión → procesar cola
// TRIGGER 4: NetInfo event 'connected' → procesar cola en < 3 segundos
// TRIGGER 5: Al abrir SyncScreen → sync manual

// Orden de sync:
// 1. Subir archivos pendientes (fotos) → actualizar URLs en WatermelonDB
// 2. Subir incidentes nuevos (synced=false)
// 3. Subir actualizaciones nuevas (synced=false)
// 4. Descargar cambios del servidor desde last_sync_timestamp
// 5. Actualizar alertas_cache con alertas activas

// En caso de error de red durante sync:
// - Log local del error
// - Incrementar contador de intentos
// - Si intentos > 5 en 24h: notificar al usuario "Hay N elementos sin sincronizar"
// - NUNCA perder datos locales por error de red
```

## Servicio de GPS

```typescript
// apps/socorro/src/services/location.service.ts
// Usar expo-location
// Estrategia de batería eficiente:
// - NO usar watchPositionAsync continuo
// - Al entrar a NuevoIncidenteScreen: getCurrentPositionAsync UNA VEZ
//   { accuracy: Location.Accuracy.High, timeout: 10000 }
// - Si timeout: ofrecer mapa para marcar manualmente + advertencia
// - Si precisión > 100m: mostrar "⚠ Ubicación imprecisa. ¿Confirmar o marcar manualmente?"
// - Guardar siempre: { lat, lng, altitud?, precision_metros, timestamp, fuente }
// - NUNCA bloquear el flujo por GPS — el incidente se puede crear sin ubicación exacta

export type FuenteUbicacion = 'GPS_ALTA' | 'GPS_BAJA' | 'RED' | 'MANUAL';
export interface Coordenada {
  lat: number; lng: number; altitud?: number;
  precision_metros: number; timestamp: number; fuente: FuenteUbicacion;
}
```

## Servicio de cámara

```typescript
// apps/socorro/src/services/camera.service.ts
// Flujo completo:
// 1. expo-camera para captura
// 2. expo-image-manipulator: resize a max 1200px lado mayor, calidad 0.75, formato JPEG
//    (WebP no tiene soporte completo en React Native aún)
// 3. Obtener coordenadas GPS actuales (getCurrentPositionAsync rápido, accuracy: Low)
// 4. Guardar en FileSystem.documentDirectory + 'fotos/' + uuid + '.jpg'
// 5. Generar miniatura 400x400 para preview inmediato en UI
// 6. Encolar en tabla archivos_pendientes
// 7. Devolver { uri_local, miniatura_uri, coordenada } inmediatamente
// La foto se sube en background cuando hay conexión — no bloquear al usuario
```

## Criterios de aceptación — Agente 3

- [ ] Crear incidente: exactamente 3 toques desde HomeScreen
- [ ] App funciona completamente en modo avión (demostrar con lista completa de incidentes cargada)
- [ ] GPS obtiene coordenadas en < 10s o muestra fallback manual
- [ ] Foto se captura y aparece en UI en < 3 segundos (sin esperar upload)
- [ ] Al recuperar conexión: sync automático en < 5 segundos
- [ ] App arranca en < 2 segundos (medir con Flipper en Android gama media)
- [ ] WatermelonDB persiste datos tras cerrar y reabrir la app (verificar)
- [ ] Sin crashes en 30 minutos de uso simulado en modo avión

---

# ═══════════════════════════════════════════════════════════
# AGENTE 4 — PANEL WEB COORDINACIÓN (CDGRD)
# Especialidad: Next.js 14, MapLibre, PostgreSQL Realtime, Dashboard
# Ejecutar: Semana 3, en paralelo con Agente 3
# ═══════════════════════════════════════════════════════════

## Rol

Dashboard de sala de operaciones para el CDGRD Meta en Villavicencio.
Siempre encendido, siempre actualizado. Monitorea el departamento completo en tiempo real.

## Layout principal (1920×1080)

```
┌─────────────────────────────────────────────────────────────┐
│ [SIAGRD META] [NIVEL DPTO: AMARILLO] [• ONLINE] [21:34 COL] │ ← TopBar
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│  INCIDENTES  │                                               │
│  ACTIVOS     │          MAPA DEL META                        │
│  ─────────── │          (MapLibre, oscuro)                   │
│  🔴 INC-001  │          con incidentes en tiempo real        │
│  🟡 INC-002  │                                               │
│  🟡 INC-003  │                                               │
│              │                                               │
│  ALERTAS     │                                               │
│  ACTIVAS     │                                               │
│  ─────────── │                                               │
│  🟡 Nivel    │                                               │
│     Amarillo │                                               │
│  Villavicen. │                                               │
│              │                                               │
│  RECURSOS    ├──────────────────────────────────────────────┤
│  ─────────── │ [DETALLE INCIDENTE — abre al hacer click]     │
│  Bomberos: 3 │ INC-2026-00042 | INUNDACIÓN | 🔴 ROJO         │
│  disponible  │ Villavicencio — Hace 23 min                   │
│  Cruz Roja:2 │ [Timeline] [Recursos] [Fotos] [Cerrar]        │
└──────────────┴──────────────────────────────────────────────┘
```

## Implementar en `apps/panel-web/`

```
src/
  app/
    (dashboard)/
      layout.tsx              # Layout con sidebar + realtime subscriptions
      page.tsx                # Mapa principal + panel lateral
      incidentes/
        page.tsx              # Lista completa con filtros
        [id]/page.tsx         # Detalle + timeline + fotos
      alertas/
        page.tsx              # Alertas activas + historial
        nueva/page.tsx        # Crear y emitir alerta (flujo crítico)
      recursos/page.tsx       # Inventario departamental
      damnificados/page.tsx   # RUD
      municipios/
        page.tsx              # Vista de los 27 municipios
        [id]/page.tsx         # Detalle de municipio
      reportes/page.tsx       # Reportes ciudadanos pendientes
      salud/page.tsx          # Estado del sistema (uptime, sync, APIs)
    (auth)/
      login/page.tsx          # Login simple y seguro
  components/
    MapaDepartamental.tsx     # Mapa principal (ver abajo)
    IncidenteTimeline.tsx
    AlertaEmision.tsx         # Flujo de emisión (ver abajo)
    NivelAlertaGlobal.tsx
    RealtimeIndicator.tsx
    SistemasSalud.tsx         # Health del sistema
  hooks/
    useRealtimeIncidentes.ts
    useRealtimeAlertas.ts
    useRealtimeReportes.ts
  lib/
    postgres.ts
    map-config.ts             # Estilo oscuro MapLibre
```

## MapaDepartamental — implementación crítica

```typescript
// components/MapaDepartamental.tsx
// Capas del mapa (en orden de renderizado):
// 1. Fondo: estilo oscuro personalizado (basado en Protomaps o tiles OSM)
// 2. Layer: polígonos de 27 municipios, coloreados por nivel de riesgo base
//    - getColor: nivel 1=gris, 2=azul tenue, 3=naranja tenue, 4=rojo tenue
// 3. Layer: bordes de municipios (línea delgada blanca 20% opacidad)
// 4. Layer: alertas activas (polígono semitransparente por nivel)
// 5. Layer: incidentes activos (puntos animados)
//    - getColor: VERDE=#16A34A, AMARILLO=#D97706, NARANJA=#EA580C, ROJO=#DC2626
//    - getSize: ROJO=18px con pulso, otros=12px
//    - Animación de aparición: nuevo incidente → escala de 0 a 1 en 500ms
// 6. Layer: reportes ciudadanos pendientes (puntos pequeños grises)
// 7. Layer: recursos disponibles (íconos por tipo)

// Tiempo real:
// - PostgreSQL subscription en tabla incidentes → actualiza estado React → MapLibre re-render
// - Nuevo incidente: sonido de alerta (sutil) + animación en mapa
// - Incidente cerrado: punto se desvanece

// Performance con muchos incidentes:
// - Clusterización si > 20 incidentes en mismo área (maplibre-gl-cluster)
// - useMemo para layers — no recalcular en cada render
// - Si > 100 incidentes: activar modo rendimiento (sin animaciones)
```

## AlertaEmision — pantalla más crítica del panel

```typescript
// Flujo de emisión en 5 pasos:
// Paso 1: Tipo de amenaza + nivel (radio buttons con colores)
// Paso 2: Municipios afectados (checkboxes en mapa interactivo del Meta)
// Paso 3: Instrucciones para ciudadanía (textarea, máx 500 chars, preview en tiempo real)
//         Instrucciones para organismos de socorro (textarea separado)
// Paso 4: Preview — así verán la notificación push los ciudadanos
// Paso 5: Confirmación
//   - Niveles VERDE y AMARILLO: un click en "EMITIR ALERTA"
//   - Nivel NARANJA: "Confirmar" en modal con resumen
//   - Nivel ROJO: dos confirmaciones separadas + campo de texto "Motivo" obligatorio
// Post-emisión: contador en tiempo real de push enviados (SSE)
```

## Criterios de aceptación — Agente 4

- [ ] Dashboard carga en < 1.5s (LCP medido con Lighthouse en producción build)
- [ ] Nuevo incidente aparece en mapa en < 2s sin refresh de página
- [ ] Mapa con 100 incidentes a 60fps (verificar con Chrome DevTools Performance)
- [ ] Alerta ROJA requiere dos confirmaciones separadas + motivo
- [ ] Funciona en 1920×1080 y en 1024px (tablet)
- [ ] Lighthouse: Performance > 90, Accessibility > 90

---

# ═══════════════════════════════════════════════════════════
# AGENTE 5 — APP CIUDADANA (PWA + NATIVA)
# Especialidad: Expo, PWA, UX masiva, accesibilidad, i18n
# Ejecutar: Semana 5, depende de Agente 1 y 2
# ═══════════════════════════════════════════════════════════

## Regla de oro: cero fricción para lo más importante

- Ver si hay alerta activa en mi municipio: **0 toques** (visible al abrir)
- Reportar emergencia: **3 toques** exactos
- Sin registro para ver alertas y mapa de riesgos
- App pesa máximo **30MB** instalada

## Pantallas

```
HomeScreen (sin login requerido)
├── Si hay alerta ROJA: pantalla COMPLETA roja con pulso animado
│   [QUÉ PASA en texto grande] [Instrucciones] [VER MAPA] [LLAMAR 123]
│   → deslizar hacia abajo para ver el resto de la app
├── Si hay alerta NARANJA/AMARILLO: banner superior con color
└── Sin alerta: card de "Estado de tu municipio" + accesos rápidos

ReportarScreen [3 toques desde Home]
├── Toque 1: botón "REPORTAR EMERGENCIA" en Home
├── Toque 2: grid de 6 tipos con íconos grandes
└── Toque 3: confirmar ubicación GPS + ENVIAR
           (foto y descripción son opcionales — aparecer después del envío)

AlertasScreen
├── Alerta activa en mi municipio (destacada)
├── Historial de alertas últimos 30 días
└── Filtrar por tipo / municipio

MapaRiesgosScreen (sin login)
├── Mapa de mi municipio con zonas de riesgo
├── Leyenda: colores de riesgo
└── Botón: "¿Estoy en zona de riesgo?"

AutoproteccionScreen
├── Lista de tipos de amenaza
└── Por amenaza: qué hacer ANTES, DURANTE, DESPUÉS
    (texto simple, sin tecnicismos, con ilustraciones)

PerfilScreen
├── Mi municipio (selector — también pide permiso de ubicación para sugerirlo)
├── Notificaciones (toggle por tipo de alerta)
├── Idioma (ES / Sikuani — DT registrada para traducción)
└── Login opcional (para seguimiento de mis reportes)
```

## PWA con service worker

```typescript
// next.config.ts — next-pwa configurado
// Service worker cachea:
// - Página principal y todas las rutas
// - Tiles de mapa del Meta (~4MB a zoom 10) en primera visita
// - Guías de autoprotección (JSON + imágenes)
// - Último estado de alertas (se invalida cada 15 min)
// Push notifications: Web Push API
// - Funciona con app cerrada
// - Click en notificación → abre app en AlertasScreen

// Manifest:
// name: "SIAGRD Meta"
// short_name: "SIAGRD"
// theme_color: "#0A0E1A"
// background_color: "#0A0E1A"
// display: "standalone"
// icons: [72, 96, 128, 144, 152, 192, 384, 512]
```

## i18n

```typescript
// Español: completo
// Sikuani: mínimo viable para lanzamiento
//   - Alertas (título + instrucciones principales)
//   - HomeScreen (botón reportar, estado del municipio)
//   - Instrucciones de evacuación (las más críticas)
// DT-003: Validación de traducción Sikuani con comunidad indígena del Meta
// Mock: archivo i18n/sik.json con [TRADUCIR: texto en español] como placeholders
```

## Criterios de aceptación — Agente 5

- [ ] Ver alerta activa: 0 toques (visible inmediatamente al abrir la app)
- [ ] Reportar emergencia: 3 toques exactos (cronometrar)
- [ ] Alerta ROJA: pantalla completa roja en < 1 segundo
- [ ] App funciona offline para consultar alertas cacheadas
- [ ] App pesa < 30MB en Android (verificar con `expo build --analyze`)
- [ ] PWA Lighthouse score > 90
- [ ] Sin registro requerido para alertas y mapa de riesgos

---

# ═══════════════════════════════════════════════════════════
# AGENTE 6 — SEGURIDAD, CI/CD Y OBSERVABILIDAD
# Especialidad: Hardening, GitHub Actions, Sentry, UptimeRobot
# Ejecutar: Semana 7, cuando los demás agentes entreguen
# ═══════════════════════════════════════════════════════════

## Seguridad — checklist completo

```
BACKEND:
☐ Todas las vars sensibles en .env (nunca en código o logs)
☐ HTTPS forzado en VPS (ya activo vía nginx + certbot en VPS)
☐ CORS: solo dominios siagrd.meta.gov.co y localhost en DEV
☐ Content-Security-Policy configurado con helmet
☐ HSTS: max-age=31536000; includeSubDomains
☐ Validación MIME real de archivos con 'file-type' (no solo extensión)
☐ Rate limiting: login 5/15min, upload 50/hora, emitir_alerta 10/hora
☐ SQL injection: imposible (PostgreSQL parametrizado + Zod)
☐ JWT: access 15min, refresh 7 días, refresh rotation
☐ Secretos: instrucciones de rotación en docs/security/SECRET_ROTATION.md

APPS MÓVILES:
☐ JWT en expo-secure-store (AES-256, NO AsyncStorage)
☐ No logs de datos personales en producción
☐ Certificate pinning para API SIAGRD (DT si es complejo — implementar después)
☐ Ofuscación código: metro-react-native-obfuscator en build release

BASE DE DATOS:
☐ RLS en todas las tablas (verificar con test de acceso cruzado)
☐ audit_log: sin DELETE, sin UPDATE para nadie
☐ Backup: PostgreSQL automático diario (verificar que esté activado en dashboard)
☐ Service role key: NUNCA en cliente móvil o web (solo en backend server-side)
```

## CI/CD con GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI SIAGRD Meta
on:
  push: { branches: [main, develop] }
  pull_request: { branches: [main] }

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint          # ESLint en todos los packages
      - run: pnpm typecheck     # tsc --noEmit en todos los packages

  test:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env: { POSTGRES_DB: siagrd_test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:backend --coverage    # Falla si cobertura < 80% en services/
      - run: pnpm test:ui                    # Tests de componentes

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm audit --audit-level=high   # Falla si hay vulns alta/crítica

  build-check:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build:backend
      - run: pnpm build:panel-web
      - run: pnpm build:ciudadano

  # Solo en push a main:
  deploy-backend:
    if: github.ref == 'refs/heads/main'
    needs: [build-check, security-audit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/ssh-action@v1.0.3
        with:
          service: siagrd-backend
          token: ${{ secrets.VPS_SSH_KEY (GitHub Secret)

  deploy-web:
    if: github.ref == 'refs/heads/main'
    needs: [build-check, security-audit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vps-action@v25
        with:
          vps-token: ${{ secrets.VERCEL_TOKEN }}
          vps-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vps-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vps-args: '--prod'
          working-directory: apps/panel-web
```

## Observabilidad

```typescript
// backend/src/monitoring/health.ts
// GET /api/health — respuesta completa del estado del sistema
interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  services: {
    database: { status: 'ok'|'error'; latency_ms: number; };
    redis: { status: 'ok'|'error'; latency_ms: number; };
    storage: { status: 'ok'|'error'; };
    fcm: { status: 'ok'|'error'|'not_configured'; };
    ideam: { status: 'ok'|'error'|'mock'; last_check: string; };
    sgc: { status: 'ok'|'error'|'mock'; last_check: string; };
  };
  sync_queue: { pendientes: number; procesados_ultima_hora: number; };
  uptime_seconds: number;
}

// Sentry: inicializar en backend, panel-web y apps móviles
// DSN del plan gratuito — suficiente para inicio
// Filtrar: no enviar a Sentry datos personales (coordenadas, cédulas)

// UptimeRobot: configurar monitor HTTP en /api/health
// Alert si status != 200 por más de 2 minutos → email al administrador técnico
```

## Plan de recuperación (DR)

```markdown
# docs/DISASTER_RECOVERY.md

## Objetivos: RTO < 4h, RPO < 24h

## Escenario 1: API caída (VPS down)
→ Las apps móviles offline siguen funcionando
→ Acción: redeploy manual desde GitHub Actions → `ssh root@13.140.174.122 "cd /opt/siagrd && docker compose up -d --force-recreate backend"`
→ Tiempo estimado: 10 minutos

## Escenario 2: Base de datos corrupta
→ PostgreSQL backup automático diario disponible en dashboard
→ Restore: PostgreSQL Dashboard → Backups → Restore to point in time
→ Tiempo estimado: 2 horas

## Escenario 3: Push falla (push no llega)
→ Automático: WhatsApp Business API como fallback (configurado desde Agente 1)
→ Último recurso: protocolo de radio (documento en /docs/protocolos/radio.md)

## Escenario 4: Sistema completamente caído
→ Recuperar desde repo GitHub + variables de entorno seguras
→ Instrucciones paso a paso en /docs/SETUP_PRODUCCION.md
→ Tiempo estimado restore completo: 4-6 horas

## Contactos técnicos (completar antes de producción)
- Administrador técnico CDGRD: [nombre] [celular] [email]
- Soporte VPS: support@
- Soporte PostgreSQL: support@postgres.io (plan Pro incluye soporte)
```

## Criterios de aceptación — Agente 6

- [ ] `pnpm ci` pasa completamente en local
- [ ] Deploy automático funciona en push a `main`
- [ ] GET /health devuelve estado de todos los servicios en < 200ms
- [ ] `pnpm audit` sin vulnerabilidades altas o críticas
- [ ] Sentry captura errores reales en staging
- [ ] UptimeRobot configurado y enviando alertas de prueba
- [ ] JWT en SecureStore verificado (no en AsyncStorage)
- [ ] docs/DISASTER_RECOVERY.md completado y probado

---

# ═══════════════════════════════════════════════════════════
# GUÍA OPERACIONAL — CÓMO USAR ESTE PROMPT
# ═══════════════════════════════════════════════════════════

## Iniciar un agente en Claude Code

```bash
# 1. Abrir nueva sesión Claude Code
# 2. El contexto inicial es: REGLAS 1-5 + CONTEXTO GLOBAL + AGENTE N específico
# 3. Primera instrucción a dar:

"Lee completamente el prompt. Luego ejecuta las fases en orden.
Antes de cada fase: actualiza docs/CONTEXTO.md con lo que vas a hacer.
Después de cada archivo creado: haz git commit inmediatamente.
Si encuentras algo que no puedes completar: regístralo en docs/DEUDA_TECNICA.md y continúa.
Solo me interrumpes en los 5 casos STOP definidos en REGLA 1.
Comienza."
```

## Secuencia de semanas

```
Semana 1-2:  Agente 1 (Backend) + Agente 2 (Design)  [PARALELO]
Semana 3-4:  Agente 3 (Socorro) + Agente 4 (Panel)   [PARALELO — depende A1+A2]
Semana 5-6:  Agente 5 (Ciudadano)                     [depende A1+A2]
Semana 7:    Agente 6 (Seguridad+DevOps)               [depende todos]
Semana 8:    Integración, pruebas de campo, ajustes
```

## Antes de empezar: crear el repo

```bash
# En GitHub: crear repo público "siagrd-meta"
# Razón: código abierto es obligatorio para software de gobierno colombiano
# Licencia: MIT

git clone https://github.com/[org]/siagrd-meta
cd siagrd-meta
pnpm init
# Crear estructura base del monorepo
# Crear docs/CONTEXTO.md, docs/DEUDA_TECNICA.md, docs/DECISIONES.md vacíos
git commit -m "chore: inicializar monorepo SIAGRD Meta pnpm workspaces"
```

## Variables de entorno a preparar

```env
# Obtener GRATIS antes de empezar:
SUPABASE_URL=              # postgres.com → nuevo proyecto → Settings → API
SUPABASE_ANON_KEY=         # postgres.com → Settings → API → anon key
SUPABASE_SERVICE_ROLE_KEY= # postgres.com → Settings → API → service_role (NUNCA en cliente)
FIREBASE_PROJECT_ID=       # console.notificaciones.google.com → nuevo proyecto
FIREBASE_PRIVATE_KEY=      # Notificaciones → Settings → Service accounts → Generate key
FIREBASE_CLIENT_EMAIL=     # Mismo archivo JSON anterior
VPS_SSH_KEY (GitHub Secret)
VERCEL_TOKEN=              # vps.com → Settings → Tokens
SENTRY_DSN=                # sentry.io → nuevo proyecto → DSN (plan gratuito)

```

## Señales para detener un agente (además de los STOP)

```
🚨 Si el agente:
→ Sugiere pagar por una API cuando existe alternativa gratuita equivalente
→ No hace commit después de completar un archivo funcional
→ No actualiza docs/CONTEXTO.md al terminar una fase
→ Usa AsyncStorage para JWT en vez de SecureStore
→ Implementa polling en vez de WebSocket/Realtime donde corresponde
→ SELECT * en cualquier query de producción
→ Hardcodea credenciales en el código
→ Dice "esto lo mejoraramos después" para algo de seguridad o accesibilidad

→ Interrumpir: "Detente. [Describir el problema]. Corrige y continúa."
```

---

*SIAGRD Meta — Departamento del Meta, Colombia*
*Ley 1523 de 2012 — Sistema Nacional de Gestión del Riesgo*
*Prompt v2.0 — Junio 2026 — Multi-agente autónomo con 5 causales de stop*
*Infraestructura objetivo: USD 0–75/mes | Código abierto (MIT)*
