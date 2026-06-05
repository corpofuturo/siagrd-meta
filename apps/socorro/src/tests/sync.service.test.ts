/**
 * Tests del servicio de sincronización offline — apps/socorro
 * Verifica comportamiento ante falta de red, orden de operaciones y persistencia.
 */

import { jest } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({ isConnected: false }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 'MULTIPART' },
}));

// Mock WatermelonDB database
const mockIncidentesQuery = { fetch: jest.fn().mockResolvedValue([]) };
const mockActualizacionesQuery = { fetch: jest.fn().mockResolvedValue([]) };
const mockArchivosQuery = { fetch: jest.fn().mockResolvedValue([]) };
const mockAlertasQuery = { fetch: jest.fn().mockResolvedValue([]) };

const mockCollections: Record<string, { query: () => { fetch: jest.Mock } }> = {
  incidentes: { query: () => mockIncidentesQuery },
  actualizaciones: { query: () => mockActualizacionesQuery },
  archivos_pendientes: { query: () => mockArchivosQuery },
  alertas_cache: { query: () => mockAlertasQuery },
};

jest.mock('../database', () => ({
  database: {
    get: jest.fn((table: string) => mockCollections[table]),
    write: jest.fn(async (fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('./auth.service', () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
}));

jest.mock('../constants', () => ({
  API_BASE: 'https://api.siagrd.test',
}));

// ── Imports bajo los mocks ────────────────────────────────────────────────────

import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { sincronizar, getSyncPendingCount, getDeviceId } from '../services/sync.service';
import { getAuthToken } from './auth.service';
import { database } from '../database';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sync.service — existencia de funciones', () => {
  it('sincronizar es una función callable', () => {
    expect(typeof sincronizar).toBe('function');
  });

  it('getSyncPendingCount es una función callable', () => {
    expect(typeof getSyncPendingCount).toBe('function');
  });

  it('getDeviceId es una función callable', () => {
    expect(typeof getDeviceId).toBe('function');
  });
});

describe('sync.service — sin conexión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
  });

  it('no lanza excepción cuando isConnected es false', async () => {
    await expect(sincronizar()).resolves.toBeUndefined();
  });

  it('no llama a getAuthToken si no hay red', async () => {
    await sincronizar();
    expect(getAuthToken).not.toHaveBeenCalled();
  });

  it('no llama a fetch global si no hay red', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await sincronizar();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('sync.service — sin token de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (getAuthToken as jest.Mock).mockResolvedValue(null);
  });

  it('no lanza excepción cuando no hay token', async () => {
    await expect(sincronizar()).resolves.toBeUndefined();
  });

  it('no realiza llamadas de red si no hay token', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await sincronizar();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('sync.service — orden de sincronización', () => {
  const callOrder: string[] = [];

  beforeEach(() => {
    callOrder.length = 0;
    jest.clearAllMocks();

    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    (getAuthToken as jest.Mock).mockResolvedValue('token-test');
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('device-123');

    // Incidente pendiente (synced = false)
    mockIncidentesQuery.fetch.mockResolvedValue([
      {
        id: 'inc-1',
        synced: false,
        codigo: 'INC-001',
        titulo: 'Test',
        descripcion: '',
        tipoAmenaza: 'inundacion',
        estado: 'activo',
        nivelAlerta: 'ROJO',
        lat: 4.1,
        lng: -73.6,
        altitud: null,
        precisionGps: 15,
        municipioId: 'mun-1',
        afectadosEstimado: 0,
        createdAtLocal: new Date().toISOString(),
        update: jest.fn(async (fn: (i: any) => void) => fn({ synced: true, serverId: null, syncError: null })),
      },
    ]);

    // Archivo pendiente (subido = false, pero archivo no existe en disco)
    mockArchivosQuery.fetch.mockResolvedValue([
      {
        id: 'arch-1',
        subido: false,
        uriLocal: '/fake/path/foto.jpg',
        incidenteId: 'inc-1',
        error: null,
        update: jest.fn(async (fn: (a: any) => void) => fn({ error: 'Archivo no encontrado en disco' })),
      },
    ]);

    mockActualizacionesQuery.fetch.mockResolvedValue([]);
    mockAlertasQuery.fetch.mockResolvedValue([]);

    // Rastrear orden: archivos primero → incidentes → actualizaciones
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'archivos_pendientes') {
        callOrder.push('archivos');
        return mockCollections['archivos_pendientes'];
      }
      if (table === 'incidentes') {
        callOrder.push('incidentes');
        return mockCollections['incidentes'];
      }
      if (table === 'actualizaciones') {
        callOrder.push('actualizaciones');
        return mockCollections['actualizaciones'];
      }
      if (table === 'alertas_cache') {
        callOrder.push('alertas_cache');
        return mockCollections['alertas_cache'];
      }
      return mockCollections[table];
    });

    // Mock fetch global para evitar llamadas reales
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ resultados: [{ local_id: 'inc-1', server_id: 'srv-1' }] }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consulta archivos antes que incidentes', async () => {
    await sincronizar();
    const archivosIdx = callOrder.indexOf('archivos');
    const incidentesIdx = callOrder.indexOf('incidentes');
    expect(archivosIdx).toBeGreaterThanOrEqual(0);
    expect(incidentesIdx).toBeGreaterThan(archivosIdx);
  });

  it('consulta incidentes antes que actualizaciones', async () => {
    await sincronizar();
    const incidentesIdx = callOrder.indexOf('incidentes');
    const actualizacionesIdx = callOrder.indexOf('actualizaciones');
    expect(incidentesIdx).toBeGreaterThanOrEqual(0);
    expect(actualizacionesIdx).toBeGreaterThan(incidentesIdx);
  });
});

describe('sync.service — getSyncPendingCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (database.get as jest.Mock).mockImplementation((table: string) => mockCollections[table]);

    mockIncidentesQuery.fetch.mockResolvedValue([
      { synced: false },
      { synced: true },
    ]);
    mockActualizacionesQuery.fetch.mockResolvedValue([
      { synced: false },
    ]);
    mockArchivosQuery.fetch.mockResolvedValue([
      { subido: false },
      { subido: false },
      { subido: true },
    ]);
  });

  it('cuenta correctamente elementos pendientes', async () => {
    const count = await getSyncPendingCount();
    // 1 incidente + 1 actualizacion + 2 archivos = 4
    expect(count).toBe(4);
  });

  it('retorna 0 cuando todo está sincronizado', async () => {
    mockIncidentesQuery.fetch.mockResolvedValue([{ synced: true }]);
    mockActualizacionesQuery.fetch.mockResolvedValue([{ synced: true }]);
    mockArchivosQuery.fetch.mockResolvedValue([{ subido: true }]);
    const count = await getSyncPendingCount();
    expect(count).toBe(0);
  });
});

describe('sync.service — getDeviceId', () => {
  it('genera y persiste un nuevo deviceId si no existe', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const id = await getDeviceId();
    expect(typeof id).toBe('string');
    expect(id.startsWith('device_')).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('retorna el deviceId existente sin sobreescribir', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('device_existing_123');
    const id = await getDeviceId();
    expect(id).toBe('device_existing_123');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
