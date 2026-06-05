import { describe, it, expect } from 'vitest';
import { wktPoint, parseGeoJSONPoint, distanciaKm } from '../utils/geo.js';

describe('wktPoint', () => {
  it('genera cadena WKT correcta con SRID=4326', () => {
    const result = wktPoint(-4.142, -73.636);
    expect(result).toBe('SRID=4326;POINT(-73.636 -4.142)');
  });

  it('usa orden lng, lat en la cadena WKT', () => {
    // WKT estándar usa X (lng), Y (lat)
    const result = wktPoint(10, 20);
    expect(result).toBe('SRID=4326;POINT(20 10)');
  });

  it('maneja valores en cero', () => {
    const result = wktPoint(0, 0);
    expect(result).toBe('SRID=4326;POINT(0 0)');
  });

  it('maneja coordenadas negativas correctamente', () => {
    const result = wktPoint(-3.989, -73.763);
    expect(result).toBe('SRID=4326;POINT(-73.763 -3.989)');
  });
});

describe('parseGeoJSONPoint', () => {
  it('convierte GeoJSON Point a { lat, lng }', () => {
    const result = parseGeoJSONPoint({ type: 'Point', coordinates: [-73.636, -4.142] });
    expect(result).toEqual({ lat: -4.142, lng: -73.636 });
  });

  it('retorna null cuando el valor es null', () => {
    const result = parseGeoJSONPoint(null);
    expect(result).toBeNull();
  });

  it('retorna null cuando el valor es undefined', () => {
    const result = parseGeoJSONPoint(undefined);
    expect(result).toBeNull();
  });

  it('retorna null cuando el tipo no es Point', () => {
    const result = parseGeoJSONPoint({ type: 'LineString', coordinates: [-73.636, -4.142] } as any);
    expect(result).toBeNull();
  });

  it('extrae correctamente lng como primer elemento y lat como segundo', () => {
    // GeoJSON usa [lng, lat] — orden contrario al convencional
    const result = parseGeoJSONPoint({ type: 'Point', coordinates: [-73.763, -3.989] });
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(-3.989);
    expect(result!.lng).toBe(-73.763);
  });
});

describe('distanciaKm', () => {
  it('retorna 0 cuando los dos puntos son idénticos', () => {
    const dist = distanciaKm(0, 0, 0, 0);
    expect(dist).toBe(0);
  });

  it('calcula distancia Villavicencio-Acacías entre 20 y 30 km', () => {
    // Villavicencio: -4.142, -73.636
    // Acacías: -3.989, -73.763
    const dist = distanciaKm(-4.142, -73.636, -3.989, -73.763);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(30);
  });

  it('retorna número positivo para cualquier par de puntos distintos', () => {
    const dist = distanciaKm(4.711, -74.0721, 6.2518, -75.5636); // Bogotá - Medellín
    expect(dist).toBeGreaterThan(0);
  });

  it('es simétrica — d(A,B) === d(B,A)', () => {
    const d1 = distanciaKm(-4.142, -73.636, -3.989, -73.763);
    const d2 = distanciaKm(-3.989, -73.763, -4.142, -73.636);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('distancia Bogotá-Medellín aproximadamente 240-260 km', () => {
    const dist = distanciaKm(4.711, -74.0721, 6.2518, -75.5636);
    expect(dist).toBeGreaterThan(240);
    expect(dist).toBeLessThan(260);
  });
});
