/**
 * Tests del servicio de ubicación GPS — apps/socorro
 * Verifica estructura del resultado, manejo de fallos y clasificación de fuente.
 */

import { jest } from '@jest/globals';

// ── Mock de expo-location ─────────────────────────────────────────────────────

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  getCurrentPositionAsync: mockGetCurrentPositionAsync,
  Accuracy: {
    High: 5,
    Lowest: 1,
  },
}));

// ── Imports bajo mocks ────────────────────────────────────────────────────────

import { obtenerUbicacion, obtenerUbicacionSinBloquear, FuenteGPS } from '../services/location.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLocationObject(accuracy: number, lat = 4.142, lng = -73.626) {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      altitude: 430,
      accuracy,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1700000000000,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('location.service — estructura del resultado', () => {
  beforeEach(() => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  it('retorna objeto con lat, lng, precision_metros, fuente y timestamp', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(15));
    const result = await obtenerUbicacion();
    expect(result).toHaveProperty('lat');
    expect(result).toHaveProperty('lng');
    expect(result).toHaveProperty('precision_metros');
    expect(result).toHaveProperty('fuente');
    expect(result).toHaveProperty('timestamp');
  });

  it('lat y lng coinciden con los retornados por expo-location', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(10, 4.142, -73.626));
    const result = await obtenerUbicacion();
    expect(result.lat).toBeCloseTo(4.142);
    expect(result.lng).toBeCloseTo(-73.626);
  });

  it('precision_metros refleja el accuracy del proveedor', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(12));
    const result = await obtenerUbicacion();
    expect(result.precision_metros).toBe(12);
  });
});

describe('location.service — clasificación fuente GPS', () => {
  beforeEach(() => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  it('fuente es GPS_ALTA cuando precisión <= 20m', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(20));
    const result = await obtenerUbicacion();
    expect(result.fuente).toBe(FuenteGPS.GPS_ALTA);
  });

  it('fuente es GPS_ALTA para precisión de 1m', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(1));
    const result = await obtenerUbicacion();
    expect(result.fuente).toBe(FuenteGPS.GPS_ALTA);
  });

  it('fuente es GPS_BAJA cuando precisión > 20m y <= 100m', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(50));
    const result = await obtenerUbicacion();
    expect(result.fuente).toBe(FuenteGPS.GPS_BAJA);
  });

  it('fuente es GPS_BAJA en el límite de 100m', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(100));
    const result = await obtenerUbicacion();
    expect(result.fuente).toBe(FuenteGPS.GPS_BAJA);
  });

  it('fuente es RED cuando precisión > 100m', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(200));
    const result = await obtenerUbicacion();
    expect(result.fuente).toBe(FuenteGPS.RED);
  });

  it('usa fuente RED (999m) si expo-location retorna accuracy null', async () => {
    const loc = buildLocationObject(0);
    loc.coords.accuracy = null as unknown as number;
    mockGetCurrentPositionAsync.mockResolvedValue(loc);
    const result = await obtenerUbicacion();
    // accuracy null → cae en 999 → FuenteGPS.RED
    expect(result.fuente).toBe(FuenteGPS.RED);
    expect(result.precision_metros).toBe(999);
  });
});

describe('location.service — fallback entre llamadas', () => {
  beforeEach(() => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  });

  it('usa fallback de precisión mínima si la llamada High falla', async () => {
    mockGetCurrentPositionAsync
      .mockRejectedValueOnce(new Error('timeout GPS'))
      .mockResolvedValueOnce(buildLocationObject(80));

    const result = await obtenerUbicacion();
    expect(result.precision_metros).toBe(80);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });
});

describe('location.service — obtenerUbicacionSinBloquear', () => {
  it('retorna null sin lanzar excepción si el permiso es denegado', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const result = await obtenerUbicacionSinBloquear();
    expect(result).toBeNull();
  });

  it('retorna null sin lanzar excepción si ambas llamadas de ubicación fallan', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockRejectedValue(new Error('Servicio GPS no disponible'));
    const result = await obtenerUbicacionSinBloquear();
    expect(result).toBeNull();
  });

  it('retorna ubicación válida si expo-location responde correctamente', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue(buildLocationObject(15));
    const result = await obtenerUbicacionSinBloquear();
    expect(result).not.toBeNull();
    expect(result?.fuente).toBe(FuenteGPS.GPS_ALTA);
  });

  it('NUNCA lanza excepción — siempre resuelve', async () => {
    mockRequestForegroundPermissionsAsync.mockRejectedValue(new Error('crash inesperado'));
    await expect(obtenerUbicacionSinBloquear()).resolves.toBeNull();
  });
});
