/**
 * Utilidades geoespaciales para SIAGRD.
 * Fórmulas: Haversine, conversión WKT/GeoJSON.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Genera un punto WKT con SRID 4326 para insertar en PostGIS.
 * @param lat Latitud en grados decimales
 * @param lng Longitud en grados decimales
 */
export function wktPoint(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * Parsea un objeto GeoJSON Point y extrae lat/lng.
 * Devuelve null si el argumento no es un GeoJSON Point válido.
 */
export function parseGeoJSONPoint(geom: unknown): { lat: number; lng: number } | null {
  if (geom === null || geom === undefined) return null;
  if (typeof geom !== 'object') return null;

  const g = geom as Partial<GeoJSONPoint>;
  if (g.type !== 'Point') return null;
  if (!Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;

  const [lng, lat] = g.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
}

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos.
 * Usa la fórmula de Haversine.
 */
export function distanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
