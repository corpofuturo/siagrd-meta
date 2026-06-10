-- ============================================================
-- siagrd — Setup completo para Railway PostgreSQL
-- Pegar TODO este contenido en Railway → Postgres → Data → Query
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos enumerados
CREATE TYPE rol_usuario    AS ENUM ('ADMIN','CDGRD','CMGRD','SOCORRO','CIUDADANO');
CREATE TYPE tipo_amenaza   AS ENUM ('INUNDACION','REMOCION','SISMO','INCENDIO_FORESTAL','ACCIDENTE_VIA','DERRAME_HC','OTRO');
CREATE TYPE nivel_alerta   AS ENUM ('VERDE','AMARILLO','NARANJA','ROJO');
CREATE TYPE estado_incidente AS ENUM ('ABIERTO','EN_ATENCION','CERRADO','FALSA_ALARMA');
CREATE TYPE tipo_archivo   AS ENUM ('FOTO','VIDEO','DOCUMENTO','AUDIO');
CREATE TYPE canal_notificacion AS ENUM ('PUSH','SMS','EMAIL','WHATSAPP');
CREATE TYPE fuente_alerta  AS ENUM ('IDEAM','SGC','CDGRD','SISTEMA');

-- Tablas base
CREATE TABLE departamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo_dane CHAR(2) NOT NULL UNIQUE,
  geom GEOMETRY(MULTIPOLYGON,4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE municipios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo_dane CHAR(5) NOT NULL UNIQUE,
  departamento_id UUID REFERENCES departamentos(id),
  geom GEOMETRY(MULTIPOLYGON,4326),
  centroide GEOMETRY(POINT,4326),
  nivel_riesgo_inundacion SMALLINT DEFAULT 1 CHECK (nivel_riesgo_inundacion BETWEEN 1 AND 4),
  nivel_riesgo_remocion   SMALLINT DEFAULT 1 CHECK (nivel_riesgo_remocion   BETWEEN 1 AND 4),
  nivel_riesgo_sismico    SMALLINT DEFAULT 1 CHECK (nivel_riesgo_sismico    BETWEEN 1 AND 4),
  poblacion INT,
  area_km2 NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE veredas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  municipio_id UUID REFERENCES municipios(id),
  geom GEOMETRY(MULTIPOLYGON,4326)
);

CREATE TABLE organismos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('BOMBEROS','DEFENSA_CIVIL','CRUZ_ROJA','POLICIA','EJERCITO','OTRO')),
  municipio_id UUID REFERENCES municipios(id),
  telefono TEXT, email TEXT,
  activo BOOLEAN DEFAULT true,
  ubicacion GEOMETRY(POINT,4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles SIN referencia a auth.users (usamos auth propia)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL,
  cedula        TEXT UNIQUE,
  telefono      TEXT,
  rol           rol_usuario NOT NULL DEFAULT 'CIUDADANO',
  organismo_id  UUID REFERENCES organismos(id),
  municipio_id  UUID REFERENCES municipios(id),
  foto_url      TEXT,
  activo        BOOLEAN DEFAULT true,
  device_token  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TABLE recursos_organismo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organismo_id UUID REFERENCES organismos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, nombre TEXT NOT NULL, descripcion TEXT,
  cantidad_total      INT NOT NULL DEFAULT 1,
  cantidad_disponible INT NOT NULL DEFAULT 1,
  ubicacion GEOMETRY(POINT,4326),
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS incident_code_seq START 1;

CREATE TABLE incidentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL DEFAULT '',
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  emitida_at TIMESTAMPTZ
);

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alerta_id UUID REFERENCES alertas(id) ON DELETE CASCADE,
  nivel nivel_alerta,
  titulo TEXT,
  municipios_ids UUID[],
  total_tokens INT DEFAULT 0,
  enviados INT DEFAULT 0,
  fallidos INT DEFAULT 0,
  estado TEXT DEFAULT 'ok',
  canal canal_notificacion,
  destinatario_id UUID,
  destinatario_tipo TEXT,
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
  nombre_jefe_hogar TEXT NOT NULL,
  cedula TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- Índices
CREATE INDEX idx_municipios_geom       ON municipios USING GIST(geom);
CREATE INDEX idx_municipios_centroide  ON municipios USING GIST(centroide);
CREATE INDEX idx_incidentes_ubicacion  ON incidentes USING GIST(ubicacion);
CREATE INDEX idx_incidentes_estado     ON incidentes(estado);
CREATE INDEX idx_incidentes_municipio  ON incidentes(municipio_id);
CREATE INDEX idx_incidentes_fecha      ON incidentes(fecha_inicio DESC);
CREATE INDEX idx_alertas_activa        ON alertas(activa) WHERE activa = true;
CREATE INDEX idx_alertas_nivel         ON alertas(nivel);
CREATE INDEX idx_reportes_ubicacion    ON reportes_ciudadanos USING GIST(ubicacion);
CREATE INDEX idx_sync_pendiente        ON sync_queue(device_id, procesado) WHERE procesado = false;
CREATE INDEX idx_archivos_incidente    ON archivos(incidente_id);
CREATE INDEX idx_damnificados_incidente ON damnificados(incidente_id);

-- Funciones y triggers
CREATE OR REPLACE FUNCTION generate_incident_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'INC-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('incident_code_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incident_code
  BEFORE INSERT ON incidentes
  FOR EACH ROW EXECUTE FUNCTION generate_incident_code();

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidentes_updated_at  BEFORE UPDATE ON incidentes  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_damnificados_updated_at BEFORE UPDATE ON damnificados FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(tabla,operacion,registro_id,datos_anteriores)
    VALUES(TG_TABLE_NAME,TG_OP,OLD.id,row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(tabla,operacion,registro_id,datos_anteriores,datos_nuevos)
    VALUES(TG_TABLE_NAME,TG_OP,NEW.id,row_to_json(OLD)::jsonb,row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSE
    INSERT INTO audit_log(tabla,operacion,registro_id,datos_nuevos)
    VALUES(TG_TABLE_NAME,TG_OP,NEW.id,row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_incidentes    AFTER INSERT OR UPDATE OR DELETE ON incidentes    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_alertas       AFTER INSERT OR UPDATE           ON alertas       FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_damnificados  AFTER INSERT OR UPDATE           ON damnificados  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
