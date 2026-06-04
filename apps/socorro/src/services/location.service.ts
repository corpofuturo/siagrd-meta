import * as Location from 'expo-location';

/** Clasificación de la fuente de la coordenada por precisión */
export enum FuenteGPS {
  GPS_ALTA = 'GPS_ALTA',   // precision <= 20m
  GPS_BAJA = 'GPS_BAJA',   // precision <= 100m
  RED = 'RED',              // precision > 100m
  MANUAL = 'MANUAL',        // ingresada por el usuario
}

export interface Coordenada {
  lat: number;
  lng: number;
  altitud?: number;
  precision_metros: number;
  timestamp: number;
  fuente: FuenteGPS;
}

/**
 * Clasifica la fuente GPS según la precisión en metros.
 */
function clasificarFuente(accuracyMetros: number): FuenteGPS {
  if (accuracyMetros <= 20) return FuenteGPS.GPS_ALTA;
  if (accuracyMetros <= 100) return FuenteGPS.GPS_BAJA;
  return FuenteGPS.RED;
}

/**
 * Solicita permiso de ubicación si no está concedido.
 * Lanza error si el usuario deniega el permiso.
 */
async function solicitarPermiso(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }
}

/**
 * Obtiene la ubicación actual con alta precisión (timeout 10s).
 * Hace fallback a precisión mínima si la alta falla.
 * Lanza error si no puede obtener ninguna ubicación.
 */
export async function obtenerUbicacion(): Promise<Coordenada> {
  await solicitarPermiso();

  let position: Location.LocationObject;

  try {
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
    });
  } catch {
    // Fallback a precisión mínima
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
  }

  const accuracy = position.coords.accuracy ?? 999;

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    altitud: position.coords.altitude ?? undefined,
    precision_metros: accuracy,
    timestamp: position.timestamp,
    fuente: clasificarFuente(accuracy),
  };
}

/**
 * Versión no bloqueante de obtenerUbicacion.
 * Retorna null si falla por cualquier razón.
 * NUNCA debe bloquear el flujo del usuario.
 */
export async function obtenerUbicacionSinBloquear(): Promise<Coordenada | null> {
  try {
    return await obtenerUbicacion();
  } catch {
    return null;
  }
}
