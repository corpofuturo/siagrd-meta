CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE rol_usuario AS ENUM ('ADMIN','CDGRD','CMGRD','SOCORRO','CIUDADANO');
CREATE TYPE tipo_amenaza AS ENUM ('INUNDACION','REMOCION','SISMO','INCENDIO_FORESTAL','ACCIDENTE_VIA','DERRAME_HC','OTRO');
CREATE TYPE nivel_alerta AS ENUM ('VERDE','AMARILLO','NARANJA','ROJO');
CREATE TYPE estado_incidente AS ENUM ('ABIERTO','EN_ATENCION','CERRADO','FALSA_ALARMA');
CREATE TYPE tipo_archivo AS ENUM ('FOTO','VIDEO','DOCUMENTO','AUDIO');
CREATE TYPE canal_notificacion AS ENUM ('PUSH','SMS','EMAIL','WHATSAPP');
CREATE TYPE fuente_alerta AS ENUM ('IDEAM','SGC','CDGRD','SISTEMA');

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
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL, apellido TEXT NOT NULL,
  cedula TEXT UNIQUE, telefono TEXT,
  rol rol_usuario NOT NULL DEFAULT 'CIUDADANO',
  organismo_id UUID REFERENCES organismos(id),
  municipio_id UUID REFERENCES municipios(id),
  foto_url TEXT, activo BOOLEAN DEFAULT true,
  device_tokens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE incidentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
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
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  registro_id UUID,
  payload JSONB NOT NULL,
  timestamp_local BIGINT NOT NULL,
  intentos SMALLINT DEFAULT 0,
  procesado BOOLEAN DEFAULT false,
  error_mensaje TEXT,
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL, operacion TEXT NOT NULL,
  registro_id UUID, usuario_id UUID,
  datos_anteriores JSONB, datos_nuevos JSONB,
  ip INET, user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE conflictos_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  version_cliente JSONB NOT NULL,
  version_servidor JSONB NOT NULL,
  timestamp_cliente BIGINT NOT NULL,
  timestamp_servidor TIMESTAMPTZ NOT NULL,
  resuelto BOOLEAN DEFAULT false,
  resuelto_por UUID,
  resolucion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
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
CREATE INDEX idx_damnificados_incidente ON damnificados(incidente_id);
