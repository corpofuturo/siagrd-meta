import * as Location from 'expo-location';

export interface Coordenada {
  latitud: number;
  longitud: number;
  precision?: number;
}

/**
 * Solicita permisos y obtiene ubicación actual.
 * Lanza error si el permiso es denegado.
 */
export async function obtenerUbicacion(): Promise<Coordenada> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitud: location.coords.latitude,
    longitud: location.coords.longitude,
    precision: location.coords.accuracy ?? undefined,
  };
}

/**
 * Intenta obtener ubicación sin bloquear la UI.
 * Retorna null si no hay permiso o hay error, sin lanzar excepción.
 */
export async function obtenerUbicacionSinBloquear(): Promise<Coordenada | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    return {
      latitud: location.coords.latitude,
      longitud: location.coords.longitude,
      precision: location.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Retorna la última ubicación conocida sin activar el GPS.
 * Útil para precarga rápida.
 */
export async function getLastKnownLocation(): Promise<Coordenada | null> {
  try {
    const location = await Location.getLastKnownPositionAsync();
    if (!location) return null;
    return {
      latitud: location.coords.latitude,
      longitud: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
