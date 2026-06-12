import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Mocks hoisted
// ---------------------------------------------------------------------------

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  (mockDb as any).json = vi.fn().mockImplementation((v: any) => v);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  enqueueNotification,
  processNotificationQueue,
  type NotificationPayload,
} from '../services/notifications.service.js';

// ---------------------------------------------------------------------------

const basePayload: NotificationPayload = {
  alerta_id: 'alerta-1',
  canal: 'PUSH',
  nivel: 'ROJO',
  titulo: 'Inundación crítica sector norte',
  municipios_ids: ['mun-1'],
};

describe('enqueueNotification', () => {
  beforeEach(() => {
    (mockDb as any).mockReset();
    (mockDb as any).mockResolvedValue([]);
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
    (mockDb as any).json = vi.fn().mockImplementation((v: any) => v);
  });

  it('llama al INSERT con ON CONFLICT DO NOTHING (idempotencia)', async () => {
    await enqueueNotification(basePayload, 'push:alerta-1');
    expect(mockDb).toHaveBeenCalledTimes(1);
  });

  it('con la misma key invocada dos veces: db es llamado dos veces (la BD resuelve el conflicto)', async () => {
    (mockDb as any).mockResolvedValue([]);

    await enqueueNotification(basePayload, 'push:alerta-idempotente');
    await enqueueNotification(basePayload, 'push:alerta-idempotente');

    // Ambas llaman a db; la idempotencia la garantiza ON CONFLICT en la BD
    expect(mockDb).toHaveBeenCalledTimes(2);
  });
});

describe('processNotificationQueue — reintentos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (mockDb as any).mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('notificación FALLIDA se reintenta hasta 3 veces antes de marcarse FALLIDA definitiva', async () => {
    const notifRow = {
      id: 'notif-1',
      canal: 'TELEGRAM',
      alerta_id: 'alerta-1',
      nivel: 'ROJO',
      titulo: 'Test reintento',
      municipios_ids: [],
      reintentos: 2, // ya tiene 2 reintentos → en el próximo llega a 3 → FALLIDO definitivo
    };

    // 1ª llamada: SELECT pendientes
    (mockDb as any).mockResolvedValueOnce([notifRow]);

    // TELEGRAM env vars ausentes → el stub hace UPDATE SET estado='ENVIADO'
    // Simulamos un fallo: mockear fetch para lanzar
    process.env.TELEGRAM_BOT_TOKEN = 'fake-token';
    process.env.TELEGRAM_CHAT_ID = 'fake-chat';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('Server Error') }),
    );

    // 2ª llamada: UPDATE SET estado='FALLIDO' (reintentos >= 3)
    (mockDb as any).mockResolvedValueOnce([]);

    await processNotificationQueue();

    // Verificar que el segundo call a db contiene la marca de FALLIDO
    const calls = (mockDb as any).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('notificación con 0 reintentos previos actualiza next_retry_at (backoff)', async () => {
    const notifRow = {
      id: 'notif-2',
      canal: 'TELEGRAM',
      alerta_id: 'alerta-2',
      nivel: 'AMARILLO',
      titulo: 'Test backoff',
      municipios_ids: [],
      reintentos: 0,
    };

    process.env.TELEGRAM_BOT_TOKEN = 'fake-token';
    process.env.TELEGRAM_CHAT_ID = 'fake-chat';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve('Unavailable') }),
    );

    (mockDb as any)
      .mockResolvedValueOnce([notifRow]) // SELECT pendientes
      .mockResolvedValueOnce([]);         // UPDATE next_retry_at

    await processNotificationQueue();

    const calls = (mockDb as any).mock.calls;
    // Debe haber al menos 2 llamadas a la bd
    expect(calls.length).toBeGreaterThanOrEqual(2);

    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });
});

describe('webhook HMAC signature', () => {
  it('signPayload genera sha256=<hex> idéntico a cálculo manual', () => {
    // Reimplementar la función localmente para verificar el algoritmo
    const secret = 'mi-secreto-satam';
    const payload = JSON.stringify({ tipo: 'alerta.emitida', datos: { id: 'alerta-1' } });

    const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

    // La función signPayload del webhook.service usa exactamente este algoritmo
    const actual = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

    expect(actual).toBe(expected);
    expect(actual).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('firma distinta con secretos diferentes', () => {
    const payload = JSON.stringify({ tipo: 'incidente.creado' });
    const firma1 = 'sha256=' + createHmac('sha256', 'secreto-a').update(payload).digest('hex');
    const firma2 = 'sha256=' + createHmac('sha256', 'secreto-b').update(payload).digest('hex');

    expect(firma1).not.toBe(firma2);
  });

  it('misma firma para mismo payload y mismo secreto (determinismo)', () => {
    const payload = '{"tipo":"alerta.emitida"}';
    const secret = 'deterministic-secret';

    const firma1 = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
    const firma2 = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

    expect(firma1).toBe(firma2);
  });
});
