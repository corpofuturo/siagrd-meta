export type RolUsuario = 'ADMIN' | 'CDGRD' | 'CMGRD' | 'SOCORRO' | 'CIUDADANO' | 'ALCALDIA' | 'GOBERNACION';
export type TipoAmenaza =
  | 'INUNDACION'
  | 'REMOCION'
  | 'SISMO'
  | 'INCENDIO_FORESTAL'
  | 'ACCIDENTE_VIA'
  | 'DERRAME_HC'
  | 'OTRO';
export type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
export type EstadoIncidente = 'ABIERTO' | 'EN_ATENCION' | 'CERRADO' | 'FALSA_ALARMA';

/** Estados del ciclo de vida SATAM (máquina de estados) */
export type EstadoEvento =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_CURSO'
  | 'CONTROLADO'
  | 'CERRADO'
  | 'CANCELADO'
  | 'FALSO_POSITIVO';

export interface AuthenticatedUser {
  id: string;
  rol: RolUsuario;
  municipio_id?: string;
  organismo_id?: string;
  email: string;
}

export interface Incidente {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo_amenaza: TipoAmenaza;
  estado: EstadoIncidente;
  nivel_alerta: NivelAlerta;
  lat: number;
  lng: number;
  precision_gps_metros?: number;
  municipio_id: string;
  vereda_id?: string;
  reportado_por?: string;
  afectados_estimado?: number;
  fecha_inicio: string;
  created_at: string;
  updated_at: string;
}

export interface Alerta {
  id: string;
  tipo: TipoAmenaza;
  nivel: NivelAlerta;
  titulo: string;
  descripcion: string;
  instrucciones_ciudadano: string;
  instrucciones_socorro?: string;
  municipios_afectados: string[];
  fuente: 'IDEAM' | 'SGC' | 'CDGRD' | 'SISTEMA';
  activa: boolean;
  inicio: string;
  fin_estimado?: string;
  created_at: string;
}

export interface SyncEvento {
  id: string;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id?: string;
  payload: Record<string, unknown>;
  timestamp_local: number;
}

export interface SyncPayload {
  device_id: string;
  eventos: SyncEvento[];
  last_sync_timestamp?: number;
}

export interface SyncResponse {
  procesados: number;
  fallidos: Array<{ id: string; error: string }>;
  conflictos: Array<{ id: string; resolucion: string }>;
  server_timestamp: number;
  incidentes_nuevos: Incidente[];
  alertas_activas: Alerta[];
}
