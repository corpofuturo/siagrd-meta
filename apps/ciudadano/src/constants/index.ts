// Constantes globales de la app ciudadana SIAGRD Meta

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? 'https://api.siagrd.corpofuturo.org';

/** TTL cache de alertas: 15 minutos en milisegundos */
export const CACHE_ALERTAS_TTL_MS = 900_000;

/** TTL cache de tiles de mapa: 24 horas en milisegundos */
export const CACHE_TILES_TTL_MS = 86_400_000;

/** 27 municipios del departamento del Meta — codigos DANE oficiales */
export const MUNICIPIOS_META: { nombre: string; codigo_dane: string }[] = [
  { nombre: 'Villavicencio', codigo_dane: '50001' },
  { nombre: 'Acacías', codigo_dane: '50006' },
  { nombre: 'Barranca de Upía', codigo_dane: '50110' },
  { nombre: 'Cabuyaro', codigo_dane: '50124' },
  { nombre: 'Castilla la Nueva', codigo_dane: '50150' },
  { nombre: 'Cubarral', codigo_dane: '50223' },
  { nombre: 'Cumaral', codigo_dane: '50226' },
  { nombre: 'El Calvario', codigo_dane: '50245' },
  { nombre: 'El Castillo', codigo_dane: '50251' },
  { nombre: 'El Dorado', codigo_dane: '50270' },
  { nombre: 'Fuente de Oro', codigo_dane: '50287' },
  { nombre: 'Granada', codigo_dane: '50313' },
  { nombre: 'Guamal', codigo_dane: '50318' },
  { nombre: 'La Macarena', codigo_dane: '50350' },
  { nombre: 'Lejanías', codigo_dane: '50400' },
  { nombre: 'Mapiripán', codigo_dane: '50325' },
  { nombre: 'Mesetas', codigo_dane: '50330' },
  { nombre: 'Puerto Concordia', codigo_dane: '50450' },
  { nombre: 'Puerto Gaitán', codigo_dane: '50568' },
  { nombre: 'Puerto Lleras', codigo_dane: '50577' },
  { nombre: 'Puerto López', codigo_dane: '50573' },
  { nombre: 'Puerto Rico', codigo_dane: '50590' },
  { nombre: 'Restrepo', codigo_dane: '50606' },
  { nombre: 'San Carlos de Guaroa', codigo_dane: '50680' },
  { nombre: 'San Juan de Arama', codigo_dane: '50683' },
  { nombre: 'San Juanito', codigo_dane: '50686' },
  { nombre: 'San Martín', codigo_dane: '50689' },
];

export type NivelAlerta = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

export const NIVEL_COLORES: Record<
  NivelAlerta,
  { bg: string; text: string; bgLight: string }
> = {
  VERDE: { bg: '#052E16', text: '#86EFAC', bgLight: '#166534' },
  AMARILLO: { bg: '#1C1700', text: '#FDE68A', bgLight: '#854D0E' },
  NARANJA: { bg: '#1C0A00', text: '#FDBA74', bgLight: '#9A3412' },
  ROJO: { bg: '#1C0505', text: '#FCA5A5', bgLight: '#991B1B' },
};

export const TIPOS_AMENAZA = [
  { id: 'inundacion', label: 'Inundación', icon: 'INUNDACION' },
  { id: 'deslizamiento', label: 'Deslizamiento', icon: 'DESLIZAMIENTO' },
  { id: 'incendio', label: 'Incendio', icon: 'INCENDIO' },
  { id: 'sismo', label: 'Sismo', icon: 'SISMO' },
  { id: 'vendaval', label: 'Vendaval', icon: 'VENDAVAL' },
  { id: 'otro', label: 'Otro', icon: 'OTRO' },
] as const;
