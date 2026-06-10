export type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
export type TipoAmenaza =
  | 'INUNDACION'
  | 'REMOCION'
  | 'SISMO'
  | 'INCENDIO_FORESTAL'
  | 'ACCIDENTE_VIA'
  | 'DERRAME_HC'
  | 'OTRO';
export type RolUsuario = 'ADMIN' | 'CDGRD' | 'CMGRD' | 'SOCORRO' | 'CIUDADANO';

export interface Coordenada {
  lat: number;
  lng: number;
  altitud?: number;
  precision_metros: number;
  timestamp: number;
  fuente: 'GPS_ALTA' | 'GPS_BAJA' | 'RED' | 'MANUAL';
}

export interface Incidente {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo_amenaza: TipoAmenaza;
  estado: 'ABIERTO' | 'EN_ATENCION' | 'CERRADO' | 'FALSA_ALARMA';
  nivel_alerta: NivelAlerta;
  lat: number;
  lng: number;
  municipio_id: string;
  municipio_nombre?: string;
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
  activa: boolean;
  inicio: string;
  fin_estimado?: string;
}

export interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  municipio_id?: string;
  organismo_id?: string;
  foto_url?: string;
}
